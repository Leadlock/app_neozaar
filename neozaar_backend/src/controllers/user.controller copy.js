const UserService = require('../services/user.services');
const BusinessService = require('../services/business.services');
const commonConstant = require('../config/common.constant');
const { roleMap } = require('../config/roles.config');
const DataTransformer = require('../utils/dataTransformer');
const CatalogService = require('../services/catalog.service');
const userServices = require('../services/user.services');

class UserController {

  // ======================= SINGLE ROUTE REGISTRATION =======================
  async register(req, res) {
    try {
      const role_id = parseInt(req.body.role_id);
      const role_type = roleMap[role_id];

      if (!role_type) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
          [commonConstant.VARIABLE.MESSAGE]: 'INVALID role_type'
        });
      }

      const userData = {
        name: req.body.name,
        email: req.body.email,
        mobile: req.body.mobile,
        password: req.body.password,
        designation: req.body.designation,
        role_id,
        role_type,
      };

      const businessData = {
        // Company Details
        company_name: req.body.company_name,
        registered_business_name: req.body.registered_business_name,
        brand_name: req.body.brand_name,
        company_registration_number: req.body.company_registration_number,
        Legal_entity_type: req.body.Legal_entity_type,
        tax_id: req.body.tax_id,
        headquater_country: req.body.headquater_country,
        website_url: req.body.website_url,
        linkedin_url: req.body.linkedin_url,

        // ISV specific fields
        cloud_partnership: req.body.cloud_partnership,
        existing_marketplace_listing: req.body.existing_marketplace_listing,
        preferred_engagement: req.body.preferred_engagement,
        competencies_certifications: req.body.competencies_certifications,

        // Support Partner specific fields
        solution_partner_type: req.body.solution_partner_type,
        core_service_offer: req.body.core_service_offer,
        competencies_certificate: req.body.competencies_certificate,
        vertical_experties: req.body.vertical_experties,
        partner_program_membership: req.body.partner_program_membership,
        preferred_engagement_modal: req.body.preferred_engagement_modal,
        primary_cloud_alignment: req.body.primary_cloud_alignment,


        // Checkboxes - these will be transformed in DataTransformer
        neozaar_tc: req.body.neozaar_tc,
        data_privacy: req.body.data_privacy,
        sla_link: req.body.sla_link,
        support_desk_email: req.body.support_desk_email
      };

      // 🔄 Transform business data using DataTransformer
      const transformedBusinessData = DataTransformer.transformRequestDataForDB(businessData, role_type);

      // Process the registration with transformed data
      const result = await UserService.registerUserWithBusinessData(userData, transformedBusinessData, req.files);

      return res.status(commonConstant.STATUS_CODES.CREATED).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.MESSAGE]: 'Thank you for registering with us. We have received your request, and our team will be reaching out to you soon.',
      });

      // return res.status(commonConstant.STATUS_CODES.CREATED).json({
      //   [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
      //   [commonConstant.VARIABLE.MESSAGE]: 'Registration initiated successfully. Please verify your email to complete registration.',
      //   [commonConstant.VARIABLE.DATA]: {
      //     user: result.user,
      //     verification_required: true,
      //     next_step: 'Please check your email and click the verification link'
      //   }
      // });
    } catch (error) {
      console.error('Error in register:', error);

      if (error.message === 'Invalid role_id or role_type') {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message
        });
      }

      if (error.message === 'User already exists') {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message
        });
      }

      if (error.message === 'Missing required fields') {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message
        });
      }

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR
      });
    }
  }

  // ======================= VERIFY EMAIL & COMPLETE REGISTRATION =======================
  async verifyEmailAndComplete(req, res) {
    try {
      const { token, email } = req.query;
      if (!token || !email) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: 'Invalid verification link'
        });
      }

      const result = await UserService.verifyEmailAndCompleteRegistration(token, email);

      // TODO:: Redirect to frontend login page after successful verification
      return res.redirect(301, "http://neozaar.whizzact.com/auth/login");

      // return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
      //   [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
      //   [commonConstant.VARIABLE.MESSAGE]: 'Email verified and registration completed successfully!',
      //   [commonConstant.VARIABLE.DATA]: result
      // });
    } catch (error) {
      console.error('Error in verifyEmailAndComplete:', error);

      if (error.message === 'Invalid token or email' || error.message === 'Email already verified') {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message
        });
      }

      if (error.message === 'No pending registration data found') {
        return res.status(commonConstant.STATUS_CODES.NOT_FOUND).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message
        });
      }

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR
      });
    }
  }

  // ======================= RESEND VERIFICATION EMAIL =======================
  async resendVerificationEmail(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: 'Email is required'
        });
      }

      const result = await UserService.resendVerificationEmail(email);

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.MESSAGE]: result.message
      });
    } catch (error) {
      console.error('Error in resendVerificationEmail:', error);

      if (error.message === 'User not found or already verified' || error.message === 'No pending verification found') {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message
        });
      }

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR
      });
    }
  }

  // ======================= GET USER BY ID =======================
  async getUserById(req, res) {
    try {
      const userId = req.params.id;
      const requesterId = req.user.id;
      const requesterRole = req.user.role_type;

      const user = await UserService.getUserById(userId, requesterId, requesterRole);

      // Get business info if user has business role
      let businessInfo = null;
      if (user.role_type === 'ISV' || user.role_type === 'SUPPORT_PARTNER') {
        businessInfo = await BusinessService.getBusinessInfoByUserId(user.id, user.role_type);

        // Transform profile data for response if it exists
        if (businessInfo && businessInfo.profile) {
          businessInfo.profile = DataTransformer.transformDBDataForResponse(businessInfo.profile, user.role_type);
        }
      }

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.DATA]: { user, businessInfo }
      });
    } catch (error) {
      console.error('Error in getUserById:', error);

      if (error.message === 'Unauthorized access') {
        return res.status(commonConstant.STATUS_CODES.FORBIDDEN).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message
        });
      }

      if (error.message === 'User not found') {
        return res.status(commonConstant.STATUS_CODES.NOT_FOUND).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message
        });
      }

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR
      });
    }
  }

  async getIsvDetails(req, res) {
    try {
      const userId = req.params.id;
      const requesterId = req.user.id;
      const requesterRole = req.user.role_type;
      const { page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const user = await UserService.getUserById(userId, requesterId, requesterRole);
      // Get business info if user has business role
      let businessInfo = null;
      let productInfo = null;
      if (user.role_type === 'ISV' || user.role_type === 'SUPPORT_PARTNER') {
        if(user.is_active === false){
          businessInfo = await userServices.getISVusersPendingById(user.id);
        }else{
          businessInfo = await BusinessService.getBusinessInfoByUserId(user.id, user.role_type);
          productInfo = await CatalogService.getIsvUserCreatedProducts(user.id, pageNum, limitNum);
        }
        // Transform profile data for response if it exists
        if (businessInfo && businessInfo.profile) {
          businessInfo.profile = DataTransformer.transformDBDataForResponse(businessInfo.profile, user.role_type);
        }
      }
      const isvDetail = { user, businessInfo, productInfo }
      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.DATA]: isvDetail
      });
    } catch (error) {
      console.error('Error in getUserById:', error);

      if (error.message === 'Unauthorized access') {
        return res.status(commonConstant.STATUS_CODES.FORBIDDEN).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message
        });
      }

      if (error.message === 'User not found') {
        return res.status(commonConstant.STATUS_CODES.NOT_FOUND).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message
        });
      }

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR
      });
    }
  }
  // ======================= GET ALL USERS =======================
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page, 10);
      const limitNum = Math.min(parseInt(limit, 10), commonConstant.PAGINATION.MAX_LIMIT);
      const { users, pagination } = await UserService.getAllUsers(pageNum, limitNum);

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.DATA]: users,
        pagination
      });
    } catch (error) {
      console.error('Error in getAllUsers:', error);

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR
      });
    }
  }
  // ======================= GET ISV USERS =======================
  async getISVusers(req, res) {
    try {
      const { page = 1, limit = 10, status = 'approved' } = req.query;
      const pageNum = parseInt(page, 10);
      const limitNum = Math.min(parseInt(limit, 10), commonConstant.PAGINATION.MAX_LIMIT);
      if (status === 'pending') {
        const { data, pagination } = await UserService.getISVusersPendingApproval(pageNum, limitNum);
        return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
          [commonConstant.VARIABLE.DATA]: data,
          pagination
        });
      }
      const { users, pagination } = await UserService.getISVusers(pageNum, limitNum); 

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.DATA]: users,
        pagination
      });
    } catch (error) {
      console.error('Error in getISVusers:', error);

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR
      });
    }
  }
  // ======================= GET PARTNER USERS =======================
  async getPartnerUsers(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page, 10);
      const limitNum = Math.min(parseInt(limit, 10), commonConstant.PAGINATION.MAX_LIMIT);
      const { users, pagination } = await UserService.getPartnerUsers(pageNum, limitNum);

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.DATA]: users,
        pagination
      });
    } catch (error) {
      console.error('Error in getISVusers:', error);

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR
      });
    }
  }

  // ======================= UPDATE USER =======================
  async updateUser(req, res) {
    try {
      const userId = req.params.id;
      const requesterId = req.user.id;
      const requesterRole = req.user.role_type;

      // Handle file uploads
      const uploadedFiles = await UserService.handleFileUploads(req.files);

      // Update basic user info
      await UserService.updateUserBasicInfo(userId, req.body, requesterId, requesterRole);

      // Update business info if files were uploaded or business data provided
      const hasBusinessData = Object.keys(uploadedFiles).length > 0 ||
        req.body.company_name || req.body.registered_business_name;

      if (hasBusinessData && req.user.role_type !== 'CLIENT') {
        const businessData = { ...req.body, ...uploadedFiles };

        // 🔄 Transform business data using DataTransformer before update
        const transformedBusinessData = DataTransformer.transformRequestDataForDB(businessData, req.user.role_type);

        console.log('=== UPDATE: AFTER DATATRANSFORMER ===');
        console.log('Transformed businessData for update:', JSON.stringify(transformedBusinessData, null, 2));
        console.log('=== END UPDATE DATATRANSFORMER ===');

        await BusinessService.updateBusinessInfo(userId, transformedBusinessData, req.user.role_type);
      }

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.MESSAGE]: 'User updated successfully',
        [commonConstant.VARIABLE.DATA]: { uploadedFiles }
      });
    } catch (error) {
      console.error('Error in updateUser:', error);

      if (error.message === 'Unauthorized update' || error.message === 'Unauthorized access') {
        return res.status(commonConstant.STATUS_CODES.FORBIDDEN).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message
        });
      }

      if (error.message === 'User not found') {
        return res.status(commonConstant.STATUS_CODES.NOT_FOUND).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message
        });
      }

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR
      });
    }
  }

  // ======================= DELETE USER =======================
  async deleteUser(req, res) {
    try {
      const userId = req.params.id;

      const result = await UserService.deleteUser(userId);

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.MESSAGE]: result.message
      });
    } catch (error) {
      console.error('Error in deleteUser:', error);

      if (error.message === 'User not found') {
        return res.status(commonConstant.STATUS_CODES.NOT_FOUND).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message
        });
      }

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR
      });
    }
  }
  async getMembers(req, res) {
    try {
      const { role, search } = req.query;

      const validRoles = ['CLIENT', 'ISV', 'SUPPORT_PARTNER'];
      if (!role) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: 'Please provide the role'
        });
      }

      if (!validRoles.includes(role)) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: `Role should be one of: ${validRoles.join(', ')}`
        });
      }

      const members = await UserService.getMembers(role, search);

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.DATA]: members
      });

    } catch (error) {
      console.error('Error in getMembers:', error);

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR
      });
    }
  }
  async sendUserApproval(req, res) {
    try {
      const { userid } = req.params;
      const userId = parseInt(userid, 10); // base 10

      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      if (!userId) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: 'user does not exists'
        });
      }

      const approvalMail = await UserService.sendApprovalMail(userId);

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.DATA]: approvalMail
      });

    } catch (error) {
      console.error(error);

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR
      });
    }
  }
}

module.exports = new UserController();
