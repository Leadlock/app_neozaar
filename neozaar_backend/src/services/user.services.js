const pool = require("../config/database");
const bcrypt = require("bcryptjs");
const sequelize = require("../config/sequelize");
const { v4: uuidv4 } = require("uuid");
const { roleMap } = require("../config/roles.config");
const commonConstant = require("../config/common.constant");
const { thankyouEmail, approvalMail } = require("../config/mail");
const uploadToSFTP = require("../utils/azureStorage");
const BusinessService = require("./business.services");
const CleanupService = require("./cleanup.services");
const User = require("../models/User");
const { Op } = require("sequelize");
const crypto = require("crypto");
const { IsvDetail, CompanyDetail } = require("../models/Users/index");
const CrmApiService = require("./crmApi/crmApi.service");
const CatalogService = require("./catalog.service");
const { decrypt } = require("dotenv");

class UserService {
  async userRegistration(data) {
    try {
      const existingUser = await User.findOne({
        where: { email: data.email },
      });

      if (existingUser) return false;
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await User.create({
        ...data,
        password: hashedPassword,
        is_active: false,
      });
      if (data.role_type == "ISV") {
        let isvData = {
          username: this.formatUsername(data.name),
          name: data.name,
          email: data.email,
          password: data.password,
          title: "ISV",
          phone: data.mobile,
          gender: "Male",
        };
        CrmApiService.createIsvUser(isvData)
          .then((res) => console.log("CRM Sync Success:", res))
          .catch((err) => console.error("CRM Sync Failed:", err));
      }
      if (data.role_type == "CLIENT") {
        let accountData = {
          name: data.company_name || data.name,
          email: data.email,
          phone: data.mobile,
          company_name: data.company_name || data.name,
        };
        CrmApiService.createAccount(accountData)
          .then((res) => console.log("CRM Sync Success:", res))
          .catch((err) => console.error("CRM Sync Failed:", err));
      }

      return user;
    } catch (error) {
      console.error("Error in userRegistration:", error);
      throw error;
    }
  }

  formatUsername(name) {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "") // convert spaces to underscore
      .replace(/[^a-z0-9_]/g, ""); // remove special chars
  }

  async getISVList(
    page = 1,
    limit = commonConstant.PAGINATION.DEFAULT_LIMIT,
    search = "",
    status = "all",
  ) {
    try {
      const offset = (page - 1) * limit;
      const whereClause = { role_type: "ISV" };
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { mobile: { [Op.iLike]: `%${search}%` } },
        ];
      }
      const isvWhereClause = {};
      if (status === "approved") {
        isvWhereClause.is_approved = true;
      } else if (status === "pending") {
        isvWhereClause.is_approved = false;
      }
      const { count, rows: users } = await User.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: IsvDetail,
            as: "isv_detail",
            include: [
              {
                model: CompanyDetail,
                as: "company_detail",
                required: false,
                where: { action_type: "ISV" },
                attributes: [
                  "id",
                  "company_name",
                  "registered_business_name",
                  "brand_name",
                ],
              },
            ],
            required: status !== "all",
            where: Object.keys(isvWhereClause).length
              ? isvWhereClause
              : undefined,
            attributes: [
              "id",
              "cloud_partnership",
              "existing_marketplace_listing",
              "preferred_engagement",
              "business_certification",
              "neozaar_tc",
              "data_privacy",
              "is_approved",
              "is_active",
              "sla_link",
              "support_desk_email",
              "signed_document",
              "is_document_signed",
              "terms_of_use_link",
              "service_sub_options",
            ],
          },
        ],
        order: [["created_at", "DESC"]],
        limit,
        offset,
        distinct: true,
        attributes: { exclude: ["password"] },
      });
      const pagination = commonConstant.PAGINATION.build({
        total: count,
        page,
        limit,
      });

      return { users, pagination };
    } catch (error) {
      console.error("Error in getISVList:", error);
      throw error;
    }
  }

  async getIsvDetailByUserId(userId) {
    try {
      const user = await User.findOne({
        where: { id: userId, role_type: "ISV" },
        include: [
          {
            model: IsvDetail,
            as: "isv_detail",
            required: false,
            include: [
              {
                model: CompanyDetail,
                as: "company_detail",
                required: false,
                where: { action_type: "ISV" },
                attributes: [
                  "id",
                  "company_name",
                  "registered_business_name",
                  "brand_name",
                  "brand_logo",
                  "company_registration_number",
                  "legal_entity_type",
                  "tax_id",
                  "headquater_country",
                  "website_url",
                  "linkedin_url",
                ],
              },
            ],
            attributes: [
              "id",
              "cloud_partnership",
              "existing_marketplace_listing",
              "preferred_engagement",
              "business_certification",
              "neozaar_tc",
              "data_privacy",
              "is_approved",
              "is_active",
              "sla_link",
              "support_desk_email",
              "signed_document",
              "is_document_signed",
              "terms_of_use_link",
              "service_sub_options",
            ],
          },
        ],
        attributes: { exclude: ["password"] },
      });

      if (!user) {
        throw new Error("ISV user not found");
      }

      return user;
    } catch (error) {
      console.error("Error in getIsvDetailByUserId:", error);
      throw error;
    }
  }

  async getIsvDetailWithProductByUserId(userId, page = 1, limit = 15) {
    try {
      const user = await User.findOne({
        where: { id: userId }, //role_type: 'ISV' },
        include: [
          {
            model: IsvDetail,
            as: "isv_detail",
            required: false,
            include: [
              {
                model: CompanyDetail,
                as: "company_detail",
                required: false,
                where: { action_type: "ISV" },
                attributes: [
                  "id",
                  "company_name",
                  "registered_business_name",
                  "brand_name",
                  "brand_logo",
                  "company_registration_number",
                  "legal_entity_type",
                  "tax_id",
                  "headquater_country",
                  "website_url",
                  "linkedin_url",
                ],
              },
            ],
            attributes: [
              "id",
              "cloud_partnership",
              "existing_marketplace_listing",
              "preferred_engagement",
              "business_certification",
              "neozaar_tc",
              "data_privacy",
              "is_approved",
              "is_active",
              "sla_link",
              "support_desk_email",
              "signed_document",
              "is_document_signed",
              "terms_of_use_link",
              "service_sub_options",
            ],
          },
          {
            model: CompanyDetail,
            as: "company_details",
            required: false,
            attributes: [
              "id",
              "company_name",
              "registered_business_name",
              "brand_name",
              "brand_logo",
              "company_registration_number",
              "legal_entity_type",
              "tax_id",
              "headquater_country",
              "website_url",
              "linkedin_url",
            ],
          },
        ],
        attributes: { exclude: ["password"] },
      });

      if (!user) {
        throw new Error("ISV user not found");
      }

      const crmProducts = await CatalogService.getIsvUserCreatedProducts(
        userId,
        page,
        limit,
      );

      return { user, products: crmProducts };
    } catch (error) {
      console.error("Error in getIsvDetailWithProductByUserId:", error);
      throw error;
    }
  }

  async updateISVuser(userId, updateData) {
    try {
      const userDetail = await User.findOne({
        where: { id: userId, role_type: "ISV" },
      });
      if (!userDetail) {
        throw new Error("ISV user not found");
      }
      await User.update(updateData, {
        where: { id: userId },
      });
      return { message: "ISV User updated successfully" };
    } catch (error) {
      throw error;
    }
  }

  // ======================= REGISTER USER WITH BUSINESS DATA =======================
  async registerUserWithBusinessData(userData, businessData, files = null) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { name, email, mobile, designation, password, role_id, role_type } =
        userData;
      const emailToken = uuidv4();

      // Validate required fields
      if (!name || !email || !password || !role_id || !role_type) {
        throw new Error("Missing required fields");
      }

      // Validate role consistency
      const expectedRoleType = roleMap[role_id];
      if (!expectedRoleType || expectedRoleType !== role_type) {
        throw new Error("Invalid role_id or role_type");
      }

      // Check if user exists
      const userExists = await client.query(
        "SELECT 1 FROM users WHERE email = $1",
        [email],
      );
      if (userExists.rows.length > 0) {
        throw new Error("User already exists");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user (inactive until email verified)
      const userResult = await client.query(
        `INSERT INTO users 
         (role_id, role_type, name, mobile, email, password, designation, is_active, is_email_verified, is_mobile_verified, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *`,
        [
          role_id,
          role_type,
          name,
          mobile,
          email,
          hashedPassword,
          designation,
          false,
          false,
          false,
        ],
      );

      const user = userResult.rows[0];

      // Handle file uploads if files exist
      let uploadedFiles = {};
      if (files && Object.keys(files).length > 0) {
        uploadedFiles = await this.handleFileUploads(files);
      }

      // ✅ Merge everything into business data, and add `email` inside business_data JSON
      const tempBusinessData = {
        ...businessData,
        ...uploadedFiles,
        email, // 👈 so we can query with ->>email
        email_verification_token: emailToken,
      };

      // Create temp_business_registration table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS temp_business_registration (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          user_id BIGINT NOT NULL,
          business_data JSONB NOT NULL,
          email_verification_token VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id)
        )
      `);

      // Insert or update temp business data
      await client.query(
        `INSERT INTO temp_business_registration 
         (user_id, business_data, email_verification_token, created_at, updated_at) 
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET 
         business_data = $2, email_verification_token = $3, updated_at = CURRENT_TIMESTAMP`,
        [user.id, JSON.stringify(tempBusinessData), emailToken],
      );

      await client.query("COMMIT");

      //TODO:: ✅ Use the new cleanup service instead of setTimeout
      //CleanupService.scheduleUserCleanup(user.id, emailToken, 24*5); // 5 days

      // Send verification email
      const verificationLink = `${
        process.env.FRONTEND_URL?.includes("localhost") ||
        !process.env.FRONTEND_URL
          ? "https://neozaar.com"
          : process.env.FRONTEND_URL
      }/api/user/verify-email?token=${emailToken}&email=${encodeURIComponent(email)}`;

      await thankyouEmail(email, verificationLink, name);

      delete user.password;
      return { user, emailToken };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // ======================= VERIFY EMAIL AND COMPLETE REGISTRATION =======================
  async verifyEmailAndCompleteRegistration(email, token) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      console.log("Verifying email for:", email);
      const userResult = await client.query(
        "SELECT * FROM users WHERE email = $1 AND verification_token = $2",
        [email, token],
      );

      if (userResult.rows.length === 0) {
        throw new Error("Invalid token or email");
      }

      const user = userResult.rows[0];

      if (user.is_email_verified) {
        throw new Error("Email already verified");
      }

      // Activate + verify user
      await client.query(
        `UPDATE users 
        SET is_email_verified = TRUE, 
            is_active = TRUE, 
            verification_token = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
        [user.id],
      );

      // Create CRM lead for CLIENT registrations and fire customer_registration scoring event
      if (user.role_type === 'CLIENT') {
        try {
          // Find or create crm_lead by email
          const { rows: existingLeads } = await client.query(
            'SELECT id, score FROM crm_leads WHERE email_normalized=LOWER(TRIM($1)) AND is_deleted=FALSE LIMIT 1',
            [user.email]
          );

          let leadId;
          if (existingLeads.length) {
            leadId = existingLeads[0].id;
          } else {
            const { rows: cdRows } = await client.query(
              "SELECT company_name FROM company_detail WHERE action_id=$1 AND action_type='CLIENT' LIMIT 1",
              [user.id]
            );
            const companyName = cdRows[0]?.company_name || null;
            const { rows: newLead } = await client.query(
              `INSERT INTO crm_leads (name, email, phone, company, status, lead_stage, score, score_label, lead_source, created_at, updated_at)
               VALUES ($1, $2, $3, $4, 'New', 'New Inquiry', 0, 'Unknown', 'Customer Registration', NOW(), NOW()) RETURNING id`,
              [user.name, user.email, user.mobile || null, companyName]
            );
            leadId = newLead[0].id;
          }

          await require('./affiliate/affiliate.registration.service').completeRegistration(user, leadId, client);

          // Fire customer_registration scoring event (+1 point)
          const { rows: leadRow } = await client.query('SELECT score FROM crm_leads WHERE id=$1', [leadId]);
          const oldScore = leadRow[0]?.score || 0;
          const newScore = Math.min(100, oldScore + 1);
          const scoreLabel = newScore >= 20 ? 'CTA Ready' : newScore >= 10 ? 'Engaged' : newScore >= 5 ? 'Interested' : 'Registered';

          await client.query(
            'UPDATE crm_leads SET score=$1, score_label=$2, updated_at=NOW() WHERE id=$3',
            [newScore, scoreLabel, leadId]
          );
          await client.query(
            'INSERT INTO crm_lead_score_history (lead_id, old_score, new_score, reason, points, changed_by) VALUES ($1,$2,$3,$4,$5,$6)',
            [leadId, oldScore, newScore, 'customer_registration', 1, null]
          );
        } catch (crmErr) {
          // CRM scoring failure must not block email verification
          console.error('[CRM] customer_registration scoring failed:', crmErr.message);
        }
      }

      // Commit the transaction
      await client.query("COMMIT");

      return {
        status: commonConstant.VARIABLE.SUCCESS,
        message: "Email verified and registration completed successfully",
        user: {
          ...user,
          is_email_verified: true,
          is_active: true,
        },
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // ======================= GET USER BY ID =======================
  async getUserById(userId, requesterId, requesterRole) {
    const client = await pool.connect();
    try {
      // Authorization check
      const privilegedRoles = ["SUPER_ADMIN", "ADMIN"];

      if (
        requesterId !== parseInt(userId) &&
        !privilegedRoles.includes(requesterRole)
      ) {
        throw new Error("Unauthorized access");
      }

      const userResult = await client.query(
        "SELECT * FROM users WHERE id = $1",
        [userId],
      );
      if (userResult.rows.length === 0) {
        throw new Error("User not found");
      }

      const user = userResult.rows[0];
      delete user.password;

      return user;
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  // ======================= GET ALL USERS =======================
  async getAllUsers(page = 1, limit = 10) {
    page = Number(page);
    limit = Number(limit);

    const client = await pool.connect();
    try {
      const offset = (page - 1) * limit;

      // Fetch paginated users
      const { count, rows: users } = await User.findAndCountAll({
        where: {
          is_active: true,
          is_email_verified: true,
        },
        order: [["created_at", "DESC"]],
        // limit,
        // offset,
        attributes: { exclude: ["password"] }, // remove password field
      });

      // Calculate pagination metadata
      // const total = count;
      // const totalPages = Math.ceil(total / limit);

      // // Build pagination object
      // const pagination = {
      //   total,
      //   page,
      //   limit,
      //   current_page: page,
      //   next_page: page < totalPages ? page + 1 : null,
      //   prev_page: page > 1 ? page - 1 : null,
      //   pages: Array.from({ length: totalPages }, (_, i) => i + 1),
      // };

      return {
        users,
        // pagination,
      };
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  // ======================= GET ISV USERS =======================
  async getISVusers(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const userResult = await pool.query(
        `
      SELECT 
        u.*, 
        isv.*
      FROM isv_details AS isv
      JOIN users AS u 
        ON u.id = isv.user_id
      ORDER BY u.id DESC
      LIMIT $1 OFFSET $2;
      `,
        [limit, offset],
      );

      const users = userResult.rows.map((user) => {
        delete user.password;
        return user;
      });

      const countResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM isv_details AS isv
      JOIN users AS u ON u.id = isv.user_id;
    `);
      const total = parseInt(countResult.rows[0].total, 10);

      return {
        users,
        pagination: commonConstant.PAGINATION.build({
          total,
          page: page,
          limit: limit,
        }),
      };
    } catch (error) {
      throw error;
    }
  }

  // ======================= GET PARTNER USERS =======================
  async getPartnerUsers(page = 1, limit = 10) {
    const client = await pool.connect();
    try {
      const offset = (page - 1) * limit;

      // Main query with pagination
      const userResult = await client.query(
        `
      SELECT 
        u.id, u.name, u.email, u.mobile, u.designation, u.role_id, u.role_type, u.is_active, u.is_email_verified, u.created_at, 
        c.company_name
      FROM users AS u 
      LEFT JOIN company_detail AS c
        ON u.id = c.action_id WHERE u.role_type = 'CLIENT'
      ORDER BY u.id DESC
      LIMIT $1 OFFSET $2;
      `,
        [limit, offset],
      );

      const users = userResult.rows.map((user) => {
        delete user.password;
        return user;
      });

      // Total count for pagination
      const countResult = await client.query(`
          SELECT COUNT(*) AS total
      FROM users where role_type = 'CLIENT';
    `);

      const total = parseInt(countResult.rows[0].total, 10);
      const totalPages = Math.ceil(total / limit);

      // Build pagination info in your preferred format
      const pagination = {
        total,
        page, // same as current page
        limit,
        current_page: page,
        next_page: page < totalPages ? page + 1 : null,
        prev_page: page > 1 ? page - 1 : null,
        pages: Array.from({ length: totalPages }, (_, i) => i + 1),
      };

      return {
        users,
        pagination,
      };
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async selectUser(role_type) {
    try {
      const userResult = await User.findAll({
        where: { role_type },
      });
      return userResult.rows;
    } catch (error) {
      throw error;
    }
  }
  async getMembers(role, search) {
    try {
      const whereClause = {
        role_type: role,
      };
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%{search}` } },
          { email: { [Op.iLike]: `%{search}` } },
        ];
      }
      const members = await User.findAll({
        where: whereClause,
        attributes: ["id", "name", "email"],
      });
      return members;
    } catch (error) {
      throw error;
    }
  }

  // ======================= UPDATE USER BASIC INFO =======================
  async updateUserBasicInfo(userId, updateData, requesterId, requesterRole) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Authorization check
      if (requesterId !== parseInt(userId) && requesterRole !== "SUPER_ADMIN") {
        throw new Error("Unauthorized update");
      }

      // Check if user exists
      const userCheck = await client.query(
        "SELECT * FROM users WHERE id = $1",
        [userId],
      );
      if (userCheck.rows.length === 0) {
        throw new Error("User not found");
      }

      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (updateData.name) {
        updateFields.push(`name = $${paramCount++}`);
        updateValues.push(updateData.name);
      }

      if (updateData.mobile) {
        updateFields.push(`mobile = $${paramCount++}`);
        updateValues.push(updateData.mobile);
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(userId);

        const updateQuery = `UPDATE users SET ${updateFields.join(", ")} WHERE id = $${paramCount}`;
        await client.query(updateQuery, updateValues);
      }

      await client.query("COMMIT");
      return { message: "User updated successfully" };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // ======================= DELETE USER =======================
  async deleteUser(userId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const userCheck = await client.query(
        "SELECT role_type FROM users WHERE id = $1",
        [userId],
      );
      if (userCheck.rows.length === 0) {
        throw new Error("User not found");
      }

      const role_type = userCheck.rows[0].role_type;

      // Helper to run a query safely using SAVEPOINTs (handles missing tables/columns)
      const safeQuery = async (sql, params) => {
        try {
          await client.query("SAVEPOINT safe_op");
          await client.query(sql, params);
          await client.query("RELEASE SAVEPOINT safe_op");
        } catch (e) {
          await client.query("ROLLBACK TO SAVEPOINT safe_op");
        }
      };

      // Delete role-specific data first
      if (role_type === "ISV") {
        await safeQuery("DELETE FROM isv_details WHERE user_id = $1", [userId]);
      } else if (role_type === "SUPPORT_PARTNER") {
        await safeQuery("DELETE FROM support_partner WHERE user_id = $1", [userId]);
      }

      // Delete company related data
      await safeQuery("DELETE FROM company_detail WHERE created_by = $1", [userId]);

      // Nullify CRM references to avoid foreign key violations
      await safeQuery("UPDATE crm_contacts SET owner_id = NULL WHERE owner_id = $1", [userId]);
      await safeQuery("UPDATE crm_contacts SET created_by = NULL WHERE created_by = $1", [userId]);
      await safeQuery("UPDATE crm_contacts SET updated_by = NULL WHERE updated_by = $1", [userId]);
      await safeQuery("UPDATE crm_leads SET owner_id = NULL WHERE owner_id = $1", [userId]);
      await safeQuery("UPDATE crm_leads SET created_by = NULL WHERE created_by = $1", [userId]);
      await safeQuery("UPDATE crm_leads SET updated_by = NULL WHERE updated_by = $1", [userId]);
      await safeQuery("UPDATE crm_opportunities SET owner_id = NULL WHERE owner_id = $1", [userId]);
      await safeQuery("UPDATE crm_opportunities SET created_by = NULL WHERE created_by = $1", [userId]);
      await safeQuery("UPDATE crm_opportunities SET updated_by = NULL WHERE updated_by = $1", [userId]);
      await safeQuery("UPDATE crm_opportunities SET seller_id = NULL WHERE seller_id = $1", [userId]);
      await safeQuery("UPDATE crm_opportunities SET seller_assigned_by = NULL WHERE seller_assigned_by = $1", [userId]);
      await safeQuery("UPDATE crm_quotes SET owner_id = NULL WHERE owner_id = $1", [userId]);
      await safeQuery("UPDATE crm_quotes SET created_by = NULL WHERE created_by = $1", [userId]);
      await safeQuery("UPDATE crm_orders SET owner_id = NULL WHERE owner_id = $1", [userId]);
      await safeQuery("UPDATE crm_orders SET created_by = NULL WHERE created_by = $1", [userId]);
      await safeQuery("UPDATE crm_invoices SET owner_id = NULL WHERE owner_id = $1", [userId]);
      await safeQuery("UPDATE crm_invoices SET created_by = NULL WHERE created_by = $1", [userId]);
      await safeQuery("UPDATE crm_meetings SET owner_id = NULL WHERE owner_id = $1", [userId]);
      await safeQuery("UPDATE crm_meetings SET created_by = NULL WHERE created_by = $1", [userId]);
      await safeQuery("UPDATE crm_tasks SET owner_id = NULL WHERE owner_id = $1", [userId]);
      await safeQuery("UPDATE crm_tasks SET created_by = NULL WHERE created_by = $1", [userId]);
      await safeQuery("UPDATE crm_tasks SET updated_by = NULL WHERE updated_by = $1", [userId]);
      await safeQuery("UPDATE crm_cases SET owner_id = NULL WHERE owner_id = $1", [userId]);
      await safeQuery("UPDATE crm_cases SET created_by = NULL WHERE created_by = $1", [userId]);
      await safeQuery("UPDATE crm_roles SET created_by = NULL WHERE created_by = $1", [userId]);
      await safeQuery("UPDATE crm_automation_rules SET created_by = NULL WHERE created_by = $1", [userId]);
      await safeQuery("UPDATE crm_activities SET owner_id = NULL WHERE owner_id = $1", [userId]);
      await safeQuery("UPDATE crm_activities SET created_by = NULL WHERE created_by = $1", [userId]);
      await safeQuery("UPDATE crm_lead_score_changes SET changed_by = NULL WHERE changed_by = $1", [userId]);
      await safeQuery("UPDATE crm_opp_stage_history SET changed_by = NULL WHERE changed_by = $1", [userId]);
      await safeQuery("UPDATE crm_documents SET uploaded_by = NULL WHERE uploaded_by = $1", [userId]);
      await safeQuery("UPDATE crm_user_roles SET assigned_by = NULL WHERE assigned_by = $1", [userId]);
      await safeQuery("UPDATE enquiries SET assigned_by = NULL WHERE assigned_by = $1", [userId]);
      await safeQuery("UPDATE seller_assignments SET assigned_by = NULL WHERE assigned_by = $1", [userId]);

      // Delete CRM records that require user_id (not nullable)
      await safeQuery("DELETE FROM crm_audit_logs WHERE user_id = $1", [userId]);
      await safeQuery("DELETE FROM crm_notifications WHERE user_id = $1", [userId]);
      await safeQuery("DELETE FROM crm_user_roles WHERE user_id = $1", [userId]);
      await safeQuery("DELETE FROM seller_assignments WHERE seller_id = $1", [userId]);

      // Delete seller assignments if any
      await safeQuery("DELETE FROM seller_item_assignments WHERE seller_id = $1", [userId]);

      // Nullify lead_details references
      await safeQuery("UPDATE lead_details SET user_id = NULL WHERE user_id = $1::text", [userId]);

      // Nullify products created by this user
      await safeQuery("UPDATE products SET user_id = NULL WHERE user_id = $1", [userId]);

      // Delete user — if still blocked by FK, find and nullify remaining references dynamically
      try {
        await client.query("SAVEPOINT delete_user");
        await client.query("DELETE FROM users WHERE id = $1", [userId]);
        await client.query("RELEASE SAVEPOINT delete_user");
      } catch (fkError) {
        await client.query("ROLLBACK TO SAVEPOINT delete_user");
        // Get all FK references dynamically and nullify them
        const fkQuery = `
          SELECT tc.table_name, kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'users'
            AND ccu.column_name = 'id'
        `;
        const fkResult = await client.query(fkQuery);
        for (const row of fkResult.rows) {
          await safeQuery(`UPDATE ${row.table_name} SET ${row.column_name} = NULL WHERE ${row.column_name} = $1`, [userId]);
          await safeQuery(`DELETE FROM ${row.table_name} WHERE ${row.column_name} = $1`, [userId]);
        }
        // Try delete again
        await client.query("DELETE FROM users WHERE id = $1", [userId]);
      }
      await client.query("COMMIT");

      return { message: "User deleted successfully" };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getRoleType(userId) {
    try {
      const userCheck = await User.findOne({
        where: { id: userId },
        attributes: ["role_type"],
      });

      if (!userCheck) {
        throw new Error("User not found");
      }
    } catch (error) {
      throw error;
    }
  }
  // ======================= HANDLE FILE UPLOADS =======================
  async handleFileUploads(files) {
    let uploadedFiles = {};

    if (files) {
      try {
        const uploadPromises = [];

        // brand_logo (single)
        if (files.brand_logo) {
          uploadPromises.push(
            uploadToSFTP(files.brand_logo[0]).then((url) => {
              uploadedFiles.brand_logo = url;
            }),
          );
        }

        // business_certification (single)
        if (files.business_certification) {
          uploadPromises.push(
            uploadToSFTP(files.business_certification[0]).then((url) => {
              uploadedFiles.business_certification = url;
            }),
          );
        }

        // company_profile_upload (multiple)
        if (files.company_profile_upload) {
          const profileUploads = files.company_profile_upload.map((file) =>
            uploadToSFTP(file),
          );

          uploadPromises.push(
            Promise.all(profileUploads).then((urls) => {
              uploadedFiles.company_profile_upload = urls;
            }),
          );
        }

        // case_studies (multiple)
        if (files.case_studies) {
          const caseStudyUploads = files.case_studies.map((file) =>
            uploadToSFTP(file),
          );

          uploadPromises.push(
            Promise.all(caseStudyUploads).then((urls) => {
              uploadedFiles.case_studies = urls;
            }),
          );
        }

        await Promise.all(uploadPromises);
      } catch (uploadError) {
        console.error("File upload error:", uploadError);
        throw new Error("Failed to upload files to storage");
      }
    }

    return uploadedFiles;
  }

  // ======================= RESEND VERIFICATION EMAIL =======================
  async resendVerificationEmail(email) {
    const client = await pool.connect();
    try {
      // Check if user exists and is not verified
      const userResult = await client.query(
        "SELECT * FROM users WHERE email = $1 AND is_email_verified = false",
        [email],
      );

      if (userResult.rows.length === 0) {
        throw new Error("User not found or already verified");
      }

      const user = userResult.rows[0];

      // Get verification token from temp data
      const tempDataResult = await client.query(
        "SELECT email_verification_token FROM temp_business_registration WHERE user_id = $1",
        [user.id],
      );

      if (tempDataResult.rows.length === 0) {
        throw new Error("No pending verification found");
      }

      const token = tempDataResult.rows[0].email_verification_token;

      const verificationLink = `${
        process.env.FRONTEND_URL?.includes("localhost") ||
        !process.env.FRONTEND_URL
          ? "https://neozaar.com/api"
          : process.env.FRONTEND_URL
      }/api/user/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

      await thankyouEmail(email, verificationLink, user.name);
      console.log("DEV VERIFICATION LINK:", verificationLink);

      return { message: "Verification email sent successfully" };
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async sendApprovalMail(userid) {
    try {
      const client = await pool.connect();
      await client.query("BEGIN");

      const tempPassword = crypto
        .randomBytes(6)
        .toString("base64")
        .slice(0, 10);
      const hashed = await bcrypt.hash(tempPassword, 10);
      const result = await client.query("SELECT * FROM users WHERE id = $1", [
        userid,
      ]);
      const user = result.rows[0];
      // Get temporary business data
      const tempDataResult = await client.query(
        "SELECT business_data FROM temp_business_registration WHERE user_id = $1",
        [userid],
      );

      if (tempDataResult.rows.length === 0) {
        throw new Error("No pending registration data found");
      }

      const businessData = tempDataResult.rows[0].business_data;

      // Activate user
      await client.query(
        "UPDATE users SET is_email_verified = $1, is_active = $2, updated_at = CURRENT_TIMESTAMP, password = $3 WHERE id = $4",
        [true, true, hashed, userid],
      );

      // Create business profile based on role
      let businessResult = null;
      if (user.role_type === "ISV" || user.role_type === "SUPPORT_PARTNER") {
        businessResult = await BusinessService.createBusinessInfoFromTemp(
          client,
          userid,
          businessData,
          user.role_type,
        );
      }

      // Clean up temporary data
      await client.query(
        "DELETE FROM temp_business_registration WHERE user_id = $1",
        [userid],
      );

      await client.query("COMMIT");

      //aproval logic
      // two table colum value will update isv_detail [is_active =true true kar na hai]
      // and users [is_email_verified = true kar na hai] ok
      const resul = await client.query(
        `
          WITH update_user AS (
            UPDATE users SET is_email_verified = TRUE WHERE id = $1
          )
          UPDATE isv_details SET is_active = TRUE, is_approved = TRUE WHERE user_id = $1;
        `,
        [userid],
      );

      const email = result.rows[0]?.email;
      const userName = result.rows[0]?.name;
      await approvalMail(userid, email, userName, tempPassword);

      return {
        message: "Email verified and registration completed successfully",
        user: { ...user, is_email_verified: true, is_active: true },
        businessInfo: businessResult,
      };
    } catch (error) {
      throw error;
    }
  }

  async getUsersByRoleType(page, limit, search = "") {
    const offset = (page - 1) * limit;

    // Internal staff roles shown in User Management
    // ISV (Software Vendor) and SUPPORT_PARTNER (Solution Partner) are excluded —
    // they are managed separately via the Partners section.
    const allowedRoles = [
      'SUPER_ADMIN', 'ADMIN', 'ROLE_MANAGER',
      'M_SELLER', 'SELLER', 'ISV_SELLER',
      'AGENT', 'A_MANAGER', 'MARKETING',
    ];

    const params = [allowedRoles];  // $1 = array
    let searchCondition = "";

    if (search?.trim()) {
      params.push(`%${search}%`);
      searchCondition = `
      AND (
        name ILIKE $${params.length}
        OR email ILIKE $${params.length}
        OR mobile ILIKE $${params.length}
      )
    `;
    }

    const countQuery = `
    SELECT COUNT(*) AS total
    FROM users
    WHERE role_type = ANY($1)
    ${searchCondition}
  `;

    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    params.push(limit);
    params.push(offset);

    const usersQuery = `
    SELECT
      id,
      role_id,
      role_type,
      name,
      mobile,
      designation,
      email,
      is_active,
      is_email_verified,
      is_mobile_verified,
      created_at,
      updated_at,
      lead_source
    FROM users
    WHERE role_type = ANY($1)
    ${searchCondition}
    ORDER BY created_at DESC
    LIMIT $${params.length - 1}
    OFFSET $${params.length}
  `;

    const { rows } = await pool.query(usersQuery, params);

    return {
      users: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRoleTypes() {
    const query = `
    SELECT role_id, role_type
    FROM roles
    WHERE role_type IN ('SUPER_ADMIN', 'ADMIN', 'ROLE_MANAGER', 'ISV_SELLER', 'AGENT', 'M_SELLER', 'SELLER', 'ISV', 'SUPPORT_PARTNER', 'A_MANAGER', 'MARKETING')
    ORDER BY role_id;
  `;

    const { rows } = await pool.query(query);

    return rows;
  }

  async getUserDetailById(id) {
    const query = `
    SELECT
      id,
      role_id,
      role_type,
      name,
      mobile,
      designation,
      email,
      is_active
    FROM users
    WHERE id = $1
  `;

    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  }
}

module.exports = new UserService();
