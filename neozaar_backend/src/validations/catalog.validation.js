const validTypes = ['product', 'bundle'];

class CatalogValidationRules {
  static async create(data, files) {
    const errors = [];

    // Required fields validation
    if (!data.type || !validTypes.includes(data.type)) {
      errors.push('Invalid or missing "type". Allowed: ' + validTypes.join(', '));
    }

    if (!data.name || data.name.trim() === '') {
      errors.push('"name" is required');
    }

    // Type-specific validations
    if (data.type === 'product') {
      this.validateProductFields(data, errors);
    } else if (data.type === 'bundle') {
      this.validateBundleFields(data, errors);
    }

    // File validations
    if (files) {
      this.validateFiles(files, data.type, errors);
    }

    return errors;
  }

  static validateProductFields(data, errors) {
    const requiredFields = [
      'short_description',
      'key_features',
      'primary_use_cases',
      'target_audience',
      'industry',
      'category_subcategory',
      'cloud_provider_support',
      'regions_supported',
      'cta_model',
      'technical_prerequisites',
      'pricing_model',
    ];

    // requiredFields.forEach(field => {
    //   if (!data[field] || data[field].toString().trim() === '') {
    //     errors.push(`"${field}" is required for products`);
    //   }
    // });

    // Boolean validations
    // if (data.free_trial_available === undefined || data.free_trial_available === null) {
    //   errors.push('"free_trial_available" is required for products');
    // }

    if (data.accept_marketplace_terms === undefined || data.accept_marketplace_terms === null) {
      errors.push('"accept_marketplace_terms" is required for products');
    }

    // if (data.consent_data_privacy_policy === undefined || data.consent_data_privacy_policy === null) {
    //   errors.push('"consent_data_privacy_policy" is required for products');
    // }

  }
static validateBundleFields(data, errors) {
  const requiredFields = [
    'short_description',
  ];

  requiredFields.forEach(field => {
    if (!data[field] || data[field].toString().trim() === '') {
      errors.push(`"${field}" is required for bundles`);
    }
  });
}


  static validateFiles(files, type, errors) {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (type === 'product') {
      // Product logo validation
      if (files['product_logo']) {
        const logo = files['product_logo'][0];
        if (!imageTypes.includes(logo.mimetype)) {
          errors.push('Invalid file type for "product_logo". Must be an image.');
        }
      }

      // Screenshots validation
      if (files['screenshots']) {
        if (files['screenshots'].length > 5) {
          errors.push('Maximum 5 screenshots allowed');
        }
        files['screenshots'].forEach((file, index) => {
          if (!imageTypes.includes(file.mimetype)) {
            errors.push(`Screenshot ${index + 1} must be an image file`);
          }
        });
      }
      

      // Document files validation
      const documentFields = ['sla_documents', 'brochures', 'customer_case_studies'];
      documentFields.forEach(field => {
        if (files[field]) {
          files[field].forEach((file, index) => {
            if (!documentTypes.includes(file.mimetype)) {
              errors.push(`${field} file ${index + 1} must be a document (PDF, Word, or Text)`);
            }
          });
        }
      });
    } else if (type === 'bundle') {
      // Bundle logo validation
      if (files['bundle_logo']) {
        const logo = files['bundle_logo'][0];
        if (!imageTypes.includes(logo.mimetype)) {
          errors.push('Invalid file type for "bundle_logo". Must be an image.');
        }
      }

      // Document files validation
      const documentFields = ['datasheets', 'case_studies'];
      documentFields.forEach(field => {
        if (files[field]) {
          files[field].forEach((file, index) => {
            if (!documentTypes.includes(file.mimetype)) {
              errors.push(`${field} file ${index + 1} must be a document (PDF, Word, or Text)`);
            }
          });
        }
      });
    }
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }


  static async update(data, files, type) {
  const errors = [];

  // ✅ Name is optional, but if provided must not be empty
  if (data.name !== undefined && data.name.trim() === '') {
    errors.push('"name" cannot be empty');
  }

  // ✅ File validations (same as create)
  if (files) {
    this.validateFiles(files, type, errors);
  }

  return errors;
}
static validateProductFieldsOptional(data, errors) {
}

}

module.exports = CatalogValidationRules;
