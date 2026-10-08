const pool = require('../config/database');

class CleanupService {
  
  // ======================= CLEANUP UNVERIFIED USER REGISTRATION =======================
  /**
   * Cleans up unverified user registrations after expiry
   * @param {number} userId - User ID to cleanup
   * @param {string} emailToken - Email verification token
   */
  static async cleanupUnverifiedRegistration(userId, emailToken) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if user exists and is still unverified
      const userResult = await client.query(
        'SELECT id, email, is_email_verified FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        console.log(`User ${userId} not found during cleanup`);
        await client.query('ROLLBACK');
        return { cleaned: false, reason: 'User not found' };
      }

      const user = userResult.rows[0];

      // If user is verified, only clean temp data
      if (user.is_email_verified) {
        await client.query(
          'DELETE FROM temp_business_registration WHERE user_id = $1',
          [userId]
        );
        console.log(`Cleaned temp data for verified user: ${userId}`);
        await client.query('COMMIT');
        return { cleaned: true, reason: 'Temp data cleaned for verified user' };
      }

      // User is unverified - check if token matches (additional security)
      const tempDataResult = await client.query(
        'SELECT email_verification_token FROM temp_business_registration WHERE user_id = $1',
        [userId]
      );

      if (tempDataResult.rows.length === 0) {
        console.log(`No temp data found for user ${userId} during cleanup`);
        await client.query('ROLLBACK');
        return { cleaned: false, reason: 'No temp data found' };
      }

      const storedToken = tempDataResult.rows[0].email_verification_token;
      
      // Token mismatch - possible security issue or user has requested new verification
      if (storedToken !== emailToken) {
        console.log(`Token mismatch for user ${userId} during cleanup`);
        await client.query('ROLLBACK');
        return { cleaned: false, reason: 'Token mismatch' };
      }

      // Delete both temp data and unverified user
      await client.query('DELETE FROM temp_business_registration WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      console.log(`Cleaned up unverified user and temp data: ${userId} (${user.email})`);
      await client.query('COMMIT');
      
      return { 
        cleaned: true, 
        reason: 'Unverified user and temp data deleted',
        email: user.email 
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Cleanup failed for user:', userId, error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  // ======================= BULK CLEANUP EXPIRED REGISTRATIONS =======================
  /**
   * Cleans up all expired unverified registrations (for cron jobs)
   * @param {number} expiryMinutes - Minutes after which to consider registration expired (default: 5)
   */
  static async cleanupExpiredRegistrations(expiryMinutes = 5) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Find all expired unverified registrations
      const expiredResult = await client.query(`
        SELECT 
          tbr.user_id, 
          tbr.email_verification_token,
          tbr.created_at,
          u.email,
          u.is_email_verified
        FROM temp_business_registration tbr
        INNER JOIN users u ON tbr.user_id = u.id
        WHERE tbr.created_at < NOW() - INTERVAL '${expiryMinutes} minutes'
      `);

      const expiredRegistrations = expiredResult.rows;
      
      if (expiredRegistrations.length === 0) {
        console.log('No expired registrations found');
        await client.query('ROLLBACK');
        return { cleaned: 0, verified: 0, unverified: 0 };
      }

      let verifiedCleanedCount = 0;
      let unverifiedCleanedCount = 0;

      for (const registration of expiredRegistrations) {
        const { user_id, email, is_email_verified } = registration;

        if (is_email_verified) {
          // Clean only temp data for verified users
          await client.query(
            'DELETE FROM temp_business_registration WHERE user_id = $1',
            [user_id]
          );
          verifiedCleanedCount++;
          console.log(`Cleaned temp data for verified user: ${user_id} (${email})`);
        } else {
          // Clean both user and temp data for unverified users
          await client.query('DELETE FROM temp_business_registration WHERE user_id = $1', [user_id]);
          await client.query('DELETE FROM users WHERE id = $1', [user_id]);
          unverifiedCleanedCount++;
          console.log(`Cleaned unverified user: ${user_id} (${email})`);
        }
      }

      await client.query('COMMIT');
      
      return {
        cleaned: expiredRegistrations.length,
        verified: verifiedCleanedCount,
        unverified: unverifiedCleanedCount
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Bulk cleanup failed:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  // ======================= SCHEDULE CLEANUP FOR SPECIFIC USER =======================
  /**
   * Schedules a cleanup task for a specific user registration
   * @param {number} userId - User ID
   * @param {string} emailToken - Email verification token
   * @param {number} delayMinutes - Minutes to wait before cleanup (default: 5)
   */
  static scheduleUserCleanup(userId, emailToken, delayMinutes = 5) {
    const delayMs = delayMinutes * 60 * 1000;
    
    setTimeout(async () => {
      try {
        await this.cleanupUnverifiedRegistration(userId, emailToken);
      } catch (error) {
        console.error(`Scheduled cleanup failed for user ${userId}:`, error.message);
      }
    }, delayMs);
    
    console.log(`Scheduled cleanup for user ${userId} in ${delayMinutes} minutes`);
  }

  // ======================= GET CLEANUP STATISTICS =======================
  /**
   * Returns statistics about pending cleanups
   */
  static async getCleanupStats() {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_pending,
          COUNT(CASE WHEN u.is_email_verified = false THEN 1 END) as unverified_users,
          COUNT(CASE WHEN u.is_email_verified = true THEN 1 END) as verified_temp_data,
          COUNT(CASE WHEN tbr.created_at < NOW() - INTERVAL '5 minutes' THEN 1 END) as expired_registrations
        FROM temp_business_registration tbr
        INNER JOIN users u ON tbr.user_id = u.id
      `);

      return result.rows[0];
    } catch (error) {
      console.error('Failed to get cleanup stats:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = CleanupService;
