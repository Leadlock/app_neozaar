const express = require('express');
const router = express.Router();
const verifyToken = require('../../middlewares/auth');
const ctrl = require('../../controllers/azure-marketplace/azure.marketplace.controller');

// All routes require a valid JWT
router.use(verifyToken);

// ISV or Admin: create a new Azure Marketplace publishing request
router.post('/requests', ctrl.createRequest);

// Admin: list all requests (with filters and search)
router.get('/requests', ctrl.listRequests);

// Admin: get a single request with full detail and audit log
router.get('/requests/:id', ctrl.getRequestById);

// Admin: reject a request
router.post('/requests/:id/reject', ctrl.rejectRequest);

// Admin: approve and submit a request to Azure
router.post('/requests/:id/approve-submit', ctrl.approveAndSubmit);

// Admin: poll the MS job status for a submitted request
router.get('/requests/:id/poll', ctrl.pollJobStatus);

// Admin: retry a failed request
router.post('/requests/:id/retry', ctrl.retryRequest);

// Admin: re-push current product data + config to an already-published offer
router.post('/requests/:id/update-listing', ctrl.updateListing);

// Admin: save/update Azure-specific config fields (offer type, plan, SaaS config, contacts, etc.)
// Does NOT submit to Microsoft — only persists the admin-filled fields into azure_payload
router.patch('/requests/:id/config', ctrl.saveAzureConfig);

// Admin: edit the underlying product fields the listing is built from (privacy URL, descriptions)
router.patch('/requests/:id/product-fields', ctrl.updateProductFields);

// ISV or Admin: get the Azure Marketplace request status for a product
router.get('/product-status/:productId', ctrl.getProductRequestStatus);

module.exports = router;
