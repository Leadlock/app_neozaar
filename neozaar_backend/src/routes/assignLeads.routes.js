const express = require('express');
const verifyToken = require('../middlewares/auth');
const { assignLead } = require('../controllers/assignLead.controller');
const router = express.Router();

router.post(
    '/:lead_id',
    verifyToken, assignLead);

module.exports = router;
