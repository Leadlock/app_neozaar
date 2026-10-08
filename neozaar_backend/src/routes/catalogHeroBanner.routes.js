const express = require("express");
const router = express.Router();
const multer = require("multer");

const CatalogHeroBannerController = require("../controllers/catalogHeroBanner.controller");
const verifyToken = require("../middlewares/auth");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Public marketplace feed — e.g. /api/catalog-hero-banner/marketplace/product
router.get(
  "/marketplace/:catalogType",
  CatalogHeroBannerController.getMarketplaceCatalogHeroBanner,
);

// ✅ Admin Routes
router.get("/get-all", verifyToken, CatalogHeroBannerController.getCatalogHeroBanner);

router.get("/get/:id", verifyToken, CatalogHeroBannerController.getCatalogHeroBannerById);

router.post(
  "/create",
  verifyToken,
  upload.fields([
    { name: "banner", maxCount: 1 },
    { name: "mobile_banner", maxCount: 1 },
  ]),
  CatalogHeroBannerController.createCatalogHeroBanner,
);

router.post(
  "/update/:id",
  verifyToken,
  upload.fields([
    { name: "banner", maxCount: 1 },
    { name: "mobile_banner", maxCount: 1 },
  ]),
  CatalogHeroBannerController.updateCatalogHeroBanner,
);

router.post(
  "/delete/:id",
  verifyToken,
  CatalogHeroBannerController.deleteCatalogHeroBanner,
);

router.post(
  "/toggle-feature/:id",
  verifyToken,
  CatalogHeroBannerController.toggleFeature,
);

module.exports = router;
