const crypto = require("crypto");
const pool = require("../config/database");
const { renderCampaignHtml, frontendBase } = require("../services/zohoCampaigns/campaignTemplate");
const { renderCombinedHtml } = require("../services/zohoCampaigns/campaignComposer");
const { composeSlug, uniqueSlug } = require("../utils/urlSlug");
const { rewriteLinksForTracking } = require("../utils/publicLinkRewrite");

// Public shareable links — admin CRUD + analytics, and the two public endpoints
// Next.js calls (`/by-slug/:slug/render`, `/by-slug/:slug/click`).
// See PUBLIC-LINKS-PLAN.md.

const MANAGER_ROLES = ["SUPER_ADMIN", "ROLE_MANAGER"];
const canManage = (req) => MANAGER_ROLES.includes(req.user?.role_type);

const VIEW_DEDUP_MINUTES = 30;
const BOT_UA_RE =
  /bot|crawler|spider|slackbot|whatsapp|facebookexternalhit|linkedinbot|twitterbot|telegrambot|discordbot|bingbot|googlebot|embedly|quora link preview|pinterest|redditbot|applebot|vkshare|w3c_validator/i;

// Only ever store a salted daily hash of the visitor IP, never the IP itself. The
// per-day date component means a hash can't be correlated across days, and makes
// "unique views" naturally per-day. Falls back to a constant if the env salt is
// unset so a missing var degrades rather than crashes.
const IP_SALT = process.env.PUBLIC_LINK_IP_SALT || "neozaar-public-link-fallback-salt";
function hashIp(ip) {
  if (!ip) return null;
  const day = new Date().toISOString().slice(0, 10);
  return crypto.createHash("sha256").update(`${ip}:${day}:${IP_SALT}`).digest("hex");
}

function getVisitor(req) {
  const ip =
    (req.get("x-visitor-ip") || "").trim() ||
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.ip ||
    "";
  const ua = (req.get("x-visitor-ua") || req.get("user-agent") || "").slice(0, 512);
  const referrer = (req.get("x-visitor-referer") || req.get("referer") || "").slice(0, 512) || null;
  return { ip, ua, referrer, ipHash: hashIp(ip), isBot: BOT_UA_RE.test(ua) };
}

const publicUrlFor = (slug) => `${frontendBase()}p/${slug}`;

// ── target loading ───────────────────────────────────────────────────────────
// Field lists kept local (not shared with zohoCampaign/campaigns controllers) —
// same self-contained-per-controller convention the rest of this codebase uses.

const LISTING_FIELDS = `
  p.id, p.name, p.short_description, p.long_description, p.key_features, p.cta_model, p.launch_url,
  p.action_type, p.brand_name, p.product_logo, p.screenshots, p.primary_use_cases, p.use_cases,
  p.is_publish, p.is_approved,
  pod.overview, pod.challenges_addressed
`;

async function loadListingRow(id) {
  const { rows } = await pool.query(
    `SELECT ${LISTING_FIELDS}
       FROM products p
       LEFT JOIN product_other_details pod ON pod.product_id = p.id
      WHERE p.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function loadCampaign(id) {
  const { rows } = await pool.query(`SELECT * FROM campaigns WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function fetchRowsByListingId(blocks) {
  const ids = [...new Set((blocks || []).map((b) => b.listingId).filter(Boolean))];
  if (!ids.length) return {};
  const { rows } = await pool.query(
    `SELECT ${LISTING_FIELDS}
       FROM products p
       LEFT JOIN product_other_details pod ON pod.product_id = p.id
      WHERE p.id = ANY($1)`,
    [ids]
  );
  const map = {};
  rows.forEach((r) => { map[r.id] = r; });
  return map;
}

// Resolve a link's target to { title, description, image, html } — or null when the
// target no longer qualifies (deleted, unpublished), which the caller treats as an
// inactive link.
async function renderTarget(link) {
  if (link.target_type === "listing") {
    const row = await loadListingRow(link.target_id);
    if (!row || !row.is_publish || !row.is_approved) return null;
    return {
      title: row.name || "Neozaar",
      description: row.short_description || "",
      image: Array.isArray(row.screenshots) ? row.screenshots.find(Boolean) || "" : "",
      html: renderCampaignHtml(row),
    };
  }
  // campaign
  const campaign = await loadCampaign(link.target_id);
  if (!campaign) return null;
  const rowsByListingId = await fetchRowsByListingId(campaign.blocks);
  const firstBlockImg = (campaign.blocks || []).map((b) => b.image).find(Boolean) || "";
  return {
    title: campaign.title || "Neozaar",
    description: campaign.description || "",
    image: campaign.header_image || firstBlockImg || "",
    html: renderCombinedHtml(campaign, rowsByListingId),
  };
}

// ── link state ───────────────────────────────────────────────────────────────

function isLive(link) {
  if (!link || !link.is_active) return false;
  if (link.expires_at && new Date(link.expires_at).getTime() <= Date.now()) return false;
  return true;
}

async function logEvent({ linkId, eventType, visitor, meta }) {
  try {
    await pool.query(
      `INSERT INTO public_link_events (link_id, event_type, ip_hash, user_agent, referrer, is_bot, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [linkId, eventType, visitor.ipHash, visitor.ua || null, visitor.referrer, visitor.isBot, meta || {}]
    );
  } catch (err) {
    console.error("publicLinks.logEvent error:", err.message);
  }
}

// ── admin CRUD ───────────────────────────────────────────────────────────────

const listLinks = async (req, res) => {
  try {
    if (!canManage(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied." });
    }
    const targetType = String(req.query.targetType || "");
    const targetId = Number(req.query.targetId);
    if (!["listing", "campaign"].includes(targetType) || !Number.isFinite(targetId)) {
      return res.status(400).json({ status: "fail", message: "targetType and targetId are required" });
    }

    const { rows } = await pool.query(
      `SELECT l.*,
              COALESCE(v.views, 0)  AS views,
              COALESCE(c.cta_clicks, 0) AS cta_clicks
         FROM public_links l
         LEFT JOIN (
           SELECT link_id, COUNT(*) AS views
             FROM public_link_events
            WHERE event_type = 'view' AND is_bot = false
            GROUP BY link_id
         ) v ON v.link_id = l.id
         LEFT JOIN (
           SELECT link_id, COUNT(*) AS cta_clicks
             FROM public_link_events
            WHERE event_type IN ('cta_click','block_click') AND is_bot = false
            GROUP BY link_id
         ) c ON c.link_id = l.id
        WHERE l.target_type = $1 AND l.target_id = $2
        ORDER BY l.created_at DESC`,
      [targetType, targetId]
    );

    const data = rows.map((l) => {
      const views = Number(l.views) || 0;
      const ctaClicks = Number(l.cta_clicks) || 0;
      return {
        ...l,
        views,
        cta_clicks: ctaClicks,
        url: publicUrlFor(l.slug),
        live: isLive(l),
        ctr: views > 0 ? ctaClicks / views : 0,
      };
    });
    res.json({ status: "success", data });
  } catch (err) {
    console.error("listLinks error:", err);
    res.status(500).json({ status: "fail", message: "Failed to load links" });
  }
};

const createLink = async (req, res) => {
  try {
    if (!canManage(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied." });
    }
    const { targetType, targetId, label, slug, unlisted, expiresAt } = req.body || {};
    if (!["listing", "campaign"].includes(targetType) || !Number.isFinite(Number(targetId))) {
      return res.status(400).json({ status: "fail", message: "targetType and targetId are required" });
    }

    // Confirm the target exists (and, for listings, is publishable) before minting a link.
    let targetTitle = "";
    if (targetType === "listing") {
      const row = await loadListingRow(Number(targetId));
      if (!row) return res.status(404).json({ status: "fail", message: "Listing not found" });
      if (!row.is_publish || !row.is_approved) {
        return res.status(400).json({ status: "fail", message: "Only published listings can have a public link." });
      }
      targetTitle = row.name || "";
    } else {
      const campaign = await loadCampaign(Number(targetId));
      if (!campaign) return res.status(404).json({ status: "fail", message: "Campaign not found" });
      targetTitle = campaign.title || "";
    }

    const desired = (typeof slug === "string" && slug.trim())
      ? slug.trim()
      : composeSlug({ title: targetTitle, label, unlisted: !!unlisted });
    const finalSlug = await uniqueSlug(desired, async (s) => {
      const { rowCount } = await pool.query(`SELECT 1 FROM public_links WHERE slug = $1`, [s]);
      return rowCount > 0;
    });

    let expiresAtValue = null;
    if (expiresAt) {
      const d = new Date(expiresAt);
      if (isNaN(d.getTime())) return res.status(400).json({ status: "fail", message: "Invalid expiresAt" });
      expiresAtValue = d.toISOString();
    }

    const { rows } = await pool.query(
      `INSERT INTO public_links (slug, target_type, target_id, label, unlisted, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        finalSlug,
        targetType,
        Number(targetId),
        (typeof label === "string" && label.trim()) ? label.trim() : null,
        !!unlisted,
        expiresAtValue,
        req.user.id,
      ]
    );
    const link = rows[0];
    res.json({ status: "success", data: { ...link, url: publicUrlFor(link.slug), live: isLive(link) } });
  } catch (err) {
    console.error("createLink error:", err);
    res.status(500).json({ status: "fail", message: "Failed to create link" });
  }
};

const updateLink = async (req, res) => {
  try {
    if (!canManage(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied." });
    }
    const { rows: existing } = await pool.query(`SELECT * FROM public_links WHERE id = $1`, [req.params.id]);
    const current = existing[0];
    if (!current) return res.status(404).json({ status: "fail", message: "Link not found" });

    const sets = [];
    const vals = [];
    let i = 1;

    if (typeof req.body?.isActive === "boolean") {
      sets.push(`is_active = $${i++}`);
      vals.push(req.body.isActive);
      sets.push(`deactivated_at = $${i++}`);
      vals.push(req.body.isActive ? null : new Date().toISOString());
    }
    if (req.body?.label !== undefined) {
      sets.push(`label = $${i++}`);
      vals.push((typeof req.body.label === "string" && req.body.label.trim()) ? req.body.label.trim() : null);
    }
    if (req.body?.expiresAt !== undefined) {
      let v = null;
      if (req.body.expiresAt) {
        const d = new Date(req.body.expiresAt);
        if (isNaN(d.getTime())) return res.status(400).json({ status: "fail", message: "Invalid expiresAt" });
        v = d.toISOString();
      }
      sets.push(`expires_at = $${i++}`);
      vals.push(v);
    }
    if (!sets.length) {
      return res.status(400).json({ status: "fail", message: "Nothing to update" });
    }

    sets.push(`updated_at = now()`);
    vals.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE public_links SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      vals
    );
    const link = rows[0];
    res.json({ status: "success", data: { ...link, url: publicUrlFor(link.slug), live: isLive(link) } });
  } catch (err) {
    console.error("updateLink error:", err);
    res.status(500).json({ status: "fail", message: "Failed to update link" });
  }
};

const deleteLink = async (req, res) => {
  try {
    if (!canManage(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied." });
    }
    await pool.query(`DELETE FROM public_links WHERE id = $1`, [req.params.id]);
    res.json({ status: "success", message: "Link deleted" });
  } catch (err) {
    console.error("deleteLink error:", err);
    res.status(500).json({ status: "fail", message: "Failed to delete link" });
  }
};

// Baseline analytics for one link. `range` is like "30d" / "7d" / "90d" (default 30,
// max 365). All counts exclude bot/unfurler hits. `by_day` is zero-filled across the
// whole range so the sparkline has no gaps. `by_block` is campaign-only (populated
// from block_click events tagged with the block's listing id).
const RANGE_RE = /^(\d{1,3})d$/;

const getAnalytics = async (req, res) => {
  try {
    if (!canManage(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied." });
    }
    const { rows: linkRows } = await pool.query(`SELECT * FROM public_links WHERE id = $1`, [req.params.id]);
    const link = linkRows[0];
    if (!link) return res.status(404).json({ status: "fail", message: "Link not found" });

    const m = RANGE_RE.exec(String(req.query.range || "30d"));
    const days = Math.min(Math.max(m ? parseInt(m[1], 10) : 30, 1), 365);

    const [totals, byDay, byBlock] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE event_type = 'view')                                AS views,
           COUNT(DISTINCT ip_hash) FILTER (WHERE event_type = 'view')                 AS unique_views,
           COUNT(*) FILTER (WHERE event_type IN ('cta_click','block_click'))          AS cta_clicks
         FROM public_link_events
         WHERE link_id = $1 AND is_bot = false`,
        [link.id]
      ),
      pool.query(
        `SELECT date_trunc('day', occurred_at)::date AS d, COUNT(*)::int AS views
           FROM public_link_events
          WHERE link_id = $1 AND is_bot = false AND event_type = 'view'
            AND occurred_at >= (now() - ($2 || ' days')::interval)
          GROUP BY d ORDER BY d`,
        [link.id, days]
      ),
      link.target_type === "campaign"
        ? pool.query(
            `SELECT (e.meta->>'blockListingId') AS listing_id, COUNT(*)::int AS clicks, p.name
               FROM public_link_events e
               LEFT JOIN products p ON p.id = NULLIF(e.meta->>'blockListingId','')::bigint
              WHERE e.link_id = $1 AND e.is_bot = false AND e.event_type = 'block_click'
              GROUP BY e.meta->>'blockListingId', p.name
              ORDER BY clicks DESC`,
            [link.id]
          )
        : Promise.resolve({ rows: [] }),
    ]);

    const views = Number(totals.rows[0].views) || 0;
    const ctaClicks = Number(totals.rows[0].cta_clicks) || 0;

    // zero-fill the day series
    const seen = new Map(byDay.rows.map((r) => [new Date(r.d).toISOString().slice(0, 10), r.views]));
    const series = [];
    for (let k = days - 1; k >= 0; k--) {
      const d = new Date(Date.now() - k * 86400000).toISOString().slice(0, 10);
      series.push({ date: d, views: seen.get(d) || 0 });
    }

    res.json({
      status: "success",
      data: {
        link: {
          id: link.id,
          slug: link.slug,
          label: link.label,
          url: publicUrlFor(link.slug),
          live: isLive(link),
          is_active: link.is_active,
          expires_at: link.expires_at,
          created_at: link.created_at,
        },
        range_days: days,
        totals: {
          views,
          unique_views: Number(totals.rows[0].unique_views) || 0,
          cta_clicks: ctaClicks,
          ctr: views > 0 ? ctaClicks / views : 0,
        },
        by_day: series,
        by_block: byBlock.rows.map((r) => ({
          listingId: r.listing_id ? Number(r.listing_id) : null,
          name: r.name || null,
          clicks: Number(r.clicks) || 0,
        })),
      },
    });
  } catch (err) {
    console.error("getAnalytics error:", err);
    res.status(500).json({ status: "fail", message: "Failed to load analytics" });
  }
};

// ── public endpoints (no auth — called by the Next.js /p/<slug> route) ────────

const renderBySlug = async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM public_links WHERE slug = $1`, [req.params.slug]);
    const link = rows[0];
    if (!link || !isLive(link)) {
      return res.status(200).json({ status: "inactive" });
    }

    const rendered = await renderTarget(link);
    if (!rendered) {
      return res.status(200).json({ status: "inactive" });
    }

    // Log a view, deduped per (link, visitor) within a short window so a refresh /
    // Next prefetch doesn't double-count. Bots are logged but flagged.
    const visitor = getVisitor(req);
    const recent = visitor.ipHash
      ? await pool.query(
          `SELECT 1 FROM public_link_events
            WHERE link_id = $1 AND event_type = 'view' AND ip_hash = $2
              AND occurred_at > now() - ($3 || ' minutes')::interval
            LIMIT 1`,
          [link.id, visitor.ipHash, VIEW_DEDUP_MINUTES]
        )
      : { rowCount: 0 };
    if (!recent.rowCount) {
      await logEvent({ linkId: link.id, eventType: "view", visitor });
    }

    res.json({
      status: "ok",
      targetType: link.target_type,
      title: rendered.title,
      description: rendered.description,
      image: rendered.image,
      html: rewriteLinksForTracking(rendered.html, link.slug),
    });
  } catch (err) {
    console.error("renderBySlug error:", err);
    res.status(500).json({ status: "fail", message: "Failed to render link" });
  }
};

// Open-redirect guard for the decoded `u`. Allowed: a same-site relative path, any
// neozaar.com URL, or a URL whose host is in `extraHosts` — the set of external
// launch_url hosts belonging to this link's own target(s), so a listing/CTA that
// legitimately points off-site still works while hand-crafted `?u=` values don't.
function safeDestination(raw, extraHosts) {
  if (typeof raw !== "string" || !raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")) return raw;
  try {
    const u = new URL(raw);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    const host = u.hostname.toLowerCase();
    if (
      host === "neozaar.com" ||
      host.endsWith(".neozaar.com") ||
      host === "localhost" ||
      (extraHosts && extraHosts.has(host))
    ) {
      return u.toString();
    }
  } catch (_) {
    /* not a URL */
  }
  return null;
}

// Hostnames of every launch_url attached to a link's target (the listing itself,
// or each listing referenced by a campaign's blocks).
async function allowedExternalHosts(link) {
  const hosts = new Set();
  const add = (v) => {
    if (typeof v !== "string" || !v.trim()) return;
    try { hosts.add(new URL(v.trim()).hostname.toLowerCase()); } catch (_) { /* skip */ }
  };
  if (link.target_type === "listing") {
    const row = await loadListingRow(link.target_id);
    add(row && row.launch_url);
  } else {
    const campaign = await loadCampaign(link.target_id);
    const map = campaign ? await fetchRowsByListingId(campaign.blocks) : {};
    Object.values(map).forEach((r) => add(r.launch_url));
  }
  return hosts;
}

const clickBySlug = async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM public_links WHERE slug = $1`, [req.params.slug]);
    const link = rows[0];
    if (!link || !isLive(link)) {
      return res.status(404).json({ status: "fail", message: "Link not available" });
    }

    let decoded = "";
    try {
      // rewriteLinksForTracking encodes with base64url; Node's base64url decoder
      // also accepts plain base64, so this covers both.
      decoded = Buffer.from(String(req.query.u || ""), "base64url").toString("utf8");
    } catch (_) {
      decoded = "";
    }
    const extraHosts = await allowedExternalHosts(link);
    const dest = safeDestination(decoded, extraHosts) || frontendBase();

    const eventType = req.query.e === "block" ? "block_click" : "cta_click";
    const visitor = getVisitor(req);
    const meta = {};
    if (decoded) meta.target = decoded;
    if (req.query.b) meta.blockListingId = Number(req.query.b) || req.query.b;
    await logEvent({ linkId: link.id, eventType, visitor, meta });

    res.json({ status: "ok", url: dest });
  } catch (err) {
    console.error("clickBySlug error:", err);
    res.status(500).json({ status: "fail", message: "Failed to record click" });
  }
};

module.exports = {
  listLinks,
  createLink,
  updateLink,
  deleteLink,
  getAnalytics,
  renderBySlug,
  clickBySlug,
  // exported for tests / reuse
  _internals: { isLive, safeDestination, hashIp, renderTarget },
};
