import { NextResponse } from "next/server";

/**
 * Accounts API — voucher listing endpoint.
 * Wire to PostgreSQL using lib/accounts/database/schema.sql when backend is ready.
 */
export async function GET() {
  return NextResponse.json({
    success: false,
    error: "Accounts API requires server-side database connection. Use client localStorage layer in development.",
    endpoints: "/api/accounts/vouchers, /api/accounts/coa, /api/accounts/reports/*",
  }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({
    success: false,
    error: "Implement POST via posting-engine connected to database..",
  }, { status: 501 });
}
