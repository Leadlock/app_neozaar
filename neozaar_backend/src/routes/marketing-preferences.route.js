// Public, token-gated — a marketing contact managing their own consent is
// not necessarily a platform user, so this intentionally has no auth
// middleware. Possessing the token (only ever sent in an email already
// delivered to that contact) is the proof of identity, same convention
// as the email unsubscribe/confirm links.
const router = require("express").Router();
const controller = require("../controllers/marketing-preferences.controller");
const { validate } = require("../middlewares/validator");
const rules = require("../validations/marketing.validation");
const { rateLimit } = require("../middlewares/rateLimit.middleware");

const limit = rateLimit({ max: 30 });

router.get("/:token", limit, validate(rules.preferenceToken), controller.get);
router.put("/:token", limit, validate(rules.updatePreferences), controller.update);

module.exports = router;
