const router = require("express").Router();
const verifyToken = require('../../middlewares/auth');
const controller = require("../../controllers/admin.controller");

router.get("/overview", verifyToken, controller.overview);
router.get("/activity/daily", verifyToken, controller.dailyActivity);
router.get("/products/top", verifyToken, controller.topProducts);

// PRODUCT FUNNEL
router.get("/products/:id/funnel", verifyToken, controller.productFunnel);

// USER ACTIVITY TIMELINE
router.get("/users/:id/activity", verifyToken, controller.userActivity);

// UTM REPORTS
router.get("/utm/sources", verifyToken, controller.utmSources);
router.get("/utm/campaigns", verifyToken, controller.utmCampaigns);

// EXPORT CSV
router.get("/export", verifyToken, controller.exportCSV);

// GDPR DELETE
router.delete("/users/:id", verifyToken, controller.deleteUser);

module.exports = router;
