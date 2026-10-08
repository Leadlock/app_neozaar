// src/routes/pricingRoutes.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/auth');
const priceController = require('../controllers/pricing.controller');

router.post('/create', verifyToken, priceController.createPricing);
router.post('/update/:id', verifyToken, priceController.updatePricing);
router.get('/delete/:id', verifyToken, priceController.deletePrice);
router.post('/getByProduct', verifyToken, priceController.getAllPriceByProductId);

module.exports = router;
