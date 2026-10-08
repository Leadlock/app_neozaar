const router = require("express").Router();
const consent = require("../../middlewares/adminConsent.middleware");
const controller = require("../../controllers/track.controller");

router.post("/", consent, controller.track);

module.exports = router;
