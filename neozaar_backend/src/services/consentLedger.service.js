/**
 * Consent ledger service — DPDPA Phase 1.
 * ─────────────────────────────────────────────────────────────
 * Append-only, hash-chained store of consent events for anonymous
 * and signed-in subjects. Writers are serialised with a Postgres
 * advisory lock so the chain is well-defined under concurrency.
 *
 * Tables: consent_events, consent_notices, dsar_requests (mig 037).
 * The legacy `user_consents` table is mirrored on analytics grants
 * so middlewares/consent.js keeps gating /api/track unchanged.
 */
const crypto = require('crypto');
const pool = require('../config/database');

// Arbitrary constant — the lock that serialises ledger writers.
const CONSENT_LOCK_KEY = 49_15_271;

// ── hashing ─────────────────────────────────────────────────
function canonicalPurposes(p = {}) {
  return `necessary=${p.necessary !== false};analytics=${p.analytics === true};marketing=${p.marketing === true}`;
}

function hashRow(r) {
  const canonical = [
    r.id,
    new Date(r.createdAt).toISOString(),
    r.subjectType,
    r.anonId || '',
    r.userId == null ? '' : r.userId,
    r.action,
    canonicalPurposes(r.purposes),
    r.noticeVersion,
    r.noticeLocale,
    r.uiSurface,
    r.sourceApp,
    r.prevHash || '',
  ].join('|');
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

// ── writes ──────────────────────────────────────────────────
/**
 * Append one consent event. Returns { id, createdAt, rowHash, prevHash }.
 * @param {object} input
 * @param {string}  input.anonId        first-party uuid (required)
 * @param {number} [input.userId]       set when the subject is signed in
 * @param {'grant'|'withdraw'|'update'|'renew'} input.action
 * @param {{necessary?:boolean,analytics?:boolean,marketing?:boolean}} input.purposes
 * @param {string}  input.noticeVersion
 * @param {string} [input.noticeLocale='en']
 * @param {'banner'|'modal'|'settings'|'api'} input.uiSurface
 * @param {string} [input.policyUrl]
 * @param {string} [input.ipHash]
 * @param {string} [input.ipTrunc]
 * @param {string} [input.userAgent]
 * @param {string} [input.country]
 * @param {string}  input.sourceApp
 */
async function recordEvent(input) {
  const {
    anonId, userId = null, action, purposes,
    noticeVersion, noticeLocale = 'en', uiSurface,
    policyUrl = null, ipHash = null, ipTrunc = null,
    userAgent = null, country = null, sourceApp,
  } = input;

  if (!anonId) throw new Error('recordEvent: anonId is required');
  if (!action) throw new Error('recordEvent: action is required');
  if (!noticeVersion) throw new Error('recordEvent: noticeVersion is required');
  if (!uiSurface) throw new Error('recordEvent: uiSurface is required');
  if (!sourceApp) throw new Error('recordEvent: sourceApp is required');

  const subjectType = userId ? 'user' : 'anon';
  const norm = {
    necessary: true,
    analytics: purposes?.analytics === true,
    marketing: purposes?.marketing === true,
  };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [CONSENT_LOCK_KEY]);

    const prev = await client.query(
      'SELECT row_hash FROM consent_events ORDER BY id DESC LIMIT 1'
    );
    const prevHash = prev.rows.length ? prev.rows[0].row_hash : '';

    const ins = await client.query(
      `INSERT INTO consent_events
         (subject_type, anon_id, user_id, action, purposes,
          notice_version, notice_locale, ui_surface, policy_url,
          ip_hash, ip_trunc, user_agent, country, source_app, prev_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id, created_at`,
      [subjectType, anonId, userId, action, norm,
       noticeVersion, noticeLocale, uiSurface, policyUrl,
       ipHash, ipTrunc, userAgent, country, sourceApp, prevHash]
    );
    const { id, created_at } = ins.rows[0];

    const rowHash = hashRow({
      id, createdAt: created_at, subjectType, anonId, userId,
      action, purposes: norm, noticeVersion, noticeLocale, uiSurface,
      sourceApp, prevHash,
    });
    await client.query('UPDATE consent_events SET row_hash = $1 WHERE id = $2', [rowHash, id]);

    // Mirror analytics state into the legacy table so /api/track gating is unchanged.
    if (userId != null) {
      const last = await client.query(
        `SELECT consent_given FROM user_consents
         WHERE user_id = $1 AND consent_type = 'analytics'
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );
      if (!last.rows.length || last.rows[0].consent_given !== norm.analytics) {
        await client.query(
          `INSERT INTO user_consents (user_id, consent_given, consent_type)
           VALUES ($1, $2, 'analytics')`,
          [userId, norm.analytics]
        );
      }
    }

    await client.query('COMMIT');
    return { id, createdAt: created_at, rowHash, prevHash };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

// ── reads ───────────────────────────────────────────────────
function subjectKey(rawId) {
  return /^\d+$/.test(String(rawId)) ? { userId: parseInt(rawId, 10) } : { anonId: String(rawId) };
}

async function currentState({ anonId = null, userId = null } = {}) {
  if (!anonId && !userId) return null;
  const { rows } = await pool.query(
    `SELECT id, action, purposes, notice_version, notice_locale, created_at
       FROM consent_events
      WHERE ($1::uuid   IS NOT NULL AND anon_id = $1::uuid)
         OR ($2::bigint IS NOT NULL AND user_id = $2::bigint)
      ORDER BY id DESC
      LIMIT 1`,
    [anonId, userId]
  );
  if (!rows.length) return null;
  return {
    purposes: rows[0].purposes,
    action: rows[0].action,
    noticeVersion: rows[0].notice_version,
    noticeLocale: rows[0].notice_locale,
    at: rows[0].created_at,
  };
}

async function history({ anonId = null, userId = null, limit = 500 } = {}) {
  if (!anonId && !userId) return [];
  const { rows } = await pool.query(
    `SELECT id, subject_type, anon_id, user_id, action, purposes,
            notice_version, notice_locale, ui_surface, country, ip_trunc,
            source_app, prev_hash, row_hash, created_at
       FROM consent_events
      WHERE ($1::uuid   IS NOT NULL AND anon_id = $1::uuid)
         OR ($2::bigint IS NOT NULL AND user_id = $2::bigint)
      ORDER BY id ASC
      LIMIT $3`,
    [anonId, userId, Math.min(limit, 2000)]
  );
  return rows;
}

/** Build the WHERE clause shared by listEvents / overview. */
function buildFilter({ from, to, country, sourceApp, action, q }, params) {
  const where = [];
  if (from) { params.push(from); where.push(`ce.created_at >= $${params.length}`); }
  if (to) { params.push(to); where.push(`ce.created_at <= $${params.length}`); }
  if (country) { params.push(String(country).toUpperCase()); where.push(`ce.country = $${params.length}`); }
  if (sourceApp) { params.push(sourceApp); where.push(`ce.source_app = $${params.length}`); }
  if (action) { params.push(action); where.push(`ce.action = $${params.length}`); }
  if (q) {
    params.push(`%${q}%`);
    const i = params.length;
    where.push(`(ce.anon_id::text ILIKE $${i} OR ce.user_id::text ILIKE $${i} OR u.email ILIKE $${i})`);
  }
  return where.length ? `WHERE ${where.join(' AND ')}` : '';
}

async function listEvents(opts = {}) {
  const limit = Math.min(parseInt(opts.limit, 10) || 50, 500);
  const offset = parseInt(opts.offset, 10) || 0;

  const params = [];
  const filter = buildFilter(opts, params);

  const countParams = params.slice();
  const { rows: cnt } = await pool.query(
    `SELECT COUNT(*)::int AS n
       FROM consent_events ce
       LEFT JOIN users u ON u.id = ce.user_id
       ${filter}`,
    countParams
  );

  params.push(limit); const lim = `$${params.length}`;
  params.push(offset); const off = `$${params.length}`;
  const { rows } = await pool.query(
    `SELECT ce.id, ce.subject_type, ce.anon_id, ce.user_id, u.email AS user_email,
            ce.action, ce.purposes, ce.notice_version, ce.notice_locale, ce.ui_surface,
            ce.country, ce.ip_trunc, ce.source_app, ce.row_hash, ce.created_at
       FROM consent_events ce
       LEFT JOIN users u ON u.id = ce.user_id
       ${filter}
       ORDER BY ce.id DESC
       LIMIT ${lim} OFFSET ${off}`,
    params
  );

  return { rows, total: cnt[0].n, limit, offset };
}

async function overview(opts = {}) {
  const params = [];
  const filter = buildFilter(opts, params);
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int                                                          AS total_events,
       COUNT(DISTINCT COALESCE(ce.user_id::text, ce.anon_id::text))::int      AS unique_subjects,
       COUNT(*) FILTER (WHERE ce.action = 'grant')::int                       AS grants,
       COUNT(*) FILTER (WHERE ce.action = 'withdraw')::int                    AS withdrawals,
       COUNT(*) FILTER (WHERE ce.action = 'update')::int                      AS updates,
       COUNT(*) FILTER (WHERE ce.action = 'renew')::int                       AS renewals,
       COUNT(*) FILTER (WHERE (ce.purposes->>'analytics')::boolean)::int      AS analytics_on,
       COUNT(*) FILTER (WHERE (ce.purposes->>'marketing')::boolean)::int      AS marketing_on
     FROM consent_events ce
     LEFT JOIN users u ON u.id = ce.user_id
     ${filter}`,
    params
  );

  const trendParams = params.slice();
  const { rows: trend } = await pool.query(
    `SELECT date_trunc('day', ce.created_at)::date AS day,
            COUNT(*) FILTER (WHERE ce.action IN ('grant','renew'))::int AS grants,
            COUNT(*) FILTER (WHERE ce.action = 'withdraw')::int         AS withdrawals
       FROM consent_events ce
       LEFT JOIN users u ON u.id = ce.user_id
       ${filter}
       GROUP BY 1 ORDER BY 1 DESC LIMIT 90`,
    trendParams
  );

  const o = rows[0];
  const decided = o.grants + o.withdrawals;
  o.grant_rate = decided ? +(o.grants / decided).toFixed(4) : null;
  o.trend = trend;
  return o;
}

/**
 * Resolve the full identity cluster for a subject id. A signed-in event
 * carries both user_id and anon_id, so a visitor who consented anonymously
 * and later logged in — or used more than one device — is one subject
 * across several ids. Returns every user_id / anon_id transitively linked
 * through shared events.
 */
async function resolveIdentityCluster(rawId) {
  const isUser = /^\d+$/.test(String(rawId));
  const userIds = new Set(isUser ? [parseInt(rawId, 10)] : []);
  const anonIds = new Set(isUser ? [] : [String(rawId)]);

  for (let pass = 0; pass < 5; pass++) {
    const { rows } = await pool.query(
      `SELECT DISTINCT user_id, anon_id
         FROM consent_events
        WHERE user_id = ANY($1::bigint[])
           OR anon_id = ANY($2::uuid[])`,
      [[...userIds], [...anonIds]]
    );
    const before = userIds.size + anonIds.size;
    for (const r of rows) {
      if (r.user_id != null) userIds.add(Number(r.user_id));
      if (r.anon_id) anonIds.add(r.anon_id);
    }
    if (userIds.size + anonIds.size === before) break; // converged
  }
  return { userIds: [...userIds], anonIds: [...anonIds] };
}

async function getSubject(rawId) {
  const { userIds, anonIds } = await resolveIdentityCluster(rawId);
  if (!userIds.length && !anonIds.length) return null;

  const { rows: events } = await pool.query(
    `SELECT ce.id, ce.subject_type, ce.anon_id, ce.user_id, u.email AS user_email,
            ce.action, ce.purposes, ce.notice_version, ce.notice_locale,
            ce.ui_surface, ce.country, ce.ip_trunc, ce.source_app,
            ce.prev_hash, ce.row_hash, ce.created_at
       FROM consent_events ce
       LEFT JOIN users u ON u.id = ce.user_id
      WHERE ce.user_id = ANY($1::bigint[])
         OR ce.anon_id = ANY($2::uuid[])
      ORDER BY ce.id ASC
      LIMIT 2000`,
    [userIds, anonIds]
  );
  if (!events.length) return null;

  const latest = events[events.length - 1];
  const currentState = {
    purposes: latest.purposes,
    action: latest.action,
    noticeVersion: latest.notice_version,
    noticeLocale: latest.notice_locale,
    at: latest.created_at,
  };

  // Distinct identities in the cluster, for the modal header.
  const emails = [...new Set(events.map(e => e.user_email).filter(Boolean))];
  const anonList = [...new Set(events.map(e => e.anon_id).filter(Boolean))];

  const seen = [...new Set(events.map(e => `${e.notice_version}|${e.notice_locale}`))];
  const noticesSeen = [];
  for (const s of seen) {
    const [v, l] = s.split('|');
    const n = await getNotice(v, l);
    if (n) noticesSeen.push(n);
  }

  return {
    subject: { userIds, anonIds },
    identities: { emails, anonIds: anonList },
    currentState,
    events,
    noticesSeen,
  };
}

// ── notice registry ─────────────────────────────────────────
async function getNotice(version, locale = 'en') {
  const { rows } = await pool.query(
    `SELECT version, locale, title, body_html, categories,
            effective_from, effective_to, created_at
       FROM consent_notices
      WHERE version = $1 AND locale = $2`,
    [version, locale]
  );
  return rows[0] || null;
}

async function listNotices() {
  const { rows } = await pool.query(
    `SELECT n.version, n.locale, n.title, n.effective_from, n.effective_to, n.created_at,
            COALESCE(c.cnt, 0)::int AS consent_count
       FROM consent_notices n
       LEFT JOIN (
         SELECT notice_version, notice_locale, COUNT(*) AS cnt
           FROM consent_events
          GROUP BY notice_version, notice_locale
       ) c ON c.notice_version = n.version AND c.notice_locale = n.locale
      ORDER BY n.effective_from DESC, n.version DESC, n.locale`
  );
  return rows;
}

// ── integrity ───────────────────────────────────────────────
/** Recompute the whole chain. Returns {ok:true,checked,lastId} or {ok:false,brokenAt,reason}. */
async function verifyChain({ from = 0, batch = 5000 } = {}) {
  let cursor = from;
  let prevHash = '';
  let checked = 0;

  if (from > 0) {
    const p = await pool.query(
      'SELECT row_hash FROM consent_events WHERE id <= $1 ORDER BY id DESC LIMIT 1',
      [from]
    );
    prevHash = p.rows.length ? p.rows[0].row_hash : '';
  }

  for (;;) {
    const { rows } = await pool.query(
      `SELECT id, created_at, subject_type, anon_id, user_id, action, purposes,
              notice_version, notice_locale, ui_surface, source_app, prev_hash, row_hash
         FROM consent_events
        WHERE id > $1
        ORDER BY id ASC
        LIMIT $2`,
      [cursor, batch]
    );
    if (!rows.length) break;

    for (const row of rows) {
      if (row.prev_hash !== prevHash) {
        return { ok: false, brokenAt: Number(row.id), reason: 'prev_hash does not match the previous row', checked };
      }
      const expected = hashRow({
        id: row.id, createdAt: row.created_at, subjectType: row.subject_type,
        anonId: row.anon_id, userId: row.user_id, action: row.action, purposes: row.purposes,
        noticeVersion: row.notice_version, noticeLocale: row.notice_locale,
        uiSurface: row.ui_surface, sourceApp: row.source_app, prevHash: row.prev_hash,
      });
      if (expected !== row.row_hash) {
        return { ok: false, brokenAt: Number(row.id), reason: 'row_hash does not match recomputed hash (row altered)', checked };
      }
      prevHash = row.row_hash;
      cursor = Number(row.id);
      checked++;
    }
  }

  return { ok: true, checked, lastId: cursor, verifiedAt: new Date().toISOString() };
}

// ── data-principal requests (read-only for v1) ──────────────
async function listDsar({ status } = {}) {
  const params = [];
  let where = '';
  if (status) { params.push(status); where = 'WHERE status = $1'; }
  const { rows } = await pool.query(
    `SELECT id, subject_email, anon_id, user_id, kind, status, details,
            received_at, due_at, closed_at, handler_note
       FROM dsar_requests
       ${where}
      ORDER BY received_at DESC
      LIMIT 200`,
    params
  );
  return rows;
}

module.exports = {
  recordEvent,
  currentState,
  history,
  listEvents,
  overview,
  getSubject,
  getNotice,
  listNotices,
  verifyChain,
  listDsar,
  subjectKey,
  _hashRow: hashRow, // exported for tests
};
