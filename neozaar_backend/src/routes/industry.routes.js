const express = require("express");
const router = express.Router();
const multer = require("multer");

const IndustryController = require("../controllers/industry.controller");
const verifyToken = require("../middlewares/auth");

// ✅ Use multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get("/get-all/industries",verifyToken,IndustryController.getIndustry);
// ✅ Upload icon + logo
router.post(
  "/create",
  verifyToken,
  upload.fields([
    { name: "icon", maxCount: 1 },
    { name: "logo", maxCount: 1 },
  ]),
  IndustryController.createIndustry,
);


router.post(
  "/update/:id",
  verifyToken,
  upload.fields([
    { name: "icon", maxCount: 1 },
    { name: "logo", maxCount: 1 },
  ]),
  IndustryController.updateIndustry,
);

// Delete
router.post(
  "/delete/:id",
  IndustryController.deleteIndustry
);

module.exports = router;
