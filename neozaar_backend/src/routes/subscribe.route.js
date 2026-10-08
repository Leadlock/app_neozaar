// routes/leadRoutes.js
const express = require('express');
const router = express.Router();
const SubcribeController = require('../controllers/subscribe.controller');


router.post('/create', SubcribeController.createSibscribe);

module.exports = router;
