const pool = require("../config/database");
const { renderSubject, renderCampaignHtml } = require("../services/zohoCampaigns/campaignTemplate");
const { createDraftCampaign } = require("../services/zohoCampaigns/zohoCampaigns.service");
const sendEmail = require("../utils/sendEmailAzure");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_RECIPIENTS = 25;

const CAMPAIGN_FIELDS = `
  p.id, p.name, p.short_description, p.long_description, p.key_features, p.cta_model, p.launch_url,
  p.action_type, p.zoho_campaign_key, p.zoho_campaign_pushed_at, p.is_publish, p.is_approved, p.brand_name,
  p.product_logo, p.screenshots, p.primary_use_cases, p.use_cases,
  pod.overview, pod.challenges_addressed
`;

// overview/challenges_addressed (services only, per the current template) live in
// product_other_details, not the products row itself — LEFT JOIN so products/solutions
// without a row there still come back fine, just with those two fields null.
async function getRowOrNull(id) {
  const result = await pool.query(
    `SELECT ${CAMPAIGN_FIELDS}
     FROM products p
     LEFT JOIN product_other_details pod ON pod.product_id = p.id
     WHERE p.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

// Public — no auth. Zoho's servers fetch this URL directly (via content_url) to get the
// campaign body, so it can't sit behind verifyToken. Content here is the same marketing
// copy already public on the listing's own page, so nothing sensitive is exposed.
const getCampaignContent = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await getRowOrNull(id);

    if (!row) {
      return res.status(404).send("Not found");
    }

    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(renderCampaignHtml(row));
  } catch (error) {
    console.error("Error in getCampaignContent:", error);
    return res.status(500).send("Internal server error");
  }
};

// Admin action — pushes a listing to Zoho Campaigns as an unsent draft. Never sends;
// review, list selection, and the actual send all happen manually, inside Zoho.
const pushToZoho = async (req, res) => {
  try {
    if (!["SUPER_ADMIN", "ROLE_MANAGER", "MARKETING"].includes(req.user.role_type)) {
      return res.status(403).json({
        status: "fail",
        message: "Access denied. Only Super Admin or Manager can push listings to Zoho Campaigns.",
      });
    }

    const { id } = req.params;
    const row = await getRowOrNull(id);

    if (!row) {
      return res.status(404).json({ status: "fail", message: "Product not found" });
    }

    if (!row.is_publish || !row.is_approved) {
      return res.status(400).json({
        status: "fail",
        message: "Only published listings can be pushed to Zoho Campaigns.",
      });
    }

    const force = req.body?.force === true;

    // Default (no force): protects against an accidental double-click creating a
    // duplicate draft. The admin can explicitly re-push (force: true) if the original
    // draft was deleted directly in Zoho or they just want a fresh one — the frontend
    // gates this behind its own confirm dialog before ever sending force.
    if (row.zoho_campaign_key && !force) {
      return res.status(200).json({
        status: "success",
        message: "Already pushed to Zoho.",
        data: {
          campaignKey: row.zoho_campaign_key,
          pushedAt: row.zoho_campaign_pushed_at,
          alreadyPushed: true,
        },
      });
    }

    const contentUrl = `${process.env.BACKEND_URL}catalog/${row.id}/zoho-campaign-content`;

    const zohoResponse = await createDraftCampaign({
      campaignName: `Neozaar ${row.name}`,
      subject: renderSubject(row),
      fromEmail: process.env.ZOHO_CAMPAIGNS_FROM_EMAIL,
      listKey: process.env.ZOHO_CAMPAIGNS_LIST_KEY,
      contentUrl,
    });

    if (!zohoResponse.campaignKey) {
      console.error("Zoho createCampaign did not return a campaignKey:", zohoResponse);
      return res.status(502).json({
        status: "fail",
        message: "Zoho did not return a campaign key",
        data: zohoResponse,
      });
    }

    await pool.query(
      `UPDATE products SET zoho_campaign_key = $1, zoho_campaign_pushed_at = now() WHERE id = $2`,
      [zohoResponse.campaignKey, row.id]
    );

    return res.status(200).json({
      status: "success",
      message: "Pushed to Zoho Campaigns as a draft.",
      data: { campaignKey: zohoResponse.campaignKey, alreadyPushed: false },
    });
  } catch (error) {
    console.error("Error in pushToZoho:", error.response?.data || error);
    return res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

// Admin action — renders a single listing and emails it straight to one or more
// addresses with a caller-supplied subject, bypassing Zoho entirely. Same render path
// as pushToZoho / the public content route; each recipient gets their own copy.
const sendListingEmail = async (req, res) => {
  try {
    if (!["SUPER_ADMIN", "ROLE_MANAGER", "MARKETING"].includes(req.user.role_type)) {
      return res.status(403).json({
        status: "fail",
        message: "Access denied. Only Super Admin or Manager can send listings by email.",
      });
    }

    const { id } = req.params;
    const row = await getRowOrNull(id);
    if (!row) {
      return res.status(404).json({ status: "fail", message: "Product not found" });
    }
    if (!row.is_publish || !row.is_approved) {
      return res.status(400).json({
        status: "fail",
        message: "Only published listings can be emailed.",
      });
    }

    const subject = typeof req.body?.subject === "string" ? req.body.subject.trim() : "";
    if (!subject) {
      return res.status(400).json({ status: "fail", message: "Subject is required" });
    }

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

    const html = renderCampaignHtml(row);
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
    console.error("Error in sendListingEmail:", error.response?.data || error);
    return res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

module.exports = { getCampaignContent, pushToZoho, sendListingEmail };
