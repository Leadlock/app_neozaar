const express = require("express");
const router = express.Router();
const multer = require("multer");

const TargetAudienceController = require("../controllers/target.audience.controller");
const verifyToken = require("../middlewares/auth");

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get(
  "/get-all-simple",
  verifyToken,
  TargetAudienceController.getAllTargetAudiences
);

router.get(
  "/get-all",
  verifyToken,
  TargetAudienceController.getTargetAudiences
);

router.get(
  "/get/:id",
  verifyToken,
  TargetAudienceController.getTargetAudienceById
);

router.post(
  "/create",
  verifyToken,
  TargetAudienceController.createTargetAudience
);

router.post(
  "/update/:id",
  verifyToken,
  TargetAudienceController.updateTargetAudience
);

router.post(
  "/delete/:id",
  verifyToken,
  TargetAudienceController.deleteTargetAudience
);

module.exports = router;
