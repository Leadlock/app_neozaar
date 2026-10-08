/**
 * Phase 2 — Solution Workspace Store.
 *
 * In-memory store for WorkspaceState objects (swap for Redis/DB in production).
 * Handles creation, retrieval, and mutation of the workspace.
 * All mutations append to the history audit trail.
 */

const crypto = require("crypto");

// ─────────────────────────────────────────────────────────────────────────────
// In-memory store
// ─────────────────────────────────────────────────────────────────────────────

const store = new Map();

function now() {
  return new Date().toISOString();
}

function historyEntry(action, detail) {
  return { timestamp: now(), action, detail };
}

function makeWorkspaceItem(catalog, neoRecommended, userNotes) {
  return {
    workspace_item_id: `WI-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    catalog,
    status: "accepted",
    neo_recommended: neoRecommended,
    user_notes: userNotes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new WorkspaceState from a ProposalStudioHandoff.
 * All Neo-recommended items start with status = "accepted".
 */
function createWorkspace(handoff, customer) {
  const workspace_id = `WS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const ts = now();

  // Derive a clean solution title from Neo's recommendation
  const reqFallback =
    handoff.requirements.slice(0, 2).map((r) => r.label).join(" & ");
  const solutionTitle =
    handoff.solutions[0]?.name ??
    (reqFallback ? `${reqFallback} Solution` : "Proposed Solution");

  const workspace = {
    workspace_id,
    status: "draft",
    handoff,
    customer: customer ?? {},
    solution_title: solutionTitle,
    solutions: handoff.solutions.map((c) => makeWorkspaceItem(c, true)),
    products:  handoff.products.map((c)  => makeWorkspaceItem(c, true)),
    services:  handoff.services.map((c)  => makeWorkspaceItem(c, true)),
    history: [historyEntry("workspace_created", `From handoff ${handoff.handoff_id}`)],
    created_at: ts,
    updated_at: ts,
  };

  store.set(workspace_id, workspace);
  return workspace;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────────────────────

function getWorkspace(workspace_id) {
  return store.get(workspace_id);
}

function requireWorkspace(workspace_id) {
  const ws = store.get(workspace_id);
  if (!ws) throw new Error(`Workspace not found: ${workspace_id}`);
  return ws;
}

/** Return all workspaces (for admin/debug; paginate in production) */
function listWorkspaces() {
  return Array.from(store.values());
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 — status + customer updates
// ─────────────────────────────────────────────────────────────────────────────

function updateWorkspaceStatus(workspace_id, status) {
  const ws = requireWorkspace(workspace_id);
  ws.status = status;
  ws.updated_at = now();
  ws.history.push(historyEntry("status_changed", status));
  return ws;
}

function updateCustomerInfo(workspace_id, customer) {
  const ws = requireWorkspace(workspace_id);
  ws.customer = { ...ws.customer, ...customer };
  ws.updated_at = now();
  ws.history.push(historyEntry("customer_updated"));
  return ws;
}

function updateSolutionTitle(workspace_id, title) {
  const ws = requireWorkspace(workspace_id);
  ws.solution_title = title;
  ws.updated_at = now();
  ws.history.push(historyEntry("solution_title_changed", title));
  return ws;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 — item selection: add / remove / replace
// ─────────────────────────────────────────────────────────────────────────────

function getBucket(ws, type) {
  if (type === "solution") return ws.solutions;
  if (type === "product")  return ws.products;
  return ws.services;
}

function addItem(workspace_id, req) {
  const ws = requireWorkspace(workspace_id);
  const bucket = getBucket(ws, req.catalog_item.type);
  const item = makeWorkspaceItem(req.catalog_item, false, req.user_notes);
  item.status = "user_added";
  bucket.push(item);
  ws.updated_at = now();
  ws.history.push(historyEntry("item_added", `${req.catalog_item.type}: ${req.catalog_item.name}`));
  return ws;
}

function removeItem(workspace_id, req) {
  const ws = requireWorkspace(workspace_id);
  let found = false;

  for (const bucket of [ws.solutions, ws.products, ws.services]) {
    const item = bucket.find((i) => i.workspace_item_id === req.workspace_item_id);
    if (item) {
      item.status = "removed";
      found = true;
      ws.history.push(
        historyEntry("item_removed", `${req.workspace_item_id}${req.reason ? `: ${req.reason}` : ""}`)
      );
      break;
    }
  }

  if (!found) throw new Error(`Workspace item not found: ${req.workspace_item_id}`);
  ws.updated_at = now();
  return ws;
}

function replaceItem(workspace_id, req) {
  const ws = requireWorkspace(workspace_id);

  for (const bucket of [ws.solutions, ws.products, ws.services]) {
    const idx = bucket.findIndex((i) => i.workspace_item_id === req.workspace_item_id);
    if (idx !== -1) {
      // Mark original as replaced
      bucket[idx].status = "replaced";

      // Insert replacement
      const replacement = makeWorkspaceItem(req.replacement_catalog_item, false, req.user_notes);
      replacement.replaced_by = req.workspace_item_id;
      replacement.status = "user_added";
      bucket.splice(idx + 1, 0, replacement);

      ws.updated_at = now();
      ws.history.push(
        historyEntry(
          "item_replaced",
          `${req.workspace_item_id} → ${req.replacement_catalog_item.name}`
        )
      );
      return ws;
    }
  }

  throw new Error(`Workspace item not found: ${req.workspace_item_id}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Return only active (non-removed, non-replaced) items of a given type */
function activeItems(ws, type) {
  return getBucket(ws, type).filter(
    (i) => i.status !== "removed" && i.status !== "replaced"
  );
}

/** Reset store — for tests only */
function _resetStore() {
  store.clear();
}

module.exports = {
  createWorkspace,
  getWorkspace,
  requireWorkspace,
  listWorkspaces,
  updateWorkspaceStatus,
  updateCustomerInfo,
  updateSolutionTitle,
  addItem,
  removeItem,
  replaceItem,
  activeItems,
  _resetStore,
};
