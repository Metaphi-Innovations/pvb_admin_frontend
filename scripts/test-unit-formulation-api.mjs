#!/usr/bin/env node
/**
 * Unit + Formulation API integration test.
 * Run: node scripts/test-unit-formulation-api.mjs
 */

const TOKEN = process.env.NEXT_PUBLIC_DEV_ACCESS_TOKEN;
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

if (!TOKEN) {
  console.error("Set NEXT_PUBLIC_DEV_ACCESS_TOKEN");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

let passed = 0;
let failed = 0;
const created = { unitId: null, formulationId: null };

function ok(name, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function getJson(path) {
  const res = await fetch(`${API}${path}`, { headers });
  return res.json();
}

async function postJson(path, body, query = "") {
  const res = await fetch(`${API}${path}${query}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}

async function putJson(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}

async function patchJson(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}

async function testFormulation() {
  console.log("\n=== Formulation Master ===\n");

  const list = await postJson("/master/formulation/list", { filters: {} }, "?page=1&limit=5");
  ok("formulation list", list.success && Array.isArray(list.data), `total=${list.totalRecords}`);

  const filter = await getJson("/master/formulation/filter-dropdown?field_name=formulation_name");
  ok("formulation filter-dropdown", filter.success && Array.isArray(filter.data));

  const create = await postJson("/master/formulation/create", {
    formulation_name: `UI Test Form ${Date.now()}`,
    description: "API test record",
  });
  ok("formulation create", create.success === true, create.data?.formulation_code);
  created.formulationId = create.data?.formulation_id ?? null;

  if (created.formulationId) {
    const detail = await getJson(`/master/formulation/details/${created.formulationId}`);
    ok("formulation view", detail.success && detail.data?.formulation_id === created.formulationId);

    const update = await putJson(`/master/formulation/update/${created.formulationId}`, {
      description: "Updated via API test",
    });
    ok("formulation update", update.success === true);

    const toggle = await patchJson(`/master/formulation/toggle-status/${created.formulationId}`, {
      is_active: false,
    });
    ok("formulation status toggle", toggle.success === true);
  }

  const exportRes = await fetch(
    `${API}/master/formulation/export?search=`,
    { method: "POST", headers, body: JSON.stringify({ filters: {} }) },
  );
  const exportType = exportRes.headers.get("content-type") || "";
  ok(
    "formulation export",
    exportRes.ok && (exportType.includes("text/csv") || exportType.includes("application/json")),
    exportType,
  );
}

async function testUnit() {
  console.log("\n=== Unit Master ===\n");

  const list = await postJson("/master/unit/list", { filters: {} }, "?page=1&limit=5");
  ok("unit list", list.success && Array.isArray(list.data), `total=${list.totalRecords}`);

  const filter = await getJson("/master/unit/filter-dropdown?field_name=unit_name");
  ok("unit filter-dropdown", filter.success && Array.isArray(filter.data));

  const parentDropdown = await getJson("/master/unit/dropdown?parent_uom=true");
  ok("unit parent UOM dropdown", parentDropdown.success && Array.isArray(parentDropdown.data));

  const create = await postJson("/master/unit/create", {
    unit_name: `UI Test Unit ${Date.now()}`,
    short_name: `TU${String(Date.now()).slice(-4)}`,
    conversion_factor: 1,
    uom_id: null,
  });
  ok("unit create", create.success === true, create.data?.unit_code);
  created.unitId = create.data?.unit_id ?? null;

  if (created.unitId) {
    const detail = await getJson(`/master/unit/details/${created.unitId}`);
    ok("unit view", detail.success && detail.data?.unit_id === created.unitId);

    const update = await putJson(`/master/unit/update/${created.unitId}`, {
      conversion_factor: 2,
    });
    ok("unit update", update.success === true);

    const toggle = await patchJson(`/master/unit/toggle-status/${created.unitId}`, {
      is_active: false,
    });
    ok("unit status toggle", toggle.success === true);
  }

  const exportRes = await fetch(`${API}/master/unit/export?search=`, {
    method: "POST",
    headers,
    body: JSON.stringify({ filters: {} }),
  });
  const exportType = exportRes.headers.get("content-type") || "";
  ok(
    "unit export",
    exportRes.ok && (exportType.includes("text/csv") || exportType.includes("application/json")),
    exportType,
  );
}

async function main() {
  await testFormulation();
  await testUnit();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
