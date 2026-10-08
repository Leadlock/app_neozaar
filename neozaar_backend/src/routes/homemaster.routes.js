const express = require("express");
const router = express.Router();
const multer = require("multer");
const HomemasterController = require("../controllers/homemaster.controller");
const verifyToken = require("../middlewares/auth");
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get("/get", HomemasterController.getPublicHomemaster);

router.get("/get-all/homemaster", verifyToken, HomemasterController.getHomemaster);

router.get("/get/:id", verifyToken, HomemasterController.getHomemasterById);

router.post(
  "/create",
  verifyToken,
  upload.fields([{ name: "banner", maxCount: 1 }]),
  HomemasterController.createHomemaster
);

router.post(
    "/update/:id",
    verifyToken,
    upload.fields([{ name: "banner", maxCount: 1 }]),
    HomemasterController.updateHomemaster
);

router.post(
    "/delete/:id",
    verifyToken,
    HomemasterController.deleteHomemaster
);

module.exports = router;
