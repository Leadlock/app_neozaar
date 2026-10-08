// Consumer for marketing_crm_handoff_requests — until now, requestCrmHandoff()
// in channels.service.js wrote rows here and nothing ever read them.
//
// requestCrmHandoff already refuses to create a handoff for a contact who
// isn't already a real crm_contacts row (it will not create one itself) —
// that guard stays as-is; this consumer only processes rows that already
// passed it.
const os = require("os");
const pool = require("../../config/database");

const TASK_PRIORITIES = new Set(["Low", "Medium", "High", "Urgent"]);

async function resolveOwnerId(client, crmContactId, preferredUserId) {
  const { resolveOwner } = require("../../controllers/crm/lifecycle.engine"); // lazy: avoids pulling lifecycle.engine's wide dependency tree into every marketing require chain at module-load time
  const contact = (await client.query("SELECT owner_id FROM crm_contacts WHERE id=$1", [crmContactId])).rows[0];
  return resolveOwner(preferredUserId || null, contact?.owner_id || null, client);
}

async function handleActivity(client, request, crmContactId) {
  const { createActivity } = require("../../controllers/crm/lifecycle.engine");
  const ownerId = await resolveOwnerId(client, crmContactId, request.payload.userId);
  await createActivity(
    "contact", crmContactId, crmContactId,
    request.payload.activityType || "note",
    request.payload.subject || "Marketing automation activity",
    request.payload.description || request.payload.message || null,
    ownerId, client,
  );
  return { ownerId };
}

async function handleTask(client, request, crmContactId) {
  const ownerId = await resolveOwnerId(client, crmContactId, request.payload.userId);
  const priority = TASK_PRIORITIES.has(request.payload.priority) ? request.payload.priority : "Medium";
  await client.query(
    `INSERT INTO crm_tasks (entity_type, entity_id, contact_id, title, description, priority, due_date, owner_id, created_by)
     VALUES ('contact',$1,$1,$2,$3,$4,$5,$6,$6)`,
    [crmContactId, request.payload.title || "Follow up (marketing automation)", request.payload.description || null,
      priority, request.payload.dueDate || null, ownerId],
  );
  return { ownerId };
}

async function handleLeadHandoff(client, request, crmContactId) {
  const { createActivity, createNotification } = require("../../controllers/crm/lifecycle.engine");
  const ownerId = await resolveOwnerId(client, crmContactId, request.payload.userId);
  await createActivity(
    "contact", crmContactId, crmContactId, "note",
    request.payload.subject || "Marketing qualified lead handoff",
    request.payload.description || request.payload.message || "This contact was handed off from a Marketing automation.",
    ownerId, client,
  );
  // createNotification always uses pool (documented as a post-commit side
  // effect in lifecycle.engine.js) — fine here since it's a best-effort
  // alert, not part of what makes this handoff "processed".
  if (ownerId) await createNotification(ownerId, "marketing_handoff", "New marketing handoff", request.payload.subject || "A contact was handed off from Marketing.", "contact", crmContactId);
  return { ownerId };
}

const HANDLERS = { activity: handleActivity, task: handleTask, lead_handoff: handleLeadHandoff };

async function processOne(request) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const crmContactId = request.payload?.crmContactId;
    if (!crmContactId) throw new Error("Handoff request has no crmContactId in payload");
    const handler = HANDLERS[request.handoff_type] || handleActivity; // unknown types degrade to a plain activity note rather than being dropped
    const result = await handler(client, request, crmContactId);
    await client.query("UPDATE marketing_crm_handoff_requests SET status='completed', processed_at=NOW(), updated_at=NOW() WHERE id=$1", [request.id]);
    await client.query("COMMIT");
    return { id: request.id, status: "completed", ...result };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    const attempts = Number(request.attempts) + 1;
    const failed = attempts >= request.max_attempts;
    await pool.query(
      `UPDATE marketing_crm_handoff_requests SET status=$1, attempts=$2, last_error=$3,
       available_at=NOW()+($4::int*INTERVAL '1 second'), updated_at=NOW() WHERE id=$5`,
      [failed ? "failed" : "queued", attempts, String(error.message).slice(0, 500), Math.min(3600, 2 ** attempts * 30), request.id],
    );
    return { id: request.id, status: failed ? "failed" : "queued", error: error.message };
  } finally {
    client.release();
  }
}

async function processNext(owner = `${os.hostname()}:${process.pid}`) {
  void owner; // kept for symmetry with the other workers' lease-owner logging; this table has no lease_owner column (lower contention than the job queues)
  const client = await pool.connect();
  let request;
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT * FROM marketing_crm_handoff_requests WHERE status='queued' AND available_at<=NOW() ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1`,
    );
    request = rows[0];
    if (!request) { await client.query("COMMIT"); return null; }
    // Flip to 'processing' inside the same transaction that holds the row
    // lock, before it's released — otherwise a second concurrent poller
    // could grab the same still-'queued' row between this COMMIT and
    // processOne's own BEGIN.
    await client.query("UPDATE marketing_crm_handoff_requests SET status='processing', updated_at=NOW() WHERE id=$1", [request.id]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
  return processOne(request);
}

module.exports = { processNext, processOne };
