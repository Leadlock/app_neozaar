const express = require("express");
const router = express.Router();
const multer = require("multer");

const HeroCarouselController = require("../controllers/heroCarousel.controller");
const verifyToken = require("../middlewares/auth");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Public homepage feed
router.get(
  "/homepage/hero-carousel",
  HeroCarouselController.getHomepageHeroCarousel,
);

// ✅ Admin Routes
router.get("/get-all", verifyToken, HeroCarouselController.getHeroCarousel);

router.get("/get/:id", verifyToken, HeroCarouselController.getHeroCarouselById);

router.post(
  "/create",
  verifyToken,
  upload.fields([
    { name: "banner", maxCount: 1 },
    { name: "mobile_banner", maxCount: 1 },
  ]),
  HeroCarouselController.createHeroCarousel,
);

router.post(
  "/update/:id",
  verifyToken,
  upload.fields([
    { name: "banner", maxCount: 1 },
    { name: "mobile_banner", maxCount: 1 },
  ]),
  HeroCarouselController.updateHeroCarousel,
);

router.post(
  "/delete/:id",
  verifyToken,
  HeroCarouselController.deleteHeroCarousel,
);

router.post(
  "/toggle-feature/:id",
  verifyToken,
  HeroCarouselController.toggleFeature,
);

module.exports = router;
