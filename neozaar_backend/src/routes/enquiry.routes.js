const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/auth');
const enquiryController = require('../controllers/enquiry.controller');
const { validationResult } = require('express-validator'); // Add this import
const { enquiryValidationRules } = require('../middlewares/validator');

// Middleware for role-based access
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role_type)) {
            return res.status(403).json({
                status: 'fail',
                message: 'Access denied',
                code: 403
            });
        }
        next();
    };
};

// Fixed validation middleware
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 'fail',
            message: 'Validation failed',
            errors: errors.array(),
            code: 400
        });
    }
    next();
};

// Create new enquiry - Only clients can create
router.post('/create/:productId',
    verifyToken,
   checkRole(['CLIENT']),
    enquiryValidationRules.create,
    validateRequest,
    enquiryController.createEnquiry
);

// Get all enquiries - All authenticated users
router.get('/',
    verifyToken,
    checkRole(['ADMIN', 'ISV', 'SUPPORT_PARTNER', 'ISV_SELLER', 'CLIENT','SUPER_ADMIN']),
    enquiryValidationRules.list,
    validateRequest,
    enquiryController.getAllEnquiries
);

// Get specific enquiry - All authenticated users
router.get('/:id',
    verifyToken,
    checkRole(['ADMIN', 'ISV', 'SUPPORT_PARTNER', 'ISV_SELLER', 'CLIENT','SUPER_ADMIN']),
    enquiryValidationRules.getById,
    validateRequest,
    enquiryController.getEnquiryById
);

// Update enquiry status - Admin and support roles only
router.post('/status/:id',
    verifyToken,
    checkRole(['ADMIN', 'SUPPORT_PARTNER', 'ISV_SELLER','SUPER_ADMIN']),
    enquiryValidationRules.updateStatus,
    validateRequest,
    enquiryController.updateEnquiryStatus
);

// Assign enquiry to partner - Admin only
router.post('/assign/:id',
    verifyToken,
    checkRole(['ADMIN','SUPER_ADMIN']),
    enquiryValidationRules.assignPartner,
    validateRequest,
    enquiryController.assignEnquiryToPartner
);

router.post('/update/:id',
    verifyToken,
    checkRole(['ADMIN', 'ISV', 'SUPPORT_PARTNER', 'ISV_SELLER','SUPER_ADMIN']),
    enquiryValidationRules.enquiryUpdateValidation,
    validateRequest,
    enquiryController.updateEnquiry
);
module.exports = router;
