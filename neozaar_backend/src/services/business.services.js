const pool = require("../config/database");
const uploadToSFTP = require("../utils/azureStorage");
const DataTransformer = require("../utils/dataTransformer");
const IsvDetail = require("../models/ISVModel/IsvDetail");
const sequelize = require("../config/sequelize");
const CompanyDetail = require("../models/CompanyDetail");
const Brand = require("../models/brand");
const { thankyouEmail, approvalMail } = require("../config/mail");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

class BusinessService {
  async isvRegistration(params, userId) {
    const t = await sequelize.transaction();
    try {
      const {
        cloud_partnership,
        existing_marketplace_listing,
        competencies_certifications = null,
        preferred_engagement = null,
        neozaar_tc = false,
        data_privacy = false,
        sla_link,
        support_desk_email,
        terms_of_use_link,
        service_sub_options,
      } = params.body;
      const files = params.files || {};

      let signed_document = null;
      let business_certification = null;
      let is_document_signed = false;
      if (files?.agreement_document?.[0]) {
        signed_document = await uploadToSFTP(files.agreement_document[0]);
        is_document_signed = true;
      }
      if (files?.business_certification?.[0]) {
        business_certification = await uploadToSFTP(
          files.business_certification[0],
        );
      }
      const parsedCloudPartnership = Array.isArray(cloud_partnership)
        ? cloud_partnership
        : JSON.parse(cloud_partnership || "[]");

      const parsedExistingMarketplace = Array.isArray(
        existing_marketplace_listing,
      )
        ? existing_marketplace_listing
        : JSON.parse(existing_marketplace_listing || "[]");

      const [isvRecord, created] = await IsvDetail.findOrCreate({
        where: { user_id: userId },
        defaults: {
          user_id: userId,
          cloud_partnership: parsedCloudPartnership,
          existing_marketplace_listing: parsedExistingMarketplace,
          competencies_certifications,
          preferred_engagement,
          business_certification,
          neozaar_tc,
          data_privacy,
          sla_link,
          support_desk_email,
          is_active: true,
          created_by: userId,
          updated_by: userId,
          signed_document,
          is_document_signed,
          is_approved: false,
          terms_of_use_link,
          service_sub_options: service_sub_options ? JSON.parse(service_sub_options) : null,
        },
        transaction: t,
      });

      if (!created) {
        const updateData = {
          cloud_partnership: parsedCloudPartnership,
          existing_marketplace_listing: parsedExistingMarketplace,
          competencies_certifications,
          preferred_engagement,
          neozaar_tc,
          data_privacy,
          sla_link,
          support_desk_email,
          updated_by: userId,
          updated_at: new Date(),
          terms_of_use_link,
          service_sub_options: service_sub_options ? JSON.parse(service_sub_options) : undefined,
        };
        if (signed_document) {
          updateData.signed_document = signed_document;
          updateData.is_document_signed = true;
        }
        if (business_certification) {
          updateData.business_certification = business_certification;
        }

        await isvRecord.update(updateData, { transaction: t });
      }

      await t.commit();
      return isvRecord;
    } catch (error) {
      await t.rollback();
      console.error("❌ Error in isvRegistration:", error);
      throw error;
    }
  }

  async uploadSignedDocument(userId, agreementFile) {
    const client = await pool.connect();

    try {
      if (!agreementFile || !agreementFile.originalname) {
        throw new Error("Invalid or missing agreement file.");
      }

      // Upload the file (this function should return a file path or URL)
      const signed_document = await uploadToSFTP(agreementFile);

      // Check if ISV record exists
      const existingRecord = await client.query(
        "SELECT id FROM isv_details WHERE user_id = $1",
        [userId],
      );

      if (existingRecord.rows.length > 0) {
        await client.query(
          `UPDATE isv_details
          SET signed_document = $1,
              is_document_signed = TRUE,
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $2`,
          [signed_document, userId],
        );
      } else {
        await client.query(
          `INSERT INTO isv_details
            (user_id, signed_document, is_document_signed, is_active,
              created_by, updated_by, created_at, updated_at)
          VALUES ($1, $2, TRUE, TRUE, $1, $1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [userId, signed_document],
        );
      }

      return true;
    } catch (error) {
      console.error("Error in uploadSignedDocument:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async setApprovalStatus(userId, isApproved, approvedBy) {
    const client = await pool.connect();
    try {
      const userDetail = await User.findByPk(userId);
      //check logeding user id
      const tempPassword = crypto.randomBytes(6).toString("hex").slice(0, 10);
      const hashed = await bcrypt.hash(tempPassword, 10);

      if (!userDetail) {
        throw new Error("User not found");
      }
      await User.update(
        {
          is_email_verified: true,
          is_active: true,
          password: hashed,
          updated_at: new Date(),
        },
        { where: { id: userId } },
      );

      const [updatedRows] = await IsvDetail.update(
        {
          is_approved: isApproved,
          updated_at: new Date(),
          approved_by: approvedBy,
          is_active: true,
        },
        { where: { user_id: userId }, returning: true },
      );

      if (updatedRows === 0) {
        throw new Error("ISV details not found for this user");
      }

      const email = userDetail?.email;
      const userName = userDetail?.name;
      await approvalMail(userId, email, userName, tempPassword);

      return true;
    } catch (error) {
      console.error("Error in setApprovalStatus:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async setIsvUserInactive(userId, isApproved, approvedBy) {
    try {
      const userDetail = await User.findByPk(userId);
      //check logeding user id
      const tempPassword = crypto.randomBytes(6).toString("hex").slice(0, 10);
      const hashed = await bcrypt.hash(tempPassword, 10);

      if (!userDetail) {
        throw new Error("User not found");
      }
      await User.update(
        {
          is_email_verified: false,
          is_active: false,
          password: hashed,
          updated_at: new Date(),
        },
        { where: { id: userId } },
      );

      const [updatedRows] = await IsvDetail.update(
        {
          is_approved: isApproved,
          updated_at: new Date(),
          approved_by: approvedBy,
          is_active: false,
        },
        { where: { user_id: userId }, returning: true },
      );

      if (updatedRows === 0) {
        throw new Error("ISV details not found for this user");
      }

      // const email = userDetail?.email
      // const userName = userDetail?.name
      //await approvalMail(userId, email, userName, tempPassword);

      return true;
    } catch (error) {
      console.error("Error in setApprovalStatus:", error);
      throw error;
    }
  }

  async sendForApproval(userId) {
    try {
      const userDetail = await User.findByPk(userId);

      if (!userDetail) {
        throw new Error("User not found");
      }
      await User.update(
        { is_email_verified: false, is_active: false, updated_at: new Date() },
        { where: { id: userId } },
      );

      const [updatedRows] = await IsvDetail.update(
        { is_approved: false, updated_at: new Date(), is_active: false },
        { where: { user_id: userId }, returning: true },
      );
      // TODO:: send email to admin for approval

      return true;
    } catch (error) {
      console.error("Error in sendForApproval:", error);
      throw error;
    }
  }

  async createCompanyDetail(params, userId, actionId, role_type) {
    try {
      const {
        company_name,
        registered_business_name,
        brand_name,
        company_registration_number,
        legal_entity_type,
        tax_id,
        headquater_country,
        website_url,
        linkedin_url,
      } = params.body;

      const files = params.files || {};

      let brand_logo = null;
      if (files?.brand_logo?.[0]) {
        brand_logo = await uploadToSFTP(files.brand_logo[0]);
      }

      const newCompany = await CompanyDetail.create({
        action_id: actionId,
        action_type: role_type,
        company_name,
        registered_business_name,
        brand_name,
        brand_logo,
        company_registration_number,
        legal_entity_type,
        tax_id,
        headquater_country,
        website_url,
        linkedin_url,
        is_active: true,
        created_by: userId,
        updated_by: userId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      if (brand_name) {
        await Brand.findOrCreate({
          where: {
            name: brand_name,
          },
          defaults: {
            name: brand_name,
            icon: brand_logo || null,
            created_by: userId,
            updated_by: userId,
            status: true,
          },
        });
      }
      return !!newCompany; 
    } catch (error) {
      console.error("Error in createCompanyDetail:", error);
      throw error;
    }
  }

  async updateCompanyDetail(params, userId, actionId, role_type) {
    try {
      const {
        company_name,
        registered_business_name,
        brand_name,
        company_registration_number,
        legal_entity_type,
        tax_id,
        headquater_country,
        website_url,
        linkedin_url,
      } = params.body;
      const files = params.files || {};

      let brand_logo = null;
      if (files?.brand_logo?.[0]) {
        brand_logo = await uploadToSFTP(files.brand_logo[0]);
      }

      const updateData = {
        company_name,
        registered_business_name,
        brand_name,
        company_registration_number,
        legal_entity_type,
        tax_id,
        headquater_country,
        website_url,
        linkedin_url,
        is_active: true,
        updated_by: userId,
        updated_at: new Date(),
      };
      if (brand_logo) {
        updateData.brand_logo = brand_logo;
      }
      const updatedCompany = await CompanyDetail.update(updateData, {
        where: {
          action_id: actionId,
          action_type: role_type,
        },
      });
      if (updatedCompany > 0) {
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error in createCompanyDetail:", error);
      throw error;
    }
  }

  // ======================= CREATE SUPPORT PARTNER PROFILE (PURE STORAGE - NO TRANSFORMATION) =======================
  async createSupportPartnerProfile(client, params) {
    try {
      const {
        userId,
        solution_partner_type,
        core_service_offer,
        vertical_experties,
        partner_program_membership,
        competencies_certificate,
        preferred_engagement_modal,
        company_profile_upload,
        case_studies,
        business_certification,
        neozaar_tc,
        data_privacy,
        primary_cloud_alignment,
      } = params;

      // console.log('💾 BusinessService: Storing Support Partner data to DB (pre-transformed):', {
      //   primary_cloud_alignment,
      //   core_service_offer,
      //   vertical_experties,
      //   partner_program_membership,
      //   preferred_engagement_modal,
      //   neozaar_tc,
      //   data_privacy
      // });

      const supportPartnerResult = await client.query(
        `INSERT INTO support_partner 
        (user_id, solution_partner_type, core_service_offer, vertical_experties, 
         partner_program_membership, competencies_certificate, preferred_engagement_modal, 
         company_profile_upload, case_studies, business_certification, neozaar_tc, data_privacy,
         primary_cloud_alignment, is_active, created_by, updated_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id`,
        [
          userId,
          solution_partner_type || null,
          core_service_offer, // Already transformed by UserController
          vertical_experties, // Already transformed by UserController
          partner_program_membership, // Already transformed by UserController
          competencies_certificate || null,
          preferred_engagement_modal, // Already transformed by UserController
          company_profile_upload || null,
          case_studies || null,
          business_certification || null,
          neozaar_tc, // Already transformed to boolean by UserController
          data_privacy, // Already transformed to boolean by UserController
          primary_cloud_alignment, // Already transformed by UserController
          true,
          userId,
          userId,
        ],
      );

      return supportPartnerResult.rows[0].id;
    } catch (error) {
      console.error("Error in createSupportPartnerProfile:", error);
      throw error;
    }
  }

  // ======================= UPDATE BUSINESS INFO =======================
  async updateBusinessInfo(userId, businessData, role_type) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // BusinessData is already transformed by UserController
      // Just pass it directly to update methods

      // Update company details
      await this.updateCompanyDetail(client, { ...businessData, userId });

      // Update profile-specific details
      if (role_type === "ISV") {
        await this.updateISVProfile(client, { ...businessData, userId });
      } else if (role_type === "SUPPORT_PARTNER") {
        await this.updateSupportPartnerProfile(client, {
          ...businessData,
          userId,
        });
      }

      await client.query("COMMIT");
      return { message: "Business info updated successfully" };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // ======================= UPDATE ISV PROFILE (PURE STORAGE - NO TRANSFORMATION) =======================
  async updateISVProfile(client, params) {
    try {
      const {
        userId,
        cloud_partnership,
        existing_marketplace_listing,
        competencies_certifications,
        preferred_engagement,
        business_certification,
      } = params;

      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (cloud_partnership !== undefined) {
        updateFields.push(`cloud_partnership = $${paramCount++}`);
        updateValues.push(cloud_partnership); // Already transformed by UserController
      }

      if (existing_marketplace_listing !== undefined) {
        updateFields.push(`existing_marketplace_listing = $${paramCount++}`);
        updateValues.push(existing_marketplace_listing); // Already transformed by UserController
      }

      if (competencies_certifications !== undefined) {
        updateFields.push(`competencies_certifications = $${paramCount++}`);
        updateValues.push(competencies_certifications);
      }

      if (preferred_engagement !== undefined) {
        updateFields.push(`preferred_engagement = $${paramCount++}`);
        updateValues.push(preferred_engagement);
      }

      if (business_certification !== undefined) {
        updateFields.push(`business_certification = $${paramCount++}`);
        updateValues.push(business_certification);
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_by = $${paramCount++}`);
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(userId);

        const updateQuery = `
          UPDATE isv_details 
          SET ${updateFields.join(", ")} 
          WHERE user_id = $${paramCount}`;

        updateValues.push(userId);

        await client.query(updateQuery, updateValues);
      }
    } catch (error) {
      console.error("Error in updateISVProfile:", error);
      throw error;
    }
  }

  // ======================= UPDATE SUPPORT PARTNER PROFILE (PURE STORAGE - NO TRANSFORMATION) =======================
  async updateSupportPartnerProfile(client, params) {
    try {
      const {
        userId,
        solution_partner_type,
        core_service_offer,
        vertical_experties,
        partner_program_membership,
        competencies_certificate,
        preferred_engagement_modal,
        company_profile_upload,
        case_studies,
        business_certification,
        primary_cloud_alignment,
      } = params;

      // console.log('💾 BusinessService: Updating Support Partner data in DB (pre-transformed):', {
      //   primary_cloud_alignment,
      //   core_service_offer,
      //   vertical_experties,
      //   partner_program_membership,
      //   preferred_engagement_modal
      // });

      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (solution_partner_type !== undefined) {
        updateFields.push(`solution_partner_type = $${paramCount++}`);
        updateValues.push(solution_partner_type);
      }

      if (core_service_offer !== undefined) {
        updateFields.push(`core_service_offer = $${paramCount++}`);
        updateValues.push(core_service_offer); // Already transformed by UserController
      }

      if (vertical_experties !== undefined) {
        updateFields.push(`vertical_experties = $${paramCount++}`);
        updateValues.push(vertical_experties); // Already transformed by UserController
      }

      if (partner_program_membership !== undefined) {
        updateFields.push(`partner_program_membership = $${paramCount++}`);
        updateValues.push(partner_program_membership); // Already transformed by UserController
      }

      if (competencies_certificate !== undefined) {
        updateFields.push(`competencies_certificate = $${paramCount++}`);
        updateValues.push(competencies_certificate);
      }

      if (preferred_engagement_modal !== undefined) {
        updateFields.push(`preferred_engagement_modal = $${paramCount++}`);
        updateValues.push(preferred_engagement_modal); // Already transformed by UserController
      }

      if (company_profile_upload !== undefined) {
        updateFields.push(`company_profile_upload = $${paramCount++}`);
        updateValues.push(company_profile_upload);
      }

      if (case_studies !== undefined) {
        updateFields.push(`case_studies = $${paramCount++}`);
        updateValues.push(case_studies);
      }

      if (business_certification !== undefined) {
        updateFields.push(`business_certification = $${paramCount++}`);
        updateValues.push(business_certification);
      }

      if (primary_cloud_alignment !== undefined) {
        updateFields.push(`primary_cloud_alignment = $${paramCount++}`);
        updateValues.push(primary_cloud_alignment); // Already transformed by UserController
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_by = $${paramCount++}`);
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(userId);

        const updateQuery = `UPDATE support_partner SET ${updateFields.join(", ")} WHERE user_id = $${paramCount}`;
        updateValues.push(userId);
        await client.query(updateQuery, updateValues);
      }
    } catch (error) {
      console.error("Error in updateSupportPartnerProfile:", error);
      throw error;
    }
  }

  // ======================= GET BUSINESS INFO BY USER ID (RAW DATA FROM DB) =======================
  async getBusinessInfoByUserId(userId, role_type) {
    const client = await pool.connect();
    try {
      // Get company details
      const companyResult = await client.query(
        "SELECT * FROM company_detail WHERE created_by = $1",
        [userId],
      );

      let companyData = null;
      let profileData = null;

      if (companyResult.rows.length > 0) {
        companyData = companyResult.rows[0];
      }

      // Get role-specific profile data (RAW - no transformation here)
      if (role_type === "ISV") {
        const isvResult = await client.query(
          "SELECT * FROM isv_details WHERE user_id = $1",
          [userId],
        );
        if (isvResult.rows.length > 0) {
          profileData = isvResult.rows[0]; // Raw data - transformation will be done in controller
        }
      } else if (role_type === "SUPPORT_PARTNER") {
        const supportResult = await client.query(
          "SELECT * FROM support_partner WHERE user_id = $1",
          [userId],
        );
        if (supportResult.rows.length > 0) {
          profileData = supportResult.rows[0]; // Raw data - transformation will be done in controller
        }
      }

      return {
        company: companyData,
        profile: profileData,
      };
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async parseArray(value) {
    if (!value) return "{}";
    if (Array.isArray(value))
      return `{${value.map((v) => v.trim()).join(",")}}`;

    const arr = String(value)
      .split(/[,;\n]+/)
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    return `{${arr.join(",")}}`; // ✅ PostgreSQL array format
  }

  static parseString(value) {
    return value ? String(value).trim() : null;
  }
}

module.exports = new BusinessService();
