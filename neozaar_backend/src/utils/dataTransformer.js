// utils/dataTransformer.js

class DataTransformer {
  
  // ======================= HELPER: JSON STRING TO ARRAY =======================
  static jsonStringToArray(field) {
    if (!field || field === 'null' || field === 'undefined' || field === '') {
      return [];
    }
    if (Array.isArray(field)) {
      return field.filter(item => item !== null && item !== undefined && item !== '');
    }
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed.filter(item => item !== null && item !== undefined && item !== '') : [];
    } catch {
      return [String(field).trim()];
    }
  }

  // ======================= HELPER: PREPARE ARRAY FOR POSTGRES text[] =======================
  static prepareArrayForPostgres(field) {
    if (!field || field === 'null' || field === 'undefined' || field === '') {
      return null; // PostgreSQL will store as NULL
    }
    
    if (Array.isArray(field)) {
      const filtered = field.filter(item => item !== null && item !== undefined && item !== '');
      return filtered.length > 0 ? filtered.map(item => String(item).trim()) : null;
    }
    
    // If it's a single string, convert to array
    return [String(field).trim()];
  }

  // ======================= TRANSFORM REQUEST DATA FOR DATABASE =======================
  static transformRequestDataForDB(businessData, role_type) {
    // console.log('=== DataTransformer: transformRequestDataForDB ===');
    // console.log('Input businessData:', JSON.stringify(businessData, null, 2));
    // console.log('Role type:', role_type);

    const transformedData = { ...businessData };

    // Transform checkboxes to boolean
    transformedData.neozaar_tc = businessData.neozaar_tc === 'true' || businessData.neozaar_tc === true;
    transformedData.data_privacy = businessData.data_privacy === 'true' || businessData.data_privacy === true;
    transformedData.sla_link = businessData.sla_link;
    transformedData.support_desk_email = businessData.support_desk_email;

    // Transform array fields based on role type
    if (role_type === 'ISV') {
      transformedData.cloud_partnership = this.prepareArrayForPostgres(
        this.jsonStringToArray(businessData.cloud_partnership)
      );

      transformedData.existing_marketplace_listing = this.prepareArrayForPostgres(
        this.jsonStringToArray(businessData.existing_marketplace_listing)
      );
    }
    else if (role_type === 'SUPPORT_PARTNER') {
      transformedData.primary_cloud_alignment = this.prepareArrayForPostgres(
        this.jsonStringToArray(businessData.primary_cloud_alignment)
      );

      transformedData.core_service_offer = this.prepareArrayForPostgres(
        this.jsonStringToArray(businessData.core_service_offer)
      );

      transformedData.vertical_experties = this.prepareArrayForPostgres(
        this.jsonStringToArray(businessData.vertical_experties)
      );

      transformedData.partner_program_membership = this.prepareArrayForPostgres(
        this.jsonStringToArray(businessData.partner_program_membership)
      );

      transformedData.preferred_engagement_modal = this.prepareArrayForPostgres(
        this.jsonStringToArray(businessData.preferred_engagement_modal)
      );
    }


    return transformedData;
  }

  // ======================= TRANSFORM DB DATA FOR RESPONSE (arrays back to frontend format) =======================
  static transformDBDataForResponse(profileData, role_type) {
    // console.log('=== DataTransformer: transformDBDataForResponse ===');
    // console.log('Input profileData:', JSON.stringify(profileData, null, 2));
    // console.log('Role type:', role_type);

    const transformedData = { ...profileData };

    if (role_type === 'ISV') {
      // Convert PostgreSQL arrays back to JavaScript arrays for frontend
      if (transformedData.cloud_partnership) {
        transformedData.cloud_partnership = Array.isArray(transformedData.cloud_partnership) 
          ? transformedData.cloud_partnership 
          : [transformedData.cloud_partnership];
      } else {
        transformedData.cloud_partnership = [];
      }

      if (transformedData.existing_marketplace_listing) {
        transformedData.existing_marketplace_listing = Array.isArray(transformedData.existing_marketplace_listing)
          ? transformedData.existing_marketplace_listing
          : [transformedData.existing_marketplace_listing];
      } else {
        transformedData.existing_marketplace_listing = [];
      }
    }
    else if (role_type === 'SUPPORT_PARTNER') {
      // Convert PostgreSQL arrays back to JavaScript arrays for frontend
      if (transformedData.primary_cloud_alignment) {
        transformedData.primary_cloud_alignment = Array.isArray(transformedData.primary_cloud_alignment)
          ? transformedData.primary_cloud_alignment
          : [transformedData.primary_cloud_alignment];
      } else {
        transformedData.primary_cloud_alignment = [];
      }

      if (transformedData.core_service_offer) {
        transformedData.core_service_offer = Array.isArray(transformedData.core_service_offer)
          ? transformedData.core_service_offer
          : [transformedData.core_service_offer];
      } else {
        transformedData.core_service_offer = [];
      }

      if (transformedData.vertical_experties) {
        transformedData.vertical_experties = Array.isArray(transformedData.vertical_experties)
          ? transformedData.vertical_experties
          : [transformedData.vertical_experties];
      } else {
        transformedData.vertical_experties = [];
      }

      if (transformedData.partner_program_membership) {
        transformedData.partner_program_membership = Array.isArray(transformedData.partner_program_membership)
          ? transformedData.partner_program_membership
          : [transformedData.partner_program_membership];
      } else {
        transformedData.partner_program_membership = [];
      }

      if (transformedData.preferred_engagement_modal) {
        transformedData.preferred_engagement_modal = Array.isArray(transformedData.preferred_engagement_modal)
          ? transformedData.preferred_engagement_modal
          : [transformedData.preferred_engagement_modal];
      } else {
        transformedData.preferred_engagement_modal = [];
      }
    }

    // console.log('=== Final response transformed data:', JSON.stringify(transformedData, null, 2));
    // console.log('=== END Response DataTransformer ===');

    return transformedData;
  }
}

module.exports = DataTransformer;
