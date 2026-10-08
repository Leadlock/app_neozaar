import { NextResponse } from "next/server";
import { createBiginContact } from "../lib/biginService.js";

/**
 * POST /allapi/whatsapp/bigin
 * Manually create a lead in Zoho Bigin CRM
 * Body: { productName, email, phone, cta }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { productName, email, phone, cta } = body;

    if (!email || !phone) {
      return NextResponse.json(
        { error: "Both 'email' and 'phone' are required" },
        { status: 400 }
      );
    }

    const result = await createBiginContact({
      productName: productName || "Direct Inquiry",
      email,
      phone,
      cta: cta || "Website",
    });

    return NextResponse.json({
      success: true,
      message: "Bigin contact created successfully",
      data: result,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
