const express = require("express");
const router = express.Router();
const multer = require("multer");

const AskTheChampController = require("../controllers/askthechamp.controller");
const verifyToken = require("../middlewares/auth");

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get(
  "/homepage/ask-the-champ",
  AskTheChampController.getHomepageAskTheChamp,
);

// ✅ Admin Routes
router.get("/get-all", verifyToken, AskTheChampController.getAskTheChamp);

router.get("/get/:id", verifyToken, AskTheChampController.getAskTheChampById);

router.post(
  "/create",
  verifyToken,
  upload.fields([
    { name: "banner", maxCount: 1 },
    { name: "mobile_banner", maxCount: 1 },
  ]),
  AskTheChampController.createAskTheChamp,
);

router.post(
  "/update/:id",
  verifyToken,
  upload.fields([
    { name: "banner", maxCount: 1 },
    { name: "mobile_banner", maxCount: 1 },
  ]),
  AskTheChampController.updateAskTheChamp,
);

router.post(
  "/delete/:id",
  verifyToken,
  AskTheChampController.deleteAskTheChamp,
);

router.post(
  "/toggle-feature/:id",
  verifyToken,
  AskTheChampController.toggleFeature,
);

module.exports = router;
