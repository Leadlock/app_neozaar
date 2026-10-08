/**
 * AI Router — Proposal Studio (Neo) integration.
 *
 * Ported from Proposal Studio's `src/api/routes.js` into neozaar_backend as a
 * standard Express sub-router, following the same shape as
 * `src/routes/crm/crm.routes.js` (thin router, delegates to the ported logic
 * under `src/ai/`).
 *
 * ── Mounting (NOT done here — see report) ────────────────────────────────────
 * This file is not wired into `src/app.js` in this pass (app.js is an existing
 * file and was intentionally left untouched). To mount it, add to app.js:
 *
 *   const aiRoutes = require('./routes/ai/ai.routes');
 *   app.use('/api/ai', aiRoutes);
 *
 * ── Auth default (see final report for rationale) ────────────────────────────
 * Public (no verifyToken):
 *   POST /discovery
 *   POST /discovery/chat
 *   GET  /catalog/health
 * Protected (verifyToken required):
 *   Everything under /workspace/*  (creates/edits/drafts/exports persisted
 *   business artefacts tied to a user — matching enquiry.routes.js's pattern
 *   of requiring login for anything that creates a real record)
 *
 * ── Deliberately deferred in this pass (see final report) ───────────────────
 *   - Workspace persistence (workspaceStore.js keeps its original in-memory
 *     Map — not backed by a DB table here)
 *   - Real CRM wiring for GET /workspace/:id/crm (still returns the same
 *     handoff payload shape as standalone Proposal Studio; does not call any
 *     neozaar_backend CRM controller/service)
 */

const { Router } = require("express");
const verifyToken = require("../../middlewares/auth");
const pool = require("../../config/database");

const { discover } = require("../../ai/discovery/agent");
const { processChatTurn } = require("../../ai/discovery/chatAgent");
const { createDiscoveryOpportunity } = require("../../ai/discovery/crmOpportunity");
const { apiCatalogProvider, getApiProviderMode } = require("../../ai/db/apiCatalogProvider");
const { getExcelCache, preloadExcelCatalog } = require("../../ai/discovery/excelAdapter");
const { composeProposal } = require("../../ai/proposal/composer");
const { createHandoff } = require("../../ai/proposal/handoff");
const { expandSolutionRelationships } = require("../../ai/proposal/relationships");
const {
  addItem,
  createWorkspace,
  getWorkspace,
  listWorkspaces,
  removeItem,
  replaceItem,
  requireWorkspace,
  updateCustomerInfo,
  updateSolutionTitle,
  updateWorkspaceStatus,
} = require("../../ai/proposal/workspaceStore");
const {
  aiEditProposal,
  buildCRMHandoff,
  createDraft,
  exportProposal,
  generateAllSections,
  generateSection,
  reviewProposal,
  updateCommercialLineItem,
  updateSectionContent,
} = require("../../ai/proposal/builder");

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Catalog preload guard + change detection
//
// apiCatalogProvider's getAllProducts()/getAllServices()/getAllSolutions() are
// SYNC getters backed by an in-memory cache built by preload(). The first
// request through this router triggers preload(); every request waits on the
// same in-flight promise.
//
// Freshness: every ~PROBE_MS a tiny "signature" query (max updated_at + row
// count of the published/approved catalog) runs; if it changed, the in-memory
// catalog is reloaded. So publishing/approving/editing a marketplace item shows
// up in Neo within ~30s, no restart. CATALOG_TTL_MS is a hard backstop, and
// POST /catalog/refresh forces an immediate reload.
// ─────────────────────────────────────────────────────────────────────────────

const CATALOG_TTL_MS  = Number(process.env.NEO_CATALOG_TTL_MS)  || 10 * 60 * 1000;
const CATALOG_PROBE_MS = Number(process.env.NEO_CATALOG_PROBE_MS) || 30 * 1000;
const catalogCache = { promise: null, loadedAt: 0, signature: null, probedAt: 0 };

async function catalogSignature() {
  try {
    const { rows } = await pool.query(
      `SELECT count(*)::int AS n,
              COALESCE(to_char(max(GREATEST(updated_at, created_at)), 'YYYYMMDDHH24MISSUS'), '0') AS ts
         FROM products
        WHERE is_publish = true AND is_approved = true AND is_drapt = false AND deleted_at IS NULL`,
    );
    return `${rows[0].n}:${rows[0].ts}`;
  } catch {
    return null; // DB hiccup — keep serving the cached catalog
  }
}

function loadCatalog() {
  catalogCache.loadedAt = Date.now(); // claim now to avoid a reload stampede
  catalogCache.promise = Promise.all([
    apiCatalogProvider.preload(),
    Promise.resolve(preloadExcelCatalog()),
    catalogSignature(),
  ]).then(([, , sig]) => {
    catalogCache.signature = sig;
    catalogCache.probedAt = Date.now();
  }).catch((err) => {
    catalogCache.loadedAt = 0; // allow the next request to retry
    throw err;
  });
  return catalogCache.promise;
}

router.use((req, _res, next) => {
  const now = Date.now();

  if (!catalogCache.promise || now - catalogCache.loadedAt > CATALOG_TTL_MS) {
    loadCatalog();
    return catalogCache.promise.then(() => next()).catch(next);
  }

  // Cheap change-detection probe, throttled to CATALOG_PROBE_MS.
  if (now - catalogCache.probedAt > CATALOG_PROBE_MS) {
    catalogCache.probedAt = now;
    catalogCache.promise = catalogCache.promise
      .then(() => catalogSignature())
      .then((sig) => {
        if (sig && catalogCache.signature && sig !== catalogCache.signature) {
          return loadCatalog();
        }
        if (sig && !catalogCache.signature) catalogCache.signature = sig;
      })
      .catch(() => { /* keep serving cached catalog on probe failure */ });
  }

  catalogCache.promise.then(() => next()).catch(next);
});

// POST /catalog/refresh — force an immediate catalog reload (public; cheap, idempotent).
router.post("/catalog/refresh", async (_req, res, next) => {
  try {
    await loadCatalog();
    res.json({
      status: "ok",
      reloaded_at: new Date(catalogCache.loadedAt).toISOString(),
      signature: catalogCache.signature,
      products: apiCatalogProvider.getAllProducts().length,
      services: apiCatalogProvider.getAllServices().length,
      solutions: apiCatalogProvider.getAllSolutions().length,
    });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Health (public)
// ─────────────────────────────────────────────────────────────────────────────

router.get("/health", (_req, res) => {
  res.json({ status: "ok", agent: "Neo", version: "2.0.0" });
});

// ─────────────────────────────────────────────────────────────────────────────
// Catalog health (public) — reports which sources are active and their item counts
// GET /catalog/health
// ─────────────────────────────────────────────────────────────────────────────

router.get("/catalog/health", (_req, res) => {
  const mode = getApiProviderMode();
  // Discovery retrieval is DB-only unless this flag is explicitly enabled.
  const excelIncluded =
    String(process.env.DISCOVERY_INCLUDE_EXCEL || "").trim().toLowerCase() === "true";
  const apiProducts  = apiCatalogProvider.getAllProducts();
  const apiServices  = apiCatalogProvider.getAllServices();
  const apiSolutions = apiCatalogProvider.getAllSolutions();
  const excelItems   = getExcelCache();

  const excelSolutions = excelItems.filter((i) => i.source === "excel_1" || i.source === "excel_2")
    .filter((i) => i.type === "solution");
  const excelProducts  = excelItems.filter((i) => i.type === "product");
  const excelServices  = excelItems.filter((i) => i.type === "service");

  res.json({
    status: "ok",
    sources: {
      api: {
        mode,               // "seed" | "rest_api" | "postgresql"
        active: true,       // API source is always active (falls back to seed)
        products:  apiProducts.length,
        services:  apiServices.length,
        solutions: apiSolutions.length,
        total:     apiProducts.length + apiServices.length + apiSolutions.length,
      },
      excel: {
        // Loaded into memory at startup, but only blended into discovery
        // retrieval when DISCOVERY_INCLUDE_EXCEL=true (default: false).
        included_in_retrieval: excelIncluded,
        active: excelIncluded && excelItems.length > 0,
        items_total: excelItems.length,
        solutions:   excelSolutions.length,
        products:    excelProducts.length,
        services:    excelServices.length,
        sources: {
          excel_1: excelItems.filter((i) => i.source === "excel_1").length,
          excel_2: excelItems.filter((i) => i.source === "excel_2").length,
        },
      },
    },
    priority: excelIncluded ? "api > excel_1 > excel_2" : "api (db-only)",
    unified_total: apiProducts.length + apiServices.length + apiSolutions.length +
      (excelIncluded ? excelItems.length : 0),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Discovery — single-shot (public)
// ─────────────────────────────────────────────────────────────────────────────

router.post("/discovery", async (req, res, next) => {
  try {
    const body = req.body;
    if (!body.message || typeof body.message !== "string") {
      res.status(400).json({ error: 'Missing required field: "message" (string)' });
      return;
    }
    const result = await discover({ message: body.message.trim(), conversationHistory: body.conversationHistory ?? [] });
    res.json(result);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Discovery — conversational multi-turn (public, chat mode)
// POST /discovery/chat  { session_id?: string, message: string, selected_bundle?: {...} }
// ─────────────────────────────────────────────────────────────────────────────

router.post("/discovery/chat", async (req, res, next) => {
  try {
    const body = req.body;
    if (!body.message || typeof body.message !== "string") {
      res.status(400).json({ error: 'Missing required field: "message" (string)' });
      return;
    }
    const result = await processChatTurn({
      session_id: typeof body.session_id === "string" ? body.session_id : undefined,
      message: body.message.trim(),
      // Customer's curated pick from the recommendation card, if any.
      // Shape: { solution_id: string|null, product_ids: string[], service_ids: string[] }.
      selected_bundle:
        body.selected_bundle && typeof body.selected_bundle === "object"
          ? body.selected_bundle
          : undefined,
    });
    res.json(result);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Discovery → CRM opportunity (protected — the /neo user is signed in)
// POST /discovery/opportunity  { session_id?, name, email, company?, phone? }
// Creates ONE CRM opportunity (via crm_leads + lifecycle conversion) with the
// customer's confirmed bundle summarised in the opportunity note. Idempotent.
// ─────────────────────────────────────────────────────────────────────────────

router.post("/discovery/opportunity", verifyToken, async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.email || typeof body.email !== "string") {
      res.status(400).json({ error: 'Missing required field: "email" (string)' });
      return;
    }
    const out = await createDiscoveryOpportunity({
      session_id: typeof body.session_id === "string" ? body.session_id : undefined,
      name: body.name,
      email: body.email,
      company: body.company,
      phone: body.phone,
    });
    res.status(201).json({ status: "success", ...out });
  } catch (err) {
    if (err.status === 400 || err.status === 502) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error("[discovery/opportunity]", err.message);
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 + 2 — Create workspace from discovery result (protected)
// ─────────────────────────────────────────────────────────────────────────────

router.post("/workspace", verifyToken, (req, res, next) => {
  try {
    const body = req.body;
    if (!body.discovery) {
      res.status(400).json({ error: 'Missing required field: "discovery" (DiscoveryResponse)' });
      return;
    }
    const handoff  = createHandoff(body.discovery);
    const workspace = createWorkspace(handoff, body.customer);
    res.status(201).json({ workspace, handoff });
  } catch (err) { next(err); }
});

router.get("/workspace", verifyToken, (_req, res) => {
  res.json(listWorkspaces());
});

router.get("/workspace/:id", verifyToken, (req, res, next) => {
  try {
    const ws = getWorkspace(req.params.id);
    if (!ws) { res.status(404).json({ error: "Workspace not found" }); return; }
    res.json(ws);
  } catch (err) { next(err); }
});

router.patch("/workspace/:id/customer", verifyToken, (req, res, next) => {
  try {
    const ws = updateCustomerInfo(req.params.id, req.body);
    res.json(ws);
  } catch (err) { next(err); }
});

router.patch("/workspace/:id/title", verifyToken, (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title) { res.status(400).json({ error: 'Missing "title"' }); return; }
    res.json(updateSolutionTitle(req.params.id, title));
  } catch (err) { next(err); }
});

router.patch("/workspace/:id/status", verifyToken, (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) { res.status(400).json({ error: 'Missing "status"' }); return; }
    res.json(updateWorkspaceStatus(req.params.id, status));
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 — Item selection (protected)
// ─────────────────────────────────────────────────────────────────────────────

router.post("/workspace/:id/items", verifyToken, (req, res, next) => {
  try {
    res.json(addItem(req.params.id, req.body));
  } catch (err) { next(err); }
});

router.delete("/workspace/:id/items/:itemId", verifyToken, (req, res, next) => {
  try {
    const body = {
      workspace_item_id: req.params.itemId,
      reason: req.body.reason,
    };
    res.json(removeItem(req.params.id, body));
  } catch (err) { next(err); }
});

router.put("/workspace/:id/items/:itemId", verifyToken, (req, res, next) => {
  try {
    const body = req.body;
    res.json(replaceItem(req.params.id, {
      workspace_item_id: req.params.itemId,
      replacement_catalog_item: body.replacement_catalog_item,
      user_notes: body.user_notes,
    }));
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4 — Solution relationships (protected)
// ─────────────────────────────────────────────────────────────────────────────

router.get("/workspace/:id/relationships", verifyToken, (req, res, next) => {
  try {
    const ws = requireWorkspace(req.params.id);
    res.json(expandSolutionRelationships(ws));
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 5 — Proposal draft (protected)
// ─────────────────────────────────────────────────────────────────────────────

router.post("/workspace/:id/draft", verifyToken, (req, res, next) => {
  try {
    const ws = requireWorkspace(req.params.id);
    if (!ws.proposal) ws.proposal = createDraft(ws);
    res.status(201).json(ws.proposal);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 6 — AI section generation (protected)
// ─────────────────────────────────────────────────────────────────────────────

router.post("/workspace/:id/draft/generate", verifyToken, async (req, res, next) => {
  try {
    const draft = await generateAllSections(req.params.id);
    res.json(draft);
  } catch (err) { next(err); }
});

router.post("/workspace/:id/draft/section", verifyToken, async (req, res, next) => {
  try {
    const body = req.body;
    if (!body.section_id) { res.status(400).json({ error: 'Missing "section_id"' }); return; }
    const section = await generateSection(req.params.id, body.section_id, body.instruction);
    res.json(section);
  } catch (err) { next(err); }
});

router.patch("/workspace/:id/draft/section/:sid", verifyToken, (req, res, next) => {
  try {
    const { content } = req.body;
    if (content === undefined) { res.status(400).json({ error: 'Missing "content"' }); return; }
    const section = updateSectionContent(req.params.id, req.params.sid, content);
    res.json(section);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 10 — Commercials (protected)
// ─────────────────────────────────────────────────────────────────────────────

router.patch("/workspace/:id/commercials/:lid", verifyToken, (req, res, next) => {
  try {
    const commercials = updateCommercialLineItem(req.params.id, req.params.lid, req.body);
    res.json(commercials);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 11 — Review (protected)
// ─────────────────────────────────────────────────────────────────────────────

router.get("/workspace/:id/review", verifyToken, (req, res, next) => {
  try {
    res.json(reviewProposal(req.params.id));
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 12 — AI Edit (protected)
// ─────────────────────────────────────────────────────────────────────────────

router.post("/workspace/:id/ai-edit", verifyToken, async (req, res, next) => {
  try {
    const body = req.body;
    if (!body.instruction) { res.status(400).json({ error: 'Missing "instruction"' }); return; }
    const result = await aiEditProposal({
      workspace_id: req.params.id,
      instruction: body.instruction,
      target_section_id: body.target_section_id,
    });
    res.json(result);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 13 — Export (protected)
// ─────────────────────────────────────────────────────────────────────────────

router.post("/workspace/:id/export", verifyToken, (req, res, next) => {
  try {
    const body = req.body;
    const format = body.format ?? "markdown";
    const final = exportProposal(req.params.id, format, body.customer_name, body.author_name);
    res.json(final);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 14 — CRM Handoff (protected)
// Deferred: still returns the Proposal Studio handoff payload shape as-is —
// does NOT call neozaar_backend's CRM controllers/leadService to create real
// leads/opportunities. See final report.
// ─────────────────────────────────────────────────────────────────────────────

router.get("/workspace/:id/crm", verifyToken, (req, res, next) => {
  try {
    res.json(buildCRMHandoff(req.params.id));
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Legacy — POST /proposal (kept for backwards compat, public like /discovery)
// ─────────────────────────────────────────────────────────────────────────────

router.post("/proposal", async (req, res, next) => {
  try {
    const body = req.body;
    if (!body.discovery) { res.status(400).json({ error: 'Missing "discovery"' }); return; }
    const proposal = await composeProposal({
      discovery: body.discovery,
      customer_name: body.customer_name,
      author_name: body.author_name,
      date: body.date,
    });
    res.json(proposal);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Error handler
// ─────────────────────────────────────────────────────────────────────────────

router.use((err, _req, res, _next) => {
  console.error("[AI Router Error]", err.message);
  res.status(500).json({ error: err.message ?? "Internal server error" });
});

module.exports = router;
