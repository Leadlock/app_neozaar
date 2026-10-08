/**
 * AWS Marketplace business logic service.
 * Handles request lifecycle, data transformation, Catalog API orchestration, and audit logging.
 *
 * Mirrors azure.marketplace.service.js. The public workflow states are identical
 * (PENDING_REVIEW | APPROVED | SUBMITTED | VALIDATING | PUBLISHED | FAILED | REJECTED).
 * AWS submits work as asynchronous "change sets"; a single NeoZaar request drives a
 * short sequence of them:
 *
 *   step "create" : CreateProduct                       -> yields an EntityId
 *   step "update" : UpdateInformation + delivery + dims  (targets that EntityId)
 *   step "offer"  : pricing / legal / support / release  (only when publishing Public)
 *
 * The current step is tracked in aws_payload._provisioning.step. pollJobStatus()
 * advances it: each SUCCEEDED change set either fires the next step or, when the
 * sequence is done, marks the request PUBLISHED.
 */

const pool = require('../../config/database');
const catalogApi = require('./aws.catalog.api.service');
const { sanitizeDeep, htmlToText } = require('./aws.text.sanitize');

const PUBLISH_TARGET = (process.env.AWS_MP_PUBLISH_TARGET || 'limited').toLowerCase();

// Admin-facing product type -> Catalog API entity type. SaaS only for v1.
const PRODUCT_TYPE_TO_ENTITY_TYPE = {
  SaaSProduct: 'SaaSProduct@1.0',
  AmiProduct: 'AmiProduct@1.0',
  ContainerProduct: 'ContainerProduct@1.0',
  // Consulting / professional-service listings. NeoZaar "services" (catalog
  // action_type = 'service') default to this so they are listed as services only.
  ProfessionalServicesProduct: 'ProfessionalServicesProduct@1.0',
};

// NeoZaar catalog action_type -> default AWS product type. A "service" is listed
// as a professional-services product; everything else defaults to SaaS.
function defaultProductTypeForCatalog(product) {
  return String(product?.action_type || '').toLowerCase() === 'service'
    ? 'ProfessionalServicesProduct'
    : 'SaaSProduct';
}

// Parse a JSON string, returning {} on failure. aws_payload is JSONB (already an
// object from pg) but may arrive as text via some drivers.
function safeJsonParse(value) {
  try {
    return JSON.parse(value) || {};
  } catch {
    return {};
  }
}

// Drop undefined values + strip AWS-forbidden control chars so change-set
// DetailsDocuments serialise cleanly and pass validation.
function finalizeChanges(changes) {
  return sanitizeDeep(JSON.parse(JSON.stringify(changes)));
}

// DescribeChangeSet returns entity identifiers with a version suffix
// (e.g. "prod-abc123@1"). StartChangeSet and the ListChangeSets EntityId filter
// want the bare product id, so strip the "@<version>" everywhere we persist/use it.
function bareEntityId(id) {
  return id ? String(id).split('@')[0] : id;
}

// ---------------------------------------------------------------------------
// Helper: write an audit log entry inside an optional existing transaction client
// ---------------------------------------------------------------------------
async function writeAudit(client, { requestId, userId, action, previousStatus, newStatus, awsResponse, errorInfo }) {
  const sql = `
    INSERT INTO aws_marketplace_audit
      (request_id, user_id, action, previous_status, new_status, aws_response, error_info)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;
  await client.query(sql, [
    requestId,
    userId || null,
    action,
    previousStatus || null,
    newStatus || null,
    awsResponse ? JSON.stringify(awsResponse) : null,
    errorInfo ? JSON.stringify(errorInfo) : null,
  ]);
}

// ---------------------------------------------------------------------------
// Helper: build the internal AWS Marketplace summary payload from NeoZaar product
// data plus the admin-entered AWS-specific config. Missing fields are flagged,
// never invented. Stored in aws_marketplace_requests.aws_payload and rendered on
// the review screen; buildChangeSet() turns it into Catalog API change sets.
// ---------------------------------------------------------------------------
function buildAwsPayload(product, sellerId, awsSpecific = {}) {
  const missingFields = [];

  const check = (label, value) => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      missingFields.push(label);
      return null;
    }
    return value;
  };

  // "service" catalog items are published as professional-service listings only.
  const listingKind =
    String(product?.action_type || '').toLowerCase() === 'service' ? 'service' : 'product';
  const productType = awsSpecific.productType || defaultProductTypeForCatalog(product);

  // Highlights / keywords / categories: prefer admin-entered, fall back to product data.
  const highlights = (awsSpecific.highlights && awsSpecific.highlights.length
    ? awsSpecific.highlights
    : product.key_features || []
  ).slice(0, 3);

  const searchKeywords = (awsSpecific.searchKeywords && awsSpecific.searchKeywords.length
    ? awsSpecific.searchKeywords
    : [...(product.category || []), ...(product.industry || [])]
  ).slice(0, 10);

  const payload = {
    sellerId: sellerId || process.env.AWS_MP_SELLER_ID || null,
    productType,
    // Whether the underlying NeoZaar catalog item is a product or a service.
    // Services are always listed as services (professional-services products).
    listingKind,
    neozaarProductId: product.id,

    // Listing info (Catalog API "Description" + "PromotionalResources")
    listing: {
      title: check('Product Title', product.name),
      shortDescription: check('Short Description', htmlToText(product.short_description)),
      longDescription: check('Long Description', htmlToText(product.long_description || product.overview)),
      sku: product.sku_id || null,
      logoUrl: awsSpecific.logoUrl || product.product_logo || null,
      highlights,
      searchKeywords,
      // AWS category taxonomy is fixed; NeoZaar categories don't map. Admin must pick.
      categories: awsSpecific.categories || [],
      videos: product.demo_video_link ? [product.demo_video_link] : [],
      additionalResources: awsSpecific.additionalResources || [],
    },

    // Support information
    support: {
      description: awsSpecific.supportDescription || null,
      resources: awsSpecific.supportResources || [],
    },

    // SaaS delivery — the fulfillment URL AWS redirects buyers to post-purchase.
    delivery: {
      fulfillmentUrl: awsSpecific.fulfillmentUrl || null,
    },

    // Usage dimensions (metered). Default to a single free dimension so a listing
    // can be created; real pricing is set on the offer before going Public.
    dimensions:
      awsSpecific.dimensions && awsSpecific.dimensions.length
        ? awsSpecific.dimensions
        : [
          {
            name: 'Free (default)',
            description: 'Free usage dimension',
            key: 'free_usage_default',
            unit: 'Units',
            types: ['ExternallyMetered'],
          },
        ],

    // Offer terms (only exercised when PUBLISH_TARGET === 'public')
    pricing: {
      model: awsSpecific.pricingModel || 'usage', // 'usage' | 'contract'
      currencyCode: awsSpecific.currencyCode || 'USD',
      rateCards: awsSpecific.rateCards || null,
      freeTrial: awsSpecific.freeTrial ?? (product.free_trial_available ?? false),
    },
    legal: {
      eulaType: awsSpecific.eulaType || 'StandardEula', // 'StandardEula' | 'CustomEula'
      eulaUrl: awsSpecific.eulaUrl || product.terms_of_use_url || null,
    },
    supportTerms: {
      refundPolicy: awsSpecific.refundPolicy || 'NA',
    },

    visibilityTarget: PUBLISH_TARGET === 'public' ? 'Public' : 'Restricted',

    // Admin-entered overrides, stored verbatim so edits are non-destructive.
    awsSpecific: {
      productType,
      logoUrl: awsSpecific.logoUrl || null,
      fulfillmentUrl: awsSpecific.fulfillmentUrl || null,
      supportDescription: awsSpecific.supportDescription || null,
      categories: awsSpecific.categories || [],
      highlights: awsSpecific.highlights || [],
      searchKeywords: awsSpecific.searchKeywords || [],
      dimensions: awsSpecific.dimensions || [],
      pricingModel: awsSpecific.pricingModel || 'usage',
      currencyCode: awsSpecific.currencyCode || 'USD',
      rateCards: awsSpecific.rateCards || [],
      freeTrial: awsSpecific.freeTrial ?? false,
      eulaType: awsSpecific.eulaType || 'StandardEula',
      eulaUrl: awsSpecific.eulaUrl || null,
      refundPolicy: awsSpecific.refundPolicy || 'NA',
    },

    // Provisioning progress across the change-set sequence.
    _provisioning: awsSpecific._provisioning || { step: null, offerId: null },

    _missingFields: missingFields,
    _warnings: [],
  };

  if (!payload.listing.logoUrl) payload._warnings.push('No logo URL — required for the AWS Marketplace listing (public HTTPS PNG, 120–640px).');
  if (productType !== 'ProfessionalServicesProduct' && !payload.delivery.fulfillmentUrl) payload._warnings.push('No SaaS fulfillment URL — required. Must implement ResolveCustomer.');
  if (payload.listing.categories.length === 0) payload._warnings.push('No AWS categories selected — required before a Public submission.');
  if (!product.accept_marketplace_terms) payload._warnings.push('ISV has not accepted marketplace terms.');

  return payload;
}

// ---------------------------------------------------------------------------
// Helper: transform the internal summary payload into Catalog API change sets.
//   POST StartChangeSet  { Catalog: "AWSMarketplace", ChangeSet: [ ...changes ] }
//
// A `change` is { ChangeType, ChangeName?, Entity: { Type, Identifier? },
//                 DetailsDocument: {...} }.
//
// NOTE: the DetailsDocument shapes below are a first pass built from the reference
// listing (REFERENCE_sortcut_entity.json). During testing, submit with
// catalogApi.startChangeSet(cs, { validateOnly: true }) (Intent=VALIDATE) — AWS
// returns per-change errors that pinpoint any drift, the same way the Azure
// /configure call was tuned. Adjust here from those errors.
//
// @param {object} payload   - from buildAwsPayload()
// @param {object} opts
// @param {'create'|'update'|'offer'} opts.step
// @param {string} [opts.entityId] - required for step 'update'
// @param {string} [opts.offerId]  - required for step 'offer'
// @returns {Array<object>} the ChangeSet array
// ---------------------------------------------------------------------------
// UpdateInformation change for a SaaS product. All listed fields are REQUIRED by
// SaaSProduct@1.0 — validateForSubmission() gates them before we build this.
function updateInformationChange(payload, entityType, entityId) {
  const l = payload.listing;
  const arr = (a) => (Array.isArray(a) && a.length ? a : undefined);
  return {
    ChangeType: 'UpdateInformation',
    Entity: { Type: entityType, Identifier: entityId },
    DetailsDocument: {
      ProductTitle: l.title,
      ShortDescription: l.shortDescription,
      LongDescription: l.longDescription,
      Highlights: l.highlights,
      SearchKeywords: l.searchKeywords,
      Categories: l.categories,
      LogoUrl: l.logoUrl,
      SupportDescription: payload.support.description,
      Sku: l.sku || undefined,
      AdditionalResources: arr(l.additionalResources),
      Videos: arr(l.videos),
      SupportResources: arr(payload.support.resources),
    },
  };
}

function buildChangeSet(payload, { step, entityId, offerId } = {}) {
  const entityType = PRODUCT_TYPE_TO_ENTITY_TYPE[payload.productType] || 'SaaSProduct@1.0';
  const productRef = (id) => ({ Type: entityType, Identifier: id });

  // "refresh" — re-push listing info to an already-published product (Update Listing).
  // UpdateInformation is a full-replace and idempotent; delivery/pricing edits are
  // out of scope for v1 and still done in AMMP.
  if (step === 'refresh') {
    if (!entityId) throw new Error('buildChangeSet(refresh): entityId is required.');
    return finalizeChanges([updateInformationChange(payload, entityType, entityId)]);
  }

  if (step === 'create') {
    // CreateProduct takes no details for SaaS; the title seeds the draft.
    return finalizeChanges([
      {
        ChangeType: 'CreateProduct',
        ChangeName: 'CreateSaaSProduct',
        Entity: { Type: entityType },
        DetailsDocument: {},
      },
    ]);
  }

  if (step === 'update') {
    if (!entityId) throw new Error('buildChangeSet(update): entityId is required.');

    // SaaSProduct@1.0 has no separate UpdatePromotionalResources / UpdateSupportInformation
    // change types — logo, videos and support info are all folded into UpdateInformation.
    const changes = [updateInformationChange(payload, entityType, entityId)];

    // Dimensions are NOT added here: AWS rejects AddDimensions for SaaS unless the
    // same change set also sets usage pricing. They're added together with pricing
    // in the 'offer' step (Public path only).

    // A CreateProduct-only SaaS product has no delivery option — AddDeliveryOptions
    // creates one. Skip if one already exists (retry after this step partly ran).
    // Professional-services products have no delivery options at all.
    if (
      payload.productType !== 'ProfessionalServicesProduct' &&
      payload.delivery.fulfillmentUrl &&
      !payload._provisioning?.deliveryOptionId
    ) {
      changes.push({
        ChangeType: 'AddDeliveryOptions',
        Entity: productRef(entityId),
        DetailsDocument: {
          DeliveryOptions: [
            {
              Details: {
                SaaSUrlDeliveryOptionDetails: {
                  FulfillmentUrl: payload.delivery.fulfillmentUrl,
                },
              },
            },
          ],
        },
      });
    }

    return finalizeChanges(changes);
  }

  if (step === 'offer') {
    if (!offerId) throw new Error('buildChangeSet(offer): offerId is required.');
    const offerRef = { Type: 'Offer@1.0', Identifier: offerId };
    const changes = [];

    // Dimensions must be added in the SAME change set as usage pricing. The
    // AddDimensions DetailsDocument is a bare array of dimension objects.
    // (Skipped once the product already has dimensions — no re-add on retry.)
    const dims = (payload.dimensions || []).filter((d) => !(payload._provisioning?.dimensionKeys || []).includes(d.key));
    if (payload.pricing.model === 'usage' && dims.length) {
      changes.push({
        ChangeType: 'AddDimensions',
        Entity: productRef(entityId),
        DetailsDocument: dims.map((d) => ({
          Name: d.name,
          // AWS rejects an empty Description (regex ^\S+[\S\s]*) — fall back to the name.
          Description: (d.description || '').trim() || d.name,
          Key: d.key,
          Unit: d.unit || 'Units',
          Types: d.types || ['ExternallyMetered'],
        })),
      });
    }

    // Pricing
    if (payload.pricing.model === 'usage') {
      changes.push({
        ChangeType: 'UpdatePricingTerms',
        Entity: offerRef,
        DetailsDocument: {
          PricingModel: 'Usage',
          Terms: [
            {
              Type: 'UsageBasedPricingTerm',
              CurrencyCode: payload.pricing.currencyCode,
              RateCards: payload.pricing.rateCards || [
                { RateCard: payload.dimensions.map((d) => ({ DimensionKey: d.key, Price: '0' })) },
              ],
            },
          ],
        },
      });
    } else {
      changes.push({
        ChangeType: 'UpdatePricingTerms',
        Entity: offerRef,
        DetailsDocument: {
          PricingModel: 'Contract',
          Terms: [
            {
              Type: 'ConfigurableUpfrontPricingTerm',
              CurrencyCode: payload.pricing.currencyCode,
              RateCards: payload.pricing.rateCards || [],
            },
          ],
        },
      });
    }

    // Legal
    changes.push({
      ChangeType: 'UpdateLegalTerms',
      Entity: offerRef,
      DetailsDocument: {
        Terms: [
          {
            Type: 'LegalTerm',
            Documents:
              payload.legal.eulaType === 'CustomEula' && payload.legal.eulaUrl
                ? [{ Type: 'CustomEula', Url: payload.legal.eulaUrl }]
                : [{ Type: 'StandardEula' }],
          },
        ],
      },
    });

    // Support terms
    changes.push({
      ChangeType: 'UpdateSupportTerms',
      Entity: offerRef,
      DetailsDocument: {
        Terms: [{ Type: 'SupportTerm', RefundPolicy: payload.supportTerms.refundPolicy }],
      },
    });

    // Release to public
    if (payload.visibilityTarget === 'Public') {
      changes.push({
        ChangeType: 'ReleaseOffer',
        Entity: offerRef,
        DetailsDocument: {},
      });
    }

    return finalizeChanges(changes);
  }

  throw new Error(`buildChangeSet: unknown step "${step}"`);
}

// ---------------------------------------------------------------------------
// Validation: is a request ready for its first submission?
// ---------------------------------------------------------------------------
function validateForSubmission(awsPayload) {
  const l = awsPayload.listing || {};
  const cats = l.categories || [];
  const isSaas = awsPayload.productType !== 'ProfessionalServicesProduct';
  const required = [
    // SaaSProduct@1.0 UpdateInformation rejects the change set unless every one
    // of these is present — enforce them here so the admin fills the form first.
    ['Product Title', l.title],
    ['Short Description', l.shortDescription],
    ['Long Description', l.longDescription],
    ['Logo URL', l.logoUrl],
    // SaaS-only: professional services have no fulfillment URL or usage dimensions.
    ['SaaS Fulfillment URL', isSaas ? awsPayload.delivery?.fulfillmentUrl : 'ok'],
    ['At least one usage dimension', !isSaas || (awsPayload.dimensions || []).length ? 'ok' : ''],
    ['Support Description', awsPayload.support?.description],
    ['At least one highlight', (l.highlights || []).length ? 'ok' : ''],
    ['1 to 3 AWS categories', cats.length >= 1 && cats.length <= 3 ? 'ok' : ''],
    ['At least one search keyword', (l.searchKeywords || []).length ? 'ok' : ''],
  ];

  if (awsPayload.visibilityTarget === 'Public') {
    required.push(
      ['Refund Policy', awsPayload.supportTerms?.refundPolicy],
      ['EULA', awsPayload.legal?.eulaType === 'CustomEula' ? awsPayload.legal?.eulaUrl : 'ok'],
    );
  }

  const missing = required.filter(([, v]) => !v).map(([label]) => label);
  return { valid: missing.length === 0, missing };
}

// ---------------------------------------------------------------------------
// SERVICE FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Create a new AWS Marketplace publishing request. Caller: ISV or Admin.
 */
async function createRequest({ productId, requestedByUserId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

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
    const isvUserId = product.user_id || requestedByUserId;

    const existingResult = await client.query(
      `SELECT id, status FROM aws_marketplace_requests
       WHERE product_id = $1
         AND status IN ('PENDING_REVIEW', 'APPROVED', 'SUBMITTED', 'VALIDATING')
       LIMIT 1`,
      [productId]
    );

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      throw Object.assign(
        new Error(`An active AWS Marketplace request already exists for this product (status: ${existing.status}, id: ${existing.id}).`),
        { status: 409, existingRequestId: existing.id }
      );
    }

    const sellerId = process.env.AWS_MP_SELLER_ID || '';
    const awsPayload = buildAwsPayload(product, sellerId);

    const insertResult = await client.query(
      `INSERT INTO aws_marketplace_requests
         (marketplace_type, product_id, isv_user_id, requested_by_user_id, status, aws_product_type, visibility, aws_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      ['aws', productId, isvUserId, requestedByUserId, 'PENDING_REVIEW',
        awsPayload.productType, awsPayload.visibilityTarget, JSON.stringify(awsPayload)]
    );

    const request = insertResult.rows[0];

    await writeAudit(client, {
      requestId: request.id,
      userId: requestedByUserId,
      action: 'REQUEST_CREATED',
      newStatus: 'PENDING_REVIEW',
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
  const params = ['aws'];
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
    `SELECT COUNT(*) FROM aws_marketplace_requests r
     LEFT JOIN products p ON p.id = r.product_id
     LEFT JOIN users u ON u.id = r.isv_user_id
     WHERE ${where}`,
    params
  );

  const dataResult = await pool.query(
    `SELECT
       r.id, r.marketplace_type, r.product_id, r.isv_user_id, r.requested_by_user_id,
       r.reviewed_by_user_id, r.status, r.rejection_reason,
       r.aws_product_type, r.aws_entity_id, r.aws_product_id, r.aws_change_set_id, r.visibility,
       r.submitted_at, r.validated_at, r.published_at, r.failed_at,
       r.created_at, r.updated_at,
       p.name AS product_name, p.product_logo,
       u.name AS isv_name,
       rb.name AS requested_by_name,
       rv.name AS reviewed_by_name
     FROM aws_marketplace_requests r
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
 * Get a single request by ID with full audit history + product data.
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
     FROM aws_marketplace_requests r
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

  const auditResult = await pool.query(
    `SELECT a.*, u.name AS actor_name
     FROM aws_marketplace_audit a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.request_id = $1
     ORDER BY a.created_at ASC`,
    [requestId]
  );

  request.audit = auditResult.rows;

  if (request.aws_payload && typeof request.aws_payload === 'string') {
    try { request.aws_payload = JSON.parse(request.aws_payload); } catch { /* ignore */ }
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
      'SELECT id, status FROM aws_marketplace_requests WHERE id = $1 FOR UPDATE',
      [requestId]
    );

    if (existing.rows.length === 0) throw Object.assign(new Error('Request not found.'), { status: 404 });

    const prev = existing.rows[0].status;
    if (!['PENDING_REVIEW', 'FAILED'].includes(prev)) {
      throw Object.assign(new Error(`Cannot reject a request with status ${prev}.`), { status: 400 });
    }

    await client.query(
      `UPDATE aws_marketplace_requests
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

// ---------------------------------------------------------------------------
// Internal: rebuild the summary payload from current product data + saved config.
// ---------------------------------------------------------------------------
function rebuildPayload(row) {
  const sellerId = process.env.AWS_MP_SELLER_ID || '';
  const savedPayload =
    typeof row.aws_payload === 'string' ? safeJsonParse(row.aws_payload) : row.aws_payload || {};
  const savedAwsSpecific = {
    ...(savedPayload.awsSpecific || {}),
    productType: savedPayload.productType || savedPayload.awsSpecific?.productType || 'SaaSProduct',
    _provisioning: savedPayload._provisioning || { step: null, offerId: null },
  };
  return buildAwsPayload(row, sellerId, savedAwsSpecific);
}

// ---------------------------------------------------------------------------
// Internal: fill _provisioning with refs read back from the live product
// (ProductCode, the default delivery-option Id) that the change-set builders need.
// Safe to call repeatedly; only fetches when something is missing.
// ---------------------------------------------------------------------------
async function ensureProvisioningRefs(payload, entityId) {
  const prov = { ...(payload._provisioning || {}) };
  if (entityId && (!prov.deliveryOptionId || !prov.productCode)) {
    try {
      const ent = await catalogApi.describeEntity(entityId);
      const d = ent.details || {};
      prov.productCode = prov.productCode || d.Description?.ProductCode || d.ProductCode || null;
      prov.deliveryOptionId =
        prov.deliveryOptionId || d.Versions?.[0]?.DeliveryOptions?.[0]?.Id || null;
    } catch { /* non-fatal — the delivery change is skipped if the id is still missing */ }
  }
  payload._provisioning = prov;
  return payload;
}

// ---------------------------------------------------------------------------
// Internal: submit one change set for the given step and persist the outcome.
// Returns { changeSetId }.  Throws on API failure (caller marks FAILED).
// ---------------------------------------------------------------------------
async function submitStep(client, { requestId, payload, step, entityId, offerId }) {
  const changeSet = buildChangeSet(payload, { step, entityId, offerId });
  const changeSetName = `neozaar-${step}-req${requestId}-${Date.now()}`;
  const { changeSetId } = await catalogApi.startChangeSet(changeSet, {
    changeSetName,
    clientRequestToken: `req${requestId}-${step}-${Date.now()}`,
    validateOnly: false,
  });

  const nextProvisioning = { ...(payload._provisioning || {}), step, offerId: offerId || payload._provisioning?.offerId || null };
  const nextPayload = { ...payload, _provisioning: nextProvisioning };

  await client.query(
    `UPDATE aws_marketplace_requests
     SET status = 'SUBMITTED', submitted_at = COALESCE(submitted_at, NOW()),
         aws_change_set_id = $1, aws_payload = $2
     WHERE id = $3`,
    [changeSetId, JSON.stringify(nextPayload), requestId]
  );

  return { changeSetId };
}

/**
 * Approve and submit a request. Admin only.
 * Validates, then fires the first change set (CreateProduct, or the update step
 * if the product already exists from a prior run).
 */
async function approveAndSubmit({ requestId, approvedByUserId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT p.*, pod.overview,
              r.status, r.product_id, r.marketplace_type, r.isv_user_id,
              r.requested_by_user_id, r.reviewed_by_user_id,
              r.aws_product_type, r.aws_entity_id, r.aws_product_id, r.aws_change_set_id,
              r.visibility, r.aws_payload
       FROM aws_marketplace_requests r
       LEFT JOIN products p ON p.id = r.product_id
       LEFT JOIN product_other_details pod ON pod.product_id = p.id
       WHERE r.id = $1
       FOR UPDATE OF r`,
      [requestId]
    );

    if (existing.rows.length === 0) throw Object.assign(new Error('Request not found.'), { status: 404 });

    const row = existing.rows[0];
    row.aws_entity_id = bareEntityId(row.aws_entity_id);

    if (!['PENDING_REVIEW', 'FAILED'].includes(row.status)) {
      throw Object.assign(new Error(`Cannot approve a request with status ${row.status}.`), { status: 400 });
    }

    const awsPayload = rebuildPayload(row);
    if (row.aws_entity_id) await ensureProvisioningRefs(awsPayload, row.aws_entity_id);

    const { valid, missing } = validateForSubmission(awsPayload);
    if (!valid) {
      throw Object.assign(
        new Error(`Missing required fields for AWS submission: ${missing.join(', ')}`),
        { status: 422, missingFields: missing }
      );
    }

    if (!catalogApi.credentialsConfigured()) {
      throw Object.assign(
        new Error('AWS credentials are not configured on the server. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.'),
        { status: 503 }
      );
    }

    // Guard: AWS rejects a second running change set on the same entity.
    if (row.aws_entity_id && (await catalogApi.hasRunningChangeSet(row.aws_entity_id))) {
      throw Object.assign(
        new Error('A change set is already in progress for this product on AWS. Poll for its status first.'),
        { status: 409 }
      );
    }

    // Mark APPROVED
    await client.query(
      `UPDATE aws_marketplace_requests
       SET status = 'APPROVED', reviewed_by_user_id = $1, aws_payload = $2
       WHERE id = $3`,
      [approvedByUserId, JSON.stringify(awsPayload), requestId]
    );
    await writeAudit(client, {
      requestId, userId: approvedByUserId, action: 'APPROVED',
      previousStatus: row.status, newStatus: 'APPROVED',
    });

    // Decide the first step: 'create' if there's no entity yet, else 'update'.
    const step = row.aws_entity_id ? 'update' : 'create';

    let result;
    try {
      result = await submitStep(client, {
        requestId,
        payload: awsPayload,
        step,
        entityId: row.aws_entity_id || undefined,
      });
    } catch (apiErr) {
      const errorInfo = {
        message: apiErr.message,
        awsErrorCode: apiErr.awsErrorCode || null,
        awsRequest: apiErr.awsRequest || null,
        awsResponse: apiErr.awsResponse || null,
        statusCode: apiErr.status || null,
      };
      await client.query(
        `UPDATE aws_marketplace_requests
         SET status = 'FAILED', failed_at = NOW(), aws_response = $1
         WHERE id = $2`,
        [JSON.stringify(errorInfo), requestId]
      );
      await writeAudit(client, {
        requestId, userId: approvedByUserId, action: 'FAILED',
        previousStatus: 'APPROVED', newStatus: 'FAILED', errorInfo,
      });
      await client.query('COMMIT');
      throw Object.assign(new Error(`AWS submission failed: ${apiErr.message}`), { status: 502, awsError: errorInfo });
    }

    await writeAudit(client, {
      requestId, userId: approvedByUserId, action: 'SUBMITTED',
      previousStatus: 'APPROVED', newStatus: 'SUBMITTED',
      awsResponse: { changeSetId: result.changeSetId, step },
    });

    await client.query('COMMIT');
    return { id: requestId, status: 'SUBMITTED', changeSetId: result.changeSetId, step };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Poll the current change set and advance the provisioning sequence.
 * Frontend polls this periodically.
 */
async function pollJobStatus({ requestId, callerUserId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reqResult = await client.query(
      `SELECT p.*, pod.overview,
              r.id AS request_id, r.status, r.aws_change_set_id, r.aws_entity_id,
              r.aws_product_id, r.visibility, r.aws_payload
       FROM aws_marketplace_requests r
       LEFT JOIN products p ON p.id = r.product_id
       LEFT JOIN product_other_details pod ON pod.product_id = p.id
       WHERE r.id = $1
       FOR UPDATE OF r`,
      [requestId]
    );
    if (reqResult.rows.length === 0) throw Object.assign(new Error('Request not found.'), { status: 404 });

    const row = reqResult.rows[0];
    row.aws_entity_id = bareEntityId(row.aws_entity_id);

    if (!['SUBMITTED', 'VALIDATING'].includes(row.status)) {
      await client.query('COMMIT');
      return { id: requestId, status: row.status, polled: false };
    }
    if (!row.aws_change_set_id) {
      await client.query('COMMIT');
      return { id: requestId, status: row.status, polled: false, message: 'No change set id on record.' };
    }
    if (!catalogApi.credentialsConfigured()) {
      throw Object.assign(new Error('AWS credentials not configured.'), { status: 503 });
    }

    const cs = await catalogApi.describeChangeSet(row.aws_change_set_id);
    const payload = typeof row.aws_payload === 'string' ? safeJsonParse(row.aws_payload) : row.aws_payload || {};
    const provisioning = payload._provisioning || { step: null, offerId: null };
    const step = provisioning.step;

    // Still running --------------------------------------------------------
    if (['PREPARING', 'APPLYING'].includes(cs.status)) {
      if (row.status !== 'VALIDATING') {
        await client.query(
          'UPDATE aws_marketplace_requests SET status = \'VALIDATING\', validated_at = COALESCE(validated_at, NOW()) WHERE id = $1',
          [requestId]
        );
        await writeAudit(client, {
          requestId, userId: callerUserId, action: 'VALIDATED',
          previousStatus: row.status, newStatus: 'VALIDATING', awsResponse: { status: cs.status, step },
        });
      }
      await client.query('COMMIT');
      return { id: requestId, status: 'VALIDATING', changeSetStatus: cs.status, step };
    }

    // Failed / cancelled --------------------------------------------------
    if (['FAILED', 'CANCELLED'].includes(cs.status)) {
      const errorInfo = {
        changeSetStatus: cs.status,
        failureCode: cs.failureCode,
        failureDescription: cs.failureDescription,
        errors: cs.errors,
        step,
      };
      await client.query(
        `UPDATE aws_marketplace_requests
         SET status = 'FAILED', failed_at = NOW(), aws_response = $1, validation_errors = $2
         WHERE id = $3`,
        [JSON.stringify(cs.raw || {}), JSON.stringify(cs.errors || []), requestId]
      );
      await writeAudit(client, {
        requestId, userId: callerUserId, action: 'FAILED',
        previousStatus: row.status, newStatus: 'FAILED', errorInfo,
      });
      await client.query('COMMIT');
      return { id: requestId, status: 'FAILED', changeSetStatus: cs.status, errors: cs.errors, step };
    }

    // Succeeded ---------------------------------------------------------------
    if (cs.status === 'SUCCEEDED') {
      // --- step "refresh" succeeded: an Update Listing re-push is done ---
      if (step === 'refresh') {
        let visibility = row.visibility || 'Draft';
        try {
          const ent = await catalogApi.describeEntity(row.aws_entity_id);
          visibility = ent.details?.Description?.Visibility || visibility;
        } catch { /* keep current */ }
        await client.query(
          `UPDATE aws_marketplace_requests
           SET status = 'PUBLISHED', visibility = $1, aws_response = $2 WHERE id = $3`,
          [visibility, JSON.stringify(cs.raw || {}), requestId]
        );
        await writeAudit(client, {
          requestId, userId: callerUserId, action: 'LISTING_UPDATED',
          previousStatus: row.status, newStatus: 'PUBLISHED',
          awsResponse: { visibility, step },
        });
        await client.query('COMMIT');
        return { id: requestId, status: 'PUBLISHED', visibility, step };
      }

      // --- step "create" succeeded: capture the new EntityId, fire "update" ---
      if (step === 'create') {
        const createChange = (cs.changes || []).find((c) => c.ChangeType === 'CreateProduct') || cs.changes?.[0];
        const entityId = bareEntityId(createChange?.Entity?.Identifier) || null;
        if (!entityId) {
          throw Object.assign(new Error('CreateProduct succeeded but no EntityId was returned.'), { status: 502 });
        }

        // Read back the product code + default delivery-option id that change set B needs.
        await ensureProvisioningRefs(payload, entityId);
        const productCode = payload._provisioning.productCode || null;

        // Persist the captured entity + advance the tracked step. This commits even
        // if the follow-up change set B fails, so a retry resumes from 'update'
        // instead of losing the product AWS already created.
        const withEntity = {
          ...payload,
          _provisioning: { ...(payload._provisioning || {}), step: 'update' },
        };
        await client.query(
          'UPDATE aws_marketplace_requests SET aws_entity_id = $1, aws_product_id = $2, aws_payload = $3 WHERE id = $4',
          [entityId, productCode, JSON.stringify(withEntity), requestId]
        );
        await writeAudit(client, {
          requestId, userId: callerUserId, action: 'VALIDATED',
          previousStatus: row.status, newStatus: row.status,
          awsResponse: { step: 'create', result: 'SUCCEEDED', entityId, productCode },
        });

        const nextPayload = rebuildPayload({ ...row, aws_entity_id: entityId, aws_payload: JSON.stringify(withEntity) });
        let result;
        try {
          result = await submitStep(client, {
            requestId, payload: nextPayload, step: 'update', entityId,
          });
        } catch (apiErr) {
          const errorInfo = {
            message: apiErr.message,
            awsErrorCode: apiErr.awsErrorCode || null,
            awsResponse: apiErr.awsResponse || null,
            statusCode: apiErr.status || null,
            step: 'update',
          };
          await client.query(
            'UPDATE aws_marketplace_requests SET status = \'FAILED\', failed_at = NOW(), aws_response = $1 WHERE id = $2',
            [JSON.stringify(errorInfo), requestId]
          );
          await writeAudit(client, {
            requestId, userId: callerUserId, action: 'FAILED',
            previousStatus: row.status, newStatus: 'FAILED', errorInfo,
          });
          await client.query('COMMIT');
          throw Object.assign(new Error(`AWS submission failed (update): ${apiErr.message}`), { status: 502, awsError: errorInfo });
        }

        await writeAudit(client, {
          requestId, userId: callerUserId, action: 'SUBMITTED',
          previousStatus: row.status, newStatus: 'SUBMITTED',
          awsResponse: { changeSetId: result.changeSetId, step: 'update', entityId },
        });
        await client.query('COMMIT');
        return { id: requestId, status: 'SUBMITTED', step: 'update', entityId, changeSetId: result.changeSetId };
      }

      // --- step "update" succeeded ---
      if (step === 'update') {
        if (payload.visibilityTarget !== 'Public') {
          // Limited target: the listing is fully populated on AWS. It stays in
          // Draft visibility — moving to Restricted/Public needs an offer with
          // dimensions + pricing (the Public path). Read back the real visibility.
          let visibility = 'Draft';
          try {
            const ent = await catalogApi.describeEntity(row.aws_entity_id);
            visibility = ent.details?.Description?.Visibility || visibility;
          } catch { /* keep default */ }

          await client.query(
            `UPDATE aws_marketplace_requests
             SET status = 'PUBLISHED', published_at = NOW(), visibility = $1, aws_response = $2
             WHERE id = $3`,
            [visibility, JSON.stringify(cs.raw || {}), requestId]
          );
          await writeAudit(client, {
            requestId, userId: callerUserId, action: 'PUBLISHED',
            previousStatus: row.status, newStatus: 'PUBLISHED',
            awsResponse: { visibility, step },
          });
          await client.query('COMMIT');
          return { id: requestId, status: 'PUBLISHED', visibility };
        }

        // Public target: resolve the auto-created offer, then fire the "offer" step.
        let offerId = provisioning.offerId;
        if (!offerId) {
          const offers = await catalogApi.listEntities('Offer');
          const match = offers.find((o) => (o.name || '').includes(row.aws_entity_id)) || offers[0];
          offerId = match?.entityId || null;
        }
        if (!offerId) {
          throw Object.assign(new Error('Could not resolve the offer for this product to set pricing.'), { status: 502 });
        }

        const nextPayload = rebuildPayload({ ...row, aws_payload: JSON.stringify(payload) });
        const result = await submitStep(client, {
          requestId, payload: nextPayload, step: 'offer', entityId: row.aws_entity_id, offerId,
        });
        await writeAudit(client, {
          requestId, userId: callerUserId, action: 'SUBMITTED',
          previousStatus: row.status, newStatus: 'SUBMITTED',
          awsResponse: { changeSetId: result.changeSetId, step: 'offer', offerId },
        });
        await client.query('COMMIT');
        return { id: requestId, status: 'SUBMITTED', step: 'offer', offerId, changeSetId: result.changeSetId };
      }

      // --- step "offer" succeeded: fully published ---
      if (step === 'offer') {
        await client.query(
          `UPDATE aws_marketplace_requests
           SET status = 'PUBLISHED', published_at = NOW(), visibility = 'Public', aws_response = $1
           WHERE id = $2`,
          [JSON.stringify(cs.raw || {}), requestId]
        );
        await writeAudit(client, {
          requestId, userId: callerUserId, action: 'PUBLISHED',
          previousStatus: row.status, newStatus: 'PUBLISHED',
          awsResponse: { visibility: 'Public', step },
        });
        await client.query('COMMIT');
        return { id: requestId, status: 'PUBLISHED', visibility: 'Public' };
      }
    }

    await client.query('COMMIT');
    return { id: requestId, status: row.status, changeSetStatus: cs.status, step };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Retry a FAILED request. Re-submits from the current provisioning step.
 */
/**
 * Update Listing — re-push the current NeoZaar product data + saved AWS config to
 * an already-PUBLISHED listing. Fires a single UpdateInformation change set
 * (idempotent full-replace). Admin only.
 */
async function updateListing({ requestId, adminUserId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT p.*, pod.overview,
              r.status, r.product_id, r.aws_product_type, r.aws_entity_id,
              r.aws_product_id, r.aws_change_set_id, r.visibility, r.aws_payload
       FROM aws_marketplace_requests r
       LEFT JOIN products p ON p.id = r.product_id
       LEFT JOIN product_other_details pod ON pod.product_id = p.id
       WHERE r.id = $1
       FOR UPDATE OF r`,
      [requestId]
    );
    if (existing.rows.length === 0) throw Object.assign(new Error('Request not found.'), { status: 404 });

    const row = existing.rows[0];
    row.aws_entity_id = bareEntityId(row.aws_entity_id);

    if (row.status !== 'PUBLISHED') {
      throw Object.assign(new Error(`Update Listing is only available once the request is PUBLISHED (current: ${row.status}).`), { status: 400 });
    }
    if (!row.aws_entity_id) {
      throw Object.assign(new Error('This request has no AWS product to update.'), { status: 400 });
    }
    if (!catalogApi.credentialsConfigured()) {
      throw Object.assign(new Error('AWS credentials not configured.'), { status: 503 });
    }
    if (await catalogApi.hasRunningChangeSet(row.aws_entity_id)) {
      throw Object.assign(new Error('A change set is already in progress for this product on AWS.'), { status: 409 });
    }

    const awsPayload = rebuildPayload(row);
    await ensureProvisioningRefs(awsPayload, row.aws_entity_id);
    const { valid, missing } = validateForSubmission(awsPayload);
    if (!valid) {
      throw Object.assign(
        new Error(`Missing required fields for the listing update: ${missing.join(', ')}`),
        { status: 422, missingFields: missing }
      );
    }

    await writeAudit(client, {
      requestId, userId: adminUserId, action: 'LISTING_UPDATE_REQUESTED',
      previousStatus: 'PUBLISHED', newStatus: 'PUBLISHED',
    });

    let result;
    try {
      result = await submitStep(client, {
        requestId,
        payload: awsPayload,
        step: 'refresh',
        entityId: row.aws_entity_id,
      });
    } catch (apiErr) {
      const errorInfo = {
        message: apiErr.message,
        awsErrorCode: apiErr.awsErrorCode || null,
        awsResponse: apiErr.awsResponse || null,
        statusCode: apiErr.status || null,
        step: 'refresh',
      };
      await client.query(
        'UPDATE aws_marketplace_requests SET status = \'FAILED\', failed_at = NOW(), aws_response = $1 WHERE id = $2',
        [JSON.stringify(errorInfo), requestId]
      );
      await writeAudit(client, {
        requestId, userId: adminUserId, action: 'FAILED',
        previousStatus: 'PUBLISHED', newStatus: 'FAILED', errorInfo,
      });
      await client.query('COMMIT');
      throw Object.assign(new Error(`Listing update failed: ${apiErr.message}`), { status: 502, awsError: errorInfo });
    }

    await writeAudit(client, {
      requestId, userId: adminUserId, action: 'SUBMITTED',
      previousStatus: 'PUBLISHED', newStatus: 'SUBMITTED',
      awsResponse: { changeSetId: result.changeSetId, step: 'refresh' },
    });

    await client.query('COMMIT');
    return { id: requestId, status: 'SUBMITTED', changeSetId: result.changeSetId, step: 'refresh' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function retryRequest({ requestId, retriedByUserId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT p.*, pod.overview,
              r.status, r.product_id, r.aws_product_type, r.aws_entity_id,
              r.aws_product_id, r.aws_change_set_id, r.visibility, r.aws_payload
       FROM aws_marketplace_requests r
       LEFT JOIN products p ON p.id = r.product_id
       LEFT JOIN product_other_details pod ON pod.product_id = p.id
       WHERE r.id = $1
       FOR UPDATE OF r`,
      [requestId]
    );
    if (existing.rows.length === 0) throw Object.assign(new Error('Request not found.'), { status: 404 });

    const row = existing.rows[0];
    row.aws_entity_id = bareEntityId(row.aws_entity_id);
    if (row.status !== 'FAILED') {
      throw Object.assign(new Error(`Can only retry FAILED requests. Current status: ${row.status}`), { status: 400 });
    }
    if (!catalogApi.credentialsConfigured()) {
      throw Object.assign(new Error('AWS credentials not configured.'), { status: 503 });
    }
    if (row.aws_entity_id && (await catalogApi.hasRunningChangeSet(row.aws_entity_id))) {
      throw Object.assign(new Error('A change set is already in progress for this product on AWS.'), { status: 409 });
    }

    const awsPayload = rebuildPayload(row);
    if (row.aws_entity_id) await ensureProvisioningRefs(awsPayload, row.aws_entity_id);
    const { valid, missing } = validateForSubmission(awsPayload);
    if (!valid) {
      throw Object.assign(
        new Error(`Missing required fields for AWS submission: ${missing.join(', ')}`),
        { status: 422, missingFields: missing }
      );
    }

    // Resume from the failed step; if we never got an entity, restart at 'create'.
    const savedStep = awsPayload._provisioning?.step;
    const step = row.aws_entity_id ? (savedStep && savedStep !== 'create' ? savedStep : 'update') : 'create';

    await writeAudit(client, {
      requestId, userId: retriedByUserId, action: 'RETRIED',
      previousStatus: 'FAILED', newStatus: 'APPROVED',
    });
    await client.query(
      'UPDATE aws_marketplace_requests SET status = \'APPROVED\', failed_at = NULL, aws_payload = $1 WHERE id = $2',
      [JSON.stringify(awsPayload), requestId]
    );

    let result;
    try {
      result = await submitStep(client, {
        requestId,
        payload: awsPayload,
        step,
        entityId: row.aws_entity_id || undefined,
        offerId: awsPayload._provisioning?.offerId || undefined,
      });
    } catch (apiErr) {
      const errorInfo = {
        message: apiErr.message,
        awsErrorCode: apiErr.awsErrorCode || null,
        awsResponse: apiErr.awsResponse || null,
        statusCode: apiErr.status || null,
      };
      await client.query(
        'UPDATE aws_marketplace_requests SET status = \'FAILED\', failed_at = NOW(), aws_response = $1 WHERE id = $2',
        [JSON.stringify(errorInfo), requestId]
      );
      await writeAudit(client, {
        requestId, userId: retriedByUserId, action: 'FAILED',
        previousStatus: 'APPROVED', newStatus: 'FAILED', errorInfo,
      });
      await client.query('COMMIT');
      throw Object.assign(new Error(`Retry failed: ${apiErr.message}`), { status: 502, awsError: errorInfo });
    }

    await writeAudit(client, {
      requestId, userId: retriedByUserId, action: 'SUBMITTED',
      previousStatus: 'APPROVED', newStatus: 'SUBMITTED',
      awsResponse: { changeSetId: result.changeSetId, step },
    });

    await client.query('COMMIT');
    return { id: requestId, status: 'SUBMITTED', changeSetId: result.changeSetId, step };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Save/update the AWS-specific config the admin fills in on the review page.
 * Merges into aws_payload.awsSpecific — does NOT submit to AWS.
 */
async function saveAwsConfig({ requestId, config }) {
  const existing = await pool.query(
    'SELECT id, status, aws_payload FROM aws_marketplace_requests WHERE id = $1',
    [requestId]
  );
  if (existing.rows.length === 0) throw Object.assign(new Error('Request not found.'), { status: 404 });

  const row = existing.rows[0];
  // Config is editable except while a change set is in flight. PUBLISHED requests
  // stay editable so an admin can revise and re-push via updateListing().
  if (['SUBMITTED', 'VALIDATING'].includes(row.status)) {
    throw Object.assign(new Error(`Cannot edit config while request is ${row.status}.`), { status: 400 });
  }

  const currentPayload =
    typeof row.aws_payload === 'string' ? safeJsonParse(row.aws_payload) : row.aws_payload || {};
  const cur = currentPayload.awsSpecific || {};

  const mergedAwsSpecific = {
    ...cur,
    productType:        config.productType        ?? cur.productType        ?? 'SaaSProduct',
    logoUrl:            config.logoUrl            ?? cur.logoUrl            ?? null,
    fulfillmentUrl:     config.fulfillmentUrl     ?? cur.fulfillmentUrl     ?? null,
    supportDescription: config.supportDescription ?? cur.supportDescription ?? null,
    categories:         config.categories         ?? cur.categories         ?? [],
    highlights:         config.highlights         ?? cur.highlights         ?? [],
    searchKeywords:     config.searchKeywords     ?? cur.searchKeywords     ?? [],
    dimensions:         config.dimensions         ?? cur.dimensions         ?? [],
    pricingModel:       config.pricingModel       ?? cur.pricingModel       ?? 'usage',
    currencyCode:       config.currencyCode       ?? cur.currencyCode       ?? 'USD',
    rateCards:          config.rateCards          ?? cur.rateCards          ?? [],
    freeTrial:          config.freeTrial          ?? cur.freeTrial          ?? false,
    eulaType:           config.eulaType           ?? cur.eulaType           ?? 'StandardEula',
    eulaUrl:            config.eulaUrl            ?? cur.eulaUrl            ?? null,
    refundPolicy:       config.refundPolicy       ?? cur.refundPolicy       ?? 'NA',
    _provisioning:      currentPayload._provisioning || { step: null, offerId: null },
  };

  // Re-derive the full summary so the review screen reflects the new config.
  const productResult = await pool.query('SELECT p.*, pod.overview FROM products p LEFT JOIN product_other_details pod ON pod.product_id = p.id WHERE p.id = $1', [row.product_id ?? currentPayload.neozaarProductId]);
  const product = productResult.rows[0] || { id: currentPayload.neozaarProductId };
  const updatedPayload = buildAwsPayload(product, process.env.AWS_MP_SELLER_ID || '', mergedAwsSpecific);

  await pool.query(
    'UPDATE aws_marketplace_requests SET aws_payload = $1, aws_product_type = $2, visibility = $3 WHERE id = $4',
    [JSON.stringify(updatedPayload), updatedPayload.productType, updatedPayload.visibilityTarget, requestId]
  );

  return updatedPayload;
}

/**
 * Update the NeoZaar product fields the AWS listing is built from, so an admin
 * can fix missing data (e.g. Privacy Policy URL) straight from the review page.
 * Writes to the product itself (not just the request) so every channel benefits.
 */
const EDITABLE_PRODUCT_FIELDS = ['privacy_policy_url', 'terms_of_use_url', 'short_description', 'long_description'];

async function updateProductFields({ requestId, fields }) {
  const existing = await pool.query(
    `SELECT r.status, r.product_id, p.action_type
     FROM aws_marketplace_requests r
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
 * Latest AWS Marketplace request status for a product.
 */
async function getProductRequestStatus(productId) {
  const result = await pool.query(
    `SELECT id, status FROM aws_marketplace_requests
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
  saveAwsConfig,
  updateProductFields,
  getProductRequestStatus,
  buildAwsPayload,
  buildChangeSet,
  validateForSubmission,
};
