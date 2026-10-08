/**
 * Azure Marketplace business logic service.
 * Handles request lifecycle, data transformation, MS API orchestration, and audit logging.
 */

const pool = require('../../config/database');
const msApi = require('./azure.ms.api.service');
const { htmlToText } = require('../aws-marketplace/aws.text.sanitize');

// Parse a JSON string, returning {} on failure. Used for azure_payload which is
// JSONB (already an object from pg) but may arrive as text via some drivers.
function safeJsonParse(value) {
  try {
    return JSON.parse(value) || {};
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Helper: write an audit log entry inside an optional existing transaction client
// ---------------------------------------------------------------------------
async function writeAudit(client, { requestId, userId, action, previousStatus, newStatus, msResponse, errorInfo }) {
  const sql = `
    INSERT INTO azure_marketplace_audit
      (request_id, user_id, action, previous_status, new_status, ms_response, error_info)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;
  await client.query(sql, [
    requestId,
    userId || null,
    action,
    previousStatus || null,
    newStatus || null,
    msResponse ? JSON.stringify(msResponse) : null,
    errorInfo ? JSON.stringify(errorInfo) : null,
  ]);
}

// ---------------------------------------------------------------------------
// Product Ingestion API schema
// ---------------------------------------------------------------------------
// Per-resource schema versions for the Product Ingestion API. Microsoft versions
// each resource independently; these track the values used in the current docs.
// Ref: https://learn.microsoft.com/partner-center/marketplace-offers/product-ingestion-api
// Verified against a live SaaS offer's resource-tree on this account.
const SCHEMA_VERSIONS = {
  configure: '2022-03-01-preview2',
  product: '2022-03-01-preview3',
  'commercial-marketplace-setup': '2022-03-01-preview2',
  'customer-leads': '2022-03-01-preview3',
  'microsoft365-integration': '2022-03-01-preview2',
  property: '2022-03-01-preview3',
  plan: '2022-03-01-preview3',
  listing: '2022-03-01-preview3',
  'listing-asset': '2022-03-01-preview3',
  'plan-listing': '2022-03-01-preview3',
  'price-and-availability-offer': '2022-03-01-preview3',
  'price-and-availability-custom-meter': '2022-03-01-preview3',
  'price-and-availability-plan': '2022-03-01-preview4',
  'software-as-a-service-technical-configuration': '2022-03-01-preview3',
  reseller: '2022-03-01-preview2',
  submission: '2022-03-01-preview2',
};
const ingestionSchema = (name) =>
  `https://schema.mp.microsoft.com/schema/${name}/${SCHEMA_VERSIONS[name] || '2022-03-01-preview2'}`;

// Admin-facing offer type -> Product Ingestion API `product.type`.
const OFFER_TYPE_TO_MS_PRODUCT_TYPE = {
  SaaS: 'softwareAsAService',
  AzureApplication: 'azureApplication',
  VirtualMachine: 'azureVirtualMachine',
  Container: 'azureContainer',
  // Consulting / professional-service offers. NeoZaar "services" (catalog
  // action_type = 'service') default to this so they are listed as services only.
  ProfessionalService: 'consultingService',
};

// NeoZaar catalog action_type -> default Azure offer type. A "service" is listed
// as a consulting/professional-service offer; everything else defaults to SaaS.
function defaultOfferTypeForCatalog(product) {
  return String(product?.action_type || '').toLowerCase() === 'service'
    ? 'ProfessionalService'
    : 'SaaS';
}

// ---------------------------------------------------------------------------
// Helper: build the internal Azure Marketplace summary payload from NeoZaar
// product data plus the admin-entered Azure-specific config. Fields that are
// missing are flagged — never invented. This is the object stored in
// azure_marketplace_requests.azure_payload and rendered on the review screen;
// buildConfigurePayload() turns it into the Microsoft resource tree.
// ---------------------------------------------------------------------------
function buildAzurePayload(product, publisherId, azureSpecific = {}) {
  const missingFields = [];

  const check = (label, value) => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      missingFields.push(label);
      return null;
    }
    return value;
  };

  // "service" catalog items are published as professional-service offers only.
  const listingKind =
    String(product?.action_type || '').toLowerCase() === 'service' ? 'service' : 'product';
  const offerType = azureSpecific.offerType || defaultOfferTypeForCatalog(product);

  const payload = {
    // Top-level offer metadata
    publisherId: publisherId || process.env.AZURE_PUBLISHER_ID,
    offerType,
    // Whether the underlying NeoZaar catalog item is a product or a service.
    // Services are always listed as services (professional-service offers).
    listingKind,
    neozaarProductId: product.id,

    // Listing info — mapped from NeoZaar product fields
    listing: {
      title: check('Product Name', product.name),
      shortDescription: check('Short Description', htmlToText(product.short_description)),
      longDescription: check('Long Description', htmlToText(product.long_description || product.overview)),
      privacyPolicyUrl: product.privacy_policy_url || null,
      termsOfUseUrl: product.terms_of_use_url || null,
      supportUrl: azureSpecific.supportContactUrl || null,
      gettingStartedInstructions:
        product.technical_prerequisites || product.primary_use_cases || null,
      logoUri: product.product_logo || null,
      screenshots: product.screenshots || [],
      videos: product.demo_video_link ? [{ videoUrl: product.demo_video_link }] : [],
      industries: product.industry || [],
      categories: product.category || [],
      subcategories: product.subcategory || [],
    },

    // Commercial / pricing
    commercial: {
      pricingModel: product.pricing_model || null,
      billingDimension: product.billing_dimension || null,
      licenseModel: product.license_model || null,
      freeTrialAvailable: product.free_trial_available ?? false,
      startingPrice: product.starting_price || null,
      regionsSupported: product.regions_supported || [],
    },

    // Technical configuration
    technical: {
      apiMeteringEndpoint: product.api_metering_endpoint || null,
      cloudProviderSupport: product.cloud_provider_support || [],
      complianceCertifications: product.compliance_certifications || [],
      exportControlInfo: product.export_control_info || null,
    },

    // Legal
    legal: {
      acceptMarketplaceTerms: product.accept_marketplace_terms ?? false,
      consentDataPrivacyPolicy: product.consent_data_privacy_policy ?? false,
    },

    // Azure-specific fields the admin fills in on the review screen. These become
    // the externalIds / SaaS technical config in the Microsoft resource tree.
    azureSpecific: {
      offerType,
      offerId: azureSpecific.offerId || null,
      planId: azureSpecific.planId || null,
      planName: azureSpecific.planName || null,
      planDescription: azureSpecific.planDescription || null,
      saasLandingPageUrl: azureSpecific.saasLandingPageUrl || null,
      saasWebhookUrl: azureSpecific.saasWebhookUrl || null,
      saasAadTenantId: azureSpecific.saasAadTenantId || null,
      saasAadAppId: azureSpecific.saasAadAppId || null,
      supportContactName: azureSpecific.supportContactName || null,
      supportContactEmail: azureSpecific.supportContactEmail || null,
      supportContactPhone: azureSpecific.supportContactPhone || null,
      engineeringContactName: azureSpecific.engineeringContactName || null,
      engineeringContactEmail: azureSpecific.engineeringContactEmail || null,
      cspOptIn: azureSpecific.cspOptIn ?? false,
      previewAudience: azureSpecific.previewAudience || [],
    },

    _missingFields: missingFields,
    _warnings: [],
  };

  // Add warnings for important missing fields
  if (!product.product_logo) payload._warnings.push('No product logo — required for Azure Marketplace listing.');
  if (!product.privacy_policy_url) payload._warnings.push('No privacy policy URL — required for submission.');
  if (!product.accept_marketplace_terms) payload._warnings.push('ISV has not accepted marketplace terms.');

  return payload;
}

// ---------------------------------------------------------------------------
// Helper: transform the internal summary payload into a Microsoft Product
// Ingestion API `configure` resource tree.
//   POST https://graph.microsoft.com/rp/product-ingestion/configure?$version=...
//
// Cross-resource references within a single create request use `resourceName`
// (a payload-local label, not stored) per the docs. Identifiers use the
// `identity.externalID` property (capital ID).
//
// Publish target is controlled by MS_PUBLISH_TARGET:
//   unset / "draft"  -> create/update the draft only (no submission resource)
//   "preview"        -> also publish the draft to the preview environment
// Live publishing is intentionally not automated here.
//
// Field names below track Microsoft's published schema; a `configure` call
// returns per-resource errors (keyed by resourceName) that pinpoint any drift.
// ---------------------------------------------------------------------------
function buildConfigurePayload(payload, existing = null) {
  const az = payload.azureSpecific || {};
  const offerExternalId = az.offerId;
  const planExternalId = az.planId;
  const msProductType = OFFER_TYPE_TO_MS_PRODUCT_TYPE[payload.offerType] || 'softwareAsAService';
  const isSaaS = msProductType === 'softwareAsAService';

  // Upsert: when the offer / plan already exist in Partner Center, reference them
  // by durable ID and update in place. Otherwise create them via `resourceName`
  // (a payload-local label the API resolves within the same request).
  const PRODUCT = 'neozaarOffer';
  const PLAN = PRODUCT + '_plan';
  const productDurableId = existing?.productDurableId || null;
  const planDurableId = existing?.planDurableIdByExternalId?.[planExternalId] || null;
  const productRef = productDurableId || { resourceName: PRODUCT };
  const planRef = planDurableId || { resourceName: PLAN };
  const productSelfRef = productDurableId ? { id: productDurableId } : { resourceName: PRODUCT };
  const planSelfRef = planDurableId ? { id: planDurableId } : { resourceName: PLAN };

  const resources = [];

  // 1. Product
  resources.push({
    $schema: ingestionSchema('product'),
    ...productSelfRef,
    type: msProductType,
    alias: `${payload.listing.title || offerExternalId} (NeoZaar)`,
    identity: { externalId: offerExternalId },
  });

  // 2. Commercial marketplace setup (required for marketplace SaaS offers)
  resources.push({
    $schema: ingestionSchema('commercial-marketplace-setup'),
    product: productRef,
    sellThroughMicrosoft: true,
    useMicrosoftLicenseManagementService: false,
  });

  // 3. Property — terms of use + marketplace categories. Microsoft's category
  //    taxonomy is fixed; NeoZaar categories don't map, so default to a broad
  //    business-application category (admin can refine in Partner Center).
  resources.push({
    $schema: ingestionSchema('property'),
    product: productRef,
    kind: isSaaS ? 'azureSaaS' : undefined,
    termsOfUseUrl: payload.listing.termsOfUseUrl || '',
    termsConditions: 'custom',
    categories: { ITandAdministration: ['businessApplication'] },
  });

  // 4. Offer listing
  resources.push({
    $schema: ingestionSchema('listing'),
    product: productRef,
    kind: isSaaS ? 'azureSaaS' : undefined,
    languageId: 'en-us',
    title: payload.listing.title,
    description: payload.listing.longDescription,
    searchResultSummary: (payload.listing.shortDescription || '').slice(0, 100),
    // Required to publish (preview/live).
    gettingStartedInstructions:
      payload.listing.gettingStartedInstructions ||
      `Contact ${az.supportContactEmail || 'our team'} to get started with ${payload.listing.title}.`,
    privacyPolicyLink: payload.listing.privacyPolicyUrl || undefined,
    supportContact: az.supportContactEmail
      ? {
        name: az.supportContactName || undefined,
        email: az.supportContactEmail,
        // phone + url are required to publish; fall back to landing page / same phone.
        phone: az.supportContactPhone || undefined,
        url: payload.listing.supportUrl || az.saasLandingPageUrl || payload.listing.privacyPolicyUrl,
      }
      : undefined,
    engineeringContact: az.engineeringContactEmail
      ? {
        name: az.engineeringContactName || undefined,
        email: az.engineeringContactEmail,
        phone: az.engineeringContactPhone || az.supportContactPhone || undefined,
      }
      : undefined,
  });

  // 5. Plan
  resources.push({
    $schema: ingestionSchema('plan'),
    ...planSelfRef,
    product: productRef,
    identity: { externalId: planExternalId },
    alias: az.planName || planExternalId,
    azureRegions: ['azureGlobal'],
  });

  // 6. Plan listing
  resources.push({
    $schema: ingestionSchema('plan-listing'),
    product: productRef,
    plan: planRef,
    kind: isSaaS ? 'azureSaaS-plan' : undefined,
    languageId: 'en-us',
    name: az.planName || planExternalId,
    description: az.planDescription || payload.listing.shortDescription || undefined,
  });

  // 7. SaaS technical configuration
  if (isSaaS) {
    resources.push({
      $schema: ingestionSchema('software-as-a-service-technical-configuration'),
      product: productRef,
      landingPageUrl: az.saasLandingPageUrl,
      connectionWebhook: az.saasWebhookUrl,
      azureAdTenantId: az.saasAadTenantId,
      azureAdAppId: az.saasAadAppId,
    });
  }

  // 8. Price and availability (plan)
  const startingPrice = Number(payload.commercial.startingPrice);
  resources.push({
    $schema: ingestionSchema('price-and-availability-plan'),
    product: productRef,
    plan: planRef,
    visibility: 'visible',
    audience: 'public',
    privateAudiences: [],
    markets: ['in'],
    pricing:
      Number.isFinite(startingPrice) && startingPrice > 0
        ? {
          recurrentPrice: {
            recurrentPriceMode: 'flatRate',
            priceInputOption: 'usd',
            prices: [
              {
                billingTerm: { type: 'month', value: 1 },
                paymentOption: { type: 'month', value: 1 },
                pricePerPaymentInUsd: startingPrice,
              },
            ],
          },
        }
        : undefined,
    trial: payload.commercial.freeTrialAvailable ? { type: 'day', value: 30 } : null,
  });

  // 9. Reseller (CSP) channel
  resources.push({
    $schema: ingestionSchema('reseller'),
    product: productRef,
    resellerChannelState: az.cspOptIn ? 'inAll' : 'none',
    audiences: [],
  });

  // 9. Submission — only when explicitly publishing to preview.
  const publishTarget = (process.env.MS_PUBLISH_TARGET || 'draft').toLowerCase();
  if (publishTarget === 'preview') {
    resources.push({
      $schema: ingestionSchema('submission'),
      product: productRef,
      target: { targetType: 'preview' },
    });
  }

  // Strip undefined values so the payload is clean JSON.
  return JSON.parse(
    JSON.stringify({
      $schema: ingestionSchema('configure'),
      resources,
    })
  );
}

// ---------------------------------------------------------------------------
// Look up an existing Partner Center offer + its plans by external (offer) ID
// so buildConfigurePayload can update in place instead of re-creating (which
// conflicts). Returns null (create mode) if the offer doesn't exist or the
// lookup fails — the configure call will then surface any real error.
// ---------------------------------------------------------------------------
async function resolveExistingOffer(offerExternalId) {
  if (!offerExternalId) return null;
  try {
    const data = await msApi.getProductByExternalId(offerExternalId);
    const product = data?.value?.[0] || (data?.id ? data : null);
    if (!product?.id) return null;

    const planDurableIdByExternalId = {};
    try {
      const planData = await msApi.getPlans(product.id);
      for (const pl of planData?.value || []) {
        const ext = pl?.identity?.externalId;
        if (ext && pl.id) planDurableIdByExternalId[ext] = pl.id;
      }
    } catch { /* no plans yet — treat plan as create */ }

    return { productDurableId: product.id, planDurableIdByExternalId };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Validation: determine if a request is ready for submission
// Returns { valid: boolean, missing: string[] }
// ---------------------------------------------------------------------------
function validateForSubmission(azurePayload) {
  const az = azurePayload.azureSpecific || {};
  const required = [
    ['Product Name', azurePayload.listing?.title],
    ['Short Description', azurePayload.listing?.shortDescription],
    ['Long Description', azurePayload.listing?.longDescription],
    ['Privacy Policy URL', azurePayload.listing?.privacyPolicyUrl],
    ['Offer ID', az.offerId],
    ['Plan ID', az.planId],
    ['Plan Name', az.planName],
  ];

  // The Product Ingestion API has no consulting-service resource schema (it covers
  // SaaS, VM, container, private offers), and buildConfigurePayload() only builds
  // the SaaS tree. Fail early with a clear reason instead of a cryptic schema error.
  const offerType = az.offerType || azurePayload.offerType;
  if (offerType !== 'SaaS') {
    required.push([
      `Supported offer type (Microsoft's API cannot publish "${offerType}" offers - change Offer Type to SaaS, or publish this one manually in Partner Center)`,
      '',
    ]);
  }

  if (offerType === 'SaaS') {
    required.push(
      ['SaaS Landing Page URL', az.saasLandingPageUrl],
      ['SaaS Webhook URL', az.saasWebhookUrl],
      ['AAD Tenant ID', az.saasAadTenantId],
      ['AAD App ID', az.saasAadAppId],
    );
  }

  const missing = required.filter(([, v]) => !v).map(([label]) => label);
  return { valid: missing.length === 0, missing };
}

// ---------------------------------------------------------------------------
// SERVICE FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Create a new Azure Marketplace publishing request.
 * Caller: ISV or Admin.
 */
async function createRequest({ productId, requestedByUserId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Load product (including ISV user id)
    const productResult = await client.query(
      `SELECT p.*, pod.overview, u.id AS isv_id FROM products p
       LEFT JOIN product_other_details pod ON pod.product_id = p.id
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.id = $1 AND p.deleted_at IS NULL`,
      [productId]
    );

    if (productResult.rows.length === 0) {
      throw Object.assign(new Error('Product not found.'), { status: 404 });
    }

    const product = productResult.rows[0];
    // For ISV-owned products, user_id is the ISV. For NeoZaar's own products it may be
    // an admin ID or null — fall back to the requesting user so the NOT NULL-free column
    // still has a meaningful value for display in the admin dashboard.
    const isvUserId = product.user_id || requestedByUserId;

    // 2. Check for existing active request
    const existingResult = await client.query(
      `SELECT id, status FROM azure_marketplace_requests
       WHERE product_id = $1
         AND status IN ('PENDING_REVIEW', 'APPROVED', 'SUBMITTED', 'VALIDATING')
       LIMIT 1`,
      [productId]
    );

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      throw Object.assign(
        new Error(`An active Azure Marketplace request already exists for this product (status: ${existing.status}, id: ${existing.id}).`),
        { status: 409, existingRequestId: existing.id }
      );
    }

    // 3. Build payload
    const publisherId = process.env.AZURE_PUBLISHER_ID || '';
    const azurePayload = buildAzurePayload(product, publisherId);

    // 4. Insert request
    const insertResult = await client.query(
      `INSERT INTO azure_marketplace_requests
         (marketplace_type, product_id, isv_user_id, requested_by_user_id, status, azure_payload)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      ['azure', productId, isvUserId, requestedByUserId, 'PENDING_REVIEW', JSON.stringify(azurePayload)]
    );

    const request = insertResult.rows[0];

    // 5. Write audit
    await writeAudit(client, {
      requestId: request.id,
      userId: requestedByUserId,
      action: 'REQUEST_CREATED',
      newStatus: 'PENDING_REVIEW',
      msResponse: null,
      errorInfo: null,
    });

    await client.query('COMMIT');
    return request;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get paginated list of requests (admin view).
 */
async function listRequests({ status, search, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const conditions = ['r.marketplace_type = $1'];
  const params = ['azure'];
  let idx = 2;

  if (status && status !== 'ALL') {
    conditions.push(`r.status = $${idx++}`);
    params.push(status);
  }

  if (search) {
    const s = `%${search}%`;
    conditions.push(`(
      LOWER(p.name) LIKE LOWER($${idx}) OR
      LOWER(u.name) LIKE LOWER($${idx}) OR
      CAST(r.product_id AS TEXT) LIKE $${idx} OR
      CAST(r.id AS TEXT) LIKE $${idx}
    )`);
    params.push(s);
    idx++;
  }

  const where = conditions.join(' AND ');

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM azure_marketplace_requests r
     LEFT JOIN products p ON p.id = r.product_id
     LEFT JOIN users u ON u.id = r.isv_user_id
     WHERE ${where}`,
    params
  );

  const dataResult = await pool.query(
    `SELECT
       r.id, r.marketplace_type, r.product_id, r.isv_user_id, r.requested_by_user_id,
       r.reviewed_by_user_id, r.status, r.rejection_reason,
       r.ms_offer_id, r.ms_product_id, r.ms_job_id,
       r.submitted_at, r.validated_at, r.published_at, r.failed_at,
       r.created_at, r.updated_at,
       p.name AS product_name, p.product_logo,
       u.name AS isv_name,
       rb.name AS requested_by_name,
       rv.name AS reviewed_by_name
     FROM azure_marketplace_requests r
     LEFT JOIN products p ON p.id = r.product_id
     LEFT JOIN product_other_details pod ON pod.product_id = p.id
     LEFT JOIN users u ON u.id = r.isv_user_id
     LEFT JOIN users rb ON rb.id = r.requested_by_user_id
     LEFT JOIN users rv ON rv.id = r.reviewed_by_user_id
     WHERE ${where}
     ORDER BY r.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );

  return {
    data: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
    page,
    limit,
    total_pages: Math.ceil(parseInt(countResult.rows[0].count, 10) / limit),
  };
}

/**
 * Get a single request by ID with full audit history, product data.
 */
async function getRequestById(requestId) {
  const reqResult = await pool.query(
    `SELECT
       r.*,
       p.name AS product_name, p.short_description, p.long_description, pod.overview,
       p.product_logo, p.screenshots, p.pricing_model, p.license_model,
       p.billing_dimension, p.free_trial_available, p.starting_price,
       p.regions_supported, p.cloud_provider_support, p.category, p.subcategory,
       p.privacy_policy_url, p.terms_of_use_url, p.compliance_certifications,
       p.key_features, p.primary_use_cases, p.target_audience, p.industry,
       p.api_metering_endpoint, p.accept_marketplace_terms,
       p.consent_data_privacy_policy, p.type AS product_type,
       p.sku_id, p.brand_name, p.demo_video_link,
       u.name AS isv_name, u.email AS isv_email,
       rb.name AS requested_by_name,
       rv.name AS reviewed_by_name
     FROM azure_marketplace_requests r
     LEFT JOIN products p ON p.id = r.product_id
     LEFT JOIN product_other_details pod ON pod.product_id = p.id
     LEFT JOIN users u ON u.id = r.isv_user_id
     LEFT JOIN users rb ON rb.id = r.requested_by_user_id
     LEFT JOIN users rv ON rv.id = r.reviewed_by_user_id
     WHERE r.id = $1`,
    [requestId]
  );

  if (reqResult.rows.length === 0) {
    throw Object.assign(new Error('Request not found.'), { status: 404 });
  }

  const request = reqResult.rows[0];
  request.short_description = htmlToText(request.short_description);
  request.long_description = htmlToText(request.long_description || request.overview);

  // Audit history
  const auditResult = await pool.query(
    `SELECT a.*, u.name AS actor_name
     FROM azure_marketplace_audit a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.request_id = $1
     ORDER BY a.created_at ASC`,
    [requestId]
  );

  request.audit = auditResult.rows;

  // Parse JSON fields
  if (request.azure_payload && typeof request.azure_payload === 'string') {
    try { request.azure_payload = JSON.parse(request.azure_payload); } catch { /* ignore */ }
  }

  return request;
}

/**
 * Reject a request. Admin only.
 */
async function rejectRequest({ requestId, rejectedByUserId, rejectionReason }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id, status FROM azure_marketplace_requests WHERE id = $1 FOR UPDATE',
      [requestId]
    );

    if (existing.rows.length === 0) throw Object.assign(new Error('Request not found.'), { status: 404 });

    const prev = existing.rows[0].status;
    if (!['PENDING_REVIEW', 'FAILED'].includes(prev)) {
      throw Object.assign(new Error(`Cannot reject a request with status ${prev}.`), { status: 400 });
    }

    await client.query(
      `UPDATE azure_marketplace_requests
       SET status = 'REJECTED', rejection_reason = $1, reviewed_by_user_id = $2
       WHERE id = $3`,
      [rejectionReason || null, rejectedByUserId, requestId]
    );

    await writeAudit(client, {
      requestId,
      userId: rejectedByUserId,
      action: 'REJECTED',
      previousStatus: prev,
      newStatus: 'REJECTED',
    });

    await client.query('COMMIT');
    return { id: requestId, status: 'REJECTED' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Approve and submit a request to Azure Marketplace. Admin only.
 * Performs validation first; if valid, calls MS API.
 */
async function approveAndSubmit({ requestId, approvedByUserId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT p.*, pod.overview,
              r.status,
              r.product_id,
              r.marketplace_type,
              r.isv_user_id,
              r.requested_by_user_id,
              r.reviewed_by_user_id,
              r.ms_offer_id,
              r.ms_product_id,
              r.ms_job_id,
              r.azure_payload
       FROM azure_marketplace_requests r
       LEFT JOIN products p ON p.id = r.product_id
       LEFT JOIN product_other_details pod ON pod.product_id = p.id
       WHERE r.id = $1
       FOR UPDATE OF r`,
      [requestId]
    );

    if (existing.rows.length === 0) throw Object.assign(new Error('Request not found.'), { status: 404 });

    const row = existing.rows[0];

    if (!['PENDING_REVIEW', 'FAILED'].includes(row.status)) {
      throw Object.assign(new Error(`Cannot approve a request with status ${row.status}.`), { status: 400 });
    }

    // Rebuild payload from current product data, keeping the admin-entered
    // Azure-specific config (Offer ID, Plan, SaaS technical config, contacts).
    const publisherId = process.env.AZURE_PUBLISHER_ID || '';
    const savedPayload =
      typeof row.azure_payload === 'string'
        ? safeJsonParse(row.azure_payload)
        : row.azure_payload || {};
    const savedAzureSpecific = {
      ...(savedPayload.azureSpecific || {}),
      // offerType is stored at the payload top level by saveAzureConfig()
      offerType: savedPayload.offerType || savedPayload.azureSpecific?.offerType || 'SaaS',
    };
    const azurePayload = buildAzurePayload(row, publisherId, savedAzureSpecific);

    // Validate required fields
    const { valid, missing } = validateForSubmission(azurePayload);
    if (!valid) {
      throw Object.assign(
        new Error(`Missing required fields for Azure submission: ${missing.join(', ')}`),
        { status: 422, missingFields: missing }
      );
    }

    if (!msApi.credentialsConfigured()) {
      throw Object.assign(
        new Error('Azure credentials are not configured on the server. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_PUBLISHER_ID.'),
        { status: 503 }
      );
    }

    // Build the Microsoft Product Ingestion resource tree from the summary payload.
    const existingOffer = await resolveExistingOffer(azurePayload.azureSpecific?.offerId);
    const configurePayload = buildConfigurePayload(azurePayload, existingOffer);

    // Mark APPROVED
    await client.query(
      `UPDATE azure_marketplace_requests
       SET status = 'APPROVED', reviewed_by_user_id = $1, azure_payload = $2
       WHERE id = $3`,
      [approvedByUserId, JSON.stringify(azurePayload), requestId]
    );

    await writeAudit(client, {
      requestId,
      userId: approvedByUserId,
      action: 'APPROVED',
      previousStatus: row.status,
      newStatus: 'APPROVED',
    });

    // Submit to MS
    let msResponse;
    let msJobId = null;
    try {
      msResponse = await msApi.submitConfiguration(configurePayload);
      msJobId = msResponse?.jobId || msResponse?.id || null;
    } catch (msErr) {
      // Record the MS error and mark FAILED
      const errorInfo = {
        message: msErr.message,
        msRequest: msErr.msRequest || null,
        msResponse: msErr.msResponse ?? msErr.response?.data ?? null,
        statusCode: msErr.status ?? msErr.response?.status ?? null,
      };

      await client.query(
        `UPDATE azure_marketplace_requests
         SET status = 'FAILED', failed_at = NOW(), ms_response = $1
         WHERE id = $2`,
        [JSON.stringify(errorInfo), requestId]
      );

      await writeAudit(client, {
        requestId,
        userId: approvedByUserId,
        action: 'FAILED',
        previousStatus: 'APPROVED',
        newStatus: 'FAILED',
        errorInfo,
      });

      await client.query('COMMIT');
      throw Object.assign(
        new Error(`Azure submission failed: ${msErr.message}`),
        { status: 502, msError: errorInfo }
      );
    }

    // Mark SUBMITTED
    await client.query(
      `UPDATE azure_marketplace_requests
       SET status = 'SUBMITTED', submitted_at = NOW(), ms_job_id = $1, ms_response = $2
       WHERE id = $3`,
      [msJobId, JSON.stringify(msResponse), requestId]
    );

    await writeAudit(client, {
      requestId,
      userId: approvedByUserId,
      action: 'SUBMITTED',
      previousStatus: 'APPROVED',
      newStatus: 'SUBMITTED',
      msResponse,
    });

    await client.query('COMMIT');
    return { id: requestId, status: 'SUBMITTED', msJobId, msResponse };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Poll MS job status and update our record.
 * Frontend polls this endpoint periodically.
 */
async function pollJobStatus({ requestId, callerUserId }) {
  const reqResult = await pool.query(
    'SELECT id, status, ms_job_id FROM azure_marketplace_requests WHERE id = $1',
    [requestId]
  );

  if (reqResult.rows.length === 0) throw Object.assign(new Error('Request not found.'), { status: 404 });

  const request = reqResult.rows[0];

  if (!['SUBMITTED', 'VALIDATING'].includes(request.status)) {
    return { id: requestId, status: request.status, polled: false };
  }

  if (!request.ms_job_id) {
    return { id: requestId, status: request.status, polled: false, message: 'No MS job ID on record.' };
  }

  if (!msApi.credentialsConfigured()) {
    throw Object.assign(new Error('Azure credentials not configured.'), { status: 503 });
  }

  const jobData = await msApi.getJobStatus(request.ms_job_id);
  // Product Ingestion API: GET /configure/{jobId}/status returns
  //   jobStatus: 'notStarted' | 'running' | 'completed'
  //   jobResult: 'pending'    | 'succeeded' | 'failed'
  // Fall back to a flat `status` field for mock/sandbox servers.
  const jobStatus = (jobData.jobStatus || jobData.status || '').toLowerCase();
  const jobResult = (jobData.jobResult || '').toLowerCase();

  let newStatus = request.status;
  let action = 'POLLED';

  if (jobStatus === 'completed') {
    if (jobResult === 'failed' || jobResult === 'error') {
      newStatus = 'FAILED';
      action = 'FAILED';
    } else {
      newStatus = 'PUBLISHED';
      action = 'PUBLISHED';
    }
  } else if (jobResult === 'succeeded') {
    newStatus = 'PUBLISHED';
    action = 'PUBLISHED';
  } else if (jobResult === 'failed' || jobResult === 'error') {
    newStatus = 'FAILED';
    action = 'FAILED';
  } else if (jobStatus === 'running' || jobStatus === 'notstarted' || jobStatus === 'inprogress') {
    newStatus = 'VALIDATING';
    action = 'VALIDATED';
  }

  if (newStatus !== request.status || action === 'POLLED') {
    const updateFields = [`status = '${newStatus}'`, 'ms_response = $1'];
    const updateParams = [JSON.stringify(jobData), requestId];

    if (newStatus === 'PUBLISHED') updateFields.push('published_at = NOW()');
    if (newStatus === 'FAILED') updateFields.push('failed_at = NOW()');
    if (newStatus === 'VALIDATING') updateFields.push('validated_at = NOW()');

    await pool.query(
      `UPDATE azure_marketplace_requests SET ${updateFields.join(', ')}, updated_at = NOW()
       WHERE id = $${updateParams.length}`,
      updateParams
    );

    const auditClient = await pool.connect();
    try {
      await writeAudit(auditClient, {
        requestId,
        userId: callerUserId,
        action,
        previousStatus: request.status,
        newStatus,
        msResponse: jobData,
        errorInfo: newStatus === 'FAILED' ? { jobData } : null,
      });
    } finally {
      auditClient.release();
    }
  }

  return { id: requestId, status: newStatus, msJobStatus: jobStatus, msJobResult: jobResult, jobData };
}

/**
 * Retry a FAILED request. Re-submits to MS without creating a new request.
 */
async function retryRequest({ requestId, retriedByUserId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT p.*, pod.overview,
              r.status,
              r.product_id,
              r.marketplace_type,
              r.isv_user_id,
              r.requested_by_user_id,
              r.reviewed_by_user_id,
              r.ms_offer_id,
              r.ms_product_id,
              r.ms_job_id,
              r.azure_payload
       FROM azure_marketplace_requests r
       LEFT JOIN products p ON p.id = r.product_id
       LEFT JOIN product_other_details pod ON pod.product_id = p.id
       WHERE r.id = $1
       FOR UPDATE OF r`,
      [requestId]
    );

    if (existing.rows.length === 0) throw Object.assign(new Error('Request not found.'), { status: 404 });

    const row = existing.rows[0];
    if (row.status !== 'FAILED') {
      throw Object.assign(new Error(`Can only retry FAILED requests. Current status: ${row.status}`), { status: 400 });
    }

    if (!msApi.credentialsConfigured()) {
      throw Object.assign(new Error('Azure credentials not configured.'), { status: 503 });
    }

    const publisherId = process.env.AZURE_PUBLISHER_ID || '';
    const savedPayload =
      typeof row.azure_payload === 'string'
        ? safeJsonParse(row.azure_payload)
        : row.azure_payload || {};
    const savedAzureSpecific = {
      ...(savedPayload.azureSpecific || {}),
      // offerType is stored at the payload top level by saveAzureConfig()
      offerType: savedPayload.offerType || savedPayload.azureSpecific?.offerType || 'SaaS',
    };
    const azurePayload = buildAzurePayload(row, publisherId, savedAzureSpecific);

    // Re-validate — config may have changed since the request first failed.
    const { valid, missing } = validateForSubmission(azurePayload);
    if (!valid) {
      throw Object.assign(
        new Error(`Missing required fields for Azure submission: ${missing.join(', ')}`),
        { status: 422, missingFields: missing }
      );
    }

    const existingOffer = await resolveExistingOffer(azurePayload.azureSpecific?.offerId);
    const configurePayload = buildConfigurePayload(azurePayload, existingOffer);

    await writeAudit(client, {
      requestId,
      userId: retriedByUserId,
      action: 'RETRIED',
      previousStatus: 'FAILED',
      newStatus: 'APPROVED',
    });

    await client.query(
      `UPDATE azure_marketplace_requests
       SET status = 'APPROVED', azure_payload = $1
       WHERE id = $2`,
      [JSON.stringify(azurePayload), requestId]
    );

    let msResponse;
    let msJobId = null;
    try {
      msResponse = await msApi.submitConfiguration(configurePayload);
      msJobId = msResponse?.jobId || msResponse?.id || null;
    } catch (msErr) {
      const errorInfo = {
        message: msErr.message,
        msRequest: msErr.msRequest || null,
        msResponse: msErr.msResponse ?? msErr.response?.data ?? null,
        statusCode: msErr.status ?? msErr.response?.status ?? null,
      };

      await client.query(
        `UPDATE azure_marketplace_requests
         SET status = 'FAILED', failed_at = NOW(), ms_response = $1
         WHERE id = $2`,
        [JSON.stringify(errorInfo), requestId]
      );

      await writeAudit(client, {
        requestId,
        userId: retriedByUserId,
        action: 'FAILED',
        previousStatus: 'APPROVED',
        newStatus: 'FAILED',
        errorInfo,
      });

      await client.query('COMMIT');
      throw Object.assign(new Error(`Retry failed: ${msErr.message}`), { status: 502, msError: errorInfo });
    }

    await client.query(
      `UPDATE azure_marketplace_requests
       SET status = 'SUBMITTED', submitted_at = NOW(), ms_job_id = $1, ms_response = $2, failed_at = NULL
       WHERE id = $3`,
      [msJobId, JSON.stringify(msResponse), requestId]
    );

    await writeAudit(client, {
      requestId,
      userId: retriedByUserId,
      action: 'SUBMITTED',
      previousStatus: 'APPROVED',
      newStatus: 'SUBMITTED',
      msResponse,
    });

    await client.query('COMMIT');
    return { id: requestId, status: 'SUBMITTED', msJobId, msResponse };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Update Listing — re-push current NeoZaar product data + saved Azure config to an
 * already-PUBLISHED offer. The Product Ingestion API is idempotent by externalId,
 * so re-submitting the configure resource tree updates the existing offer.
 * Admin only. Allowed only from PUBLISHED.
 */
async function updateListing({ requestId, adminUserId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT p.*, pod.overview,
              r.status,
              r.product_id,
              r.marketplace_type,
              r.isv_user_id,
              r.requested_by_user_id,
              r.reviewed_by_user_id,
              r.ms_offer_id,
              r.ms_product_id,
              r.ms_job_id,
              r.azure_payload
       FROM azure_marketplace_requests r
       LEFT JOIN products p ON p.id = r.product_id
       LEFT JOIN product_other_details pod ON pod.product_id = p.id
       WHERE r.id = $1
       FOR UPDATE OF r`,
      [requestId]
    );

    if (existing.rows.length === 0) throw Object.assign(new Error('Request not found.'), { status: 404 });

    const row = existing.rows[0];

    if (row.status !== 'PUBLISHED') {
      throw Object.assign(
        new Error(`Update Listing is only available once the request is PUBLISHED (current: ${row.status}).`),
        { status: 400 }
      );
    }

    if (!msApi.credentialsConfigured()) {
      throw Object.assign(
        new Error('Azure credentials are not configured on the server.'),
        { status: 503 }
      );
    }

    const publisherId = process.env.AZURE_PUBLISHER_ID || '';
    const savedPayload =
      typeof row.azure_payload === 'string' ? safeJsonParse(row.azure_payload) : row.azure_payload || {};
    const savedAzureSpecific = {
      ...(savedPayload.azureSpecific || {}),
      offerType: savedPayload.offerType || savedPayload.azureSpecific?.offerType || 'SaaS',
    };
    const azurePayload = buildAzurePayload(row, publisherId, savedAzureSpecific);

    const { valid, missing } = validateForSubmission(azurePayload);
    if (!valid) {
      throw Object.assign(
        new Error(`Missing required fields for the listing update: ${missing.join(', ')}`),
        { status: 422, missingFields: missing }
      );
    }

    const existingOffer = await resolveExistingOffer(azurePayload.azureSpecific?.offerId);
    const configurePayload = buildConfigurePayload(azurePayload, existingOffer);

    await writeAudit(client, {
      requestId,
      userId: adminUserId,
      action: 'LISTING_UPDATE_REQUESTED',
      previousStatus: 'PUBLISHED',
      newStatus: 'PUBLISHED',
    });

    let msResponse;
    let msJobId = null;
    try {
      msResponse = await msApi.submitConfiguration(configurePayload);
      msJobId = msResponse?.jobId || msResponse?.id || null;
    } catch (msErr) {
      const errorInfo = {
        message: msErr.message,
        msRequest: msErr.msRequest || null,
        msResponse: msErr.msResponse ?? msErr.response?.data ?? null,
        statusCode: msErr.status ?? msErr.response?.status ?? null,
      };
      await client.query(
        `UPDATE azure_marketplace_requests
         SET status = 'FAILED', failed_at = NOW(), ms_response = $1
         WHERE id = $2`,
        [JSON.stringify(errorInfo), requestId]
      );
      await writeAudit(client, {
        requestId,
        userId: adminUserId,
        action: 'FAILED',
        previousStatus: 'PUBLISHED',
        newStatus: 'FAILED',
        errorInfo,
      });
      await client.query('COMMIT');
      throw Object.assign(
        new Error(`Listing update failed: ${msErr.message}`),
        { status: 502, msError: errorInfo }
      );
    }

    await client.query(
      `UPDATE azure_marketplace_requests
       SET status = 'SUBMITTED', ms_job_id = $1, ms_response = $2, azure_payload = $3
       WHERE id = $4`,
      [msJobId, JSON.stringify(msResponse), JSON.stringify(azurePayload), requestId]
    );

    await writeAudit(client, {
      requestId,
      userId: adminUserId,
      action: 'SUBMITTED',
      previousStatus: 'PUBLISHED',
      newStatus: 'SUBMITTED',
      msResponse,
    });

    await client.query('COMMIT');
    return { id: requestId, status: 'SUBMITTED', msJobId, msResponse };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Save/update the Azure-specific config fields filled in by the admin on the review page.
 * Merges into azure_payload.azureSpecific — does NOT submit to Microsoft.
 * Allowed on any non-terminal status (PENDING_REVIEW, APPROVED, FAILED, REJECTED).
 */
async function saveAzureConfig({ requestId, config }) {
  // Load the current request
  const existing = await pool.query(
    'SELECT id, status, azure_payload FROM azure_marketplace_requests WHERE id = $1',
    [requestId]
  );
  if (existing.rows.length === 0) throw Object.assign(new Error('Request not found.'), { status: 404 });

  const row = existing.rows[0];
  // Editable except while a submission is in flight. PUBLISHED requests stay
  // editable so an admin can revise and re-push via updateListing().
  if (['SUBMITTED', 'VALIDATING'].includes(row.status)) {
    throw Object.assign(
      new Error(`Cannot edit config while request is ${row.status}.`),
      { status: 400 }
    );
  }

  // Deep-merge: keep existing azure_payload, overwrite azureSpecific with the new values
  const currentPayload = row.azure_payload || {};
  const updatedPayload = {
    ...currentPayload,
    azureSpecific: {
      ...(currentPayload.azureSpecific || {}),
      // Offer-level
      offerId:            config.offerId            ?? currentPayload.azureSpecific?.offerId            ?? null,
      offerType:          config.offerType          ?? currentPayload.offerType                        ?? 'SaaS',
      planId:             config.planId             ?? currentPayload.azureSpecific?.planId             ?? null,
      planName:           config.planName           ?? currentPayload.azureSpecific?.planName           ?? null,
      planDescription:    config.planDescription    ?? currentPayload.azureSpecific?.planDescription    ?? null,
      // SaaS technical config
      saasLandingPageUrl: config.saasLandingPageUrl ?? currentPayload.azureSpecific?.saasLandingPageUrl ?? null,
      saasWebhookUrl:     config.saasWebhookUrl     ?? currentPayload.azureSpecific?.saasWebhookUrl     ?? null,
      saasAadTenantId:    config.saasAadTenantId    ?? currentPayload.azureSpecific?.saasAadTenantId    ?? null,
      saasAadAppId:       config.saasAadAppId       ?? currentPayload.azureSpecific?.saasAadAppId       ?? null,
      // Contacts
      supportContactName:  config.supportContactName  ?? currentPayload.azureSpecific?.supportContactName  ?? null,
      supportContactEmail: config.supportContactEmail ?? currentPayload.azureSpecific?.supportContactEmail ?? null,
      supportContactPhone: config.supportContactPhone ?? currentPayload.azureSpecific?.supportContactPhone ?? null,
      engineeringContactName:  config.engineeringContactName  ?? currentPayload.azureSpecific?.engineeringContactName  ?? null,
      engineeringContactEmail: config.engineeringContactEmail ?? currentPayload.azureSpecific?.engineeringContactEmail ?? null,
      // Business options
      cspOptIn:       config.cspOptIn       ?? currentPayload.azureSpecific?.cspOptIn       ?? false,
      previewAudience: config.previewAudience ?? currentPayload.azureSpecific?.previewAudience ?? [],
      // Also allow overriding offer-level type at top
    },
    // Allow admin to set/override offer type at top level too
    offerType: config.offerType ?? currentPayload.offerType ?? 'SaaS',
  };

  await pool.query(
    'UPDATE azure_marketplace_requests SET azure_payload = $1 WHERE id = $2',
    [JSON.stringify(updatedPayload), requestId]
  );

  return updatedPayload;
}

/**
 * Update the NeoZaar product fields the Azure listing is built from, so an admin
 * can fix missing data (e.g. Privacy Policy URL) straight from the review page.
 * Writes to the product itself (not just the request) so every channel benefits.
 */
const EDITABLE_PRODUCT_FIELDS = ['privacy_policy_url', 'terms_of_use_url', 'short_description', 'long_description'];

async function updateProductFields({ requestId, fields }) {
  const existing = await pool.query(
    `SELECT r.status, r.product_id, p.action_type
     FROM azure_marketplace_requests r
     LEFT JOIN products p ON p.id = r.product_id
     WHERE r.id = $1`,
    [requestId]
  );
  if (existing.rows.length === 0) throw Object.assign(new Error('Request not found.'), { status: 404 });
  const { status, product_id: productId, action_type: actionType } = existing.rows[0];
  if (['SUBMITTED', 'VALIDATING'].includes(status)) {
    throw Object.assign(new Error(`Cannot edit product data while request is ${status}.`), { status: 400 });
  }

  const updates = {};
  for (const key of EDITABLE_PRODUCT_FIELDS) {
    if (fields[key] === undefined) continue;
    const value = String(fields[key] ?? '').trim();
    if (key.endsWith('_url') && value && !/^https?:\/\/\S+$/i.test(value)) {
      throw Object.assign(new Error(`${key.replace(/_/g, ' ')} must be a valid http(s) URL.`), { status: 400 });
    }
    updates[key] = value;
  }
  if (Object.keys(updates).length === 0) {
    throw Object.assign(new Error('No editable fields supplied.'), { status: 400 });
  }
  if ('long_description' in updates && !updates.long_description) {
    throw Object.assign(new Error('Long description cannot be empty.'), { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Services keep their long text as "Overview" in product_other_details.
    const isService = String(actionType || '').toLowerCase() === 'service';
    if (isService && 'long_description' in updates) {
      const upd = await client.query(
        'UPDATE product_other_details SET overview = $1 WHERE product_id = $2',
        [updates.long_description, productId]
      );
      if (upd.rowCount === 0) {
        await client.query('INSERT INTO product_other_details (product_id, overview) VALUES ($1, $2)', [productId, updates.long_description]);
      }
      delete updates.long_description;
    }
    const keys = Object.keys(updates);
    if (keys.length) {
      const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      await client.query(`UPDATE products SET ${sets} WHERE id = $${keys.length + 1}`, [...keys.map((k) => updates[k]), productId]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return getRequestById(requestId);
}

/**
 * Check if a product already has an active request, and return its status.
 */
async function getProductRequestStatus(productId) {
  const result = await pool.query(
    `SELECT id, status FROM azure_marketplace_requests
     WHERE product_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [productId]
  );

  return result.rows[0] || null;
}

module.exports = {
  createRequest,
  listRequests,
  getRequestById,
  rejectRequest,
  approveAndSubmit,
  pollJobStatus,
  retryRequest,
  updateListing,
  saveAzureConfig,
  updateProductFields,
  getProductRequestStatus,
  buildAzurePayload,
  buildConfigurePayload,
  validateForSubmission,
};
