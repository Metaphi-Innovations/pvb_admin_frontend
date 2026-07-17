#!/usr/bin/env node
/**
 * TDS API integration test — hits backend directly (no backend changes).
 * Run: node scripts/test-tds-api.mjs
 */

const TOKEN = process.env.TDS_TEST_TOKEN || process.env.NEXT_PUBLIC_DEV_ACCESS_TOKEN;
const BASE = process.env.API_BASE || "http://localhost:8000/api/master/tds";

if (!TOKEN) {
  console.error("Set TDS_TEST_TOKEN or NEXT_PUBLIC_DEV_ACCESS_TOKEN");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

let passed = 0;
let failed = 0;
const createdIds = [];

function ok(name, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function req(method, path, body, opts = {}) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: opts.blob ? { Authorization: headers.Authorization } : headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (opts.blob) {
    const blob = await res.blob();
    return { status: res.status, ok: res.ok, blob, contentType: res.headers.get("content-type") };
  }
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  console.log("\n=== TDS API Tests ===\n");

  // CREATE — seed records for pagination
  for (let i = 1; i <= 5; i++) {
    const r = await req("POST", "/create", {
      tds_rate: i + 0.5,
      tds_section_name: `API Test Section ${i}`,
      applicable_to: "vendor",
      description: `Pagination test record ${i}`,
    });
    ok(`CREATE #${i}`, r.ok && r.data?.success, r.data?.message);
    if (r.data?.data?.tds_id) createdIds.push(r.data.data.tds_id);
  }

  // LIST pagination
  const p1 = await req("POST", "/list?page=1&limit=3&search=&ordering=tdsCode", { filters: {} });
  ok("LIST page 1", p1.ok && Array.isArray(p1.data?.data), `items=${p1.data?.data?.length}`);
  const total = p1.data?.totalRecords ?? 0;
  ok("LIST totalRecords", total >= 7, `total=${total}`);

  const p2 = await req("POST", "/list?page=2&limit=3&search=&ordering=tdsCode", { filters: {} });
  ok("LIST page 2", p2.ok && p2.data?.data?.length > 0, `items=${p2.data?.data?.length}`);

  const pLast = await req("POST", `/list?page=${Math.ceil(total / 3)}&limit=3&search=&ordering=tdsCode`, {
    filters: {},
  });
  ok("LIST last page", pLast.ok, `items=${pLast.data?.data?.length}`);

  // SEARCH
  const search = await req("POST", "/list?page=1&limit=10&search=API%20Test&ordering=", { filters: {} });
  ok("LIST search", search.ok && search.data?.data?.length >= 5, `found=${search.data?.data?.length}`);

  // FILTER is_active
  const filt = await req("POST", "/list?page=1&limit=10&search=&ordering=", {
    filters: { is_active: true },
  });
  ok("LIST filter is_active", filt.ok, `items=${filt.data?.data?.length}`);

  // FILTER-DROPDOWN fields
  for (const field of [
    "tds_code",
    "tds_rate",
    "tds_section_name",
    "applicable_to",
    "description",
    "is_active",
    "created_by_user__username",
  ]) {
    const fd = await req("GET", `/filter-dropdown?field_name=${field}`);
    ok(`FILTER-DROPDOWN ${field}`, fd.ok && Array.isArray(fd.data?.data), `opts=${fd.data?.data?.length}`);
  }

  // DROPDOWN
  const dd = await req("GET", "/dropdown");
  ok("DROPDOWN", dd.ok && Array.isArray(dd.data?.data), `items=${dd.data?.data?.length}`);

  const testId = createdIds[0] || p1.data?.data?.[0]?.tds_id;
  ok("Has test ID for detail", !!testId, testId);

  if (testId) {
    // DETAILS
    const detail = await req("GET", `/details/${testId}`);
    ok("DETAILS", detail.ok && detail.data?.data?.tds_id === testId, detail.data?.data?.tds_code);

    // UPDATE
    const upd = await req("PUT", `/update/${testId}`, {
      tds_rate: 9.99,
      tds_section_name: "Updated API Test",
      description: "Updated via test script",
    });
    ok("UPDATE", upd.ok && upd.data?.success, upd.data?.message);

    // TOGGLE STATUS off
    const off = await req("PATCH", `/toggle-status/${testId}`, { is_active: false });
    ok("TOGGLE inactive", off.ok && off.data?.data?.is_active === false);

    // TOGGLE STATUS on
    const on = await req("PATCH", `/toggle-status/${testId}`, { is_active: true });
    ok("TOGGLE active", on.ok && on.data?.data?.is_active === true);
  }

  // EXPORT
  const exp = await req("POST", "/export?search=&ordering=tdsCode", { filters: {} }, { blob: true });
  ok("EXPORT", exp.ok && (exp.contentType?.includes("csv") || exp.blob?.size > 0), `type=${exp.contentType}`);

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
