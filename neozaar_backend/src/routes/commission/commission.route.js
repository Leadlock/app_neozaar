const express = require('express');
const router = express.Router();

const commisionController = require('../../controllers/commission/commission.controller');
const verifyToken = require('../../middlewares/auth');


// Admin-only routes - use verifyToken only
router.post('/create', verifyToken, commisionController.createCommission);
router.get('/get-by-isv/:isvId', verifyToken, commisionController.getCommissionByIsvId);



module.exports = router;
