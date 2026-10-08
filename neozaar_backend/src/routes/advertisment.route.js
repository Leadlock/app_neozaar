const express = require("express");
const router = express.Router();
const multer = require("multer");
const AdvertismentController = require("../controllers/advertismentController");
const verifyToken = require("../middlewares/auth");
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get("/ads", AdvertismentController.getAdsForPage);

router.get(
  "/get-all/advertisment",
  verifyToken,
  AdvertismentController.getAdvertisments
);


router.get(
  "/get/:id",
  verifyToken,
  AdvertismentController.getAdvertismentById
);


router.post(
  "/create",
  verifyToken,
  upload.fields([{ name: "image", maxCount: 1 }, { name: "mobile_banner", maxCount: 1 }]),
  AdvertismentController.createAdvertisment
);


router.post(
  "/update/:id",
  verifyToken,
  upload.fields([{ name: "image", maxCount: 1 }, { name: "mobile_banner", maxCount: 1 }]),
  AdvertismentController.updateAdvertisment
);


router.post(
  "/delete/:id",
  verifyToken,
  AdvertismentController.deleteAdvertisment
);

module.exports = router;



//TODO: category_name needs to be stored in ads DB 
    // jab product page pe show karenge tab check karo konsi category hai aur uska hi add show karo 
    // jab bhi category change ho to uske hisab se ads show karo
    // if koi specific product page pe show karna hoga woh handle karo
