const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { roleMap } = require('../config/roles.config');
const commonConstant = require('../config/common.constant');
const { thankyouEmail, approvalMail } = require('../config/mail');
const uploadToSFTP = require('../utils/azureStorage');
const BusinessService = require('./business.services');
const CleanupService = require('./cleanup.services');
const User = require('../models/User');
const { Op } = require('sequelize');
const TempBusinessRegistration = require('../models/Users/TempBusinessRegistration');
const crypto = require('crypto');

class UserService {

  // ======================= REGISTER USER WITH BUSINESS DATA =======================
  async registerUserWithBusinessData(userData, businessData, files = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { name, email, mobile, designation, password, role_id, role_type } = userData;
      const emailToken = uuidv4();

      // Validate required fields
      if (!name || !email || !password || !role_id || !role_type) {
        throw new Error('Missing required fields');
      }

      // Validate role consistency
      const expectedRoleType = roleMap[role_id];
      if (!expectedRoleType || expectedRoleType !== role_type) {
        throw new Error('Invalid role_id or role_type');
      }

      // Check if user exists
      const userExists = await client.query('SELECT 1 FROM users WHERE email = $1', [email]);
      if (userExists.rows.length > 0) {
        throw new Error('User already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user (inactive until email verified)
      const userResult = await client.query(
        `INSERT INTO users 
         (role_id, role_type, name, mobile, email, password, designation, is_active, is_email_verified, is_mobile_verified, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *`,
        [role_id, role_type, name, mobile, email, hashedPassword, designation, false, false, false]
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
        email_verification_token: emailToken
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
        [user.id, JSON.stringify(tempBusinessData), emailToken]
      );

      await client.query('COMMIT');

      //TODO:: ✅ Use the new cleanup service instead of setTimeout
      //CleanupService.scheduleUserCleanup(user.id, emailToken, 24*5); // 5 days

      // Send verification email
      const verificationLink = `${process.env.FRONTEND_URL?.includes('localhost') || !process.env.FRONTEND_URL
        ? 'https://neozaar.com'
        : process.env.FRONTEND_URL
        }/api/user/verify-email?token=${emailToken}&email=${encodeURIComponent(email)}`;

      await thankyouEmail(email, verificationLink, name);

      delete user.password;
      return { user, emailToken };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ======================= VERIFY EMAIL AND COMPLETE REGISTRATION =======================
  async verifyEmailAndCompleteRegistration(token, email) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Find user and temp business data
      const userResult = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        throw new Error('Invalid token or email');
      }

      const user = userResult.rows[0];
      if (user.is_email_verified) {
        throw new Error('Email already verified');
      }

      // Get temporary business data
      const tempDataResult = await client.query(
        'SELECT business_data FROM temp_business_registration WHERE user_id = $1 AND email_verification_token = $2',
        [user.id, token]
      );

      if (tempDataResult.rows.length === 0) {
        throw new Error('No pending registration data found');
      }

      const businessData = tempDataResult.rows[0].business_data;

      // Activate user
      await client.query(
        'UPDATE users SET is_email_verified = $1, is_active = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [true, true, user.id]
      );

      // Create business profile based on role
      let businessResult = null;
      if (user.role_type === 'ISV' || user.role_type === 'SUPPORT_PARTNER') {
        businessResult = await BusinessService.createBusinessInfoFromTemp(client, user.id, businessData, user.role_type);
      }

      // Clean up temporary data
      await client.query('DELETE FROM temp_business_registration WHERE user_id = $1', [user.id]);

      await client.query('COMMIT');

      return {
        message: 'Email verified and registration completed successfully',
        user: { ...user, is_email_verified: true, is_active: true },
        businessInfo: businessResult
      };

    } catch (error) {
      await client.query('ROLLBACK');
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
      if (requesterId !== parseInt(userId) && requesterRole !== 'SUPER_ADMIN') {
        throw new Error('Unauthorized access');
      }

      const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
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
        order: [['created_at', 'DESC']],
        limit,
        offset,
        attributes: { exclude: ['password'] } // remove password field
      });

      // Calculate pagination metadata
      const total = count;
      const totalPages = Math.ceil(total / limit);

      // Build pagination object
      const pagination = {
        total,
        page,
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
        [limit, offset]
      );

      const users = userResult.rows.map(user => {
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
            limit: limit
          })
      };
    } catch (error) {
      throw error;
    }
  }

  async getISVusersPendingApproval(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const { rows: users, count: total } = await User.findAndCountAll({
        where: {
          role_type: 'ISV',
          is_email_verified: false,
          is_active: false
        },
        include: [
          {
            model: TempBusinessRegistration,
            as: 'temp_business_registration',
            attributes: ['business_data']
          }
        ],
        order: [['id', 'DESC']],
        limit,
        offset,
        attributes: {
          include: [['id', 'user_id']],
          exclude: ['password']
        },
        raw: true,
        // nest: true
      });
      const formattedUsers = users.map((user) => {
        // const businessData = user.temp_business_registration?.business_data || {};
        const businessData = user['temp_business_registration.business_data']
        ? user['temp_business_registration.business_data']
        : {};
        return {
          id: user.id,
          role_id: user.role_id ?? null,
          role_type: user.role_type,
          name: user.name,
          mobile: user.mobile,
          designation: user.designation,
          email: user.email,
          is_active: user.is_active,
          is_email_verified: user.is_email_verified,
          is_mobile_verified: user.is_mobile_verified,
          created_at: user.created_at,
          updated_at: user.updated_at,
          user_id: user.user_id,
          created_by: user.created_by ?? user.user_id,
          updated_by: user.updated_by ?? user.user_id,
          business_certification: user.business_certification ?? null,
          sla_link: user.sla_link ?? null,
          support_desk_email: user.support_desk_email ?? null,

          // 🧠 Merge selected fields from business_data (if present)
          cloud_partnership: businessData.cloud_partnership || [],
          existing_marketplace_listing: businessData.existing_marketplace_listing || [],
          preferred_engagement: businessData.preferred_engagement || null,
          neozaar_tc: businessData.neozaar_tc || false,
          data_privacy: businessData.data_privacy || false,
          competencies_certifications: businessData.competencies_certifications || null
        };
      });

      const pagination = commonConstant.PAGINATION.build({
        total,
        page,
        limit
      });

      return {
        status: 'success',
        data: formattedUsers,
        pagination
      };
    } catch (error) {
      console.error('Error fetching ISV users pending approval:', error);
      throw error;
    }
  }

  async getISVusersPendingById(userId) {
    try {
      // Fetch user info
      const user = await User.findOne({
        where: {
          id: userId,
          role_type: 'ISV',
          is_email_verified: false,
          is_active: false
        },
        attributes: {
          include: [['id', 'user_id']],
          exclude: ['password']
        },
        raw: true
      });

      if (!user) {
        return {
          status: 'fail',
          message: 'User not found or already approved'
        };
      }

      // Fetch associated business data
      const businessDataResult = await TempBusinessRegistration.findOne({
        where: { user_id: userId },
        attributes: ['business_data'],
        raw: true
      });
      console.log(businessDataResult);
      const businessData = businessDataResult ? businessDataResult.business_data : {};
      // 🧩 Merge both user and business data
      const formattedUser = {
        user_id: user.user_id,
        created_by: user.created_by ?? user.user_id,
        updated_by: user.updated_by ?? user.user_id,
        business_certification: user.business_certification ?? null,
        sla_link: businessData.sla_link ?? null,
        support_desk_email: businessData.support_desk_email ?? null,

        // 🧠 Merge selected fields from business_data (if present)
        cloud_partnership: businessData.cloud_partnership || [],
        existing_marketplace_listing: businessData.existing_marketplace_listing || [],
        preferred_engagement: businessData.preferred_engagement || null,
        neozaar_tc: businessData.neozaar_tc || false,
        data_privacy: businessData.data_privacy || false,
        competencies_certifications: businessData.competencies_certifications || null,
        tax_id: businessData.tax_id || null,
        brand_name: businessData.brand_name || null,
        brand_logo: businessData.brand_logo || null,
        website_url: businessData.website_url || null,
        company_name: businessData.company_name || null,
        linkedin_url: businessData.linkedin_url || null,
        Legal_entity_type: businessData.Legal_entity_type || [],
        headquater_country: businessData.headquater_country || [],
        registered_business_name: businessData.registered_business_name || null,
        company_registration_number: businessData.company_registration_number || null
      };

      return {
        status: 'success',
        data: formattedUser
      };
    } catch (error) {
      console.error('Error fetching ISV user pending by ID:', error);
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
        u.*, 
        sp.*
      FROM support_partner AS sp
      JOIN users AS u 
        ON u.id = sp.user_id
      ORDER BY u.id DESC
      LIMIT $1 OFFSET $2;
      `,
        [limit, offset]
      );

      const users = userResult.rows.map(user => {
        delete user.password;
        return user;
      });

      // Total count for pagination
      const countResult = await client.query(`
      SELECT COUNT(*) AS total
      FROM support_partner AS sp
      JOIN users AS u ON u.id = sp.user_id;
    `);

      const total = parseInt(countResult.rows[0].total, 10);
      const totalPages = Math.ceil(total / limit);

      // Build pagination info in your preferred format
      const pagination = {
        total,
        page,               // same as current page
        limit,
        current_page: page,
        next_page: page < totalPages ? page + 1 : null,
        prev_page: page > 1 ? page - 1 : null,
        pages: Array.from({ length: totalPages }, (_, i) => i + 1)
      };

      return {
        users,
        pagination
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
        where: { role_type }
      });
      return userResult.rows;
    } catch (error) {
      throw error;
    }
  }
  async getMembers(role, search) {
    try {
      const whereClause = {
        role_type: role
      }
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%{search}` } },
          { email: { [Op.iLike]: `%{search}` } },
        ];
      }
      const members = await User.findAll({
        where: whereClause,
        attributes: ['id', 'name', 'email']
      });
      return members
    }
    catch (error) {
      throw error;
    }
  }


  // ======================= UPDATE USER BASIC INFO =======================
  async updateUserBasicInfo(userId, updateData, requesterId, requesterRole) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Authorization check
      if (requesterId !== parseInt(userId) && requesterRole !== 'SUPER_ADMIN') {
        throw new Error('Unauthorized update');
      }

      // Check if user exists
      const userCheck = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0) {
        throw new Error('User not found');
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

        const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount}`;
        await client.query(updateQuery, updateValues);
      }

      await client.query('COMMIT');
      return { message: 'User updated successfully' };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ======================= DELETE USER =======================
  async deleteUser(userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userCheck = await client.query('SELECT role_type FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0) {
        throw new Error('User not found');
      }

      const role_type = userCheck.rows[0].role_type;

      // Delete role-specific data first
      if (role_type === 'ISV') {
        await client.query('DELETE FROM isv_details WHERE user_id = $1', [userId]);
      } else if (role_type === 'SUPPORT_PARTNER') {
        await client.query('DELETE FROM support_partner WHERE user_id = $1', [userId]);
      }

      // Delete company related data (if any references exist)
      await client.query('DELETE FROM company_detail WHERE created_by = $1', [userId]);

      // Clean up temp registration data
      await client.query('DELETE FROM temp_business_registration WHERE user_id = $1', [userId]);

      // Delete user
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
      await client.query('COMMIT');

      return { message: 'User deleted successfully' };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async getRoleType(userId) {
    try {
      const userCheck = await User.findOne({
        where: { id: userId },
        attributes: ['role_type'],
      });

      if (!userCheck) {
        throw new Error('User not found');
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
            uploadToSFTP(files.brand_logo[0]).then(url => {
              uploadedFiles.brand_logo = url;
            })
          );
        }

        // business_certification (single)
        if (files.business_certification) {
          uploadPromises.push(
            uploadToSFTP(files.business_certification[0]).then(url => {
              uploadedFiles.business_certification = url;
            })
          );
        }

        // company_profile_upload (multiple)
        if (files.company_profile_upload) {
          const profileUploads = files.company_profile_upload.map(file =>
            uploadToSFTP(file)
          );

          uploadPromises.push(
            Promise.all(profileUploads).then(urls => {
              uploadedFiles.company_profile_upload = urls;
            })
          );
        }

        // case_studies (multiple)
        if (files.case_studies) {
          const caseStudyUploads = files.case_studies.map(file =>
            uploadToSFTP(file)
          );

          uploadPromises.push(
            Promise.all(caseStudyUploads).then(urls => {
              uploadedFiles.case_studies = urls;
            })
          );
        }

        await Promise.all(uploadPromises);

      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        throw new Error('Failed to upload files to storage');
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
        'SELECT * FROM users WHERE email = $1 AND is_email_verified = false',
        [email]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found or already verified');
      }

      const user = userResult.rows[0];

      // Get verification token from temp data
      const tempDataResult = await client.query(
        'SELECT email_verification_token FROM temp_business_registration WHERE user_id = $1',
        [user.id]
      );

      if (tempDataResult.rows.length === 0) {
        throw new Error('No pending verification found');
      }

      const token = tempDataResult.rows[0].email_verification_token;

      const verificationLink = `${process.env.FRONTEND_URL?.includes('localhost') || !process.env.FRONTEND_URL
        ? 'http://20.83.163.38:5000'
        : process.env.FRONTEND_URL
        }/api/user/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

      await thankyouEmail(email, verificationLink, user.name);
      console.log("DEV VERIFICATION LINK:", verificationLink);

      return { message: 'Verification email sent successfully' };

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }
  async sendApprovalMail(userid) {
    try {
      const client = await pool.connect();
      await client.query('BEGIN');

      const tempPassword = crypto.randomBytes(6).toString('base64').slice(0, 10);
      const hashed = await bcrypt.hash(tempPassword, 10);
      const result = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [userid]
      );
      const user = result.rows[0];
      // Get temporary business data
      const tempDataResult = await client.query(
        'SELECT business_data FROM temp_business_registration WHERE user_id = $1',
        [userid]
      );

      if (tempDataResult.rows.length === 0) {
        throw new Error('No pending registration data found');
      }

      const businessData = tempDataResult.rows[0].business_data;

      // Activate user
      await client.query(
        'UPDATE users SET is_email_verified = $1, is_active = $2, updated_at = CURRENT_TIMESTAMP, password = $3 WHERE id = $4' ,
        [true, true, hashed, userid]
      );

      // Create business profile based on role
      let businessResult = null;
      if (user.role_type === 'ISV' || user.role_type === 'SUPPORT_PARTNER') {
        businessResult = await BusinessService.createBusinessInfoFromTemp(client, userid, businessData, user.role_type);
      }

      // Clean up temporary data
      await client.query('DELETE FROM temp_business_registration WHERE user_id = $1', [userid]);

      await client.query('COMMIT');

      const resul = await client.query(`
          WITH update_user AS (
            UPDATE users SET is_email_verified = TRUE WHERE id = $1
          )
          UPDATE isv_details SET is_active = TRUE, is_approved = TRUE WHERE user_id = $1;
        `, [userid]);

      const email = result.rows[0]?.email
      const userName = result.rows[0]?.name
      await approvalMail(userid, email, userName, tempPassword);

      return {
        message: 'Email verified and registration completed successfully',
        user: { ...user, is_email_verified: true, is_active: true },
        businessInfo: businessResult
      };
    } catch (error) {
      throw error
    }
  }

}

module.exports = new UserService();
