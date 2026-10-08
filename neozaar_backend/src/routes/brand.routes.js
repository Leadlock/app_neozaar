const express = require("express");
const router = express.Router();
const multer = require("multer");

const BrandController = require("../controllers/brand.controller");
const verifyToken = require("../middlewares/auth");

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get("/get-all-brand", BrandController.getAllBrands)
router.get("/get-all", verifyToken, BrandController.getBrands);

router.get("/get/:id", verifyToken, BrandController.getBrandById);

router.post(
  "/create",
  verifyToken,
  upload.fields([{ name: "icon", maxCount: 1 }]),
  BrandController.createBrand,
);

router.post(
  "/update/:id",
  verifyToken,
  upload.fields([{ name: "icon", maxCount: 1 }]),
  BrandController.updateBrand,
);

router.post("/delete/:id", verifyToken, BrandController.deleteBrand);

module.exports = router;
