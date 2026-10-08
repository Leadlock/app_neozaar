const express = require('express');
const router = express.Router();
const enumController = require('../controllers/enum.controller');
const { validate, enumValidationRules } = require('../middlewares/validator');

// Enum routes - only GET is allowed as per requirements
router.get('/', validate(enumValidationRules.get), enumController.getEnums);

module.exports = router;
