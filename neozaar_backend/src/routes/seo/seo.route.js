const express = require('express');
const verifyToken = require('../../middlewares/auth');
const { createSeoData, getSeoDataByPageUrl, updateSeoData, deleteSeoData, getSeoPages } = require('../../controllers/SeoController/seo.controller');
const router = express.Router();

router.post('/create', verifyToken, createSeoData);
router.get('/page/:pageUrl', getSeoDataByPageUrl);
router.get('/get-all', verifyToken, getSeoPages);
router.post('/update/:seoId', verifyToken, updateSeoData);
router.get('/delete/:seoId', verifyToken, deleteSeoData);

module.exports = router;
