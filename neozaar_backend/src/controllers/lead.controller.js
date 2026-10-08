// controllers/leadController.js
const leadService = require('../services/leadService.service');
const commonConstant = require('../config/common.constant.js');
const createLeadComment = require('../services/leadService.service');
class LeadController {

  async createLead(req, res) {
    try {
      const userId = req.user?.id || null;
      const lead = await leadService.createLead(req.body, userId);
      
      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({ status: commonConstant.VARIABLE.STATUS, lead });
    } catch (error) {
      return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({ status: commonConstant.VARIABLE.FAIL, message: error.message });
    }
  }

  async updateLead(req, res) {
    try {
      const { id } = req.params;
      const status = req.body.status;
      const remark = req.body.remark;
      const lead = await leadService.updateLeadStatus(id, status, remark);
      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({ status: commonConstant.VARIABLE.STATUS, lead });
    } catch (error) {
      return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({ status: commonConstant.VARIABLE.FAIL, message: error.message });
    }
  }

  async getAllLeads_old(req, res) {
    try {

      const userId = req.user?.id;
      const { page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      let leads;
      if (req.user.role_type == 'CLIENT') {
        leads = await leadService.getAllLeadsByUser(userId, pageNum, limitNum);
      } else if (req.user.role_type == 'ISV') {
        leads = await leadService.getAllLeadsByISV(userId, pageNum, limitNum);
      } else {
        leads = await leadService.getAllLeads(pageNum, limitNum);
      }
      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({ status: commonConstant.VARIABLE.STATUS, leads });
    } catch (error) {
      return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({ status: commonConstant.VARIABLE.FAIL, message: error.message });
    }
  }

  async getAllLeads(req, res) {
    try {
      const userId = req.user?.id;
      const roleType = req.user?.role_type;
      // Pagination
      const page = parseInt(req.query.page || 1, 10);
      const limit = parseInt(req.query.limit || 10, 10);
      // Search & Filters
      const filters = {
        page,
        limit,
        search: req.query.search?.trim() || '',
        status: req.query.status || null,
        lead_type: req.query.lead_type || null,
        from_date: req.query.from_date || null,
        to_date: req.query.to_date || null,
        action_type: req.query.action_type || null,
        source: req.query.source || null // 'direct' | 'affiliate'
      };

      let leads;
      if (roleType === 'CLIENT') {
        leads = await leadService.getAllLeadsByUser(userId, filters);
      } 
      else if (roleType === 'ISV') {
        leads = await leadService.getAllLeadsByISV(userId, filters);
      }
      else if (roleType === 'ISV_SELLER') {
        leads = await leadService.getAllLeads(filters, userId);
      }
      else if (roleType === 'AGENT') {
        // Affiliates only see affiliate leads assigned to them
        filters.source = 'affiliate';
        leads = await leadService.getAllLeads(filters, userId);
      }
      else {
        leads = await leadService.getAllLeads(filters);
      }
      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({status: commonConstant.VARIABLE.STATUS, leads});
    } catch (error) {
      console.error('getAllLeads controller error:', error);
      return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({status: commonConstant.VARIABLE.FAIL, message: error.message });
    }
  }


  async getLeadById(req, res) {
    try {
      const { id } = req.params;
      const lead = await leadService.getLeadById(id);
      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({ status: commonConstant.VARIABLE.STATUS, lead });
    } catch (error) {
      return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({ status: commonConstant.VARIABLE.FAIL, message: error.message });
    }
  }
  async assignLead(req, res) {
    try {
      const { lead_id } = req.params;
      const { assign_user_id, assign_user_type } = req.body;
      const assign_by = req.user.id;

      const assignment = await leadService.assignLead(
        lead_id,
        assign_user_id,
        assign_user_type,
        assign_by
      );

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        status: commonConstant.VARIABLE.STATUS,
        assignment
      });
    } catch (error) {
      return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
        status: commonConstant.VARIABLE.FAIL,
        message: error.message
      });
    }
  }
  async updateComment(req, res) {
    try {
      const { lead_id } = req.params;
      const { comment, status } = req.body;
      const user_id = req.user.id; // logged-in user
      const newComment = await leadService.createLeadComment(lead_id, user_id, comment, status );
      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        status: commonConstant.VARIABLE.SUCCESS,
        data: newComment
      });
    } catch (error) {
      return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
        status: commonConstant.VARIABLE.FAIL,
        message: error.message
      });
    }
  }
}

module.exports = new LeadController();
