const express = require('express');
const router = express.Router();

const cosell360Controller = require('../controllers/cosell360Controller');
const { rateLimit } = require('../middlewares/rateLimit.middleware');

// Public — the CoSell360 readiness assessment on /isv-registration/assessment.
router.post(
  '/cosell360/assessment',
  rateLimit({ windowMs: 60_000, max: 5, message: 'Too many submissions. Please try again shortly.' }),
  cosell360Controller.submitAssessment,
);

module.exports = router;
