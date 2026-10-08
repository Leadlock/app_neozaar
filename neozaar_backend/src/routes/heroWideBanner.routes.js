const express = require("express");
const router = express.Router();
const multer = require("multer");

const HeroWideBannerController = require("../controllers/heroWideBanner.controller");
const verifyToken = require("../middlewares/auth");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Public homepage feed
router.get(
  "/homepage/hero-wide-banner",
  HeroWideBannerController.getHomepageHeroWideBanner,
);

// ✅ Admin Routes
router.get("/get-all", verifyToken, HeroWideBannerController.getHeroWideBanner);

router.get("/get/:id", verifyToken, HeroWideBannerController.getHeroWideBannerById);

router.post(
  "/create",
  verifyToken,
  upload.fields([
    { name: "banner", maxCount: 1 },
    { name: "mobile_banner", maxCount: 1 },
  ]),
  HeroWideBannerController.createHeroWideBanner,
);

router.post(
  "/update/:id",
  verifyToken,
  upload.fields([
    { name: "banner", maxCount: 1 },
    { name: "mobile_banner", maxCount: 1 },
  ]),
  HeroWideBannerController.updateHeroWideBanner,
);

router.post(
  "/delete/:id",
  verifyToken,
  HeroWideBannerController.deleteHeroWideBanner,
);

router.post(
  "/toggle-feature/:id",
  verifyToken,
  HeroWideBannerController.toggleFeature,
);

module.exports = router;
