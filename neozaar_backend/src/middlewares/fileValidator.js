
const { validateImageFile, validateCollateralFile } = require('../utils/fileValidation');

function validateUploadedFiles(req, res, next) {
  const image = req.files?.['image_url'] ? req.files['image_url'][0] : null;
  const collateral = req.files?.['sales_collateral'] ? req.files['sales_collateral'][0] : null;

  if (image) {
    const imageError = validateImageFile(image);
    if (imageError) {
      return res.status(400).json({
        status: 'fail',
        message: imageError,
        code: 400
      });
    }
  }

  if (collateral) {
    const collateralError = validateCollateralFile(collateral);
    if (collateralError) {
      return res.status(400).json({
        status: 'fail',
        message: collateralError,
        code: 400
      });
    }
  }

  next();
}

module.exports = validateUploadedFiles;
