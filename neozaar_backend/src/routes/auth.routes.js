const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/auth');

const {
  login,
  forgotPassword,
  sendOtp,
  verifyOtp,
  resetPassword,
  userLoginData
} = require('../controllers/auth.controller');
const { validate, authValidationRules } = require('../middlewares/validator');
const socialAuthController = require('../controllers/social-auth.controller');

// Auth routes
router.get('/get_token-user', verifyToken, userLoginData);
router.post('/login', validate(authValidationRules.login), login);
router.post('/admin/login', validate(authValidationRules.login), login);
router.post('/forget-password', validate(authValidationRules.forgotPassword), forgotPassword);
router.post('/reset-password', validate(authValidationRules.resetPassword), resetPassword);
router.post('/verify-email', validate(authValidationRules.verifyOtp), verifyOtp);  // Renamed from verify-otp to verify-email as per requirements
router.post('/send-otp', validate(authValidationRules.sendOtp), sendOtp);
router.get('/oauth/:provider/start', socialAuthController.start);
router.get('/oauth/:provider/callback', socialAuthController.callback);
router.post('/oauth/exchange', socialAuthController.exchange);

module.exports = router;
