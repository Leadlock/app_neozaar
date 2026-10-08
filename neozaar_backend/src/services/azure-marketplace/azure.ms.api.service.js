/**
 * Microsoft Marketplace — Product Ingestion API client.
 * https://learn.microsoft.com/partner-center/marketplace-offers/product-ingestion-api
 *
 * The Product Ingestion API is exposed through Microsoft Graph under the
 * workload name `product-ingestion`. Base URL: https://graph.microsoft.com/rp/product-ingestion
 *
 * All MS credentials are read from process.env — never exposed to the frontend.
 *
 * Required env vars:
 *   AZURE_TENANT_ID        — AAD tenant that owns the Partner Center-linked app registration
 *   AZURE_CLIENT_ID        — App (client) ID of that registration
 *   AZURE_CLIENT_SECRET    — Client secret
 *   AZURE_PUBLISHER_ID     — Partner Center seller ID (informational; the API is
 *                            scoped by the authenticated account)
 *
 * Optional:
 *   MS_INGESTION_API_BASE      — override base URL (mock / sandbox)
 *   MS_INGESTION_SCHEMA_VERSION — override the $version query param (default 2022-03-01-preview2)
 */

const axios = require('axios');

const MS_API_BASE =
  process.env.MS_INGESTION_API_BASE || 'https://graph.microsoft.com/rp/product-ingestion';
// $version is a REQUIRED query parameter on every Product Ingestion API call.
const API_VERSION = process.env.MS_INGESTION_SCHEMA_VERSION || '2022-03-01-preview2';
const TOKEN_URL = (tenantId) =>
  `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
// Product Ingestion API is reached via Microsoft Graph — token audience must be Graph.
const TOKEN_SCOPE = 'https://graph.microsoft.com/.default';

// ---------------------------------------------------------------------------
// Internal: obtain a fresh AAD access token (cached per process lifetime)
// ---------------------------------------------------------------------------
let _cachedToken = null;
let _tokenExpiresAt = 0;

async function getAccessToken() {
  if (_cachedToken && Date.now() < _tokenExpiresAt - 30_000) {
    return _cachedToken;
  }

  const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET } = process.env;

  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
    throw new Error(
      'Azure credentials not configured. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET in environment.'
    );
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: AZURE_CLIENT_ID,
    client_secret: AZURE_CLIENT_SECRET,
    scope: TOKEN_SCOPE,
  });

  const response = await axios.post(TOKEN_URL(AZURE_TENANT_ID), params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  _cachedToken = response.data.access_token;
  _tokenExpiresAt = Date.now() + response.data.expires_in * 1000;
  return _cachedToken;
}

// ---------------------------------------------------------------------------
// Internal: authenticated Axios config
// ---------------------------------------------------------------------------
async function authHeaders() {
  const token = await getAccessToken();
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}

// Append the mandatory $version query parameter (and any extras) to a path.
function withVersion(path, extra = {}) {
  const qs = new URLSearchParams({ ...extra, $version: API_VERSION });
  const sep = path.includes('?') ? '&' : '?';
  return `${MS_API_BASE}${path}${sep}${qs.toString()}`;
}

// ---------------------------------------------------------------------------
// Internal: normalise an axios error into something worth logging / storing.
// ---------------------------------------------------------------------------
function wrapApiError(err, method, url) {
  const status = err.response?.status;
  const body = err.response?.data;
  const msMessage =
    body?.error?.message || body?.message || (typeof body === 'string' ? body : null);
  const msErrors = body?.errors || body?.error?.details || null;
  // Roll per-resource validation messages into the error text so they surface
  // in the UI toast, not just the stored ms_response.
  const detailText = Array.isArray(msErrors)
    ? msErrors.map((d) => d?.message || d?.code).filter(Boolean).join(' | ')
    : null;

  const wrapped = new Error(
    `MS ingestion API ${method} ${url} failed` +
      (status ? ` (HTTP ${status})` : '') +
      (msMessage ? `: ${msMessage}` : `: ${err.message}`) +
      (detailText ? ` — ${detailText}` : '')
  );
  wrapped.status = status;
  wrapped.msRequest = { method, url };
  wrapped.msResponse = body ?? null;
  wrapped.msErrors = msErrors;
  wrapped.cause = err;
  return wrapped;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Find a product by its external ID (the offer ID). Returns the product
 * resource (including its durable `id`) or null if it does not exist yet.
 * GET /product?externalID={id}
 */
async function getProductByExternalId(externalId) {
  const url = withVersion('/product', { externalID: externalId });
  try {
    const response = await axios.get(url, await authHeaders());
    return response.data || null;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw wrapApiError(err, 'GET', url);
  }
}

/**
 * List the plans within a product.
 * GET /plan?product={product-durableID}
 * @param {string} productDurableId e.g. "product/12345678-abcd-..."
 * @returns {{ value: Array<{ id: string, identity: { externalId: string } }> }}
 */
async function getPlans(productDurableId) {
  const url = withVersion('/plan', { product: productDurableId });
  try {
    const response = await axios.get(url, await authHeaders());
    return response.data || { value: [] };
  } catch (err) {
    if (err.response?.status === 404) return { value: [] };
    throw wrapApiError(err, 'GET', url);
  }
}

/**
 * List all products of a given type for the authenticated account.
 * GET /product?type={type}
 */
async function listProducts(type = 'softwareAsAService') {
  const url = withVersion('/product', { type });
  try {
    const response = await axios.get(url, await authHeaders());
    return response.data;
  } catch (err) {
    throw wrapApiError(err, 'GET', url);
  }
}

/**
 * Retrieve every resource within a product in one call.
 * GET /resource-tree/{product-durableID}
 * @param {string} durableId e.g. "product/12345678-abcd-..."
 * @param {string} [targetType] "draft" | "preview" | "live"
 */
async function getResourceTree(durableId, targetType) {
  const url = withVersion(
    `/resource-tree/${durableId}`,
    targetType ? { targetType } : {}
  );
  try {
    const response = await axios.get(url, await authHeaders());
    return response.data;
  } catch (err) {
    throw wrapApiError(err, 'GET', url);
  }
}

/**
 * Submit a configuration (resource tree) to create / update / publish an offer.
 * POST /configure
 *
 * @param {object} configurePayload - { $schema, resources: [...] }
 * @returns {{ jobId: string, jobStatus: string, jobResult: string, errors: any[] }}
 */
async function submitConfiguration(configurePayload) {
  const url = withVersion('/configure');
  try {
    const response = await axios.post(url, configurePayload, await authHeaders());
    const data = response.data || {};
    return { ...data, jobId: data.jobID || data.jobId || null };
  } catch (err) {
    throw wrapApiError(err, 'POST', url);
  }
}

/**
 * Poll the status of a configuration job.
 * GET /configure/{jobId}/status
 *
 * @returns {{ jobID, jobStatus, jobResult, errors: any[] }}
 *   jobStatus: 'notStarted' | 'running' | 'completed'
 *   jobResult: 'pending'    | 'succeeded' | 'failed' | 'cancelled'
 */
async function getJobStatus(jobId) {
  const url = withVersion(`/configure/${jobId}/status`);
  try {
    const response = await axios.get(url, await authHeaders());
    return response.data;
  } catch (err) {
    throw wrapApiError(err, 'GET', url);
  }
}

/**
 * Get the detailed summary (resources created / updated) of a completed job.
 * GET /configure/{jobId}
 */
async function getJobDetails(jobId) {
  const url = withVersion(`/configure/${jobId}`);
  try {
    const response = await axios.get(url, await authHeaders());
    return response.data;
  } catch (err) {
    throw wrapApiError(err, 'GET', url);
  }
}

/**
 * Returns true if the MS credentials are configured (does not validate them).
 */
function credentialsConfigured() {
  const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_PUBLISHER_ID } = process.env;
  return !!(AZURE_TENANT_ID && AZURE_CLIENT_ID && AZURE_CLIENT_SECRET && AZURE_PUBLISHER_ID);
}

module.exports = {
  apiBase: MS_API_BASE,
  apiVersion: API_VERSION,
  getProductByExternalId,
  getPlans,
  listProducts,
  getResourceTree,
  submitConfiguration,
  // Backwards-compatible alias for existing callers.
  createSubmission: submitConfiguration,
  getJobStatus,
  getJobDetails,
  credentialsConfigured,
};
