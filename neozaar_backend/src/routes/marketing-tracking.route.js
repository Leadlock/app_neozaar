const express = require("express");
const { rateLimit } = require("../middlewares/rateLimit.middleware");
const { validate } = require("../middlewares/validator");
const { classifyTrackingSource } = require("../middlewares/marketing-tracking.middleware");
const rules = require("../validations/marketing.validation");
const controller = require("../controllers/marketing-tracking.controller");

const router = express.Router();
const publicLimit=rateLimit({ windowMs: 60_000, max: 60 });
router.post("/events",publicLimit,classifyTrackingSource,validate(rules.trackingEvent),controller.ingest);
router.post("/identity/stitch",publicLimit,classifyTrackingSource,validate(rules.identify),controller.identify);

module.exports = router;
