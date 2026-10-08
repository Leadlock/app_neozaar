const pool = require("../config/database");
const { renderCombinedHtml } = require("../services/zohoCampaigns/campaignComposer");
const { renderStudioHtml } = require("../services/zohoCampaigns/studioCampaignComposer");
const { createDraftCampaign } = require("../services/zohoCampaigns/zohoCampaigns.service");
const { AVAILABLE_FIELDS } = require("../services/zohoCampaigns/campaignTemplate");
const uploadToSFTP = require("../utils/azureStorage");
const sendEmail = require("../utils/sendEmailAzure");
const { recommendTemplates } = require("../services/zohoCampaigns/templateRecommendation.service");

// Where the "For which list?" tracking email lands. Not templated — ops just wants a
// timestamped record that a given campaign was pushed and which list it was meant for.
const CAMPAIGN_PUSH_TRACKING_RECIPIENT = "tech-support@neozaar.com";

// Fire-and-forget tracking email sent right after a successful Zoho push. Deliberately
// carries only the campaign title, the moment of this push, the admin's "For which
// list?" answer, and who pushed it — never the rendered template. A send failure is
// logged and swallowed so it can never fail the push itself.
async function sendCampaignPushTrackingEmail({ campaign, whichList, pushedByName, pushedByEmail }) {
  const sentAt = new Date();
  const sentAtLabel = sentAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  const esc = (v) => String(v ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2 style="margin: 0 0 12px;">Campaign pushed to Zoho</h2>
      <table cellpadding="6" style="border-collapse: collapse;">
        <tr><td style="font-weight: bold;">Campaign</td><td>${esc(campaign.title)}</td></tr>
        <tr><td style="font-weight: bold;">Campaign ID</td><td>${esc(campaign.id)}</td></tr>
        <tr><td style="font-weight: bold;">For which list?</td><td>${esc(whichList)}</td></tr>
        <tr><td style="font-weight: bold;">Sending date</td><td>${esc(sentAtLabel)} IST</td></tr>
        <tr><td style="font-weight: bold;">Pushed by</td><td>${esc(pushedByName || "—")}${pushedByEmail ? ` &lt;${esc(pushedByEmail)}&gt;` : ""}</td></tr>
      </table>
      <p style="color: #999; font-size: 12px; margin-top: 18px;">Automated tracking notification — no reply needed.</p>
    </div>
  `;

  try {
    await sendEmail(
      CAMPAIGN_PUSH_TRACKING_RECIPIENT,
      `Campaign pushed to Zoho: ${campaign.title} — ${whichList}`,
      html,
      true
    );
  } catch (err) {
    console.error("sendCampaignPushTrackingEmail error:", err?.message || err);
  }
}

// Same fields the single-listing push endpoint reads (zohoCampaign.controller.js) —
// kept as its own copy here rather than shared, since each controller stays
// self-contained about exactly what it needs from `products`, matching how this
// codebase already treats per-controller raw queries elsewhere.
const LISTING_FIELDS = `
  p.id, p.name, p.short_description, p.long_description, p.key_features, p.cta_model, p.launch_url,
  p.action_type, p.brand_name, p.product_logo, p.screenshots, p.primary_use_cases, p.use_cases,
  pod.overview, pod.challenges_addressed
`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_RECIPIENTS = 25;

// Campaigns are managed by Super Admin, Manager (ROLE_MANAGER) and the
// dedicated Marketing role (scoped to Marketing + Catalog).
const CAMPAIGN_MANAGER_ROLES = ["SUPER_ADMIN", "ROLE_MANAGER", "MARKETING"];
function canManageCampaigns(req) {
  return CAMPAIGN_MANAGER_ROLES.includes(req.user?.role_type);
}

// Fetches the current row for every listing referenced in a campaign's blocks, in one
// query. Content is never snapshotted onto the block itself — always read live, same
// principle as the single-listing flow.
async function fetchRowsByListingId(blocks) {
  const listingIds = [...new Set((blocks || []).map((block) => block.listingId).filter(Boolean))];
  if (!listingIds.length) return {};

  const { rows } = await pool.query(
    `SELECT ${LISTING_FIELDS}
     FROM products p
     LEFT JOIN product_other_details pod ON pod.product_id = p.id
     WHERE p.id = ANY($1)`,
    [listingIds]
  );

  const rowsByListingId = {};
  rows.forEach((row) => { rowsByListingId[row.id] = row; });
  return rowsByListingId;
}

async function renderCampaign(campaign, rowsByListingId = {}) {
  if (campaign.campaign_type !== "studio") return renderCombinedHtml(campaign, rowsByListingId);
  if (!campaign.email_template_id) return renderStudioHtml(campaign);

  const { rows } = await pool.query(
    `SELECT v.html_content
     FROM marketing_email_templates t
     JOIN marketing_email_template_versions v ON v.template_id=t.id AND v.version=t.current_version
     WHERE t.id=$1`,
    [campaign.email_template_id]
  );
  return renderStudioHtml({ ...campaign, html_content: rows[0]?.html_content || "", content_blocks: [] });
}

async function validateStudioTemplate(campaignType, emailTemplateId) {
  if (campaignType !== "studio" || !emailTemplateId) return;
  const { rows } = await pool.query(
    `SELECT id FROM marketing_email_templates WHERE id=$1 AND status='published'`,
    [emailTemplateId]
  );
  if (!rows[0]) throw Object.assign(new Error("Select a published email template"), { statusCode: 409 });
}

// The composer's field-toggle checkboxes read this instead of hardcoding a duplicate
// list — strips the render() functions out of AVAILABLE_FIELDS, keeping only what the
// UI needs (key + label), so the checkboxes can never offer a field the renderer
// doesn't know how to draw.
const getAvailableFields = async (req, res) => {
  const metadata = {};
  Object.keys(AVAILABLE_FIELDS).forEach((actionType) => {
    metadata[actionType] = AVAILABLE_FIELDS[actionType].map(({ key, label }) => ({ key, label }));
  });
  res.json({ status: "success", data: metadata });
};

const getCampaigns = async (req, res) => {
  try {
    if (!canManageCampaigns(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied. Only Super Admin or Manager can view campaigns." });
    }
    const { rows } = await pool.query(
      `SELECT c.*, u.name AS created_by_name
       FROM campaigns c
       LEFT JOIN users u ON c.created_by = u.id
       ORDER BY c.updated_at DESC`
    );
    res.json({ status: "success", data: rows });
  } catch (error) {
    console.error("getCampaigns error:", error);
    res.status(500).json({ status: "fail", message: "Failed to fetch campaigns" });
  }
};

const getTemplateRecommendations = async (req, res) => {
  try {
    if (!canManageCampaigns(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied. Only Super Admin or Manager can get template recommendations." });
    }

    const clean = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
    const segmentId = Number(req.body?.segmentId) || null;
    const campaign = {
      name: clean(req.body?.title, 160),
      subject: clean(req.body?.subject, 255),
      preheader: clean(req.body?.preheader, 500),
    };

    const { rows: templates } = await pool.query(
      `SELECT t.id,t.name,t.category,v.subject,v.text_content
       FROM marketing_email_templates t
       JOIN marketing_email_template_versions v ON v.template_id=t.id AND v.version=t.current_version
       WHERE t.status='published'
       ORDER BY t.updated_at DESC
       LIMIT 50`
    );
    if (!templates.length) {
      return res.status(409).json({ status: "fail", message: "No published templates are available to recommend." });
    }

    let audience = null;
    if (segmentId) {
      const { rows } = await pool.query(
        `SELECT id,name,description,rules FROM marketing_segments WHERE id=$1`,
        [segmentId]
      );
      if (rows[0]) {
        audience = {
          name: clean(rows[0].name, 160),
          description: clean(rows[0].description, 500),
          rules: rows[0].rules,
        };
      }
    }

    const recommendations = await recommendTemplates({ campaign, audience, templates });
    if (!recommendations.length) {
      return res.status(502).json({ status: "fail", message: "AI could not confidently match a published template. Add more campaign details and try again." });
    }
    return res.json({ status: "success", data: recommendations });
  } catch (error) {
    console.error("getTemplateRecommendations error:", error);
    const configurationError = /OPENAI|AZURE_OPENAI|API key|placeholder/i.test(error?.message || "");
    return res.status(configurationError ? 503 : 500).json({
      status: "fail",
      message: configurationError
        ? "AI recommendations are not configured. Ask an administrator to configure the AI provider."
        : "AI template recommendations are temporarily unavailable.",
    });
  }
};

const getCampaignById = async (req, res) => {
  try {
    if (!canManageCampaigns(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied. Only Super Admin or Manager can view campaigns." });
    }
    const { rows } = await pool.query(`SELECT * FROM campaigns WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ status: "fail", message: "Campaign not found" });
    res.json({ status: "success", data: rows[0] });
  } catch (error) {
    console.error("getCampaignById error:", error);
    res.status(500).json({ status: "fail", message: "Failed to fetch campaign" });
  }
};

const createCampaign = async (req, res) => {
  try {
    if (!canManageCampaigns(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied. Only Super Admin or Manager can create campaigns." });
    }
    const { title, description, blocks, headerImage, headerLink, segmentId, emailTemplateId, automationId, scheduledAt, goalEvent, campaignType, subject, preheader, contentBlocks, htmlContent } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ status: "fail", message: "Title is required" });
    }
    await validateStudioTemplate(campaignType, emailTemplateId);
    // header_link only means anything when there's an image to click — drop it otherwise.
    const headerImageValue = typeof headerImage === "string" && headerImage.trim() ? headerImage.trim() : null;
    const headerLinkValue = headerImageValue && typeof headerLink === "string" && headerLink.trim() ? headerLink.trim() : null;
    const { rows } = await pool.query(
      `INSERT INTO campaigns (title, description, blocks, header_image, header_link, created_by,segment_id,email_template_id,automation_id,scheduled_at,goal_event,campaign_type,subject,preheader,content_blocks,html_content)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [title.trim(),description||null,JSON.stringify(blocks||[]),headerImageValue,headerLinkValue,req.user.id,segmentId||null,emailTemplateId||null,automationId||null,scheduledAt||null,goalEvent||null,campaignType==='studio'?'studio':'listing',subject||null,preheader||null,JSON.stringify(contentBlocks||[]),htmlContent||null]
    );
    res.json({ status: "success", data: rows[0] });
  } catch (error) {
    console.error("createCampaign error:", error);
    res.status(error.statusCode || 500).json({ status: "fail", message: error.statusCode ? error.message : "Failed to create campaign" });
  }
};

// Full replace of title/description/blocks — mirrors crm_quotes.updateQuote. Editing and
// re-saving a campaign that's already been pushed to Zoho is allowed; it just doesn't
// touch the existing Zoho draft (pushCampaign below is the only thing that does that).
const updateCampaign = async (req, res) => {
  try {
    if (!canManageCampaigns(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied. Only Super Admin or Manager can edit campaigns." });
    }
    const { title, description, blocks, headerImage, headerLink, segmentId, emailTemplateId, automationId, scheduledAt, goalEvent, campaignType, subject, preheader, contentBlocks, htmlContent } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ status: "fail", message: "Title is required" });
    }
    await validateStudioTemplate(campaignType, emailTemplateId);
    // header_link only means anything when there's an image to click — drop it otherwise.
    const headerImageValue = typeof headerImage === "string" && headerImage.trim() ? headerImage.trim() : null;
    const headerLinkValue = headerImageValue && typeof headerLink === "string" && headerLink.trim() ? headerLink.trim() : null;
    const { rows } = await pool.query(
      `UPDATE campaigns SET title=$1,description=$2,blocks=$3,header_image=$4,header_link=$5,segment_id=$6,email_template_id=$7,automation_id=$8,scheduled_at=$9,goal_event=$10,campaign_type=$11,subject=$12,preheader=$13,content_blocks=$14,html_content=$15,updated_at=now()
       WHERE id=$16 RETURNING *`,
      [title.trim(),description||null,JSON.stringify(blocks||[]),headerImageValue,headerLinkValue,segmentId||null,emailTemplateId||null,automationId||null,scheduledAt||null,goalEvent||null,campaignType==='studio'?'studio':'listing',subject||null,preheader||null,JSON.stringify(contentBlocks||[]),htmlContent||null,req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ status: "fail", message: "Campaign not found" });
    res.json({ status: "success", data: rows[0] });
  } catch (error) {
    console.error("updateCampaign error:", error);
    res.status(error.statusCode || 500).json({ status: "fail", message: error.statusCode ? error.message : "Failed to update campaign" });
  }
};

// Removes only our own record — never reaches back into Zoho to delete an
// already-pushed draft. Once something's in Zoho, Zoho's own dashboard manages it.
const deleteCampaign = async (req, res) => {
  try {
    if (!canManageCampaigns(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied. Only Super Admin or Manager can delete campaigns." });
    }
    await pool.query(`DELETE FROM campaigns WHERE id = $1`, [req.params.id]);
    res.json({ status: "success", message: "Campaign deleted" });
  } catch (error) {
    console.error("deleteCampaign error:", error);
    res.status(500).json({ status: "fail", message: "Failed to delete campaign" });
  }
};

// Authenticated — renders the combined HTML for the composer's own preview pane.
// Same renderer the public content route and the push action both use, so what the
// admin previews is exactly what Zoho will fetch.
const getCampaignPreview = async (req, res) => {
  try {
    if (!canManageCampaigns(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied. Only Super Admin or Manager can preview campaigns." });
    }
    const { rows } = await pool.query(`SELECT * FROM campaigns WHERE id = $1`, [req.params.id]);
    const campaign = rows[0];
    if (!campaign) return res.status(404).json({ status: "fail", message: "Campaign not found" });

    const rowsByListingId = await fetchRowsByListingId(campaign.blocks);
    const html = await renderCampaign(campaign, rowsByListingId);
    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (error) {
    console.error("getCampaignPreview error:", error);
    res.status(500).json({ status: "fail", message: "Failed to render preview" });
  }
};

// Public — no auth. This is what Zoho's servers fetch via content_url once a campaign
// has been pushed. Same reasoning as the single-listing zoho-campaign-content route:
// this is the same marketing copy already public on each listing's own page, nothing
// sensitive is exposed by making the assembled HTML fetchable.
const getCampaignContent = async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM campaigns WHERE id = $1`, [req.params.id]);
    const campaign = rows[0];
    if (!campaign) return res.status(404).send("Not found");

    const rowsByListingId = await fetchRowsByListingId(campaign.blocks);
    const html = await renderCampaign(campaign, rowsByListingId);
    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (error) {
    console.error("getCampaignContent error:", error);
    res.status(500).send("Internal server error");
  }
};

// Pushes to Zoho as an unsent draft — never sends. Same force/duplicate-guard shape as
// the single-listing pushToZoho. campaignName/subject are asked for explicitly here
// (rather than auto-derived, like the single-listing flow does from one row's name)
// since there's no single listing to derive them from once it's a combined campaign.
const pushCampaign = async (req, res) => {
  try {
    if (!canManageCampaigns(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied. Only Super Admin or Manager can push campaigns to Zoho." });
    }

    const { rows } = await pool.query(`SELECT * FROM campaigns WHERE id = $1`, [req.params.id]);
    const campaign = rows[0];
    if (!campaign) return res.status(404).json({ status: "fail", message: "Campaign not found" });

    const force = req.body?.force === true;
    if (campaign.zoho_campaign_key && !force) {
      return res.status(200).json({
        status: "success",
        message: "Already pushed to Zoho.",
        data: {
          campaignKey: campaign.zoho_campaign_key,
          pushedAt: campaign.zoho_campaign_pushed_at,
          alreadyPushed: true,
        },
      });
    }

    const { campaignName, subject, whichList } = req.body || {};
    if (!campaignName || !campaignName.trim() || !subject || !subject.trim()) {
      return res.status(400).json({ status: "fail", message: "campaignName and subject are required to push" });
    }
    if (!whichList || !whichList.trim()) {
      return res.status(400).json({ status: "fail", message: "whichList (\"For which list?\") is required to push" });
    }
    const whichListValue = whichList.trim();

    const contentUrl = `${process.env.BACKEND_URL}campaigns/${campaign.id}/content`;

    // Composer pushes go to the Zoho "Test List" (ZOHO_CAMPAIGNS_TEST_LIST_KEY), not the
    // Subscribers List (ZOHO_CAMPAIGNS_LIST_KEY) — the draft is unsent anyway, and the
    // recipient list is finalised by hand inside Zoho before any send. Falls back to the
    // Subscribers List if the test-list key isn't configured.
    const listKey = process.env.ZOHO_CAMPAIGNS_TEST_LIST_KEY || process.env.ZOHO_CAMPAIGNS_LIST_KEY;

    const zohoResponse = await createDraftCampaign({
      campaignName: campaignName.trim(),
      subject: subject.trim(),
      fromEmail: process.env.ZOHO_CAMPAIGNS_FROM_EMAIL,
      listKey,
      contentUrl,
    });

    if (!zohoResponse.campaignKey) {
      console.error("Zoho createCampaign did not return a campaignKey:", zohoResponse);
      return res.status(502).json({ status: "fail", message: "Zoho did not return a campaign key", data: zohoResponse });
    }

    await pool.query(
      `UPDATE campaigns SET status = 'pushed', zoho_campaign_key = $1, zoho_campaign_pushed_at = now(), zoho_list_label = $2 WHERE id = $3`,
      [zohoResponse.campaignKey, whichListValue, campaign.id]
    );

    // Tracking notification — non-blocking, never fails the push (see helper).
    await sendCampaignPushTrackingEmail({
      campaign,
      whichList: whichListValue,
      pushedByName: req.user?.name,
      pushedByEmail: req.user?.email,
    });

    return res.status(200).json({
      status: "success",
      message: "Pushed to Zoho Campaigns as a draft.",
      data: { campaignKey: zohoResponse.campaignKey, alreadyPushed: false, whichList: whichListValue },
    });
  } catch (error) {
    console.error("pushCampaign error:", error.response?.data || error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

// Renders the campaign and sends it straight to one or more addresses with a caller-
// supplied subject — a lightweight "test send" / internal share that bypasses Zoho
// entirely. Each recipient gets their own copy (no address leakage). Operates on the
// saved campaign row, same as preview/push — unsaved composer edits aren't included.
const sendCampaignEmail = async (req, res) => {
  try {
    if (!canManageCampaigns(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied. Only Super Admin or Manager can send campaigns." });
    }

    const { rows } = await pool.query(`SELECT * FROM campaigns WHERE id = $1`, [req.params.id]);
    const campaign = rows[0];
    if (!campaign) return res.status(404).json({ status: "fail", message: "Campaign not found" });

    const subject = typeof req.body?.subject === "string" ? req.body.subject.trim() : "";
    if (!subject) {
      return res.status(400).json({ status: "fail", message: "Subject is required" });
    }

    // recipients: an array, or a string split on comma / semicolon / whitespace / newlines
    const raw = req.body?.recipients;
    const candidates = Array.isArray(raw) ? raw : String(raw || "").split(/[\s,;]+/);
    const recipients = [...new Set(candidates.map((s) => String(s).trim().toLowerCase()).filter(Boolean))];
    if (!recipients.length) {
      return res.status(400).json({ status: "fail", message: "At least one recipient email is required" });
    }
    const invalid = recipients.filter((e) => !EMAIL_RE.test(e));
    if (invalid.length) {
      return res.status(400).json({ status: "fail", message: `Invalid email address(es): ${invalid.join(", ")}` });
    }
    if (recipients.length > MAX_EMAIL_RECIPIENTS) {
      return res.status(400).json({ status: "fail", message: `Too many recipients — max ${MAX_EMAIL_RECIPIENTS} per send` });
    }

    const rowsByListingId = await fetchRowsByListingId(campaign.blocks);
    const html = await renderCampaign(campaign, rowsByListingId);

    // Optional dedicated sender for campaign "Send as Email" — must be a real mailbox in
    // the M365 tenant the app can send as. Falls back to the default no_reply@ sender.
    const fromAddress = process.env.CAMPAIGN_SEND_FROM_EMAIL || undefined;
    const fromName = process.env.CAMPAIGN_SEND_FROM_NAME || "NeoZaar";
    const result = await sendEmail.toMany(recipients, subject, html, true, fromAddress, fromName);

    if (!result.sent.length) {
      return res.status(502).json({ status: "fail", message: "Failed to send to any recipient", data: result });
    }
    return res.status(200).json({
      status: "success",
      message: `Sent to ${result.sent.length} recipient${result.sent.length === 1 ? "" : "s"}` +
        (result.failed.length ? `; ${result.failed.length} failed` : "") + ".",
      data: { sent: result.sent, failed: result.failed.map((f) => f.email) },
    });
  } catch (error) {
    console.error("sendCampaignEmail error:", error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

// Uploads one block image straight to blob storage and hands back its URL — the composer
// sets a block's `image` to this immediately (not on campaign save), same "upload now, get
// a URL back" shape catalog.controller.js's own image uploads use, via the same
// uploadToSFTP util so these images live in the same blob container as every other
// listing asset.
const uploadImage = async (req, res) => {
  try {
    if (!canManageCampaigns(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied. Only Super Admin or Manager can upload campaign images." });
    }
    if (!req.file) {
      return res.status(400).json({ status: "fail", message: "No image file provided" });
    }
    const url = await uploadToSFTP(req.file);
    res.json({ status: "success", data: { url } });
  } catch (error) {
    console.error("uploadImage error:", error);
    res.status(500).json({ status: "fail", message: "Failed to upload image" });
  }
};

module.exports = {
  getAvailableFields,
  getTemplateRecommendations,
  uploadImage,
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignPreview,
  getCampaignContent,
  pushCampaign,
  sendCampaignEmail,
};
