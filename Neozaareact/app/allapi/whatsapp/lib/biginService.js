import axios from "axios";

const BIGIN_CLIENT_ID = process.env.BIGIN_CLIENT_ID;
const BIGIN_CLIENT_SECRET = process.env.BIGIN_CLIENT_SECRET;
const BIGIN_REFRESH_TOKEN = process.env.BIGIN_REFRESH_TOKEN;
const BIGIN_ACCOUNTS_URL = process.env.BIGIN_ACCOUNTS_URL || "https://accounts.zoho.in";
const BIGIN_API_URL = process.env.BIGIN_API_URL || "https://www.zohoapis.in/bigin/v2";

let accessToken = null;
let tokenExpiry = 0;

/**
 * Get a fresh access token using the refresh token
 */
async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const response = await axios.post(`${BIGIN_ACCOUNTS_URL}/oauth/v2/token`, null, {
      params: {
        refresh_token: BIGIN_REFRESH_TOKEN,
        client_id: BIGIN_CLIENT_ID,
        client_secret: BIGIN_CLIENT_SECRET,
        grant_type: "refresh_token",
      },
    });

    accessToken = response.data.access_token;
    // Token expires in 1 hour, refresh 5 min early
    tokenExpiry = Date.now() + 55 * 60 * 1000;

    console.log("🔑 Bigin access token refreshed");
    return accessToken;
  } catch (err) {
    console.error("❌ Failed to refresh Bigin token:", err.response?.data || err.message);
    throw err;
  }
}

/**
 * Create a contact/lead in Zoho Bigin
 * @param {Object} data - { productName, email, phone, cta }
 */
export async function createBiginContact(data) {
  const token = await getAccessToken();

  const payload = {
    data: [
      {
        Last_Name: data.phone,
        Email: data.email,
        Phone: data.phone,
        Description: `Product Interest: ${data.productName} | CTA: ${data.cta}`,
      },
    ],
    trigger: ["workflow"],
  };

  try {
    const response = await axios.post(`${BIGIN_API_URL}/Contacts`, payload, {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Bigin contact created:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (err) {
    console.error("❌ Bigin API Error:", err.response?.data || err.message);
    throw err;
  }
}
