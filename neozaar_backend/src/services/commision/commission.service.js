const CommissionModel = require('../../models/commission/commission.model');
const User = require('../../models/User');
const UserService = require('../user.services');
const pool = require('../../config/database');

class CommissionService {

    static async getCommissionByIsvId(isvId) {
        return await CommissionModel.findOne({ where: { isv_id: isvId } });
    }

  static async createCommission(isv_id, params, approved_by ) {
    const client = await pool.connect();

    try {
      let { commission_percentage } = params;

      // 🧠 Ensure it's numeric
      const commissionValue = Number(commission_percentage);

      if (isNaN(commissionValue)) {
        throw new Error(`Invalid commission_percentage: ${commission_percentage}`);
      }
      console.log(commissionValue);
      await client.query('BEGIN');
      const existingResult = await client.query('SELECT * FROM commissions WHERE isv_id = $1',[isv_id]);

      let commission;
      if (existingResult.rowCount > 0) {
        commission = existingResult.rows[0];
        await client.query( `UPDATE commissions  SET commission_percentage = $1, approved_by = $2, updated_at = NOW()  WHERE isv_id = $3`, [commissionValue, approved_by, isv_id]);
      } else {
        const insertResult = await client.query(
          `INSERT INTO commissions (isv_id, commission_percentage, approved_by, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *`,
          [isv_id, commissionValue, approved_by]
        );
        commission = insertResult.rows[0];
      }

        await client.query('COMMIT');
        // UserService.sendApprovalMail(isv_id).catch(err =>
        //   console.error('Mail sending failed:', err)
        // );

      return commission;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in createCommission:', error);
      throw error;
    } finally {
      client.release();
    }
  }



  
}


module.exports = CommissionService;
