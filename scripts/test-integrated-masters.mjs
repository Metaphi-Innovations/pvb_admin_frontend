/**
 * Integration smoke tests for all API-integrated master modules.
 * Run: node scripts/test-integrated-masters.mjs
 */
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const TOKEN =
  process.env.NEXT_PUBLIC_DEV_ACCESS_TOKEN ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNzU3NGM3NWYtMjIxYy00Y2YwLTg0OTgtMWRhMDhlZjgwYmRlIiwiZW1haWwiOiJhZG1pbkBnbWFpbC5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyOTg2OTk4LCJleHAiOjE3ODU1Nzg5OTh9.pagubydsabIpuTsspYxkSg1yn7PguBkumnyK2IDOt74";

const results = [];
const stamp = Date.now().toString(36);

function log(ok, module, op, detail = "") {
  const line = `${ok ? "PASS" : "FAIL"} | ${module.padEnd(14)} | ${op.padEnd(22)} | ${detail}`;
  console.log(line);
  results.push({ ok, module, op, detail });
}

async function req(method, path, { body, query } = {}) {
  const url = new URL(BASE.replace(/\/$/, "") + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/json",
  };
  let payload;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(url, { method, headers, body: payload });
  const contentType = res.headers.get("content-type") || "";
  let data = null;
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.arrayBuffer();
  }
  return { status: res.status, data, ok: res.ok, contentType };
}

function firstId(listData, keys = ["id", "segment_id", "category_id"]) {
  const rows = listData?.data;
  if (!Array.isArray(rows) || !rows.length) return null;
  const row = rows[0];
  for (const k of keys) {
    if (row[k]) return String(row[k]);
  }
  return null;
}

async function testCategory() {
  const mod = "category";
  try {
    const list = await req("POST", "/master/category/list", {
      query: { page: 1, page_size: 10, search: "" },
      body: { filters: {} },
    });
    log(list.status === 200 && Array.isArray(list.data?.data), mod, "list", `status=${list.status} total=${list.data?.totalRecords}`);

    const active = await req("POST", "/master/category/list", {
      query: { page: 1, page_size: 10, search: "" },
      body: { filters: { is_active: true } },
    });
    log(active.status === 200, mod, "filter is_active", `status=${active.status}`);

    const byUser = await req("POST", "/master/category/list", {
      query: { page: 1, page_size: 10, search: "" },
      body: { filters: { created_by_user: { username: "admin" } } },
    });
    log(byUser.status === 200, mod, "filter created user", `status=${byUser.status} count=${byUser.data?.data?.length}`);

    const byDate = await req("POST", "/master/category/list", {
      query: { page: 1, page_size: 10, search: "" },
      body: {
        filters: {
          range: { created_at: { from: "2020-01-01", to: "2030-12-31" } },
        },
      },
    });
    log(byDate.status === 200, mod, "filter created date", `status=${byDate.status}`);

    const name = `API Test Cat ${stamp}`;
    const create = await req("POST", "/master/category/create", {
      body: { categoryName: name, description: "integration test" },
    });
    log(create.status === 200 || create.status === 201 || create.data?.success, mod, "create", `status=${create.status} msg=${create.data?.message || ""}`);

    const listAfter = await req("POST", "/master/category/list", {
      query: { page: 1, page_size: 50, search: name },
      body: { filters: {} },
    });
    const id =
      (listAfter.data?.data || []).find((r) => r.categoryName === name || r.category_name === name)?.id ||
      firstId(listAfter.data);
    log(!!id, mod, "find created", `id=${id}`);

    if (id) {
      const view = await req("GET", `/master/category/${id}`);
      log(view.status === 200 && view.data?.data, mod, "view", `status=${view.status}`);

      const update = await req("PUT", `/master/category/update/${id}`, {
        body: { categoryName: name, description: "updated", is_active: true },
      });
      log(update.status === 200 || update.data?.success, mod, "update", `status=${update.status}`);

      const status = await req("PATCH", `/master/category/update-status/${id}`);
      log(status.status === 200 || status.data?.success, mod, "toggle status", `status=${status.status}`);
    }

    const exp = await req("POST", "/master/category/export", {
      query: { search: "" },
      body: { filters: {} },
    });
    log(exp.status === 200, mod, "export", `status=${exp.status} type=${exp.contentType}`);
  } catch (e) {
    log(false, mod, "exception", e.message);
  }
}

async function testGst() {
  const mod = "gst";
  try {
    const list = await req("POST", "/master/gst/list", {
      query: { page: 1, page_size: 10, search: "", ordering: "" },
      body: { filters: {} },
    });
    log(list.status === 200 && Array.isArray(list.data?.data), mod, "list", `status=${list.status} total=${list.data?.totalRecords}`);

    const active = await req("POST", "/master/gst/list", {
      query: { page: 1, page_size: 10, search: "" },
      body: { filters: { is_active: true } },
    });
    log(active.status === 200, mod, "filter is_active", `status=${active.status}`);

    const byUser = await req("POST", "/master/gst/list", {
      query: { page: 1, page_size: 10, search: "" },
      body: { filters: { created_by_user: { username: "admin" } } },
    });
    log(byUser.status === 200, mod, "filter created user", `status=${byUser.status}`);

    const dropdown = await req("GET", "/master/gst/dropdown");
    log(dropdown.status === 200 && Array.isArray(dropdown.data?.data), mod, "dropdown", `status=${dropdown.status} count=${dropdown.data?.data?.length}`);

    // unique percentage unlikely to collide
    const pct = Number(`0.${String(Date.now()).slice(-4)}`);
    const create = await req("POST", "/master/gst/create", {
      body: { gstPercentage: pct, remark: `test ${stamp}` },
    });
    log(create.status === 200 || create.status === 201 || create.data?.success, mod, "create", `status=${create.status} pct=${pct} msg=${create.data?.message || ""}`);
    let id =
      create.data?.data?.id ||
      create.data?.data?.gst_id ||
      create.data?.id ||
      null;
    if (id) id = String(id);

    if (!id) {
      const listAfter = await req("POST", "/master/gst/list", {
        query: { page: 1, page_size: 100, search: "" },
        body: { filters: { gstPercentage: pct } },
      });
      id = firstId(listAfter.data);
      if (!id) {
        const all = await req("POST", "/master/gst/list", {
          query: { page: 1, page_size: 100, search: "" },
          body: { filters: {} },
        });
        const row = (all.data?.data || []).find(
          (r) => Number(r.gstPercentage) === pct || String(r.remark || "").includes(stamp),
        );
        id = row?.id ? String(row.id) : null;
        if (!id && all.data?.data?.[0]) {
          console.log("  gst sample row keys:", Object.keys(all.data.data[0]).join(","));
          console.log("  gst create body keys:", create.data ? Object.keys(create.data).join(",") : "null");
          console.log("  gst create data:", JSON.stringify(create.data)?.slice(0, 300));
        }
      }
    }
    log(!!id, mod, "find created", `id=${id}`);

    if (id) {
      const view = await req("GET", `/master/gst/${id}`);
      log(view.status === 200 && view.data?.data, mod, "view", `status=${view.status}`);

      const update = await req("PUT", `/master/gst/update/${id}`, {
        body: { gstPercentage: pct, remark: `updated ${stamp}` },
      });
      log(update.status === 200 || update.data?.success, mod, "update", `status=${update.status}`);

      const status = await req("PATCH", `/master/gst/update-status/${id}`);
      log(status.status === 200 || status.data?.success, mod, "toggle status", `status=${status.status}`);
    }

    const exp = await req("POST", "/master/gst/export", {
      query: { search: "" },
      body: { filters: {} },
    });
    log(exp.status === 200, mod, "export", `status=${exp.status}`);
  } catch (e) {
    log(false, mod, "exception", e.message);
  }
}

async function testHsn() {
  const mod = "hsn";
  try {
    const list = await req("POST", "/master/hsn/list", {
      query: { page: 1, page_size: 10, search: "", ordering: "" },
      body: { filters: {} },
    });
    log(list.status === 200 && Array.isArray(list.data?.data), mod, "list", `status=${list.status} total=${list.data?.totalRecords}`);

    const active = await req("POST", "/master/hsn/list", {
      query: { page: 1, page_size: 10, search: "" },
      body: { filters: { is_active: true } },
    });
    log(active.status === 200, mod, "filter is_active", `status=${active.status}`);

    const byUser = await req("POST", "/master/hsn/list", {
      query: { page: 1, page_size: 10, search: "" },
      body: { filters: { created_by_user: { username: "admin" } } },
    });
    log(byUser.status === 200, mod, "filter created user", `status=${byUser.status}`);

    const gstDd = await req("GET", "/master/gst/dropdown");
    const gstId = gstDd.data?.data?.[0]?.id;
    log(!!gstId, mod, "gst dropdown for create", `gstId=${gstId}`);

    const desc = `API Test HSN ${stamp}`;
    const create = await req("POST", "/master/hsn/create", {
      body: { hsnDescription: desc, gstId },
    });
    log(create.status === 200 || create.status === 201 || create.data?.success, mod, "create", `status=${create.status} msg=${create.data?.message || ""}`);

    const listAfter = await req("POST", "/master/hsn/list", {
      query: { page: 1, page_size: 50, search: stamp },
      body: { filters: {} },
    });
    const id = firstId(listAfter.data);
    log(!!id, mod, "find created", `id=${id}`);

    if (id) {
      const view = await req("GET", `/master/hsn/${id}`);
      log(view.status === 200 && view.data?.data, mod, "view", `status=${view.status}`);

      const update = await req("PUT", `/master/hsn/update/${id}`, {
        body: { hsnDescription: `${desc} updated`, gstId },
      });
      log(update.status === 200 || update.data?.success, mod, "update", `status=${update.status}`);

      const status = await req("PATCH", `/master/hsn/update-status/${id}`);
      log(status.status === 200 || status.data?.success, mod, "toggle status", `status=${status.status}`);
    }

    const exp = await req("POST", "/master/hsn/export", {
      query: { search: "" },
      body: { filters: {} },
    });
    log(exp.status === 200, mod, "export", `status=${exp.status}`);
  } catch (e) {
    log(false, mod, "exception", e.message);
  }
}

async function testSegment() {
  const mod = "segment";
  try {
    const list = await req("POST", "/master/segment/list", {
      query: { page: 1, limit: 10, search: "", ordering: "" },
      body: { filters: {} },
    });
    log(list.status === 200 && Array.isArray(list.data?.data), mod, "list", `status=${list.status} total=${list.data?.totalRecords ?? list.data?.count}`);

    const active = await req("POST", "/master/segment/list", {
      query: { page: 1, limit: 10, search: "" },
      body: { filters: { is_active: true } },
    });
    log(active.status === 200, mod, "filter is_active", `status=${active.status}`);

    const byUser = await req("POST", "/master/segment/list", {
      query: { page: 1, limit: 10, search: "" },
      body: { filters: { created_by_user: { username: "admin" } } },
    });
    log(byUser.status === 200, mod, "filter created user", `status=${byUser.status}`);

    const name = `API Test Seg ${stamp}`;
    const create = await req("POST", "/master/segment/create", {
      body: { segment_name: name, description: "integration test" },
    });
    log(create.status === 200 || create.status === 201 || create.data?.success, mod, "create", `status=${create.status} msg=${create.data?.message || ""}`);

    const listAfter = await req("POST", "/master/segment/list", {
      query: { page: 1, limit: 50, search: stamp },
      body: { filters: {} },
    });
    const id =
      (listAfter.data?.data || []).find((r) => r.segment_name === name)?.segment_id ||
      firstId(listAfter.data, ["segment_id", "id"]);
    log(!!id, mod, "find created", `id=${id}`);

    if (id) {
      const view = await req("GET", `/master/segment/details/${id}`);
      log(view.status === 200 && view.data?.data, mod, "view", `status=${view.status}`);

      const update = await req("PUT", `/master/segment/update/${id}`, {
        body: { segment_name: `${name} u`, description: "updated" },
      });
      log(update.status === 200 || update.data?.success, mod, "update", `status=${update.status}`);

      const status = await req("PATCH", `/master/segment/toggle-status/${id}`, {
        body: { is_active: false },
      });
      log(status.status === 200 || status.data?.success, mod, "toggle status", `status=${status.status}`);
    }

    const exp = await req("POST", "/master/segment/export", {
      query: { search: "", ordering: "" },
      body: { filters: {} },
    });
    log(exp.status === 200, mod, "export", `status=${exp.status}`);
  } catch (e) {
    log(false, mod, "exception", e.message);
  }
}

async function testDocumentType() {
  const mod = "document-type";
  try {
    const list = await req("POST", "/master/document-type/list", {
      query: { page: 1, page_size: 10, search: "" },
      body: { filters: {} },
    });
    log(list.status === 200 && Array.isArray(list.data?.data), mod, "list", `status=${list.status} total=${list.data?.totalRecords}`);

    const active = await req("POST", "/master/document-type/list", {
      query: { page: 1, page_size: 10, search: "" },
      body: { filters: { is_active: true } },
    });
    log(active.status === 200, mod, "filter is_active", `status=${active.status}`);

    const byUser = await req("POST", "/master/document-type/list", {
      query: { page: 1, page_size: 10, search: "" },
      body: { filters: { created_by_user: { username: "admin" } } },
    });
    log(byUser.status === 200, mod, "filter created user", `status=${byUser.status}`);

    const dropdown = await req("GET", "/master/document-type/dropdown");
    log(dropdown.status === 200 && Array.isArray(dropdown.data?.data), mod, "dropdown", `status=${dropdown.status}`);

    const title = `API Test Doc ${stamp}`;
    const create = await req("POST", "/master/document-type/create", {
      body: { title, description: "integration test" },
    });
    log(create.status === 200 || create.status === 201 || create.data?.success, mod, "create", `status=${create.status} msg=${create.data?.message || ""}`);

    const listAfter = await req("POST", "/master/document-type/list", {
      query: { page: 1, page_size: 50, search: stamp },
      body: { filters: {} },
    });
    const id =
      (listAfter.data?.data || []).find((r) => r.title === title)?.id || firstId(listAfter.data);
    log(!!id, mod, "find created", `id=${id}`);

    if (id) {
      const view = await req("GET", `/master/document-type/${id}`);
      log(view.status === 200 && view.data?.data, mod, "view", `status=${view.status}`);

      const update = await req("PUT", `/master/document-type/update/${id}`, {
        body: { title: `${title} u`, description: "updated" },
      });
      log(update.status === 200 || update.data?.success, mod, "update", `status=${update.status}`);

      const status = await req("PATCH", `/master/document-type/update-status/${id}`);
      log(status.status === 200 || status.data?.success, mod, "toggle status", `status=${status.status}`);
    }

    const exp = await req("POST", "/master/document-type/export-csv", {
      query: { search: "" },
      body: { filters: {} },
    });
    log(exp.status === 200, mod, "export", `status=${exp.status}`);
  } catch (e) {
    log(false, mod, "exception", e.message);
  }
}

async function testCustomerType() {
  const mod = "customer-type";
  try {
    const list = await req("POST", "/master/customer-type/list", {
      query: { page: 1, page_size: 10, search: "" },
      body: { filters: {} },
    });
    log(list.status === 200 && Array.isArray(list.data?.data), mod, "list", `status=${list.status} total=${list.data?.totalRecords}`);

    const active = await req("POST", "/master/customer-type/list", {
      query: { page: 1, page_size: 10, search: "" },
      body: { filters: { is_active: true } },
    });
    log(active.status === 200, mod, "filter is_active", `status=${active.status}`);

    const byUser = await req("POST", "/master/customer-type/list", {
      query: { page: 1, page_size: 10, search: "" },
      body: { filters: { created_by_user: { username: "admin" } } },
    });
    log(byUser.status === 200, mod, "filter created user", `status=${byUser.status}`);

    const code = `T${stamp.slice(-4)}`.toUpperCase();
    const name = `API Test CT ${stamp}`;
    const create = await req("POST", "/master/customer-type/create", {
      body: {
        customer_initial_code: code,
        customer_type_name: name,
        description: "integration test",
        documentTypeIds: [],
      },
    });
    log(create.status === 200 || create.status === 201 || create.data?.success, mod, "create", `status=${create.status} msg=${create.data?.message || ""}`);
    let id =
      create.data?.data?.id ||
      create.data?.id ||
      null;
    if (id) id = String(id);

    if (!id) {
      const listAfter = await req("POST", "/master/customer-type/list", {
        query: { page: 1, page_size: 100, search: "" },
        body: { filters: { customer_initial_code: code } },
      });
      id =
        (listAfter.data?.data || []).find(
          (r) => r.customer_type_name === name || r.customer_initial_code === code,
        )?.id || firstId(listAfter.data);
      if (!id) {
        const all = await req("POST", "/master/customer-type/list", {
          query: { page: 1, page_size: 100, search: "" },
          body: { filters: {} },
        });
        const row = (all.data?.data || []).find(
          (r) => r.customer_type_name === name || r.customer_initial_code === code,
        );
        id = row?.id ? String(row.id) : null;
        if (!id && all.data?.data?.[0]) {
          console.log("  ct sample row keys:", Object.keys(all.data.data[0]).join(","));
          console.log("  ct create data:", JSON.stringify(create.data)?.slice(0, 300));
        }
      }
    }
    if (id) id = String(id);
    log(!!id, mod, "find created", `id=${id}`);

    if (id) {
      const view = await req("GET", `/master/customer-type/${id}`);
      log(view.status === 200 && view.data?.data, mod, "view", `status=${view.status}`);

      const update = await req("PUT", `/master/customer-type/update/${id}`, {
        body: {
          customer_type_name: `${name} u`,
          description: "updated",
          documentTypeIds: [],
        },
      });
      log(update.status === 200 || update.data?.success, mod, "update", `status=${update.status}`);

      const status = await req("PATCH", `/master/customer-type/update-status/${id}`);
      log(status.status === 200 || status.data?.success, mod, "toggle status", `status=${status.status}`);
    }

    const exp = await req("POST", "/master/customer-type/export", {
      query: { search: "" },
      body: { filters: {} },
    });
    log(exp.status === 200, mod, "export", `status=${exp.status}`);
  } catch (e) {
    log(false, mod, "exception", e.message);
  }
}

async function main() {
  console.log(`Base: ${BASE}`);
  console.log(`Stamp: ${stamp}\n`);

  await testCategory();
  await testGst();
  await testHsn();
  await testSegment();
  await testDocumentType();
  await testCustomerType();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log("\nFailures:");
    for (const f of failed) console.log(` - ${f.module} ${f.op}: ${f.detail}`);
    process.exit(1);
  }
}

main();
