const express = require("express");
const router = express.Router();
const multer = require("multer");

const productController = require("../controllers/product.controller");
const verifyToken = require("../middlewares/auth");
const {
  validate,
  productValidationRules,
} = require("../middlewares/validator");
const { ensureProductOwnership } = require("../middlewares/productSecurity");

// Memory storage (used before uploading to Azure or other storage)
const storage = multer.memoryStorage();

// Allowed MIME types
const allowedImageTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const allowedFileTypes = [
  ...allowedImageTypes,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// ✅ Updated file filter to accept all expected fields
const fileFilter = (req, file, cb) => {
  const field = file.fieldname;

  const imageFields = ["image", "image_url", "product_logo"];
  const collateralFields = ["sales_collateral", "sales_enable_collateral"];

  if (
    imageFields.includes(field) &&
    allowedImageTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else if (
    collateralFields.includes(field) &&
    allowedFileTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unexpected file field: ${field}. Only image and collateral files allowed.`,
      ),
    );
  }
};

// Multer instance
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 }, // 200KB
  fileFilter,
});

// Multer error handler
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        status: "fail",
        message: "File size too large. Max 200KB allowed.",
        code: 400,
      });
    }
    return res.status(400).json({
      status: "fail",
      message: `Upload error: ${err.message}`,
      code: 400,
    });
  }

  if (err && err.message.includes("Unexpected file field")) {
    return res.status(400).json({
      status: "fail",
      message: err.message,
      code: 400,
    });
  }

  next(err);
};

router.get(
  "/get-all",
  verifyToken,
  productController.getAllProducts,
);

// ==================== PUBLIC/GENERAL ROUTES ====================

// Create product
router.post(
  "/create",
  verifyToken,
  upload.fields([
    { name: "image_url", maxCount: 1 },
    { name: "product_logo", maxCount: 1 },
    { name: "sales_collateral", maxCount: 1 },
  ]),
  handleMulterError,
  validate(productValidationRules.create),
  productController.createProduct,
);

// Get paginated product list
router.get(
  "/",
  verifyToken,
  validate(productValidationRules.getProducts),
  productController.getProducts,
);

// Public marketplace
router.get(
  "/marketplace",
  verifyToken,
  validate(productValidationRules.getMarketplaceProducts),
  productController.getMarketplaceProducts,
);


// ==================== ADMIN-ONLY ROUTES ====================

router.post(
  "/private-offer/:id",
  verifyToken,
  validate(productValidationRules.updatePrivateOffer),
  productController.updatePrivateOffer,
);

router.post(
  "/general-status/:id",
  verifyToken,
  validate(productValidationRules.updateGeneralStatus),
  productController.updateGeneralStatus,
);

// ==================== OWNERSHIP-PROTECTED ROUTES ====================

// Update product
router.post(
  "/update/:id",
  verifyToken,
  ensureProductOwnership,
  upload.fields([
    { name: "image_url", maxCount: 1 },
    { name: "product_logo", maxCount: 1 },
    { name: "sales_collateral", maxCount: 1 },
  ]),
  handleMulterError,
  validate(productValidationRules.update),
  productController.updateProduct,
);

// Get by ID
router.get(
  "/:id",
  verifyToken,
  ensureProductOwnership,
  validate(productValidationRules.getById),
  productController.getProductById,
);

// Update product status
router.post(
  "/status/:id",
  verifyToken,
  ensureProductOwnership,
  validate(productValidationRules.updateStatus),
  productController.updateProductStatus,
);

// ==================== ERROR HANDLING ====================
router.use(handleMulterError);

router.use((err, req, res, next) => {
  console.error("Product route error:", err);

  if (err.type === "validation") {
    return res.status(400).json({
      status: "fail",
      message: "Validation failed",
      errors: err.errors,
      code: 400,
    });
  }

  res.status(500).json({
    status: "fail",
    message: "Internal server error",
    code: 500,
  });
});




module.exports = router;
