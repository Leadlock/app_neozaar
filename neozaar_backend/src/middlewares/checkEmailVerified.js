const pool = require('../config/database');
const commonConstant = require('../config/common.constant');

/**
 * Middleware to check if user's email is verified
 * Should be used after verifyToken middleware
 */
const checkEmailVerified = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    
    const userResult = await client.query(
      'SELECT is_email_verified, is_active FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(commonConstant.STATUS_CODES.NOT_FOUND).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.NOT_FOUND
      });
    }
    
    const user = userResult.rows[0];
    
    if (!user.is_email_verified) {
      return res.status(commonConstant.STATUS_CODES.FORBIDDEN).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: 'Please verify your email before proceeding'
      });
    }
    
    if (!user.is_active) {
      return res.status(commonConstant.STATUS_CODES.FORBIDDEN).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: 'Account is not active'
      });
    }
    
    next();
    
  } catch (error) {
    console.error('Error in checkEmailVerified middleware:', error);
    return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
      [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
      [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR
    });
  } finally {
    client.release();
  }
};

module.exports = checkEmailVerified;
