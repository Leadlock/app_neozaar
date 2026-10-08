const express = require('express');
const multer = require('multer');
const router = express.Router();
const verifyToken = require('../../middlewares/auth');
const ctrl = require('../../controllers/aws-marketplace/aws.marketplace.controller');

// In-memory single-file upload for listing logos (piped straight to S3).
const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Logo must be a PNG, JPG, WebP or GIF image.'));
  },
}).single('logo');

const handleLogoUpload = (req, res, next) => {
  logoUpload(req, res, (err) => {
    if (err) return res.status(400).json({ status: 'fail', message: err.message, code: 400 });
    next();
  });
};

// All routes require a valid JWT
router.use(verifyToken);

// ISV or Admin: create a new AWS Marketplace publishing request
router.post('/requests', ctrl.createRequest);

// Admin: list all requests (with filters and search)
router.get('/requests', ctrl.listRequests);

// Admin: get a single request with full detail and audit log
router.get('/requests/:id', ctrl.getRequestById);

// Admin: reject a request
router.post('/requests/:id/reject', ctrl.rejectRequest);

// Admin: approve and submit a request to AWS
router.post('/requests/:id/approve-submit', ctrl.approveAndSubmit);

// Admin: poll the change-set status for a submitted request
router.get('/requests/:id/poll', ctrl.pollJobStatus);

// Admin: retry a failed request
router.post('/requests/:id/retry', ctrl.retryRequest);

// Admin: re-push current product data + config to an already-published listing
router.post('/requests/:id/update-listing', ctrl.updateListing);

// Admin: save/update AWS-specific config fields (product type, delivery, pricing, EULA, etc.)
// Does NOT submit to AWS — only persists the admin-filled fields into aws_payload
router.patch('/requests/:id/config', ctrl.saveAwsConfig);

// Admin: upload a listing logo (multipart, field "logo"). Normalises to PNG,
// stores in S3, and sets aws_payload.awsSpecific.logoUrl to the S3 URL.
router.post('/requests/:id/logo', handleLogoUpload, ctrl.uploadLogo);

// ISV or Admin: get the AWS Marketplace request status for a product
// Admin: edit the underlying product fields the listing is built from (descriptions, URLs)
router.patch('/requests/:id/product-fields', ctrl.updateProductFields);

router.get('/product-status/:productId', ctrl.getProductRequestStatus);

module.exports = router;
