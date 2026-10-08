// middlewares/productSecurity.js
const pool = require('../config/database');

/**
 * Middleware to ensure ISV users can only access their own products
 * This should be placed AFTER verifyToken middleware and BEFORE validation
 */
const ensureProductOwnership = async (req, res, next) => {
    // Admin users can access any product
    if (req.user.role_id === 4) {
        return next();
    }

    // Only ISV users need ownership validation
    if (req.user.role_type !== 'ISV') {
        return res.status(403).json({
            status: 'fail',
            message: 'Access denied. Only Admin and ISV can access products',
            code: 403
        });
    }

    const productId = req.params.id;
    if (!productId) {
        return res.status(400).json({
            status: 'fail',
            message: 'Product ID is required',
            code: 400
        });
    }

    try {
        const result = await pool.query(
            'SELECT user_id FROM products WHERE id = $1',
            [productId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: 'fail',
                message: 'Product not found',
                code: 404
            });
        }

        const product = result.rows[0];
        
        // ISV can only access their own products
        if (product.user_id !== req.user.id) {
            // Log security violation
            logSecurityEvent('UNAUTHORIZED_PRODUCT_ACCESS', req.user.id, {
                attemptedProductId: productId,
                productOwnerId: product.user_id,
                userRole: req.user.role_type
            });

            return res.status(403).json({
                status: 'fail',
                message: 'You can only access your own products',
                code: 403
            });
        }

        next();
    } catch (error) {
        console.error('Error in ensureProductOwnership:', error);
        res.status(500).json({
            status: 'fail',
            message: 'Internal server error',
            code: 500
        });
    }
};

/**
 * Utility function to validate product ownership for bulk operations
 * Used in createProduct for bundle validation
 */
const validateProductOwnership = async (productIds, userId, client) => {
    const productIdsArray = Array.isArray(productIds) ? productIds : [productIds];
    
    const result = await client.query(
        'SELECT id FROM products WHERE id = ANY($1) AND user_id != $2',
        [productIdsArray, userId]
    );
    
    return result.rows.length === 0; // Returns true if all products belong to user
};

/**
 * Enhanced logging for security events
 */
const logSecurityEvent = (event, userId, details = {}) => {
    const timestamp = new Date().toISOString();
    const logData = {
        timestamp,
        event,
        userId,
        ...details
    };
    
    console.warn(`[SECURITY] ${timestamp} - ${event} - User: ${userId}`, logData);
    
    // In production, you might want to:
    // 1. Store in a dedicated security_logs table
    // 2. Send to a security monitoring service
    // 3. Alert administrators for repeated violations
    
    // Example: Store in database (uncomment if you create a security_logs table)
    /*
    pool.query(
        'INSERT INTO security_logs (event, user_id, details, created_at) VALUES ($1, $2, $3, $4)',
        [event, userId, JSON.stringify(details), new Date()]
    ).catch(err => console.error('Failed to log security event:', err));
    */
};

/**
 * Rate limiting for security-sensitive operations
 * Can be used to prevent brute force attacks on product access
 */
const createSecurityRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
    const attempts = new Map();
    
    return (req, res, next) => {
        const key = `${req.user.id}-${req.ip}`;
        const now = Date.now();
        
        if (!attempts.has(key)) {
            attempts.set(key, []);
        }
        
        const userAttempts = attempts.get(key);
        
        // Remove old attempts outside the window
        const validAttempts = userAttempts.filter(time => now - time < windowMs);
        
        if (validAttempts.length >= max) {
            logSecurityEvent('RATE_LIMIT_EXCEEDED', req.user.id, {
                ip: req.ip,
                endpoint: req.originalUrl,
                attempts: validAttempts.length
            });
            
            return res.status(429).json({
                status: 'fail',
                message: 'Too many requests. Please try again later.',
                code: 429
            });
        }
        
        validAttempts.push(now);
        attempts.set(key, validAttempts);
        
        next();
    };
};

module.exports = {
    ensureProductOwnership,
    validateProductOwnership,
    logSecurityEvent,
    createSecurityRateLimit
};
