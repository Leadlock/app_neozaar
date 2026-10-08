const express = require("express");
const router = express.Router();
const multer = require("multer");

const catalogController = require("../controllers/catalog.controller");
const zohoCampaignController = require("../controllers/zohoCampaign.controller");
const verifyToken = require("../middlewares/auth");
const catalogValidationRules = require("../validations/catalog.validation");
const commonConstant = require("../config/common.constant.js");
const { STATUS_CODES } = require("../config/common.constant.js");

const cloudService = require("../services/cloud.cat.services");

const storage = multer.memoryStorage();
// defParamCharset: multer defaults to 'latin1', which turns any non-ASCII char in
// an uploaded filename (en-dash, curly quotes, accents) into mojibake before it
// ever reaches the blob-name sanitizer. 'utf8' keeps file.originalname correct.
const upload = multer({ storage, defParamCharset: "utf8" });
// Get marketplace listings (type, category, search via query)
router.get("/marketplace/products", catalogController.getMarketplaceProducts);
router.get("/products/by-brand", catalogController.getBrandProducts);
router.get("/marketplace/products/:id", catalogController.getProductDetails);
router.get("/top-featured-services", catalogController.getTopFeaturedServices);
router.get("/top-featured-products", catalogController.getTopFeaturedProducts);
router.get("/all-brands", catalogController.getAllValidBrands);
router.get("/get-vendors", catalogController.getFeaturedVendors);
router.get("/get-industry", catalogController.getIndustry);
router.get("/get-all-industry", catalogController.getAllIndustry);
router.get("/get-target-segments", catalogController.getTargetSegments);
router.get("/get-all-target-segments", catalogController.getAllTargetSegments);
router.get("/get-all-vendor", catalogController.getAllVendors);
router.get("/get-featured-soutions", catalogController.getFeaturedSolutions);
router.get("/get-featured-products", catalogController.getFeaturedProducts);
router.get("/get-featured-services", catalogController.getFeaturedServices);
router.get("/get-category-showcase", catalogController.getCategoryShowcase);
router.get("/get-products-by-cta", catalogController.getProductsByCTA);
router.get(
  "/marketplace/published",
  catalogController.getPublishedCatalogsByType,
);

// router.get("/marketplace/bundles", catalogController.getMarketplaceBundles); // temporarily disabled

router.get(
  "/products/create/seo-existing-products",
  verifyToken,
  catalogController.generateAndSaveSEOForExitingCatalog,
);

//temperorily hardcoded APIS
router.get("/categories", (req, res) => {
  const response = cloudService.getCategories();
  return res.status(STATUS_CODES.SUCCESS).json(response);
});

// GET: AWS Services
router.get("/aws/services", (req, res) => {
  const response = cloudService.getAwsServices();
  return res.status(STATUS_CODES.SUCCESS).json(response);
});

// GET: Azure Services
router.get("/azure/services", (req, res) => {
  const response = cloudService.getAzureServices();
  return res.status(STATUS_CODES.SUCCESS).json(response);
});
// GET: Cloud Platforms
router.get("/cloud/platforms", (req, res) => {
  const response = cloudService.getCloudPlatforms();
  return res.status(STATUS_CODES.SUCCESS).json(response);
});

router.post(
  "/:catelogId/draft",
  verifyToken,
  catalogController.setCatalogDraftStatus,
);
// Tags-only update. Kept separate from /update/:type/:id so editing tags never
// changes the item's publish / draft / approval status.
router.post(
  "/:catelogId/tags",
  verifyToken,
  catalogController.updateCatalogTags,
);
router.post(
  "/:catelogId/publish",
  verifyToken,
  catalogController.publishCatalog,
);
router.post(
  "/:catelogId/approve",
  verifyToken,
  catalogController.approveCatalog,
);

// Push a listing to Zoho Campaigns as an unsent draft (admin action) and the public
// content route Zoho's servers fetch the campaign HTML from. Must stay registered
// before the generic "/:type/:id" route below, or that route would swallow these.
router.get("/:id/zoho-campaign-content", zohoCampaignController.getCampaignContent);
router.post("/:id/zoho-campaign", verifyToken, zohoCampaignController.pushToZoho);
router.post("/:id/send-email", verifyToken, zohoCampaignController.sendListingEmail);

// Create catalog (product or bundle)
router.post(
  "/create/:type",
  verifyToken,
  upload.fields([
    // Product files
    { name: "product_logo", maxCount: 1 },
    { name: "screenshots", maxCount: 5 },
    {
      name: "sla_documents",
      maxCount: commonConstant.FILEUPLOAD.MAX_FILE || 10,
    },
    { name: "brochures", maxCount: commonConstant.FILEUPLOAD.MAX_FILE || 10 },
    {
      name: "customer_case_studies",
      maxCount: commonConstant.FILEUPLOAD.MAX_FILE || 10,
    },

    // Bundle files
    { name: "bundle_logo", maxCount: 1 },
    { name: "datasheets", maxCount: commonConstant.FILEUPLOAD.MAX_FILE || 10 },
    {
      name: "case_studies",
      maxCount: commonConstant.FILEUPLOAD.MAX_FILE || 10,
    },
  ]),
  async (req, res, next) => {
    req.body = { ...req.body, type: req.params.type }; // bring :type into validation
    const errors = await catalogValidationRules.create(req.body, req.files);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }
    next();
  },
  catalogController.createCatalog,
);

router.post(
  "/:id/feature",
  verifyToken,
  catalogController.updateProductFeature,
);
// Main catalog endpoints with unified access control
router.get("/products", verifyToken, catalogController.getProducts);
router.get("/services", verifyToken, catalogController.getProducts);
router.get("/solutions", verifyToken, catalogController.getProducts);
// router.get("/bundles", verifyToken, catalogController.getBundles); // temporarily disabled

// Get all catalogs (with optional type filter)
router.get("/", verifyToken, catalogController.getCatalogs);

// Get catalog by ID (requires type param)
router.get("/:type/:id", verifyToken, catalogController.getCatalogById);

// get catalog by slug
router.get(
  "/:type/slug/:slug",
  verifyToken,
  catalogController.getCatalogBySlug,
);

// Delete catalog by ID
router.get("/:type/:id/delete", verifyToken, catalogController.deleteCatalog);

// router.get('/marketplace/products', catalogController.getMarketplaceBundles);

// router.get('/marketplace/bundles', catalogController.getMarketplaceProducts);

//TODO:: Status(Pending, Approval, publish)

router.post(
  "/product/bulk-upload",
  verifyToken,
  upload.single("file"),
  catalogController.bulkProductUpload,
);

router.post(
  "/update/:type/:id",
  verifyToken,
  upload.fields([
    { name: "product_logo", maxCount: 1 },
    { name: "screenshots", maxCount: 5 },
    {
      name: "sla_documents",
      maxCount: commonConstant.FILEUPLOAD.MAX_FILE || 10,
    },
    { name: "brochures", maxCount: commonConstant.FILEUPLOAD.MAX_FILE || 10 },
    {
      name: "customer_case_studies",
      maxCount: commonConstant.FILEUPLOAD.MAX_FILE || 10,
    },
    { name: "bundle_logo", maxCount: 1 },
    { name: "datasheets", maxCount: commonConstant.FILEUPLOAD.MAX_FILE || 10 },
    {
      name: "case_studies",
      maxCount: commonConstant.FILEUPLOAD.MAX_FILE || 10,
    },
  ]),
  catalogController.updateCatalog,
);


module.exports = router;
