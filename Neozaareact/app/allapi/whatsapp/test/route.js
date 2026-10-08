import { NextResponse } from "next/server";
import { sendWhatsAppMessage } from "../lib/whatsappService.js";

/**
 * GET /allapi/whatsapp/test
 * Test endpoint to verify WhatsApp API integration is working
 */
export async function GET() {
  try {
    const testPhone = process.env.WHATSAPP_TEST_PHONE;

    if (!testPhone) {
      return NextResponse.json(
        { error: "WHATSAPP_TEST_PHONE not configured in .env" },
        { status: 400 }
      );
    }

    const response = await sendWhatsAppMessage(
      testPhone,
      "Hello from Neozaar 🚀 — WhatsApp integration is working!"
    );

    return NextResponse.json({
      success: true,
      message: "Test message sent successfully",
      data: response,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /allapi/whatsapp/test
 * Send a custom message to a specific phone number
 * Body: { phone: "919769917927", message: "Hello!" }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { phone, message } = body;

    if (!phone || !message) {
      return NextResponse.json(
        { error: "Both 'phone' and 'message' are required" },
        { status: 400 }
      );
    }

    const response = await sendWhatsAppMessage(phone, message);

    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
      data: response,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
