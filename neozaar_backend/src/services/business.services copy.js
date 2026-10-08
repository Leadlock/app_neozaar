const pool = require('../config/database');
const uploadToSFTP = require('../utils/azureStorage');
const DataTransformer = require('../utils/dataTransformer');

class BusinessService {
  
  // ======================= CREATE BUSINESS INFO FROM TEMP DATA =======================
  async createBusinessInfoFromTemp(client, userId, businessData, role_type) {
    try {
      let profileId = null;
      if (role_type === 'ISV') {
        // profileId = await this.createISVProfile(client, { ...businessData, userId });
        const existingProfile = await client.query( `SELECT id FROM isv_profiles WHERE user_id = $1 LIMIT 1`, [userId] );
        if (existingProfile.rows.length > 0) {
          const existingId = existingProfile.rows[0].id;
          await this.updateISVProfile(client, existingId, businessData);
          profileId = existingId;
        } else {
          profileId = await this.createISVProfile(client, { ...businessData, userId });
        }
        
      } else if (role_type === 'SUPPORT_PARTNER') {
        profileId = await this.createSupportPartnerProfile(client, { ...businessData, userId });
      }
      const companyData = await this.createCompanyDetail(client, {
        ...businessData,
        userId,
        actionId: profileId,
        role_type
      });

      return {
        profile: { id: profileId },
        company: companyData
      };

    } catch (error) {
      throw error;
    }
  }

  // ======================= CREATE COMPANY DETAIL =======================
  async createCompanyDetail(client, params) {
    try {
      const {
        userId,
        actionId,
        role_type,
        company_name,
        registered_business_name,
        brand_name,
        brand_logo,
        company_registration_number,
        Legal_entity_type,
        tax_id,
        headquater_country,
        website_url,
        linkedin_url
      } = params;

      const companyResult = await client.query(
        `INSERT INTO company_detail
        (action_id, action_type, company_name, registered_business_name, brand_name, brand_logo,
        company_registration_number, Legal_entity_type, tax_id, headquater_country, website_url, linkedin_url, 
        is_active, created_by, updated_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *`,
        [
          actionId,
          role_type,
          company_name || null,
          registered_business_name || null,
          brand_name || null,
          brand_logo || null,
          company_registration_number || null,
          Legal_entity_type || null,
          tax_id || null,
          headquater_country || null,
          website_url || null,
          linkedin_url || null,
          true,
          userId,
          userId
        ]
      );

      return companyResult.rows[0];
    } catch (error) {
      console.error('Error in createCompanyDetail:', error);
      throw error;
    }
  }

  // ======================= CREATE ISV PROFILE (PURE STORAGE - NO TRANSFORMATION) =======================
  async createISVProfile(client, params) {
    try {
      const {
        userId,
        cloud_partnership,
        existing_marketplace_listing,
        competencies_certifications,
        preferred_engagement,
        business_certification,
        neozaar_tc,
        data_privacy,
        sla_link,
        support_desk_email,
      } = params;
       const { files } = params;
       const signed_document = null;
       if (files['signed_document']) {
          signed_document = await uploadToSFTP(files['signed_document'][0]);
        }

      const isvResult = await client.query(
        `INSERT INTO isv_details 
        (user_id, cloud_partnership, existing_marketplace_listing, 
        competencies_certifications, preferred_engagement, business_certification, 
        neozaar_tc, data_privacy, sla_link, support_desk_email, is_active, created_by, updated_by, created_at, updated_at, signed_document, is_approved, is_document_signed)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $14, FALSE, FALSE) 
        RETURNING id`,
        [
          userId, 
          cloud_partnership, 
          existing_marketplace_listing,
          competencies_certifications || null,
          preferred_engagement || null,
          business_certification || null, 
          neozaar_tc, 
          data_privacy,
          sla_link,
          support_desk_email,
          true,
          userId,
          userId,
          signed_document
        ]
      );

      return isvResult.rows[0].id;
    } catch (error) {
      console.error('Error in createISVProfile:', error);
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
        primary_cloud_alignment
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
          userId
        ]
      );

      return supportPartnerResult.rows[0].id;
    } catch (error) {
      console.error('Error in createSupportPartnerProfile:', error);
      throw error;
    }
  }

  // ======================= UPDATE BUSINESS INFO =======================
  async updateBusinessInfo(userId, businessData, role_type) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // BusinessData is already transformed by UserController
      // Just pass it directly to update methods

      // Update company details
      await this.updateCompanyDetail(client, { ...businessData, userId });

      // Update profile-specific details
      if (role_type === 'ISV') {
        await this.updateISVProfile(client, { ...businessData, userId });
      } else if (role_type === 'SUPPORT_PARTNER') {
        await this.updateSupportPartnerProfile(client, { ...businessData, userId });
      }

      await client.query('COMMIT');
      return { message: 'Business info updated successfully' };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ======================= UPDATE COMPANY DETAIL =======================
  async updateCompanyDetail(client, params) {
    try {
      const {
        userId,
        company_name,
        registered_business_name,
        brand_name,
        brand_logo,
        company_registration_number,
        Legal_entity_type,
        tax_id,
        headquater_country,
        website_url,
        linkedin_url
      } = params;

      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (company_name !== undefined) {
        updateFields.push(`company_name = $${paramCount++}`);
        updateValues.push(company_name);
      }
      if (registered_business_name !== undefined) {
        updateFields.push(`registered_business_name = $${paramCount++}`);
        updateValues.push(registered_business_name);
      }
      if (brand_name !== undefined) {
        updateFields.push(`brand_name = $${paramCount++}`);
        updateValues.push(brand_name);
      }
      if (brand_logo !== undefined) {
        updateFields.push(`brand_logo = $${paramCount++}`);
        updateValues.push(brand_logo);
      }
      if (company_registration_number !== undefined) {
        updateFields.push(`company_registration_number = $${paramCount++}`);
        updateValues.push(company_registration_number);
      }
      if (Legal_entity_type !== undefined) {
        updateFields.push(`Legal_entity_type = $${paramCount++}`);
        updateValues.push(Legal_entity_type);
      }
      if (tax_id !== undefined) {
        updateFields.push(`tax_id = $${paramCount++}`);
        updateValues.push(tax_id);
      }
      if (headquater_country !== undefined) {
        updateFields.push(`headquater_country = $${paramCount++}`);
        updateValues.push(headquater_country);
      }
      if (website_url !== undefined) {
        updateFields.push(`website_url = $${paramCount++}`);
        updateValues.push(website_url);
      }
      if (linkedin_url !== undefined) {
        updateFields.push(`linkedin_url = $${paramCount++}`);
        updateValues.push(linkedin_url);
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_by = $${paramCount++}`);
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(userId);
        updateValues.push(userId); // for WHERE clause

        const updateQuery = `UPDATE company_detail SET ${updateFields.join(', ')} WHERE created_by = $${paramCount}`;
        await client.query(updateQuery, updateValues);
      }

    } catch (error) {
      console.error('Error in updateCompanyDetail:', error);
      throw error;
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
        business_certification
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
          SET ${updateFields.join(', ')} 
          WHERE user_id = $${paramCount}`;
        
        updateValues.push(userId);

        await client.query(updateQuery, updateValues);
      }
    } catch (error) {
      console.error('Error in updateISVProfile:', error);
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
        primary_cloud_alignment
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

        const updateQuery = `UPDATE support_partner SET ${updateFields.join(', ')} WHERE user_id = $${paramCount}`;
        updateValues.push(userId);
        await client.query(updateQuery, updateValues);
      }
    } catch (error) {
      console.error('Error in updateSupportPartnerProfile:', error);
      throw error;
    }
  }

  // ======================= GET BUSINESS INFO BY USER ID (RAW DATA FROM DB) =======================
  async getBusinessInfoByUserId(userId, role_type) {
    const client = await pool.connect();
    try {
      // Get company details
      const companyResult = await client.query(
        'SELECT * FROM company_detail WHERE created_by = $1',
        [userId]
      );

      let companyData = null;
      let profileData = null;

      if (companyResult.rows.length > 0) {
        companyData = companyResult.rows[0];
      }

      // Get role-specific profile data (RAW - no transformation here)
      if (role_type === 'ISV') {
        const isvResult = await client.query(
          'SELECT * FROM isv_details WHERE user_id = $1',
          [userId]
        );
        if (isvResult.rows.length > 0) {
          profileData = isvResult.rows[0]; // Raw data - transformation will be done in controller
        }
      } else if (role_type === 'SUPPORT_PARTNER') {
        const supportResult = await client.query(
          'SELECT * FROM support_partner WHERE user_id = $1',
          [userId]
        );
        if (supportResult.rows.length > 0) {
          profileData = supportResult.rows[0]; // Raw data - transformation will be done in controller
        }
      }

      return {
        company: companyData,
        profile: profileData
      };

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new BusinessService();
