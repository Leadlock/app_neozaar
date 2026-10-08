const express = require("express");
const router = express.Router();
const multer = require("multer");

const campaignsController = require("../controllers/campaigns.controller");
const verifyToken = require("../middlewares/auth");

const upload = multer({ storage: multer.memoryStorage() });

// Public — no auth. Zoho's servers fetch this via content_url. Must stay registered
// before nothing else conflicts with it (no other :id/... route exists here to collide
// with, unlike catalog.route.js's generic /:type/:id — this router is campaigns-only).
router.get("/:id/content", campaignsController.getCampaignContent);

router.get("/", verifyToken, campaignsController.getCampaigns);
router.post("/", verifyToken, campaignsController.createCampaign);
// Must stay registered before "/:id" below, or these would be captured as an :id value
// instead.
router.get("/available-fields", verifyToken, campaignsController.getAvailableFields);
router.post("/template-recommendations", verifyToken, campaignsController.getTemplateRecommendations);
router.post("/upload-image", verifyToken, upload.single("image"), campaignsController.uploadImage);
router.get("/:id", verifyToken, campaignsController.getCampaignById);
router.put("/:id", verifyToken, campaignsController.updateCampaign);
router.delete("/:id", verifyToken, campaignsController.deleteCampaign);
router.get("/:id/preview", verifyToken, campaignsController.getCampaignPreview);
router.post("/:id/push", verifyToken, campaignsController.pushCampaign);
router.post("/:id/send-email", verifyToken, campaignsController.sendCampaignEmail);

module.exports = router;
