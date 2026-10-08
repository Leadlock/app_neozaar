const router = require("express").Router();
const controller = require("../../controllers/consent.controller");

router.post("/", controller.save);

module.exports = router;
