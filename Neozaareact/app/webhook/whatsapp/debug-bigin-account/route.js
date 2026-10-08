import { NextResponse } from "next/server";
import axios from "axios";

/**
 * GET /webhook/whatsapp/debug-bigin-account
 * Shows which Zoho/Bigin account the credentials belong to
 */
export async function GET() {
  const BIGIN_CLIENT_ID = process.env.BIGIN_CLIENT_ID;
  const BIGIN_CLIENT_SECRET = process.env.BIGIN_CLIENT_SECRET;
  const BIGIN_REFRESH_TOKEN = process.env.BIGIN_REFRESH_TOKEN;
  const BIGIN_ACCOUNTS_URL = process.env.BIGIN_ACCOUNTS_URL || "https://accounts.zoho.in";
  const BIGIN_API_URL = process.env.BIGIN_API_URL || "https://www.zohoapis.in/bigin/v2";

  try {
    // Step 1: Get access token
    const tokenResponse = await axios.post(`${BIGIN_ACCOUNTS_URL}/oauth/v2/token`, null, {
      params: {
        refresh_token: BIGIN_REFRESH_TOKEN,
        client_id: BIGIN_CLIENT_ID,
        client_secret: BIGIN_CLIENT_SECRET,
        grant_type: "refresh_token",
      },
    });

    const accessToken = tokenResponse.data.access_token;

    // Step 2: Try to list contacts (this scope should be permitted)
    const contactsResponse = await axios.get(`${BIGIN_API_URL}/Contacts?fields=Last_Name,Email,Phone&per_page=1`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });

    // Step 3: Get token owner info from accounts API
    let userInfo = null;
    try {
      const userResponse = await axios.get(`${BIGIN_ACCOUNTS_URL}/oauth/user/info`, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      });
      userInfo = userResponse.data;
    } catch (e) {
      userInfo = "Could not fetch (scope not available)";
    }

    return NextResponse.json({
      success: true,
      message: "✅ Bigin token is valid and Contacts scope works!",
      tokenOwner: userInfo,
      sampleContact: contactsResponse.data?.data?.[0] || "No contacts yet",
      totalContacts: contactsResponse.data?.info?.count || 0,
      config: {
        accountsUrl: BIGIN_ACCOUNTS_URL,
        apiUrl: BIGIN_API_URL,
        clientId: BIGIN_CLIENT_ID ? `${BIGIN_CLIENT_ID.substring(0, 15)}...` : "NOT SET",
      },
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err.message,
      details: err.response?.data || null,
      hint: "If 'invalid_code' — the refresh token has expired. Regenerate from Zoho API Console.",
    }, { status: 500 });
  }
}
