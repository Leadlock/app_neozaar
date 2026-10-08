const express = require('express');
const verifyToken = require('../middlewares/auth');
const router = express.Router();

const { getProductDashboardStats, getLeadDataFilter, getNotifications } = require('../controllers/dashboard.controller');

router.get('/', verifyToken, getProductDashboardStats);
router.get('/leads/funnel', verifyToken, getLeadDataFilter);
router.get('/notifications', verifyToken, getNotifications);


module.exports = router;
