// ══════════════════════════════════════════════════════════════════════════
// marketing.route.js — NeoZaar Marketing Automation (Phase 1–2)
//
// Mirrors campaigns.route.js: per-route verifyToken, static/specific paths
// registered before parameterised :id routes so they aren't captured as an id.
// Mounted at /api/marketing in app.js (before the global authMiddleware block).
// ══════════════════════════════════════════════════════════════════════════
const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/auth");
const { requireMarketingManager } = require("../middlewares/marketing.middleware");
const { rateLimit } = require("../middlewares/rateLimit.middleware");
const { validate } = require("../middlewares/validator");
const rules = require("../validations/marketing.validation");
const ctrl = require("../controllers/marketing.controller");

router.use(verifyToken, requireMarketingManager);

// ── Dashboard ─────────────────────────────────────────────────
router.get("/dashboard", ctrl.getDashboard);
router.get("/visitors/:visitorId", ctrl.getVisitor);
router.get("/sessions/:sessionId", ctrl.getSession);

// ── Scoring rules ─────────────────────────────────────────────
router.get("/scoring-rules", ctrl.getScoringRules);
router.post("/scoring-rules", validate(rules.scoringRule), ctrl.createScoringRule);
router.put("/scoring-rules/:id", validate(rules.updateScoringRule), ctrl.updateScoringRule);
router.delete("/scoring-rules/:id", validate(rules.id), ctrl.deleteScoringRule);
router.post("/scoring/rebuild/:id", validate(rules.id), ctrl.rebuildContactScore);
router.get("/scoring-models",ctrl.getScoringModels);
router.post("/scoring-models",validate(rules.scoringModel),ctrl.createScoringModel);
router.post("/scoring/decay",ctrl.runScoreDecay);

// ── Tags ──────────────────────────────────────────────────────
router.get("/tags", ctrl.getTags);
router.post("/tags", validate(rules.createTag), ctrl.createTag);
router.post("/tags/bulk", validate(rules.bulkTag), ctrl.bulkTagContacts);
router.get("/tag-rules", ctrl.getTagRules);
router.post("/tag-rules", validate(rules.tagRule), ctrl.createTagRule);
router.delete("/tag-rules/:id", validate(rules.id), ctrl.deleteTagRule);
router.delete("/tags/:id", validate(rules.id), ctrl.deleteTag);

// ── Segments ──────────────────────────────────────────────────
router.get("/segments", ctrl.getSegments);
router.post("/segments/preview", validate(rules.previewSegment), ctrl.previewSegmentRules);
router.get("/segments/:id/preview", validate(rules.id), ctrl.previewSegment);
router.post("/segments/:id/refresh", validate(rules.id), ctrl.refreshSegment);
router.post("/segments", validate(rules.createSegment), ctrl.createSegment);
router.put("/segments/:id", validate(rules.updateSegment), ctrl.updateSegment);
router.delete("/segments/:id", validate(rules.id), ctrl.deleteSegment);

// ── Contacts (parameterised :id routes last) ──────────────────
router.get("/contacts", validate(rules.listContacts), ctrl.getContacts);
router.get("/contacts/:id/timeline", validate(rules.timeline), ctrl.getContactTimeline);

// ── Permissions (manager-only, same as this whole router — granting
// access is deliberately not delegatable to someone who only holds a
// granular grant themselves, to avoid privilege escalation) ───
router.get("/permissions", ctrl.getUserPermissions);
router.post("/permissions", validate(rules.grantPermission), ctrl.grantUserPermission);
router.delete("/permissions/:userId/:permission", validate(rules.revokePermission), ctrl.revokeUserPermission);

module.exports = router;
