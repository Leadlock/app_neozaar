
const allowedImageTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

const allowedCollateralTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Default max file size 200KB
const DEFAULT_MAX_SIZE = 200 * 1024;

/**
 * Validate a single file
 * @param {Object} file - multer file object
 * @param {string[]} allowedTypes - Allowed MIME types
 * @param {number} maxSize - Max file size in bytes (optional)
 * @returns {string|null} error message or null if valid
 */
function validateFile(file, allowedTypes, maxSize = DEFAULT_MAX_SIZE) {
  if (!file) return 'File object is required';

  if (!allowedTypes.includes(file.mimetype)) {
    return `Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`;
  }

  if (file.size > maxSize) {
    return `File size exceeds limit of ${maxSize / (1024)}MB`;
  }

  return null; // No error
}

/**
 * Validate image file
 */
function validateImageFile(file, maxSize = DEFAULT_MAX_SIZE) {
  return validateFile(file, allowedImageTypes, maxSize);
}

/**
 * Validate collateral file
 */
function validateCollateralFile(file, maxSize = DEFAULT_MAX_SIZE) {
  return validateFile(file, allowedCollateralTypes, maxSize);
}

module.exports = {
  validateImageFile,
  validateCollateralFile,
  validateFile,
  allowedImageTypes,
  allowedCollateralTypes,
  DEFAULT_MAX_SIZE
};
