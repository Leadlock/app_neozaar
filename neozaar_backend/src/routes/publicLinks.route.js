const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/auth");
const ctrl = require("../controllers/publicLinks.controller");

// Public — no auth. Called server-side by the Next.js /p/<slug> route (render) and
// its /p/<slug>/go redirect handler (click). Registered first so the literal
// "by-slug" prefix can never be captured by an admin ":id" route.
router.get("/by-slug/:slug/render", ctrl.renderBySlug);
router.get("/by-slug/:slug/click", ctrl.clickBySlug);

// Admin — Super Admin / Manager only (enforced in the controller).
router.get("/", verifyToken, ctrl.listLinks);
router.post("/", verifyToken, ctrl.createLink);
router.get("/:id/analytics", verifyToken, ctrl.getAnalytics);
router.patch("/:id", verifyToken, ctrl.updateLink);
router.delete("/:id", verifyToken, ctrl.deleteLink);

module.exports = router;
