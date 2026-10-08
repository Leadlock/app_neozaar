const CommissionService = require('../../services/commision/commission.service');
const commonConstant = require('../../config/common.constant.js');
const pool = require('../../config/database');


class CommisionController {

    static async getCommissionByIsvId(req, res) {
        const isvId = req.params.isvId;
        try {
            const commissionData = await CommissionService.getCommissionByIsvId(isvId);
            if (commissionData) {
                res.status(200).json({
                    [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
                    [commonConstant.VARIABLE.CODE]: commonConstant.STATUS_CODES.SUCCESS,
                    [commonConstant.VARIABLE.MESSAGE]: 'Commission data retrieved successfully',
                    [commonConstant.VARIABLE.DATA]: commissionData
                });
            } else {
                res.status(404).json({
                    [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
                    [commonConstant.VARIABLE.CODE]: commonConstant.STATUS_CODES.NOT_FOUND,
                    message: 'Commission data not found for the given ISV ID',
                    [commonConstant.VARIABLE.DATA]: null
                });
            }
        } catch (error) {
            console.error('Error fetching commission data:', error);
            res.status(500).json({
                [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.ERROR,
                [commonConstant.VARIABLE.CODE]: commonConstant.STATUS_CODES.SERVER_ERROR,
                message: 'An error occurred while fetching commission data',
                [commonConstant.VARIABLE.DATA]: null
            });
        }
    }

    static async createCommission(req, res) {
        const { isv_id, commission_percentage } = req.body;
        try {
            const approved_by = req.user ? req.user.id : null;
            if (!isv_id || !commission_percentage) {
                return res.status(400).json({
                    [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
                    [commonConstant.VARIABLE.CODE]: commonConstant.STATUS_CODES.BAD_REQUEST,
                    [commonConstant.VARIABLE.MESSAGE]: 'isv_id and commission_percentage are required',
                    [commonConstant.VARIABLE.DATA]: null
                });
            }
            // if(req.user.role !== 3) { // Check if user is admin
            //     return res.status(403).json({
            //         [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
            //         [commonConstant.VARIABLE.CODE]: commonConstant.STATUS_CODES.FORBIDDEN,
            //         [commonConstant.VARIABLE.MESSAGE]: 'You do not have permission to perform this action',
            //         [commonConstant.VARIABLE.DATA]: null
            //     });
            // }
            const newCommission = await CommissionService.createCommission({ isv_id, commission_percentage, approved_by });
            if(newCommission === false) {
                return  res.status(404).json({
                    [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
                    [commonConstant.VARIABLE.CODE]: commonConstant.STATUS_CODES.NOT_FOUND,
                    [commonConstant.VARIABLE.MESSAGE]: 'ISV user not found',
                    [commonConstant.VARIABLE.DATA]: null
                });
            }
            res.status(201).json({
                [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
                [commonConstant.VARIABLE.CODE]: commonConstant.STATUS_CODES.CREATED,
                [commonConstant.VARIABLE.MESSAGE]: 'Commission created successfully',
                [commonConstant.VARIABLE.DATA]: newCommission
            });
        } catch (error) {
            console.error('Error creating commission:', error);
            res.status(500).json({
                [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.ERROR,
                [commonConstant.VARIABLE.CODE]: commonConstant.STATUS_CODES.SERVER_ERROR,
                [commonConstant.VARIABLE.MESSAGE]: 'An error occurred while creating commission',
                [commonConstant.VARIABLE.DATA]: null
            });
        }
    }
 
}

module.exports = CommisionController;
