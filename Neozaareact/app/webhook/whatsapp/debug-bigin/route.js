import { NextResponse } from "next/server";
import { createBiginContact } from "../../../allapi/whatsapp/lib/biginService.js";

/**
 * GET /webhook/whatsapp/debug-bigin
 * Test Zoho Bigin CRM connection with a dummy lead
 */
export async function GET() {
  const testData = {
    productName: "Test Product - Integration Check",
    email: "test@neozaar.com",
    phone: "919769917927",
    cta: "Integration Test",
  };

  try {
    const result = await createBiginContact(testData);

    return NextResponse.json({
      success: true,
      message: "✅ Bigin CRM is working! Test contact created.",
      biginResponse: result,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      message: "❌ Bigin CRM failed",
      error: err.message,
      details: err.response?.data || null,
    }, { status: 500 });
  }
}
