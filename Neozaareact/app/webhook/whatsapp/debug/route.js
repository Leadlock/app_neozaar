import { NextResponse } from "next/server";
import getPool from "../../../allapi/whatsapp/lib/db.js";

/**
 * GET /webhook/whatsapp/debug
 * Quick diagnostic to check DB connection and env vars
 */
export async function GET() {
  const results = {
    envCheck: {
      WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN ? `✅ Set (${process.env.WHATSAPP_TOKEN.substring(0, 10)}...)` : "❌ MISSING",
      WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || "❌ MISSING",
      WHATSAPP_WEBHOOK_VERIFY_TOKEN: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ? "✅ Set" : "❌ MISSING",
      WA_DB_HOST: process.env.WA_DB_HOST || process.env.DB_HOST || "❌ MISSING",
      WA_DB_NAME: process.env.WA_DB_NAME || process.env.DB_NAME || "❌ MISSING",
      WA_DB_USER: process.env.WA_DB_USER || process.env.DB_USER || "❌ MISSING",
      WA_DB_PASSWORD: process.env.WA_DB_PASSWORD || process.env.DB_PASSWORD ? "✅ Set" : "❌ MISSING",
      BIGIN_CLIENT_ID: process.env.BIGIN_CLIENT_ID ? "✅ Set" : "❌ MISSING",
      BIGIN_REFRESH_TOKEN: process.env.BIGIN_REFRESH_TOKEN ? "✅ Set" : "❌ MISSING",
    },
    dbCheck: null,
    productCount: null,
    ctaCheck: null,
  };

  // Test DB connection
  try {
    const pool = getPool();
    const dbResult = await pool.query("SELECT NOW() as time");
    results.dbCheck = `✅ Connected (${dbResult.rows[0].time})`;

    // Check products table
    const countResult = await pool.query(
      "SELECT COUNT(*) as total FROM products WHERE is_publish = true AND is_approved = true AND deleted_at IS NULL"
    );
    results.productCount = `✅ ${countResult.rows[0].total} published products`;

    // Check CTAs
    const ctaResult = await pool.query(
      "SELECT DISTINCT unnest(cta_model) AS cta FROM products WHERE is_publish = true AND is_approved = true AND deleted_at IS NULL ORDER BY cta"
    );
    results.ctaCheck = ctaResult.rows.map((r) => r.cta);
  } catch (err) {
    results.dbCheck = `❌ Failed: ${err.message}`;
  }

  return NextResponse.json(results, { status: 200 });
}
