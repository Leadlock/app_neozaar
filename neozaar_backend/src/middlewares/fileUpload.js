const multer = require('multer');
const { allowedImageTypes, allowedCollateralTypes } = require('../utils/fileValidation');

// Combine allowed MIME types
const allowedMimes = [...allowedImageTypes, ...allowedCollateralTypes];

// Setup multer memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  // 'utf8' so non-ASCII filenames (en-dash, curly quotes, accents) aren't
  // mojibake'd; multer's default is 'latin1'.
  defParamCharset: 'utf8',
  limits: {
    fileSize: 500 * 1024  // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and documents are allowed.'), false);
    }
  }
});

// Fields expected in form-data
const uploadFields = upload.fields([
  { name: 'brand_logo', maxCount: 1 },
  { name: 'company_profile_upload', maxCount: 5 },
  { name: 'business_certification', maxCount: 1 },
  { name: 'agreement_document', maxCount: 1 },
  // { name: 'competencies_certificate', maxCount: 5 },
  { name: 'case_studies', maxCount: 10 },
]);

// Middleware to log and process uploads
const uploadWithLogging = (req, res, next) => {
  uploadFields(req, res, (err) => {
    if (err) return next(err);

    // console.log("Incoming files:", Object.keys(req.files || {}));
    next();
  });
};

// Multer error handler middleware
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';

    if (error.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large. Max 200KB.';
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files uploaded.';
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field.';
    }

    return res.status(400).json({ status: 'fail', message });
  }

  if (error.message === 'Invalid file type. Only images and documents are allowed.') {
    return res.status(400).json({ status: 'fail', message: error.message });
  }

  next(error);
};

module.exports = {
  uploadFields: uploadWithLogging,
  handleMulterError
};
