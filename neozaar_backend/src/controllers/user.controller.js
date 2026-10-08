const UserService = require("../services/user.services");
const BusinessService = require("../services/business.services");
const commonConstant = require("../config/common.constant");
const { roleMap } = require("../config/roles.config");
const DataTransformer = require("../utils/dataTransformer");
const CatalogService = require("../services/catalog.service");
const userServices = require("../services/user.services");
const CommissionService = require("../services/commision/commission.service");
const emailService = require("../config/mail");
const { ADVISOR_TYPES } = require("../config/advisorTypes");
const User = require("../models/User");
const CompanyDetail = require("../models/CompanyDetail");
const pool = require("../config/database");
const bcrypt = require("bcryptjs");
const {
  decrypt,
  encrypt,
  generateRandomStringSecure,
} = require("../utils/cryptoHelper");

class UserController {
  // ======================= SINGLE ROUTE REGISTRATION =======================
  // controller/register.controller.js
  async register(req, res) {
    try {
      const role_id = parseInt(req.body.role_id);
      const role_type = roleMap[role_id];
      if (!role_type) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          status: commonConstant.VARIABLE.FAIL,
          message: "Invalid role_type",
        });
      }
      // Consulting Advisors must say which kind of advisor they are (validated before any user is created).
      let advisorType = null;
      if (role_type === "AGENT") {
        advisorType = String(req.body.advisor_type || "").trim();
        if (!ADVISOR_TYPES.includes(advisorType)) {
          return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
            status: commonConstant.VARIABLE.FAIL,
            message: "Please select a valid type of advisor.",
          });
        }
      }
      const userData = {
        name: req.body.name,
        email: req.body.email,
        mobile: req.body.mobile,
        password: req.body.password,
        designation: req.body.designation,
        role_id,
        role_type,
        company_name:
          req.body.company_name ||
          req.body.profile_details?.company_name ||
          null,
      };
      // User registration
      const userDetail = await UserService.userRegistration(userData);
      if (!userDetail) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          status: commonConstant.VARIABLE.FAIL,
          message: "User already exists",
        });
      }
      // ISV Registration (if ISV role)
      if (role_type == "ISV") {
        const isvDetails = await BusinessService.isvRegistration(
          { body: req.body, files: req.files },
          userDetail.id,
        );
        if (!isvDetails) {
          return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
            status: commonConstant.VARIABLE.FAIL,
            message: "Missing required ISV fields",
          });
        }
        // Company details
        const companyCreated = await BusinessService.createCompanyDetail(
          { body: req.body, files: req.files },
          userDetail.id,
          isvDetails.id,
          "ISV",
        );
        if (!companyCreated) {
          return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
            status: commonConstant.VARIABLE.FAIL,
            message: "Failed to create company details",
          });
        }

        const verificationToken = generateRandomStringSecure(30);
        await User.update(
          {
            verification_token: verificationToken,
          },
          {
            where: {
              email: userDetail.email,
            },
          },
        );

        const verificationLink =
          `${process.env.BACKEND_URL}user/isv/verify-email` +
          `?token=${verificationToken}` +
          `&email=${encodeURIComponent(userDetail.email)}`;

        try {
          await emailService.sendVerificationEmailToCustomerRegistration(
            userDetail.email,
            verificationLink,
            userDetail.name,
          );
        } catch (emailError) {
          console.error("ISV email sending failed (user still registered):", emailError.message);
        }

        return res.status(commonConstant.STATUS_CODES.CREATED).json({
          status: commonConstant.VARIABLE.SUCCESS,
          message:
            "Thank you for registering with us. A verification link has been sent to your registered email address. Please click the link to verify your email and complete your registration.",
        });
      }
      if (role_type == "CLIENT") {
        const company_name = req.body.company_name || req.body.profile_details?.company_name || null;
        const companyCreated = await BusinessService.createCompanyDetail(
          { body: { ...req.body, company_name }, files: req.files },
          userDetail.id,
          userDetail.id,
          "CLIENT",
        );
        if (!companyCreated) {
          return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
            status: commonConstant.VARIABLE.FAIL,
            message: "Failed to create company details",
          });
        }
        //Mail to customer on registration
        //const verificationLink = `${process.env.FRONTEND_URL}api/auth/verify-email?token=${userDetail.email_verification_token}&email=${encodeURIComponent(userDetail.email)}`;

        const verificationToken = generateRandomStringSecure(30); //encrypt(userDetail.email);
        await User.update(
          {
            verification_token: verificationToken,
          },
          {
            where: {
              email: userDetail.email,
            },
          },
        );
        const verificationLink =
          `${process.env.FRONTEND_URL}user/verify-email` +
          `?token=${verificationToken}` +
          `&email=${encodeURIComponent(userDetail.email)}`;

        // Save attribution before sending the verification email so verification cannot race it.
        await require('../services/affiliate/affiliate.registration.service')
          .captureRegistration(userDetail, req.body.aff_token);

        let verificationEmailSent = true;
        try {
          await emailService.sendVerificationEmailToCustomerRegistration(
            userDetail.email,
            verificationLink,
            userDetail.name,
          );
        } catch (emailError) {
          verificationEmailSent = false;
          console.error("Email sending failed (user still registered):", emailError.message);
        }



        return res.status(commonConstant.STATUS_CODES.CREATED).json({
          status: commonConstant.VARIABLE.SUCCESS,
          verification_email_sent: verificationEmailSent,
          message:
            verificationEmailSent
              ? "Thank you for registering with us. A verification link has been sent to your registered email address. Please click the link to verify your email and complete your registration."
              : "Registration completed, but the verification email could not be delivered. Please use resend verification or contact support.",
        });
      }

      // SUPPORT_PARTNER or AGENT registration — create company details
      if (role_type === "SUPPORT_PARTNER" || role_type === "AGENT") {
        await BusinessService.createCompanyDetail(
          { body: req.body, files: req.files },
          userDetail.id,
          userDetail.id,
          role_type,
        );
      }

      // SUPPORT_PARTNER and AGENT — also save to isv_details so support_desk_email
      // and partner-specific fields are accessible via the profile API
      if (role_type === "SUPPORT_PARTNER" || role_type === "AGENT") {
        await BusinessService.isvRegistration(
          { body: req.body, files: req.files },
          userDetail.id,
        );
      }

      // Notify admin when a Consulting Advisor (AGENT) registers
      if (role_type === "AGENT") {
        try {
          await pool.query("UPDATE users SET advisor_type = $1 WHERE id = $2", [advisorType, userDetail.id]);
        } catch (dbError) {
          console.error("Failed to save advisor_type:", dbError.message);
        }
        try {
          await emailService.sendNewConsultingAdvisorNotification({
            name: userDetail.name,
            email: userDetail.email,
            mobile: userDetail.mobile,
            company_name: req.body.company_name || "",
            website_url: req.body.website_url || "",
            designation: req.body.designation || "",
            advisor_type: advisorType,
          });
        } catch (emailError) {
          console.error("Consulting Advisor notification email failed:", emailError.message);
        }
      }

      return res.status(commonConstant.STATUS_CODES.CREATED).json({
        status: commonConstant.VARIABLE.SUCCESS,
        message:
          "Thank you for registering with us. We have received your request, and our team will reach out soon.",
      });
    } catch (error) {
      console.error("Error in register:", error);
      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        status: commonConstant.VARIABLE.FAIL,
        message: error.message || commonConstant.MESSAGES.ERROR,
      });
    }
  }

  async setApprovalStatus(req, res) {
    try {
      const { userid, is_approved } = req.body;
      let approved_by = req.user.id;
      if (typeof is_approved !== "boolean") {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          status: commonConstant.VARIABLE.FAIL,
          message: "is_approved must be a boolean",
        });
      }
      const result = await BusinessService.setApprovalStatus(
        userid,
        is_approved,
        approved_by,
      );
      if (result === true) {
        return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
          status: commonConstant.VARIABLE.SUCCESS,
          message: result.message,
        });
      }
      return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
        status: commonConstant.VARIABLE.FAIL,
        message: "User not found",
      });
    } catch (error) {
      console.error("Error in setApprovalStatus:", error);
      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        status: commonConstant.VARIABLE.FAIL,
        message: commonConstant.MESSAGES.ERROR,
      });
    }
  }

  async setIsvUserInactive(req, res) {
    try {
      const { userid } = req.body;
      let approved_by = req.user.id;

      const result = await BusinessService.setIsvUserInactive(
        userid,
        false,
        approved_by,
      );
      if (result === true) {
        const userDetail = await UserService.getUserById(
          userid,
          req.user.id,
          req.user.role_type,
        );

        // Mail to inactive user
        await emailService.sendIsvInactiveEmail(
          userDetail.email,
          userDetail.name,
        );

        // Mail to admin/client
        await emailService.sendIsvInactiveNotificationEmail(
          "info@neozaar.com",
          userDetail.name,
          userDetail.email,
          userDetail.mobile,
        );

        return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
          status: commonConstant.VARIABLE.SUCCESS,
          message: result.message,
        });
      }
      return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
        status: commonConstant.VARIABLE.FAIL,
        message: "User not found",
      });
    } catch (error) {
      console.error("Error in setIsvUserInactive:", error);
      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        status: commonConstant.VARIABLE.FAIL,
        message: commonConstant.MESSAGES.ERROR,
      });
    }
  }

  async getIsvDetailByUserId(req, res) {
    try {
      const userId = req.params.id;

      const user = await userServices.getIsvDetailByUserId(userId);

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.DATA]: user,
      });
    } catch (error) {
      console.error("Error in getUserById:", error);
      return res.status(commonConstant.STATUS_CODES.FORBIDDEN).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: error.message,
      });
    }
  }

  async getIsvDetailWithProductByUserId(req, res) {
    try {
      const userId = req.params.id;
      const { page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      const user = await userServices.getIsvDetailWithProductByUserId(
        userId,
        pageNum,
        limitNum,
      );

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.DATA]: user,
      });
    } catch (error) {
      console.error("Error in getUserById:", error);
      return res.status(commonConstant.STATUS_CODES.FORBIDDEN).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: error.message,
      });
    }
  }

  async updateIsvDetailByUserId(req, res) {
    try {
      const userId = req.params.id;
      const approved_by = req.user.id;
      const userData = {
        name: req.body.name,
        mobile: req.body.mobile,
        designation: req.body.designation,
      };
      const userDetail = await UserService.updateISVuser(userId, userData);
      if (userDetail == "ISV user not found") {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          status: commonConstant.VARIABLE.FAIL,
          message: userDetail.message,
        });
      }

      const isvDetails = await BusinessService.isvRegistration(
        { body: req.body, files: req.files },
        userId,
      );
      if (!isvDetails) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          status: commonConstant.VARIABLE.FAIL,
          message: "Missing required ISV fields",
        });
      }

      const companyCreated = await BusinessService.updateCompanyDetail(
        { body: req.body, files: req.files },
        userId,
        isvDetails.id,
        "ISV",
      );
      if (companyCreated == false) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          status: commonConstant.VARIABLE.FAIL,
          message: "Failed to create company details",
        });
      }

      await BusinessService.sendForApproval(userId, false, approved_by);

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        status: commonConstant.VARIABLE.SUCCESS,
        message: "ISV details updated successfully",
        data: userDetail,
      });
    } catch (error) {
      console.error("Error in updateIsvDetailByUserId:", error);
      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        status: commonConstant.VARIABLE.FAIL,
        message: commonConstant.MESSAGES.ERROR,
      });
    }
  }

  async updateISVUser(req, res) {
    try {
      const userId = req.params.id;
      const approved_by = req.user.id;
      const userData = {
        name: req.body.name,
        mobile: req.body.mobile,
        designation: req.body.designation,
      };
      const userDetail = await UserService.updateISVuser(userId, userData);
      if (userDetail == "ISV user not found") {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          status: commonConstant.VARIABLE.FAIL,
          message: userDetail.message,
        });
      }

      const isvDetails = await BusinessService.isvRegistration(
        { body: req.body, files: req.files },
        userId,
      );
      if (!isvDetails) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          status: commonConstant.VARIABLE.FAIL,
          message: "Missing required ISV fields",
        });
      }

      const companyCreated = await BusinessService.updateCompanyDetail(
        { body: req.body, files: req.files },
        userId,
        isvDetails.id,
        "ISV",
      );
      if (companyCreated == false) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          status: commonConstant.VARIABLE.FAIL,
          message: "Failed to create company details",
        });
      }
      if (
        req.body.commission_percentage !== undefined &&
        req.body.commission_percentage !== null &&
        req.body.commission_percentage !== ""
      ) {
        const commision = await CommissionService.createCommission(
          isvDetails.id,
          req.body,
          approved_by,
        );
        if (!commision) {
          return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
            status: commonConstant.VARIABLE.FAIL,
            message: "Failed to create commission",
          });
        }
      }

      if (
        req.files &&
        req.files.agreement_document &&
        req.files.agreement_document[0]
      ) {
        const file = req.files.agreement_document[0];
        const fileUpload = await BusinessService.uploadSignedDocument(
          userId,
          file,
        );
        if (!fileUpload) {
          return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
            status: commonConstant.VARIABLE.FAIL,
            message: "Failed to upload agreement attachment",
          });
        }
      } else {
        console.log("No agreement document uploaded — skipping file upload.");
      }

      await BusinessService.setApprovalStatus(userId, true, approved_by);

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.MESSAGE]: "ISV User updated successfully",
        [commonConstant.VARIABLE.DATA]: null,
      });
    } catch (error) {
      console.error("Error in updateISVUser:", error);

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR,
      });
    }
  }

  async deleteISVUser(req, res) {
    try {
      const { userId } = req.body;
      const result = await UserService.deleteUser(userId);
      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        status: commonConstant.VARIABLE.SUCCESS,
        message: result.message,
      });
    } catch (error) {
      console.error("Error in deleteISVUser:", error);
      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        status: commonConstant.VARIABLE.FAIL,
        message: commonConstant.MESSAGES.ERROR,
      });
    }
  }

  // ======================= VERIFY EMAIL & COMPLETE REGISTRATION =======================
  async verifyEmailAndComplete(req, res) {
    try {
      const { token, email } = req.query;
      if (!token) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: "Invalid verification link",
        });
      }
      const result = await UserService.verifyEmailAndCompleteRegistration(
        email,
        token,
      );
      if (result.status !== commonConstant.VARIABLE.SUCCESS) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]:
            result.message ||
            "Failed to verify email and complete registration",
        });
      }
      await emailService.sendWelcomeEmail(result.user.email, result.user.name);
      return res.status(200).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.MESSAGE]: "Email verified successfully",
      });
    } catch (error) {
      console.error("Error in verifyEmailAndComplete:", error);

      if (
        error.message === "Invalid token or email" ||
        error.message === "Email already verified"
      ) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message,
        });
      }

      if (error.message === "No pending registration data found") {
        return res.status(commonConstant.STATUS_CODES.NOT_FOUND).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message,
        });
      }

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR,
      });
    }
  }

  async isvverifyEmailAndComplete(req, res) {
    try {
      const { token, email } = req.query;
      if (!token) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: "Invalid verification link",
        });
      }
      const result = await UserService.verifyEmailAndCompleteRegistration(
        email,
        token,
      );
      if (result.status !== commonConstant.VARIABLE.SUCCESS) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]:
            result.message ||
            "Failed to verify email and complete registration",
        });
      }
      // return res.redirect(301, `${process.env.FRONTEND_URL}auth/login`);
      await emailService.sendIsvWelcomeEmail(
        result.user.email,
        result.user.name,
      );
      const companyDetail = await CompanyDetail.findOne({
        where: {
          created_by: result.user.id,
        },
      });
      await emailService.sendNewIsvRegistrationNotification({
        name: result.user.name,
        email: result.user.email,
        mobile: result.user.mobile,
        company_name: companyDetail?.company_name || "",
        website_url: companyDetail?.website_url || "",
      });
      return res.redirect(`${process.env.FRONTEND_URL}/auth/login`);
    } catch (error) {
      console.error("Error in verifyEmailAndComplete:", error);
      if (
        error.message === "Invalid token or email" ||
        error.message === "Email already verified"
      ) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message,
        });
      }

      if (error.message === "No pending registration data found") {
        return res.status(commonConstant.STATUS_CODES.NOT_FOUND).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message,
        });
      }

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR,
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
          [commonConstant.VARIABLE.MESSAGE]: "Email is required",
        });
      }

      const result = await UserService.resendVerificationEmail(email);

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.MESSAGE]: result.message,
      });
    } catch (error) {
      console.error("Error in resendVerificationEmail:", error);

      if (
        error.message === "User not found or already verified" ||
        error.message === "No pending verification found"
      ) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message,
        });
      }

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR,
      });
    }
  }

  // ======================= GET USER BY ID =======================
  async getUserById(req, res) {
    try {
      const userId = req.params.id;
      const requesterId = req.user.id;
      const requesterRole = req.user.role_type;

      const user = await UserService.getUserById(
        userId,
        requesterId,
        requesterRole,
      );

      // Get business info if user has business role
      let businessInfo = null;
      if (user.role_type === "ISV" || user.role_type === "SUPPORT_PARTNER" || user.role_type === "AGENT") {
        businessInfo = await BusinessService.getBusinessInfoByUserId(
          user.id,
          user.role_type,
        );

        // Transform profile data for response if it exists
        if (businessInfo && businessInfo.profile) {
          businessInfo.profile = DataTransformer.transformDBDataForResponse(
            businessInfo.profile,
            user.role_type,
          );
        }
      }

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.DATA]: { user, businessInfo },
      });
    } catch (error) {
      console.error("Error in getUserById:", error);

      if (error.message === "Unauthorized access") {
        return res.status(commonConstant.STATUS_CODES.FORBIDDEN).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message,
        });
      }

      if (error.message === "User not found") {
        return res.status(commonConstant.STATUS_CODES.NOT_FOUND).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message,
        });
      }

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR,
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
      const user = await UserService.getUserById(
        userId,
        requesterId,
        requesterRole,
      );
      // Get business info if user has business role
      let businessInfo = null;
      let productInfo = null;

      if (user.role_type === "ISV" || user.role_type === "SUPPORT_PARTNER" || user.role_type === "AGENT") {
        if (user.is_active === false) {
          businessInfo = await userServices.getISVusersPendingById(user.id);
        } else {
          businessInfo = await BusinessService.getBusinessInfoByUserId(
            user.id,
            user.role_type,
          );
          productInfo = await CatalogService.getIsvUserCreatedProducts(
            user.id,
            pageNum,
            limitNum,
          );
        }
        // Transform profile data for response if it exists
        if (businessInfo && businessInfo.profile) {
          businessInfo.profile = DataTransformer.transformDBDataForResponse(
            businessInfo.profile,
            user.role_type,
          );
        }
      }
      const isvDetail = { user, businessInfo, productInfo };
      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.DATA]: isvDetail,
      });
    } catch (error) {
      console.error("Error in getUserById:", error);

      if (error.message === "Unauthorized access") {
        return res.status(commonConstant.STATUS_CODES.FORBIDDEN).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message,
        });
      }

      if (error.message === "User not found") {
        return res.status(commonConstant.STATUS_CODES.NOT_FOUND).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message,
        });
      }

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR,
      });
    }
  }

  // ======================= GET ALL USERS =======================
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page, 10);
      const limitNum = Math.min(
        parseInt(limit, 10),
        commonConstant.PAGINATION.MAX_LIMIT,
      );
      const { users, pagination } = await UserService.getAllUsers(
        pageNum,
        limitNum,
      );

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.DATA]: users,
        pagination,
      });
    } catch (error) {
      console.error("Error in getAllUsers:", error);

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR,
      });
    }
  }
  // ======================= GET ISV USERS =======================
  async getISVusers(req, res) {
    try {
      const { page = 1, limit = 10, status = "all", search = "" } = req.query;
      const pageNum = parseInt(page, 10);
      const limitNum = Math.min(
        parseInt(limit, 10),
        commonConstant.PAGINATION.MAX_LIMIT,
      );

      const { users, pagination } = await UserService.getISVList(
        pageNum,
        limitNum,
        search,
        status,
      );

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.DATA]: users,
        pagination,
      });
    } catch (error) {
      console.error("Error in getISVusers:", error);

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR,
      });
    }
  }
  // ======================= GET PARTNER USERS =======================
  async getPartnerUsers(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page, 10);
      const limitNum = Math.min(
        parseInt(limit, 10),
        commonConstant.PAGINATION.MAX_LIMIT,
      );
      const { users, pagination } = await UserService.getPartnerUsers(
        pageNum,
        limitNum,
      );

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.DATA]: users,
        pagination,
      });
    } catch (error) {
      console.error("Error in getISVusers:", error);

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR,
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
      await UserService.updateUserBasicInfo(
        userId,
        req.body,
        requesterId,
        requesterRole,
      );

      // Update business info if files were uploaded or business data provided
      const hasBusinessData =
        Object.keys(uploadedFiles).length > 0 ||
        req.body.company_name ||
        req.body.registered_business_name;

      if (hasBusinessData && req.user.role_type !== "CLIENT") {
        const businessData = { ...req.body, ...uploadedFiles };

        // 🔄 Transform business data using DataTransformer before update
        const transformedBusinessData =
          DataTransformer.transformRequestDataForDB(
            businessData,
            req.user.role_type,
          );

        console.log("=== UPDATE: AFTER DATATRANSFORMER ===");
        console.log(
          "Transformed businessData for update:",
          JSON.stringify(transformedBusinessData, null, 2),
        );
        console.log("=== END UPDATE DATATRANSFORMER ===");

        await BusinessService.updateBusinessInfo(
          userId,
          transformedBusinessData,
          req.user.role_type,
        );
      }

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.MESSAGE]: "User updated successfully",
        [commonConstant.VARIABLE.DATA]: { uploadedFiles },
      });
    } catch (error) {
      console.error("Error in updateUser:", error);

      if (
        error.message === "Unauthorized update" ||
        error.message === "Unauthorized access"
      ) {
        return res.status(commonConstant.STATUS_CODES.FORBIDDEN).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message,
        });
      }

      if (error.message === "User not found") {
        return res.status(commonConstant.STATUS_CODES.NOT_FOUND).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message,
        });
      }

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR,
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
        [commonConstant.VARIABLE.MESSAGE]: result.message,
      });
    } catch (error) {
      console.error("Error in deleteUser:", error);

      if (error.message === "User not found") {
        return res.status(commonConstant.STATUS_CODES.NOT_FOUND).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: error.message,
        });
      }

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR,
      });
    }
  }

  async getConsultingAdvisors(req, res) {
    try {
      const { page = 1, limit = 20, status = 'all', search = '' } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const params = ['AGENT'];
      let statusFilter = '';
      if (status === 'pending') statusFilter = 'AND u.is_active = FALSE';
      else if (status === 'approved') statusFilter = 'AND u.is_active = TRUE';
      let searchFilter = '';
      if (search.trim()) {
        params.push(`%${search.trim()}%`);
        searchFilter = `AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.mobile ILIKE $${params.length})`;
      }
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM users u WHERE u.role_type = $1 ${statusFilter} ${searchFilter}`, params
      );
      const total = parseInt(countResult.rows[0].count);
      params.push(parseInt(limit), offset);
      const { rows } = await pool.query(
        `SELECT u.id, u.name, u.email, u.mobile, u.designation, u.advisor_type, u.is_active, u.created_at,
                cd.company_name, cd.brand_name, cd.website_url, cd.linkedin_url,
                cd.headquater_country, cd.legal_entity_type, cd.tax_id,
                cd.registered_business_name, cd.brand_logo
         FROM users u
         LEFT JOIN company_detail cd ON cd.action_id = u.id AND cd.action_type = 'AGENT'
         WHERE u.role_type = $1 ${statusFilter} ${searchFilter}
         ORDER BY u.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );
      return res.json({
        status: 'success', data: rows,
        pagination: { total, page: parseInt(page), limit: parseInt(limit),
          total_pages: Math.ceil(total / parseInt(limit)),
          has_prev: parseInt(page) > 1, has_next: parseInt(page) * parseInt(limit) < total }
      });
    } catch (error) {
      console.error('Error in getConsultingAdvisors:', error);
      return res.status(500).json({ status: 'fail', message: error.message });
    }
  }

  async approveConsultingAdvisor(req, res) {
    try {
      const { userid } = req.body;
      if (!userid) return res.status(400).json({ status: 'fail', message: 'userid is required' });
      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1 AND role_type = $2', [userid, 'AGENT']);
      if (!rows.length) return res.status(404).json({ status: 'fail', message: 'Consulting Advisor not found' });
      const user = rows[0];
      const tempPassword = require('crypto').randomBytes(6).toString('hex').slice(0, 10);
      const hashed = await bcrypt.hash(tempPassword, 10);
      await pool.query(
        'UPDATE users SET is_active = TRUE, is_email_verified = TRUE, password = $1, updated_at = NOW() WHERE id = $2',
        [hashed, userid]
      );
      try {
        await emailService.sendConsultingAdvisorApprovalEmail(user.email, user.name);
        await emailService.sendWelcomeMailtoUser(user.email, user.name, tempPassword, 'Consulting Advisor');
      } catch (emailError) {
        console.error('Approval email failed:', emailError.message);
      }
      return res.json({ status: 'success', message: 'Consulting Advisor approved successfully' });
    } catch (error) {
      console.error('Error in approveConsultingAdvisor:', error);
      return res.status(500).json({ status: 'fail', message: error.message });
    }
  }

  async getMembers(req, res) {
    try {
      const { role, search } = req.query;

      const validRoles = ["CLIENT", "ISV", "SUPPORT_PARTNER"];
      if (!role) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]: "Please provide the role",
        });
      }

      if (!validRoles.includes(role)) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
          [commonConstant.VARIABLE.MESSAGE]:
            `Role should be one of: ${validRoles.join(", ")}`,
        });
      }

      const members = await UserService.getMembers(role, search);

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.DATA]: members,
      });
    } catch (error) {
      console.error("Error in getMembers:", error);

      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR,
      });
    }
  }

  // async sendUserApproval(req, res) {
  //   try {
  //     const { userid } = req.params;
  //     const userId = parseInt(userid, 10); // base 10

  //     if (isNaN(userId)) {
  //       return res.status(400).json({ error: 'Invalid user ID' });
  //     }
  //     if (!userId) {
  //       return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
  //         [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
  //         [commonConstant.VARIABLE.MESSAGE]: 'user does not exists'
  //       });
  //     }

  //     const approvalMail = await UserService.sendApprovalMail(userId);

  //     return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
  //       [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
  //       [commonConstant.VARIABLE.DATA]: approvalMail
  //     });

  //   } catch (error) {
  //     console.error(error);

  //     return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
  //       [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
  //       [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR
  //     });
  //   }
  // }

  async userbyroletype(req, res) {
    try {
      const { page = 1, limit = 10, search = "" } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = Math.min(
        parseInt(limit, 10),
        commonConstant.PAGINATION.MAX_LIMIT,
      );

      const { users, pagination } = await UserService.getUsersByRoleType(
        pageNum,
        limitNum,
        search,
      );

      return res.status(200).json({
        success: true,
        data: users,
        pagination,
      });
    } catch (error) {
      console.error("Error fetching users by role type", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch users",
      });
    }
  }

  async getRoleTypes(req, res) {
    try {
      const roles = await UserService.getRoleTypes();

      return res.status(200).json({
        success: true,
        data: roles,
      });
    } catch (error) {
      console.error("Error fetching role types", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch role types",
      });
    }
  }

  async createuser(req, res) {
    try {
      const {
        role_id,
        name,
        mobile,
        email,
        password,
        confirm_password,
        is_active,
        is_email_verified,
      } = req.body;

      // Validate required fields
      if (
        !role_id ||
        !name ||
        !mobile ||
        !email ||
        !password ||
        !confirm_password
      ) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }

      // Check password match
      if (password !== confirm_password) {
        return res.status(400).json({
          success: false,
          message: "Password and Confirm Password do not match",
        });
      }

      // Check if role exists and get role_type
      const roleResult = await pool.query(
        `
      SELECT role_type
      FROM roles
      WHERE role_id = $1
      `,
        [role_id],
      );

      if (roleResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid role selected",
        });
      }

      const role_type = roleResult.rows[0].role_type;

      // Check if email already exists
      const existingUser = await pool.query(
        `
      SELECT id
      FROM users
      WHERE email = $1
      `,
        [email],
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Email already exists",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user
      const insertQuery = `
      INSERT INTO users (
        role_id,
        role_type,
        name,
        mobile,
        email,
        password,
        is_active,
        is_email_verified
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      )
      RETURNING *
    `;

      const { rows } = await pool.query(insertQuery, [
        role_id,
        role_type,
        name,
        mobile,
        email,
        hashedPassword,
        is_active ?? true,
        is_email_verified ?? true,
      ]);

      // Send welcome email
      try {
        await emailService.sendWelcomeMailtoUser(
          email,
          name,
          password,
          role_type,
        );
      } catch (mailError) {
        console.error("Failed to send welcome email:", mailError);
      }

      return res.status(201).json({
        success: true,
        message: "User created successfully",
        data: rows[0],
      });
    } catch (error) {
      console.error("Error creating user:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create user",
        error: error.message,
      });
    }
  }

  async updateUserByrole(req, res) {
    try {
      const { id } = req.params;

      const { role_id, name, mobile, email, password, is_active } = req.body;

      const userResult = await pool.query(
        `
      SELECT *
      FROM users
      WHERE id = $1
      `,
        [id],
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const existingUser = userResult.rows[0];

      // Check email uniqueness
      if (email && email !== existingUser.email) {
        const emailExists = await pool.query(
          `
        SELECT id
        FROM users
        WHERE email = $1
        AND id <> $2
        `,
          [email, id],
        );

        if (emailExists.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: "Email already exists",
          });
        }
      }

      let hashedPassword = existingUser.password;

      if (password && password.trim() !== "") {
        hashedPassword = await bcrypt.hash(password, 10);
      }

      // Default to existing role values
      let updatedRoleId = existingUser.role_id;
      let updatedRoleType = existingUser.role_type;

      // If role_id is sent, get corresponding role_type
      if (role_id) {
        const roleResult = await pool.query(
          `
        SELECT role_id, role_type
        FROM roles
        WHERE role_id = $1
        `,
          [role_id],
        );

        if (roleResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid role selected",
          });
        }

        updatedRoleId = roleResult.rows[0].role_id;
        updatedRoleType = roleResult.rows[0].role_type;
      }

      const roleChanged =
        updatedRoleId !== existingUser.role_id ||
        updatedRoleType !== existingUser.role_type;

      const updateResult = await pool.query(
        `
      UPDATE users
      SET
        role_id = $1,
        role_type = $2,
        name = COALESCE($3, name),
        mobile = COALESCE($4, mobile),
        email = COALESCE($5, email),
        password = $6,
        is_active = COALESCE($7, is_active),
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
      `,
        [
          updatedRoleId,
          updatedRoleType,
          name,
          mobile,
          email,
          hashedPassword,
          is_active,
          id,
        ],
      );

      // Send mail only if role changed
      if (roleChanged) {
        try {
          await emailService.sendRoleChangeEmail(
            updateResult.rows[0].email,
            updateResult.rows[0].name,
            existingUser.role_type,
            updatedRoleType,
          );
        } catch (mailError) {
          console.error("Failed to send role change email:", mailError);
        }
      }

      return res.status(200).json({
        success: true,
        message: "User updated successfully",
        roleChanged,
        data: updateResult.rows[0],
      });
    } catch (error) {
      console.error("Error updating user:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update user",
        error: error.message,
      });
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await UserService.getUserDetailById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Error fetching user:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch user",
      });
    }
  }
}

module.exports = new UserController();
