const { body, validationResult, param, query } = require('express-validator');
const { updatePrivateOffer, updateGeneralStatus } = require('../controllers/product.controller');

/**
 * Middleware to validate request data
 * @param {Array} validations - Array of validation rules
 * @returns {Function} Express middleware function
 */
const validate = (validations) => {
    return async (req, res, next) => {
        // Execute all validations
        await Promise.all(validations.map(validation => validation.run(req)));

        // Check for validation errors
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        // Return validation errors
        return res.status(400).json({ errors: errors.array() });
    };
};

// User validation rules
const userValidationRules = {
    create: [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        //body('role_type').isIn(['CLIENT', 'ISV', 'ADMIN', 'SUPPORT_PARTNER', 'ISV_SELLER']).withMessage('Invalid role type'),
        body('role_id').isInt().withMessage('Role ID must be an integer')
    ],
    update: [
        param('id').isInt().withMessage('User ID must be an integer'),
        body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')
    ],
    getById: [
        param('id').isInt().withMessage('User ID must be an integer')
    ],
    delete: [
        param('id').isInt().withMessage('User ID must be an integer')
    ]
};

// Auth validation rules
const authValidationRules = {
  login: [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  forgotPassword: [
    body('email').isEmail().withMessage('Valid email is required')
  ],
  sendOtp: [
    body('email').isEmail().withMessage('Valid email is required')
  ],
  verifyOtp: [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
  ],
  resetPassword: [
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('confirm_password').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
  ]
};


// Product validation rules
const productValidationRules = {
  create: [
    // ✅ SECURITY UPDATE: Remove user_id validation for ISV users
    // The controller will handle user_id assignment based on role
    body('user_id')
      .optional() // Make it optional since ISV users can't set it
      .toInt()
      .isInt().withMessage('User ID must be an integer')
      // .custom((value, { req }) => {
      //   // Only allow ADMIN users to specify user_id
      //   if (value && req.user.role_type === 'ISV') {
      //     throw new Error('ISV users cannot specify user_id');
      //   }
      //   return true;
      // }),

   , body('name')
      .trim()
      .notEmpty().withMessage('Product name is required'),

    body('action_type')
      .notEmpty().withMessage('Action type is required')
      .isIn(['product', 'bundle']).withMessage('Action type must be either "product" or "bundle"'),

    body('action_id')
      .notEmpty().withMessage('Action ID is required'),

    body('starting_price')
      .notEmpty().withMessage('Starting price is required')
      .isFloat({ min: 0 }).withMessage('Starting price must be a positive number'),

    body('license_type')
      .notEmpty().withMessage('License type is required'),    
body('demo_available')
    .optional()
    .isBoolean().withMessage('demo_available must be a boolean')
    .toBoolean(),

  // ✅ Trim whitespace from demo_person_email before custom validation
  body('demo_person_email')
    .customSanitizer(value => (typeof value === 'string' ? value.trim() : value))
    .custom((value, { req }) => {
      const isDemo = req.body.demo_available === true;

      // When demo is available, email must be valid
      if (isDemo) {
        if (
          value === undefined ||
          value === null ||
          typeof value !== 'string' ||
          value.trim() === ''
        ) {
          throw new Error('Demo person email is required when demo is available');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          throw new Error('Demo person email must be valid');
        }
      } else {
        // When demo is NOT available, email must NOT be provided
        if (value !== undefined && value !== null && value !== '') {
          throw new Error('Demo person email should not be provided when demo is not available');
        }
      }

      return true;
    }),
    body('launch_url')
      .optional()
      .isURL().withMessage('Launch URL must be valid'),

    body('status')
      .optional()
      .not().exists().withMessage('status cannot be set directly')
      .isBoolean().withMessage('Statuss must be a boolean')
      .toBoolean(),
    body('is_publish')
      .optional()
      .not().exists().withMessage('is_publish cannot be set directly')
      .isBoolean().withMessage('is_publish must be a boolean')
      .toBoolean(),
    body('approval')
      .optional()
      .not().exists().withMessage('only by admin')
      .isBoolean().withMessage('approval must be a boolean')
      .toBoolean(),
    body('has_private_offer')
       .optional()
      .isBoolean().withMessage('has_private_offer must be a boolean')
      .toBoolean()
  ],

  update: [
    param('id')
      .toInt()
      .isInt().withMessage('Product ID must be an integer'),

    // body('product_ids').not().exists().withMessage('product_ids cannot be updated'),
    body('action_id').not().exists().withMessage('action_id cannot be updated'),
    body('action_type').not().exists().withMessage('action_type cannot be updated'),
    body('is_publish').not().exists().withMessage('is_publish cannot be updated via update endpoint'),
    body('user_id').not().exists().withMessage('user_id cannot be updated'),

    body('name')
      .optional()
      .trim()
      .notEmpty().withMessage('Product name cannot be empty'),

    body('starting_price')
      .optional()
      .isFloat({ min: 0 }).withMessage('Starting price must be a positive number'),

    body('license_type')
      .optional()
      .notEmpty().withMessage('License type cannot be empty'),

    body('demo_available')
      .optional()
      .isBoolean().withMessage('Demo available must be a boolean')
      .toBoolean(),

    body('demo_person_email')
      .optional()
      .isEmail().withMessage('Demo person email must be valid'),

    body('launch_url')
      .optional()
      .isURL().withMessage('Launch URL must be valid'),

    body('status')
      .optional()
      .not().exists().withMessage('status cannot be set directly')
      .isBoolean().withMessage('is_publish must be a boolean')
  ],

  getById: [
    param('id')
      .toInt()
      .isInt().withMessage('Product ID must be an integer')
  ],

  getProducts: [
    query('page')
      .optional()
      .toInt()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

    query('limit')
      .optional()
      .toInt()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

    query('type')
      .optional()
      .isIn(['product', 'bundle']).withMessage('Type must be either "product" or "bundle"')
  ],
  
  getMarketplaceProducts: [
    query('type')
      .optional()
      .isIn(['product', 'bundle']).withMessage('Type must be either "product" or "bundle"'),

    query('category')
      .optional()
      .trim()
      .notEmpty().withMessage('Category cannot be empty'),

    query('search')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Search term must be between 2 and 100 characters')
  ],

  updateStatus: [
    param('id')
      .toInt()
      .isInt().withMessage('Product ID must be an integer'),

    body('is_publish')
      .optional()
      .isBoolean().withMessage('is_publish must be a boolean')
      .toBoolean(),

    body('approval')
      .optional()
      .isBoolean().withMessage('approval must be a boolean')
      .toBoolean()
      .custom((value, { req }) => {
        // Only ADMIN can set approval
        if (typeof value === 'boolean' && req.user.role_id !== 4) {
          throw new Error('Only admin can set approval status');
        }
        return true;
      }),

    // ✅ At least one field must be provided
    body().custom((value, { req }) => {
      if (!req.body.hasOwnProperty('is_publish') && !req.body.hasOwnProperty('approval')) {
        throw new Error('At least one field (is_publish or approval) must be provided');
      }
      return true;
    })
  ],
  updatePrivateOffer: [
    param('id')
      .toInt()
      .isInt().withMessage('Product ID must be an integer'),

    body('has_private_offer')
      .optional()
      .isBoolean().withMessage('has_private_offer must be a boolean')
      .toBoolean()
  ],
  updateGeneralStatus: [
    param('id')
      .toInt()
      .isInt().withMessage('Product ID must be an integer'),

    body('general_status')
      .optional()
      .isBoolean().withMessage('has_private_offer must be a boolean')
      .toBoolean()
  ]

};
// Enquiry validation rules
// const enquiryValidationRules = {
//     create: [
//         body('user_id').isInt().withMessage('User ID must be an integer'),
//         body('product_id').isInt().withMessage('Product ID must be an integer'),
//         body('enquiry_type').notEmpty().withMessage('Enquiry type is required')
//     ],
//     updateStatus: [
//         param('id').isInt().withMessage('Enquiry ID must be an integer'),
//         body('status').notEmpty().withMessage('Status is required')
//     ]
// };

const enquiryValidationRules = {
    // Create enquiry validation rules
    create: [
        param('productId')
            .isInt()
            .withMessage('Invalid product ID'),
        body('full_name')
            .notEmpty()
            .trim()
            .withMessage('Full name is required'),
        body('business_email')
            .notEmpty()
            .isEmail()
            .normalizeEmail()
            .withMessage('Valid business email is required'),
        body('company_name')
            .notEmpty()
            .trim()
            .withMessage('Company name is required'),
        body('country_or_region')
            .notEmpty()
            .trim()
            .withMessage('Country or region is required'),
        body('requirements')
            .notEmpty()
            .trim()
            .withMessage('Requirements are required'),
        body('consent')
            .isBoolean()
            .equals('true')
            .withMessage('Consent must be provided'),
        
        // Optional fields
        body('phone_number')
            .optional()
            .trim(),
        body('company_website')
            .optional()
            .isURL()
            .withMessage('Invalid website URL'),
        body('expected_usage')
            .optional()
            .trim(),
        body('preferred_contact_method')
            .optional()
            .isIn(['Email', 'Call', 'WhatsApp', 'Teams'])
            .withMessage('Invalid contact method'),
        
        // AWS validations
        body('aws_details.aws_account_id')
            .optional()
            .matches(/^\d{12}$/)
            .withMessage('AWS Account ID must be 12 digits'),
        body('aws_details.services_of_interest')
            .optional(),
        
        // Azure validations
        body('azure_details.azure_tenant_id')
            .optional()
            .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
            .withMessage('Invalid Azure Tenant ID format'),
        body('azure_details.azure_subscription_id')
            .optional()
            .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
            .withMessage('Invalid Azure Subscription ID format'),
        body('azure_details.azure_product_or_service')
            .optional()
            .trim()
    ],

    // List enquiries validation rules
    list: [
        query('status')
            .optional()
            .isIn(['PENDING', 'COMPLETED', 'CANCELLED'])
            .withMessage('Invalid status'),
        query('enquiry_type')
            .optional()
            .isIn(['AWS_PRIVATE_OFFER', 'AZURE_PRIVATE_OFFER', 'MULTI_CLOUD_PRIVATE_OFFER', 'GENERAL_PRIVATE_OFFER'])
            .withMessage('Invalid enquiry type')
    ],

    // Get by ID validation rules
    getById: [
        param('id')
            .isInt()
            .withMessage('Invalid enquiry ID')
    ],

    // Update status validation rules
    updateStatus: [
        param('id')
            .isInt()
            .withMessage('Invalid enquiry ID'),
        body('status')
            .isIn(['PENDING', 'COMPLETED', 'CANCELLED'])
            .withMessage('Invalid status'),
        body('remarks')
            .optional()
            .trim()
            .isLength({ min: 1 })
            .withMessage('Remarks cannot be empty if provided')
    ],

    // Assign partner validation rules
    assignPartner: [
        param('id')
            .isInt()
            .withMessage('Invalid enquiry ID'),
        body('partner_id')
            .isInt()
            .withMessage('Invalid partner ID')
    ],

    enquiryUpdateValidation : [
    // ID parameter validation
    param('id')
        .isInt()
        .withMessage('Invalid enquiry ID'),

    // Basic information
    body('full_name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Full name cannot be empty')
        .isLength({ max: 255 })
        .withMessage('Full name must be less than 255 characters'),

    body('business_email')
        .optional()
        .trim()
        .isEmail()
        .withMessage('Invalid email format')
        .matches(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/)
        .withMessage('Invalid email format'),

    body('phone_number')
        .optional()
        .trim()
        .matches(/^\+?[1-9]\d{1,14}$/)
        .withMessage('Invalid phone number format'),

    body('company_name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Company name cannot be empty')
        .isLength({ max: 255 })
        .withMessage('Company name must be less than 255 characters'),

    body('company_website')
        .optional()
        .trim()
        .isURL()
        .withMessage('Invalid website URL'),

    body('country_or_region')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Country or region cannot be empty')
        .isLength({ max: 100 })
        .withMessage('Country or region must be less than 100 characters'),

    body('expected_usage')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Expected usage must be less than 1000 characters'),

    body('requirements')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Requirements cannot be empty')
        .isLength({ max: 2000 })
        .withMessage('Requirements must be less than 2000 characters'),

    body('preferred_contact_method')
        .optional()
        .trim()
        .isIn(['Email', 'Call', 'WhatsApp', 'Teams'])
        .withMessage('Invalid contact method'),

    body('remarks')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Remarks must be less than 1000 characters'),

    // AWS Details Validation
    body('aws_details.aws_account_id')
        .optional()
        .trim()
        .matches(/^\d{12}$/)
        .withMessage('AWS Account ID must be exactly 12 digits'),

    body('aws_details.services_of_interest')
        .optional()
        .custom((value) => {
            if (Array.isArray(value)) {
                return value.every(item => typeof item === 'string' && item.trim().length > 0);
            }
            if (typeof value === 'string') {
                return value.split(',').every(item => item.trim().length > 0);
            }
            return true;
        })
        .withMessage('Invalid services of interest format'),

    // Azure Details Validation
    body('azure_details.azure_tenant_id')
        .optional()
        .trim()
        .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
        .withMessage('Invalid Azure Tenant ID format'),

    body('azure_details.azure_subscription_id')
        .optional()
        .trim()
        .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
        .withMessage('Invalid Azure Subscription ID format'),

    body('azure_details.azure_product_or_service')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('Azure product or service must be less than 255 characters')
]
};


// Enum validation rules
const enumValidationRules = {
    get: [
        query('name').optional().isString().withMessage('Name must be a string')
    ]
};

const validateContactForm = [
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('business_email')
    .isEmail().withMessage('Valid business email is required')
    .custom((val) => {
      if (val.endsWith('@gmail.com') || val.endsWith('@yahoo.com')) {
        throw new Error('Use your company email address');
      }
      return true;
    }),
 body('phone_number')
  .optional()
  .matches(/^[+]?[\d\s-]{7,20}$/)
  .withMessage('Invalid phone number format'),

  body('company_name').optional().isString(),
  body('country').optional().isString(),
  body('help_type').notEmpty().isIn([
    'Product Enquiry',
    'Partnership',
    'Technical Support',
    'Billing Enquiry',
    'Other'
  ]),
  body('message').notEmpty().withMessage('Message is required'),
  body('heard_about').optional().isString(),
  body('consent_given').isBoolean().withMessage('Consent checkbox is required')
];

module.exports = {
    validate,
    userValidationRules,
    authValidationRules,
    productValidationRules,
    enquiryValidationRules,
    enumValidationRules,
    validateContactForm
};
