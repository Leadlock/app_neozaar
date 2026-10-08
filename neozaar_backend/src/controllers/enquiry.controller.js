const pool = require('../config/database');
const { validateEmail, validateUUID, validateAWSAccountId } = require('../utils/validators');

// Helper function for common validation
const validateEnquiryData = (data) => {
    const errors = [];
    
    // Required fields validation
    const requiredFields = [
        'full_name', 
        'business_email', 
        'company_name', 
        'country_or_region', 
        'requirements',
        'consent'
    ];

    requiredFields.forEach(field => {
        if (!data[field]) {
            errors.push(`${field} is required`);
        }
    });

    // Consent validation - must be true
    if (data.consent !== true) {
        errors.push('Consent must be provided and must be true');
    }

    // Email validation
    if (data.business_email && !validateEmail(data.business_email)) {
        errors.push('Invalid business email format');
    }

    // AWS Account ID validation (if provided)
    if (data.aws_details?.aws_account_id && !validateAWSAccountId(data.aws_details.aws_account_id)) {
        errors.push('Invalid AWS Account ID format. Must be 12 digits.');
    }

    // Azure UUID validations (if provided)
    if (data.azure_details?.azure_tenant_id && !validateUUID(data.azure_details.azure_tenant_id)) {
        errors.push('Invalid Azure Tenant ID format');
    }
    if (data.azure_details?.azure_subscription_id && !validateUUID(data.azure_details.azure_subscription_id)) {
        errors.push('Invalid Azure Subscription ID format');
    }

    // Preferred contact method validation
    const validContactMethods = ['Email', 'Call', 'WhatsApp', 'Teams'];
    if (data.preferred_contact_method && !validContactMethods.includes(data.preferred_contact_method)) {
        errors.push('Invalid preferred contact method');
    }

    return errors;
};
// ============================= CREATE ENQUIRY ============================= //
const createEnquiry = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { productId } = req.params;

        const { 
            full_name,
            business_email,
            phone_number,
            company_name,
            company_website,
            country_or_region,
            expected_usage,
            requirements,
            preferred_contact_method,
            consent,
            aws_details,
            azure_details,
            remarks 
        } = req.body;

        // Consent check
        if (!consent) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                status: 'fail',
                message: 'Consent is required to submit the enquiry',
                code: 400
            });
        }

        // Validate input data
        const validationErrors = validateEnquiryData(req.body);
        if (validationErrors.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                status: 'fail',
                message: 'Validation failed',
                errors: validationErrors,
                code: 400
            });
        }

        // Get product and ISV details
        const productResult = await client.query(
            `SELECT p.*, isv.cloud_platforms
             FROM products p
             JOIN isv_users isv ON p.user_id = isv.user_id
             WHERE p.id = $1 AND p.is_publish = true`,
            [productId]
        );

        if (productResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                status: 'fail',
                message: 'Product not found or not available for enquiry',
                code: 404
            });
        }

        const product = productResult.rows[0];
        const cloud_platforms = product.cloud_platforms || [];

        // Determine enquiry type
        let enquiry_type;
        const hasAWS = cloud_platforms.includes('AWS') || cloud_platforms.includes('BOTH');
        const hasAzure = cloud_platforms.includes('AZURE') || cloud_platforms.includes('BOTH');

        if (hasAWS && hasAzure) {
            enquiry_type = 'MULTI_CLOUD_PRIVATE_OFFER';
        } else if (hasAWS) {
            enquiry_type = 'AWS_PRIVATE_OFFER';
        } else if (hasAzure) {
            enquiry_type = 'AZURE_PRIVATE_OFFER';
        } else {
            enquiry_type = 'GENERAL_PRIVATE_OFFER';
        }


        // Format services_of_interest if it's a comma-separated string
let formattedServicesOfInterest = null;
if (hasAWS && aws_details?.services_of_interest) {
    if (typeof aws_details.services_of_interest === 'string') {
        formattedServicesOfInterest = Array.from(
            new Set(
                aws_details.services_of_interest
                    .split(',')
                    .map(item => item.trim())
                    .filter(Boolean)
            )
        );
    } else if (Array.isArray(aws_details.services_of_interest)) {
        formattedServicesOfInterest = Array.from(
            new Set(
                aws_details.services_of_interest
                    .map(item => item.trim())
                    .filter(Boolean)
            )
        );
    }
}

        // Insert enquiry
        const insertQuery = `
            INSERT INTO private_offer_enquiries (
                user_id, product_id, enquiry_type, status, remarks,
                full_name, business_email, phone_number, company_name,
                company_website, country_or_region, expected_usage,
                requirements, preferred_contact_method, consent,
                aws_account_id, services_of_interest,
                azure_tenant_id, azure_subscription_id, azure_product_or_service,
                created_by, created_at, updated_by, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                $13, $14, $15, $16, $17, $18, $19, $20, $21, 
                CURRENT_TIMESTAMP, $21, CURRENT_TIMESTAMP
            ) RETURNING *`;

        const result = await client.query(insertQuery, [
            req.user.id,         // user_id
            productId,           // product_id
            enquiry_type,        // enquiry_type
            'PENDING',          // status
            remarks || null,     // remarks
            full_name,          // full_name
            business_email,     // business_email
            phone_number || null, // phone_number
            company_name,       // company_name
            company_website || null, // company_website
            country_or_region,  // country_or_region
            expected_usage || null, // expected_usage
            requirements,       // requirements
            preferred_contact_method || null, // preferred_contact_method
            consent,            // consent
            hasAWS ? aws_details?.aws_account_id || null : null,         // aws_account_id
            hasAWS ? formattedServicesOfInterest : null, // services_of_interest
            hasAzure ? azure_details?.azure_tenant_id || null : null,       // azure_tenant_id
            hasAzure ? azure_details?.azure_subscription_id || null : null, // azure_subscription_id
            hasAzure ? azure_details?.azure_product_or_service || null : null, // azure_product_or_service
            req.user.id         // created_by
        ]);

        await client.query('COMMIT');

        // Marketing: score/segment/automate on this private-offer enquiry.
        // The `consent` field above is consent to submit THIS enquiry (share
        // AWS/Azure account details) — unrelated to and never used to imply
        // Marketing email/WhatsApp/SMS consent, which stays its own explicit
        // opt-in. Never allowed to fail the enquiry itself.
        try {
            const enquiryRow = result.rows[0];
            if (enquiryRow.business_email || enquiryRow.phone_number) {
                const ingestion = require('../services/marketing/event-ingestion.service');
                await ingestion.ingestEvent({
                    email: enquiryRow.business_email || null,
                    phone: enquiryRow.phone_number || null,
                    eventType: 'PRIVATE_OFFER_REQUEST',
                    refType: 'product',
                    refId: enquiryRow.product_id,
                    channel: 'web',
                    metadata: { enquiryId: enquiryRow.id, enquiryType: enquiryRow.enquiry_type },
                    ingestionSource: 'enquiry',
                });
            }
        } catch (marketingError) {
            console.error('Marketing enquiry event ingestion failed:', marketingError?.message || marketingError);
        }

        // Format the response based on enquiry type
        const enquiry = result.rows[0];
        const responseData = {
            id: enquiry.id,
            user_id: enquiry.user_id,
            product_id: enquiry.product_id,
            enquiry_type: enquiry.enquiry_type,
            status: enquiry.status,
            full_name: enquiry.full_name,
            business_email: enquiry.business_email,
            phone_number: enquiry.phone_number,
            company_name: enquiry.company_name,
            company_website: enquiry.company_website,
            country_or_region: enquiry.country_or_region,
            expected_usage: enquiry.expected_usage,
            requirements: enquiry.requirements,
            preferred_contact_method: enquiry.preferred_contact_method,
            remarks: enquiry.remarks,
            created_at: enquiry.created_at,
            updated_at: enquiry.updated_at
        };

        // Add AWS details only if it's AWS or Multi-cloud
        if (hasAWS) {
            responseData.aws_details = {
                aws_account_id: enquiry.aws_account_id,
                services_of_interest: enquiry.services_of_interest
            };
        }

        // Add Azure details only if it's Azure or Multi-cloud
        if (hasAzure) {
            responseData.azure_details = {
                azure_tenant_id: enquiry.azure_tenant_id,
                azure_subscription_id: enquiry.azure_subscription_id,
                azure_product_or_service: enquiry.azure_product_or_service
            };
        }
        
        res.status(201).json({
            status: 'success',
            message: 'Enquiry created successfully',
            data: responseData,
            code: 201
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in createEnquiry:', error);
        
        if (error.code === '23503') {
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid reference data provided',
                code: 400
            });
        }

        res.status(500).json({
            status: 'fail',
            message: 'Internal server error',
            code: 500
        });
    } finally {
        client.release();
    }
};
// ============================= GET ALL ENQUIRIES ============================= //
// ============================= GET ALL ENQUIRIES ============================= //
const getAllEnquiries = async (req, res) => {
    const client = await pool.connect();
    try {
        let query = '';
        const params = [];
        let paramCount = 1;

        const baseQuery = `
            SELECT 
                e.*,
                p.name as product_name,
                p.user_id as isv_id,
                u.name as created_by_name,
                partner.name as assigned_to_name,
                isv.cloud_platforms
            FROM private_offer_enquiries e
            LEFT JOIN products p ON e.product_id = p.id
            LEFT JOIN users u ON e.created_by = u.id
            LEFT JOIN users partner ON e.assign_to = partner.id
            LEFT JOIN isv_users isv ON p.user_id = isv.user_id
        `;

        // Role-based filtering
        switch (req.user.role_type) {
            case 'SUPER_ADMIN':
                query = baseQuery;
                break;

            case 'ISV':
                query = `${baseQuery} WHERE p.user_id = $${paramCount}`;
                params.push(req.user.id);
                paramCount++;
                break;

            case 'SUPPORT_PARTNER':
            case 'ISV_SELLER':
                query = `${baseQuery} WHERE e.assign_to = $${paramCount}`;
                params.push(req.user.id);
                paramCount++;
                break;

            case 'CLIENT':
                query = `${baseQuery} WHERE e.user_id = $${paramCount}`;
                params.push(req.user.id);
                paramCount++;
                break;

            default:
                return res.status(403).json({
                    status: 'fail',
                    message: 'Invalid role type',
                    code: 403
                });
        }

        // Add filters
        if (req.query.status) {
            query += ` ${params.length ? 'AND' : 'WHERE'} e.status = $${paramCount}`;
            params.push(req.query.status);
            paramCount++;
        }

        if (req.query.enquiry_type) {
            query += ` ${params.length ? 'AND' : 'WHERE'} e.enquiry_type = $${paramCount}`;
            params.push(req.query.enquiry_type);
            paramCount++;
        }

        // Add sorting
        query += ' ORDER BY e.created_at DESC';

        const result = await client.query(query, params);

        // Format the response
        const formattedEnquiries = result.rows.map(enquiry => {
            const baseResponse = {
                id: enquiry.id,
                user_id: enquiry.user_id,
                product_id: enquiry.product_id,
                product_name: enquiry.product_name,
                enquiry_type: enquiry.enquiry_type,
                status: enquiry.status,
                full_name: enquiry.full_name,
                business_email: enquiry.business_email,
                phone_number: enquiry.phone_number,
                company_name: enquiry.company_name,
                company_website: enquiry.company_website,
                country_or_region: enquiry.country_or_region,
                expected_usage: enquiry.expected_usage,
                requirements: enquiry.requirements,
                preferred_contact_method: enquiry.preferred_contact_method,
                remarks: enquiry.remarks,
                created_by: enquiry.created_by,
                created_by_name: enquiry.created_by_name,
                created_at: enquiry.created_at,
                updated_by: enquiry.updated_by,
                updated_at: enquiry.updated_at,
                assign_to: enquiry.assign_to,
                assigned_to_name: enquiry.assigned_to_name,
                assigned_by: enquiry.assigned_by,
                assigned_at: enquiry.assigned_at
            };

            const cloud_platforms = enquiry.cloud_platforms || [];
            const hasAWS = cloud_platforms.includes('AWS') || cloud_platforms.includes('BOTH');
            const hasAzure = cloud_platforms.includes('AZURE') || cloud_platforms.includes('BOTH');

            // Add AWS details only if it's AWS or Multi-cloud
            if (hasAWS && enquiry.aws_account_id) {
                baseResponse.aws_details = {
                    aws_account_id: enquiry.aws_account_id,
                    services_of_interest: enquiry.services_of_interest
                };
            }

            // Add Azure details only if it's Azure or Multi-cloud
            if (hasAzure && (enquiry.azure_tenant_id || enquiry.azure_subscription_id || enquiry.azure_product_or_service)) {
                baseResponse.azure_details = {
                    azure_tenant_id: enquiry.azure_tenant_id,
                    azure_subscription_id: enquiry.azure_subscription_id,
                    azure_product_or_service: enquiry.azure_product_or_service
                };
            }

            return baseResponse;
        });

        res.json({
            status: 'success',
            message: 'Enquiries fetched successfully',
            data: formattedEnquiries,
            code: 200
        });

    } catch (error) {
        console.error('Error in getAllEnquiries:', error);
        res.status(500).json({
            status: 'fail',
            message: 'Internal server error',
            code: 500
        });
    } finally {
        client.release();
    }
};

// ============================= GET ENQUIRY BY ID ============================= //
// ============================= GET ENQUIRY BY ID ============================= //
const getEnquiryById = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        const query = `
            SELECT 
                e.*,
                p.name as product_name,
                p.user_id as isv_id,
                u.name as created_by_name,
                partner.name as assigned_to_name,
                isv.cloud_platforms
            FROM private_offer_enquiries e
            LEFT JOIN products p ON e.product_id = p.id
            LEFT JOIN users u ON e.created_by = u.id
            LEFT JOIN users partner ON e.assign_to = partner.id
            LEFT JOIN isv_users isv ON p.user_id = isv.user_id
            WHERE e.id = $1
        `;

        const result = await client.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: 'fail',
                message: 'Enquiry not found',
                code: 404
            });
        }

        const enquiry = result.rows[0];

        // Check access rights based on role
        const hasAccess = 
            req.user.role_id === 4 || 
            req.user.id === enquiry.user_id || 
            req.user.id === enquiry.isv_id || 
            req.user.id === enquiry.assign_to;

        if (!hasAccess) {
            return res.status(403).json({
                status: 'fail',
                message: 'Access denied',
                code: 403
            });
        }

        // Format the response
        const cloud_platforms = enquiry.cloud_platforms || [];
        const hasAWS = cloud_platforms.includes('AWS') || cloud_platforms.includes('BOTH');
        const hasAzure = cloud_platforms.includes('AZURE') || cloud_platforms.includes('BOTH');

        const responseData = {
            id: enquiry.id,
            user_id: enquiry.user_id,
            product_id: enquiry.product_id,
            product_name: enquiry.product_name,
            enquiry_type: enquiry.enquiry_type,
            status: enquiry.status,
            full_name: enquiry.full_name,
            business_email: enquiry.business_email,
            phone_number: enquiry.phone_number,
            company_name: enquiry.company_name,
            company_website: enquiry.company_website,
            country_or_region: enquiry.country_or_region,
            expected_usage: enquiry.expected_usage,
            requirements: enquiry.requirements,
            preferred_contact_method: enquiry.preferred_contact_method,
            remarks: enquiry.remarks,
            created_by: enquiry.created_by,
            created_by_name: enquiry.created_by_name,
            created_at: enquiry.created_at,
            updated_by: enquiry.updated_by,
            updated_at: enquiry.updated_at,
            assign_to: enquiry.assign_to,
            assigned_to_name: enquiry.assigned_to_name,
            assigned_by: enquiry.assigned_by,
            assigned_at: enquiry.assigned_at
        };

        // Add AWS details only if it's AWS or Multi-cloud
        if (hasAWS && enquiry.aws_account_id) {
            responseData.aws_details = {
                aws_account_id: enquiry.aws_account_id,
                services_of_interest: enquiry.services_of_interest
            };
        }

        // Add Azure details only if it's Azure or Multi-cloud
        if (hasAzure && (enquiry.azure_tenant_id || enquiry.azure_subscription_id || enquiry.azure_product_or_service)) {
            responseData.azure_details = {
                azure_tenant_id: enquiry.azure_tenant_id,
                azure_subscription_id: enquiry.azure_subscription_id,
                azure_product_or_service: enquiry.azure_product_or_service
            };
        }

        res.json({
            status: 'success',
            message: 'Enquiry fetched successfully',
            data: responseData,
            code: 200
        });

    } catch (error) {
        console.error('Error in getEnquiryById:', error);
        res.status(500).json({
            status: 'fail',
            message: 'Internal server error',
            code: 500
        });
    } finally {
        client.release();
    }
};
// ============================= UPDATE ENQUIRY STATUS ============================= //
const updateEnquiryStatus = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const { status, remarks } = req.body;

        // Validate status
        const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid status',
                code: 400
            });
        }

        const enquiryCheck = await client.query(
            'SELECT * FROM private_offer_enquiries WHERE id = $1',
            [id]
        );

        if (enquiryCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                status: 'fail',
                message: 'Enquiry not found',
                code: 404
            });
        }

        const enquiry = enquiryCheck.rows[0];

        // Check if status can be updated
        if (enquiry.status === 'COMPLETED' || enquiry.status === 'CANCELLED') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                status: 'fail',
                message: `Cannot update status. Enquiry is already ${enquiry.status}`,
                code: 400
            });
        }

        // Get current UTC timestamp
        const currentUtc = new Date().toISOString();

        // Update status
        const result = await client.query(
            `UPDATE private_offer_enquiries 
             SET status = $1, 
                 remarks = $2, 
                 updated_by = $3, 
                 updated_at = $4 
             WHERE id = $5 
             RETURNING *`,
            [status, remarks, req.user.id, currentUtc, id]
        );

        await client.query('COMMIT');

        res.json({
            status: 'success',
            message: 'Enquiry status updated successfully',
            data: result.rows[0],
            code: 200
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in updateEnquiryStatus:', error);
        res.status(500).json({
            status: 'fail',
            message: 'Internal server error',
            code: 500
        });
    } finally {
        client.release();
    }
};

// ============================= ASSIGN ENQUIRY TO PARTNER ============================= //
const assignEnquiryToPartner = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const { partner_id } = req.body;

        // Check if user is admin
        if (req.user.role_id !== 4 ) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                status: 'fail',
                message: 'Only admin can assign enquiries',
                code: 403
            });
        }

        // Check if partner exists and has correct role
        const partnerCheck = await client.query(
            "SELECT * FROM users WHERE id = $1 AND role_type IN ('SUPPORT_PARTNER', 'ISV_SELLER')",
            [partner_id]
        );

        if (partnerCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                status: 'fail',
                message: 'Partner not found or invalid role',
                code: 404
            });
        }

        // Check if enquiry exists
        const enquiryCheck = await client.query(
            'SELECT * FROM private_offer_enquiries WHERE id = $1',
            [id]
        );

        if (enquiryCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                status: 'fail',
                message: 'Enquiry not found',
                code: 404
            });
        }

        // Get current UTC timestamp
        const currentUtc = new Date().toISOString();

        // Assign enquiry to partner
        const result = await client.query(
            `UPDATE private_offer_enquiries 
             SET assign_to = $1,
                 assigned_by = $2,
                 assigned_at = $3,
                 updated_by = $2,
                 updated_at = $3,
                 status = CASE 
                    WHEN status = 'PENDING' THEN 'IN_PROGRESS'
                    ELSE status
                 END
             WHERE id = $4 
             RETURNING *`,
            [partner_id, req.user.id, currentUtc, id]
        );

        await client.query('COMMIT');

        res.json({
            status: 'success',
            message: 'Enquiry assigned successfully',
            data: result.rows[0],
            code: 200
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in assignEnquiryToPartner:', error);
        res.status(500).json({
            status: 'fail',
            message: 'Internal server error',
            code: 500
        });
    } finally {
        client.release();
    }
};
// ============================= UPDATE ENQUIRY ============================= //
const updateEnquiry = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const { 
            full_name,
            business_email,
            phone_number,
            company_name,
            company_website,
            country_or_region,
            expected_usage,
            requirements,
            preferred_contact_method,
            aws_details,
            azure_details,
            remarks 
        } = req.body;

        // Get existing enquiry with product and ISV info
        const enquiryCheck = await client.query(
            `SELECT e.*, p.user_id as isv_id, isv.cloud_platforms
             FROM private_offer_enquiries e
             LEFT JOIN products p ON e.product_id = p.id
             LEFT JOIN isv_users isv ON p.user_id = isv.user_id
             WHERE e.id = $1`,
            [id]
        );

        if (enquiryCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                status: 'fail',
                message: 'Enquiry not found',
                code: 404
            });
        }

        const existingEnquiry = enquiryCheck.rows[0];

        // Check access rights - only admin or the creator can update
        const hasAccess = 
            req.user.role_id === 4 || 
            req.user.id === existingEnquiry.user_id;

        if (!hasAccess) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                status: 'fail',
                message: 'Access denied. Only Super admin or the creator can update the enquiry',
                code: 403
            });
        }

        // Check if enquiry can be updated
        if (existingEnquiry.status === 'COMPLETED' || existingEnquiry.status === 'CANCELLED') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                status: 'fail',
                message: `Cannot update enquiry. Status is ${existingEnquiry.status}`,
                code: 400
            });
        }

        // Validate input data if provided
        if (business_email) {
            const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
            if (!emailRegex.test(business_email)) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    status: 'fail',
                    message: 'Invalid email format',
                    code: 400
                });
            }
        }

        if (preferred_contact_method && !['Email', 'Call', 'WhatsApp', 'Teams'].includes(preferred_contact_method)) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid preferred contact method',
                code: 400
            });
        }

        // Format services_of_interest if provided
        const cloud_platforms = existingEnquiry.cloud_platforms || [];
        const hasAWS = cloud_platforms.includes('AWS') || cloud_platforms.includes('BOTH');
        const hasAzure = cloud_platforms.includes('AZURE') || cloud_platforms.includes('BOTH');

        let formattedServicesOfInterest = existingEnquiry.services_of_interest;
        if (hasAWS && aws_details?.services_of_interest) {
            if (typeof aws_details.services_of_interest === 'string') {
                formattedServicesOfInterest = Array.from(
                    new Set(
                        aws_details.services_of_interest
                            .split(',')
                            .map(item => item.trim())
                            .filter(Boolean)
                    )
                );
            } else if (Array.isArray(aws_details.services_of_interest)) {
                formattedServicesOfInterest = Array.from(
                    new Set(
                        aws_details.services_of_interest
                            .map(item => item.trim())
                            .filter(Boolean)
                    )
                );
            }
        }

        // Build update query dynamically
        const updates = [];
        const values = [];
        let valueCount = 1;

        // Helper function to add update fields
        const addUpdate = (field, value) => {
            if (value !== undefined) {
                updates.push(`${field} = $${valueCount}`);
                values.push(value);
                valueCount++;
            }
        };

        // Add all possible updates
        addUpdate('full_name', full_name);
        addUpdate('business_email', business_email);
        addUpdate('phone_number', phone_number);
        addUpdate('company_name', company_name);
        addUpdate('company_website', company_website);
        addUpdate('country_or_region', country_or_region);
        addUpdate('expected_usage', expected_usage);
        addUpdate('requirements', requirements);
        addUpdate('preferred_contact_method', preferred_contact_method);
        addUpdate('remarks', remarks);

        // AWS details
        if (hasAWS) {
            addUpdate('aws_account_id', aws_details?.aws_account_id);
            addUpdate('services_of_interest', formattedServicesOfInterest);
        }

        // Azure details
        if (hasAzure) {
            addUpdate('azure_tenant_id', azure_details?.azure_tenant_id);
            addUpdate('azure_subscription_id', azure_details?.azure_subscription_id);
            addUpdate('azure_product_or_service', azure_details?.azure_product_or_service);
        }

        // Add metadata updates
        addUpdate('updated_by', req.user.id);
        updates.push('updated_at = CURRENT_TIMESTAMP');

        if (updates.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                status: 'fail',
                message: 'No fields to update',
                code: 400
            });
        }

        // Perform update
        const updateQuery = `
            UPDATE private_offer_enquiries 
            SET ${updates.join(', ')}
            WHERE id = $${valueCount}
            RETURNING *
        `;

        values.push(id);
        const result = await client.query(updateQuery, values);

        await client.query('COMMIT');

        // Format the response
        const updatedEnquiry = result.rows[0];
        const responseData = {
            id: updatedEnquiry.id,
            user_id: updatedEnquiry.user_id,
            product_id: updatedEnquiry.product_id,
            enquiry_type: updatedEnquiry.enquiry_type,
            status: updatedEnquiry.status,
            full_name: updatedEnquiry.full_name,
            business_email: updatedEnquiry.business_email,
            phone_number: updatedEnquiry.phone_number,
            company_name: updatedEnquiry.company_name,
            company_website: updatedEnquiry.company_website,
            country_or_region: updatedEnquiry.country_or_region,
            expected_usage: updatedEnquiry.expected_usage,
            requirements: updatedEnquiry.requirements,
            preferred_contact_method: updatedEnquiry.preferred_contact_method,
            remarks: updatedEnquiry.remarks,
            created_at: updatedEnquiry.created_at,
            updated_at: updatedEnquiry.updated_at,
            updated_by: updatedEnquiry.updated_by
        };

        // Add AWS details only if it's AWS or Multi-cloud
        if (hasAWS) {
            responseData.aws_details = {
                aws_account_id: updatedEnquiry.aws_account_id,
                services_of_interest: updatedEnquiry.services_of_interest
            };
        }

        // Add Azure details only if it's Azure or Multi-cloud
        if (hasAzure) {
            responseData.azure_details = {
                azure_tenant_id: updatedEnquiry.azure_tenant_id,
                azure_subscription_id: updatedEnquiry.azure_subscription_id,
                azure_product_or_service: updatedEnquiry.azure_product_or_service
            };
        }

        res.json({
            status: 'success',
            message: 'Enquiry updated successfully',
            data: responseData,
            code: 200
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in updateEnquiry:', error);
        
        if (error.code === '23503') {
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid reference data provided',
                code: 400
            });
        }

        res.status(500).json({
            status: 'fail',
            message: 'Internal server error',
            code: 500
        });
    } finally {
        client.release();
    }
};


module.exports = {
    createEnquiry,
    getAllEnquiries,
    getEnquiryById,
    updateEnquiryStatus,
    updateEnquiry,
    assignEnquiryToPartner
};
