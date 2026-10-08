// Ops visibility for the marketing background workers, none of which had
// any before this: automation.worker, email.worker, retention.worker and
// crmHandoff.worker all poll in tight loops with their own sleep/backoff,
// so calling heartbeat() on every single iteration would write far more
// often than needed — this throttles to at most once per HEARTBEAT_INTERVAL_MS
// per worker, in-memory, so callers don't need their own timing logic.
const pool = require("../../config/database");

const HEARTBEAT_INTERVAL_MS = 20_000;
const STALE_AFTER_MS = 90_000; // a worker whose loop sleeps up to 5s at a time going >90s quiet almost certainly crashed or hung
const lastWrite = new Map();

const KNOWN_WORKERS = ["automation.worker", "email.worker", "retention.worker", "crmHandoff.worker"];

async function heartbeat(workerName, meta = {}) {
  const last = lastWrite.get(workerName) || 0;
  if (Date.now() - last < HEARTBEAT_INTERVAL_MS) return;
  lastWrite.set(workerName, Date.now());
  try {
    await pool.query(
      `INSERT INTO marketing_worker_heartbeats (worker_name, last_seen_at, meta) VALUES ($1,NOW(),$2)
       ON CONFLICT (worker_name) DO UPDATE SET last_seen_at=NOW(), meta=EXCLUDED.meta`,
      [workerName, JSON.stringify(meta)],
    );
  } catch (error) {
    console.error(`Marketing heartbeat write failed for ${workerName}:`, error.message);
  }
}

async function getHealth() {
  const heartbeatRows = (await pool.query("SELECT worker_name, last_seen_at, meta FROM marketing_worker_heartbeats")).rows;
  const byName = Object.fromEntries(heartbeatRows.map((r) => [r.worker_name, r]));
  const workers = KNOWN_WORKERS.map((name) => {
    const row = byName[name];
    const secondsSinceLastSeen = row ? Math.round((Date.now() - new Date(row.last_seen_at).getTime()) / 1000) : null;
    return {
      worker: name,
      lastSeenAt: row?.last_seen_at || null,
      secondsSinceLastSeen,
      healthy: row ? secondsSinceLastSeen * 1000 < STALE_AFTER_MS : false,
      meta: row?.meta || {},
    };
  });

  const jobs = (await pool.query(
    `SELECT job_type, status, COUNT(*)::int count FROM marketing_jobs GROUP BY job_type, status ORDER BY job_type, status`,
  )).rows;
  const handoffs = (await pool.query(
    `SELECT status, COUNT(*)::int count FROM marketing_crm_handoff_requests GROUP BY status ORDER BY status`,
  )).rows;

  return { workers, jobs, handoffs };
}

module.exports = { heartbeat, getHealth, KNOWN_WORKERS };
