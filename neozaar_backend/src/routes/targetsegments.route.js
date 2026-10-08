const express = require("express");
const router = express.Router();
const multer = require("multer");

const TargetSegmentsController = require("../controllers/targetsegments.controller");
const verifyToken = require("../middlewares/auth");

// ✅ Use multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Get all target segments
router.get(
  "/get-all/target-segments",
  verifyToken,
  TargetSegmentsController.getTargetSegments,
);

// ✅ Create (icon + logo upload)
router.post(
  "/create",
  verifyToken,
  upload.fields([
    { name: "icon", maxCount: 1 },
    { name: "logo", maxCount: 1 },
  ]),
  TargetSegmentsController.createTargetSegment,
);

// ✅ Update
router.post(
  "/update/:id",
  verifyToken,
  upload.fields([
    { name: "icon", maxCount: 1 },
    { name: "logo", maxCount: 1 },
  ]),
  TargetSegmentsController.updateTargetSegment,
);

// ✅ Delete
router.post("/delete/:id", TargetSegmentsController.deleteTargetSegment);

module.exports = router;
