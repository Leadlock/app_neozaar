// Zoho Campaigns integration: OAuth token exchange + creating a draft campaign.
// Mirrors the OAuth refresh-token flow already used for the newsletter subscribe
// integration in Neozaareact/app/allapi/subscribe/route.js, but scoped for campaign
// creation and living here since this is the app the admin portal actually calls.

const axios = require("axios");

const REGION = process.env.ZOHO_CAMPAIGNS_REGION || "in";
const CLIENT_ID = process.env.ZOHO_CAMPAIGNS_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOHO_CAMPAIGNS_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.ZOHO_CAMPAIGNS_REFRESH_TOKEN;
const TOPIC_ID = process.env.ZOHO_CAMPAIGNS_TOPIC_ID;

function assertEnv() {
  const missing = [
    "ZOHO_CAMPAIGNS_CLIENT_ID",
    "ZOHO_CAMPAIGNS_CLIENT_SECRET",
    "ZOHO_CAMPAIGNS_REFRESH_TOKEN",
    "ZOHO_CAMPAIGNS_TOPIC_ID",
  ].filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}

async function getAccessToken() {
  assertEnv();
  const tokenUrl = `https://accounts.zoho.${REGION}/oauth/v2/token`;
  const params = new URLSearchParams({
    refresh_token: REFRESH_TOKEN,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "refresh_token",
  });

  const { data } = await axios.post(tokenUrl, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (!data.access_token) {
    throw new Error(`No access token returned by Zoho: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

// Zoho rejects campaign names containing "special characters" (error 7006) — real
// listing names routinely have them ("Secure & Govern Identity Access", "Time-to-Recover
// & Time-to-Survive..."), so strip anything that isn't a letter, digit, space, or hyphen
// before sending, rather than passing the raw name straight through.
function sanitizeCampaignName(name) {
  return String(name || "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Creates an UNSENT draft campaign. No send call happens anywhere in this service —
// sending is done manually by the admin, inside Zoho's own dashboard.
async function createDraftCampaign({ campaignName, subject, fromEmail, listKey, contentUrl, topicId = TOPIC_ID }) {
  const accessToken = await getAccessToken();
  const apiUrl = `https://campaigns.zoho.${REGION}/api/v1.1/createCampaign`;

  const params = new URLSearchParams({
    resfmt: "JSON",
    campaignname: sanitizeCampaignName(campaignName),
    from_email: fromEmail,
    subject,
    list_details: JSON.stringify({ [listKey]: [] }),
  });
  if (contentUrl) params.set("content_url", contentUrl);
  // Required on accounts using Zoho's updated topic-management version (this one does) —
  // omitted, createCampaign fails with code 903 "Mandatory Fields are not found".
  if (topicId) params.set("topicId", topicId);

  const { data } = await axios.post(`${apiUrl}?${params.toString()}`, null, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });

  return data;
}

module.exports = { getAccessToken, createDraftCampaign };
