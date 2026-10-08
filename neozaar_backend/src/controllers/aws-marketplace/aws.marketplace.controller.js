/**
 * AWS Marketplace Controller
 * All admin-only routes check for ADMIN / SUPER_ADMIN roles.
 * ISV / Admin users can create requests.
 *
 * Mirrors azure.marketplace.controller.js.
 */

const svc = require('../../services/aws-marketplace/aws.marketplace.service');
const s3assets = require('../../services/aws-marketplace/aws.s3.assets.service');

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];
const ALLOWED_ROLES = [...ADMIN_ROLES, 'ISV'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireRole(roles, req, res) {
  if (!req.user || !roles.includes(req.user.role_type)) {
    res.status(403).json({ status: 'fail', message: 'Access denied.', code: 403 });
    return false;
  }
  return true;
}

function handleError(res, err) {
  console.error('[AwsMarketplace]', err.message, err.stack || '');
  const status = err.status || 500;
  const body = {
    status: 'fail',
    message: err.message || 'Internal server error',
    code: status,
  };
  if (err.missingFields) body.missingFields = err.missingFields;
  if (err.awsError) body.awsError = err.awsError;
  if (err.existingRequestId) body.existingRequestId = err.existingRequestId;
  res.status(status).json(body);
}

// ---------------------------------------------------------------------------
// Create a publishing request (ISV or Admin)
// ---------------------------------------------------------------------------
const createRequest = async (req, res) => {
  if (!requireRole(ALLOWED_ROLES, req, res)) return;

  const productId = parseInt(req.body.product_id, 10);
  if (!productId) {
    return res.status(400).json({ status: 'fail', message: 'product_id is required.', code: 400 });
  }

  try {
    const request = await svc.createRequest({
      productId,
      requestedByUserId: req.user.id,
    });

    res.status(201).json({
      status: 'success',
      message: 'AWS Marketplace publishing request submitted for admin review.',
      data: request,
    });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// List all requests — Admin only
// ---------------------------------------------------------------------------
const listRequests = async (req, res) => {
  if (!requireRole(ADMIN_ROLES, req, res)) return;

  const { status = 'ALL', search = '', page = 1, limit = 20 } = req.query;

  try {
    const result = await svc.listRequests({
      status,
      search,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    res.json({ status: 'success', ...result });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// Get single request by ID — Admin only
// ---------------------------------------------------------------------------
const getRequestById = async (req, res) => {
  if (!requireRole(ADMIN_ROLES, req, res)) return;

  const requestId = parseInt(req.params.id, 10);
  if (!requestId) return res.status(400).json({ status: 'fail', message: 'Invalid request ID.', code: 400 });

  try {
    const request = await svc.getRequestById(requestId);
    res.json({ status: 'success', data: request });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// Reject a request — Admin only
// ---------------------------------------------------------------------------
const rejectRequest = async (req, res) => {
  if (!requireRole(ADMIN_ROLES, req, res)) return;

  const requestId = parseInt(req.params.id, 10);
  if (!requestId) return res.status(400).json({ status: 'fail', message: 'Invalid request ID.', code: 400 });

  const { rejection_reason } = req.body;

  try {
    const result = await svc.rejectRequest({
      requestId,
      rejectedByUserId: req.user.id,
      rejectionReason: rejection_reason,
    });

    res.json({ status: 'success', message: 'Request rejected.', data: result });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// Approve and submit — Admin only
// ---------------------------------------------------------------------------
const approveAndSubmit = async (req, res) => {
  if (!requireRole(ADMIN_ROLES, req, res)) return;

  const requestId = parseInt(req.params.id, 10);
  if (!requestId) return res.status(400).json({ status: 'fail', message: 'Invalid request ID.', code: 400 });

  try {
    const result = await svc.approveAndSubmit({
      requestId,
      approvedByUserId: req.user.id,
    });

    res.json({ status: 'success', message: 'Request approved and submitted to AWS Marketplace.', data: result });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// Poll change set status — Admin only
// ---------------------------------------------------------------------------
const pollJobStatus = async (req, res) => {
  if (!requireRole(ADMIN_ROLES, req, res)) return;

  const requestId = parseInt(req.params.id, 10);
  if (!requestId) return res.status(400).json({ status: 'fail', message: 'Invalid request ID.', code: 400 });

  try {
    const result = await svc.pollJobStatus({ requestId, callerUserId: req.user.id });
    res.json({ status: 'success', data: result });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// Save AWS-specific config fields — Admin only
// Does NOT submit to AWS. Merges into aws_payload.awsSpecific.
// ---------------------------------------------------------------------------
const saveAwsConfig = async (req, res) => {
  if (!requireRole(ADMIN_ROLES, req, res)) return;

  const requestId = parseInt(req.params.id, 10);
  if (!requestId) return res.status(400).json({ status: 'fail', message: 'Invalid request ID.', code: 400 });

  try {
    const updatedPayload = await svc.saveAwsConfig({
      requestId,
      adminUserId: req.user.id,
      config: req.body,
    });
    res.json({ status: 'success', message: 'AWS configuration saved.', data: updatedPayload });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// Retry a FAILED request — Admin only
// ---------------------------------------------------------------------------
const retryRequest = async (req, res) => {
  if (!requireRole(ADMIN_ROLES, req, res)) return;

  const requestId = parseInt(req.params.id, 10);
  if (!requestId) return res.status(400).json({ status: 'fail', message: 'Invalid request ID.', code: 400 });

  try {
    const result = await svc.retryRequest({ requestId, retriedByUserId: req.user.id });
    res.json({ status: 'success', message: 'Request re-submitted to AWS Marketplace.', data: result });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// Edit product fields (privacy URL, descriptions...) from the review page. Admin only.
// ---------------------------------------------------------------------------
const updateProductFields = async (req, res) => {
  if (!requireRole(ADMIN_ROLES, req, res)) return;

  const requestId = parseInt(req.params.id, 10);
  if (!requestId) return res.status(400).json({ status: 'fail', message: 'Invalid request ID.', code: 400 });

  try {
    const data = await svc.updateProductFields({ requestId, fields: req.body || {} });
    res.json({ status: 'success', message: 'Product details updated.', data });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// Update Listing — re-push current data to an already-published listing. Admin only.
// ---------------------------------------------------------------------------
const updateListing = async (req, res) => {
  if (!requireRole(ADMIN_ROLES, req, res)) return;

  const requestId = parseInt(req.params.id, 10);
  if (!requestId) return res.status(400).json({ status: 'fail', message: 'Invalid request ID.', code: 400 });

  try {
    const result = await svc.updateListing({ requestId, adminUserId: req.user.id });
    res.json({ status: 'success', message: 'Listing update submitted to AWS Marketplace.', data: result });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// Upload a listing logo — Admin only.
// Normalises the image to a compliant PNG, mirrors it to S3 (AWS Marketplace
// only accepts S3-hosted media), and stores the S3 URL on the request.
// ---------------------------------------------------------------------------
const uploadLogo = async (req, res) => {
  if (!requireRole(ADMIN_ROLES, req, res)) return;

  const requestId = parseInt(req.params.id, 10);
  if (!requestId) return res.status(400).json({ status: 'fail', message: 'Invalid request ID.', code: 400 });

  const file = req.file || req.files?.logo?.[0];
  if (!file || !file.buffer) {
    return res.status(400).json({ status: 'fail', message: 'No logo file uploaded (form field "logo").', code: 400 });
  }

  try {
    // Replace any previously uploaded logo for this request.
    const current = await svc.getRequestById(requestId);
    const prevUrl = current?.aws_payload?.awsSpecific?.logoUrl;

    const { url } = await s3assets.uploadLogo({ buffer: file.buffer, requestId });
    const updatedPayload = await svc.saveAwsConfig({ requestId, config: { logoUrl: url } });

    if (prevUrl && prevUrl !== url) s3assets.deleteAsset(prevUrl);

    res.json({
      status: 'success',
      message: 'Logo uploaded and stored in S3.',
      data: { logoUrl: url, payload: updatedPayload },
    });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// Get the latest AWS Marketplace request status for a given product
// Accessible by ADMIN or the product's ISV
// ---------------------------------------------------------------------------
const getProductRequestStatus = async (req, res) => {
  if (!requireRole(ALLOWED_ROLES, req, res)) return;

  const productId = parseInt(req.params.productId, 10);
  if (!productId) return res.status(400).json({ status: 'fail', message: 'Invalid product ID.', code: 400 });

  try {
    const result = await svc.getProductRequestStatus(productId);
    res.json({ status: 'success', data: result });
  } catch (err) {
    handleError(res, err);
  }
};

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
  uploadLogo,
  getProductRequestStatus,
};
