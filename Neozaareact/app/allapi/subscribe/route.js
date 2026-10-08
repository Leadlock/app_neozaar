import { NextResponse } from "next/server";

// Environment variables
const CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN;
const LIST_KEY = process.env.ZOHO_LIST_KEY;
const ZOHO_REGION = process.env.ZOHO_REGION || "com";

// Validate environment variables
function validateEnv() {
  const missingVars = [];

  if (!CLIENT_ID) missingVars.push("ZOHO_CLIENT_ID");
  if (!CLIENT_SECRET) missingVars.push("ZOHO_CLIENT_SECRET");
  if (!REFRESH_TOKEN) missingVars.push("ZOHO_REFRESH_TOKEN");
  if (!LIST_KEY) missingVars.push("ZOHO_LIST_KEY");

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }
}

// Save subscriber in our DB and trigger the confirmation email
async function notifyBackendSubscription(email, source) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/";

  try {
    const res = await fetch(`${apiBase}subscribe/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Backend subscribe/create failed:", res.status, text);
    }
  } catch (err) {
    console.error("Failed to notify backend of subscription:", err);
  }
}

// Get fresh access token
async function getAccessToken() {
  validateEnv();

  const tokenUrl = `https://accounts.zoho.${ZOHO_REGION}/oauth/v2/token`;

  const params = new URLSearchParams({
    refresh_token: REFRESH_TOKEN,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "refresh_token",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error(
      "Zoho token refresh failed:",
      response.status,
      responseText
    );

    throw new Error(
      `Zoho token refresh failed (${response.status}): ${responseText}`
    );
  }

  let data;

  try {
    data = JSON.parse(responseText);
  } catch (err) {
    console.error(err);
    throw new Error("Invalid response from Zoho token API");
  }

  if (!data.access_token) {
    console.error("Zoho token response:", data);
    throw new Error("No access token returned by Zoho");
  }

  return data.access_token;
}

export async function POST(req) {
  try {
    const body = await req.json();

    const email = body?.email?.trim();
    const source = body?.source || "Website Newsletter";

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    // Persist subscriber + send confirmation email via our backend (errors are logged, not fatal)
    await notifyBackendSubscription(email, source);

    const accessToken = await getAccessToken();

    const params = new URLSearchParams({
      resfmt: "JSON",
      listkey: LIST_KEY,
      contactinfo: JSON.stringify({ "Contact Email": email }),
      source,
    });

    const apiUrl = `https://campaigns.zoho.${ZOHO_REGION}/api/v1.1/json/listsubscribe?${params.toString()}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });

    const responseText = await response.text();

    let responseData = {};

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = {
        message: responseText,
      };
    }

    console.log("Zoho response:", responseData);

    if (response.ok && responseData?.status === "success") {
      const message = (responseData?.message || "").toLowerCase();

      if (message.includes("already exists")) {
        return NextResponse.json(
          {
            success: true,
            message: "You're already subscribed!",
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: "Successfully subscribed!",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: responseData?.message || "Subscription failed",
      },
      { status: response.ok ? 400 : response.status }
    );
  } catch (error) {
    console.error("Subscribe API Error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong",
      },
      { status: 500 }
    );
  }
}