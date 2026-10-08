import { NextResponse } from "next/server";
import { handleMessage } from "../../allapi/whatsapp/lib/botService.js";
import { parseInboundMessage, describeWebhook } from "../../allapi/whatsapp/lib/parseInbound.js";

/**
 * GET /webhook/whatsapp
 * Meta WhatsApp webhook verification endpoint
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ WhatsApp Webhook Verified");
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

/**
 * POST /webhook/whatsapp
 * Meta sends incoming WhatsApp messages here
 */
export async function POST(req) {
  console.log("🔥 WHATSAPP WEBHOOK HIT");

  try {
    const body = await req.json();
    console.log("📨", describeWebhook(body));

    const inbound = parseInboundMessage(body);

    // Status receipts (sent/delivered/read) and non-message webhooks — ack only.
    if (!inbound) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    console.log("================================");
    console.log("📩 Incoming WhatsApp Message");
    console.log("From:", inbound.from);
    console.log("Type:", inbound.type);
    console.log("Text:", inbound.text);
    if (inbound.choiceId) console.log("Choice:", inbound.choiceId, `(${inbound.choiceTitle})`);
    console.log("================================");

    try {
      await handleMessage(inbound.from, inbound.text, inbound);
      console.log("✅ Bot message processed successfully");
    } catch (err) {
      console.error("❌ Bot processing error:", err.message);
      console.error("Stack:", err.stack);
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (err) {
    console.error("Webhook processing error:", err.message);
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
}
