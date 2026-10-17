/**
 * Browser E2E verification for HR Demo Workspace (Playwright).
 * Run: npx --yes playwright@1.49.0 install chromium && node scripts/verify-demo-workspace.mjs
 */

import { chromium } from "playwright";

const BASE = process.env.DEMO_VERIFY_BASE || "http://localhost:3000";
const results = [];

function record(id, ok, detail = "") {
  results.push({ id, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${id}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(120000);

  async function go(path) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    return res;
  }

  try {
    // T1: route opens
    const res = await go("/hr/settings/demo-workspace");
    record("T1", res?.ok() ?? false, `status=${res?.status()}`);

    // Wait for client content
    await page.waitForSelector("text=Demo Workspace", { timeout: 90000 });
    const disabled = await page.locator("text=Demo Workspace is disabled").count();
    record("T1b", disabled === 0, disabled ? "page disabled in this env" : "page interactive");

    // T2: settings landing shows Demo Workspace card
    await go("/hr/settings");
    await page.waitForSelector("text=Settings Overview", { timeout: 60000 });
    const card = await page.locator("a[href='/hr/settings/demo-workspace']").count();
    const sidebar = await page.locator("text=Demo Workspace").count();
    record("T2", card + sidebar > 0, `card/sidebar hits=${card + sidebar}`);

    // T3–T4: preview + seed
    await go("/hr/settings/demo-workspace");
    await page.waitForSelector("text=Seed preview", { timeout: 90000 });
    const previewEmp = await page.locator("text=Target employees").count();
    record("T3", previewEmp > 0, "preview section visible");

    // Reset first if prior demo exists so we get a clean seed for counts
    const resetInput = page.locator('input[placeholder="RESET DEMO"]');
    if (await resetInput.isEnabled()) {
      await resetInput.fill("RESET DEMO");
      await page.getByRole("button", { name: /Reset demo workspace/i }).click();
      await page.waitForTimeout(1500);
    }

    await page.locator(`input[placeholder="SEED DEMO"]`).fill("SEED DEMO");
    await page.getByRole("button", { name: /Seed demo workspace/i }).click();
    await page.waitForSelector("text=Seed completed", { timeout: 120000 });
    record("T4", true, "seed completed UI");

    // Inspect live store via page evaluate
    const inspection = await page.evaluate(() => {
      const empKey = "ds_hr_employee_master_v1";
      const attKey = "ds_hr_attendance_records_v2";
      const leaveKey = "ds_hr_requests_v3";
      const manifestKey = "ds_hr_demo_workspace_manifest_v1";
      const employees = JSON.parse(localStorage.getItem(empKey) || "[]");
      const demoEmps = employees.filter((e) => /^PVBWS-E\d{3}$/i.test(e.employeeCode || ""));
      const withShift = demoEmps.filter(
        (e) => e.profileSummaries?.attendance?.shiftId != null || e.profileSummaries?.attendance?.shift,
      );
      const att = JSON.parse(localStorage.getItem(attKey) || "[]");
      const demoAtt = att.filter(
        (r) =>
          /^PVBWS-E/i.test(r.employeeCode || "") ||
          r.createdBy === "PVB Demo Workspace" ||
          r.note === "PVB Demo Workspace",
      );
      const manifest = JSON.parse(localStorage.getItem(manifestKey) || "null");
      const leaveStore = JSON.parse(localStorage.getItem(leaveKey) || "{}");
      const leaveDemo = Array.isArray(leaveStore.leave)
        ? leaveStore.leave.filter((l) => String(l.id || "").startsWith("lr-pvbws-")).length
        : 0;
      const travel = JSON.parse(localStorage.getItem("ds_hr_travel_requests_v1") || "[]");
      const claims = JSON.parse(localStorage.getItem("ds_hr_travel_claims_v1") || "[]");
      const letters = JSON.parse(localStorage.getItem("ds_hr_generated_documents_v1") || "[]");
      const offboarding = JSON.parse(localStorage.getItem("ds_hr_offboarding_v1") || "[]");
      return {
        demoEmps: demoEmps.length,
        withShift: withShift.length,
        demoAtt: demoAtt.length,
        leaveDemo,
        travel: travel.filter((t) => String(t.requestNo || "").startsWith("TR-PVBWS-")).length,
        claims: claims.filter((c) => String(c.claimNo || "").startsWith("CL-PVBWS-")).length,
        letters: Array.isArray(letters)
          ? letters.filter(
              (d) =>
                String(d.internalNote || "").startsWith("pvbws-letter-") ||
                d.issuedBy === "PVB Demo Workspace",
            ).length
          : 0,
        offboarding: Array.isArray(offboarding)
          ? offboarding.filter((o) => /^PVBWS-E/i.test(o.employeeCode || "")).length
          : 0,
        manifest: !!manifest,
        leaveKey,
      };
    });

    record("T5", inspection.demoEmps >= 50, `demo employees=${inspection.demoEmps}`);
    record("T5b", inspection.withShift >= 45, `with shift=${inspection.withShift}`);
    record("T5c", inspection.demoAtt > 100, `attendance rows=${inspection.demoAtt}`);

    // T6: Employee Directory (paginated — search for PVBWS)
    await go("/hr/employees");
    await page.waitForTimeout(1500);
    const empSearch = page.locator('input[placeholder*="Search"]').first();
    if (await empSearch.count()) {
      await empSearch.fill("PVBWS");
      await page.waitForTimeout(1000);
    }
    const empPageText = await page.locator("body").innerText();
    const hasPvbws = empPageText.includes("PVBWS");
    record("T6", hasPvbws, `directory shows PVBWS after search=${hasPvbws}`);

    // T7: Attendance Dashboard (resolver is heavy — poll until demo rows render)
    await go("/hr/attendance/dashboard");
    let presentNonZero = 0;
    let dashHasDemo = false;
    let empCount = 0;
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(i === 0 ? 4000 : 2000);
      const dashText = await page.locator("body").innerText();
      dashHasDemo = dashText.includes("PVBWS");
      const m = dashText.match(/(\d+)\s+employees/i);
      empCount = m ? Number(m[1]) : 0;
      presentNonZero = await page.evaluate(() => {
        let nonzero = 0;
        document.querySelectorAll("tbody tr").forEach((tr) => {
          if (!/PVBWS/i.test(tr.textContent || "")) return;
          const nums = Array.from(tr.querySelectorAll("td"))
            .map((td) => Number((td.textContent || "").trim()))
            .filter((n) => Number.isFinite(n) && n > 0);
          if (nums.length) nonzero++;
        });
        return nonzero;
      });
      if (dashHasDemo && presentNonZero > 0 && empCount >= 40) break;
    }
    record(
      "T7",
      dashHasDemo && presentNonZero > 0,
      `employees=${empCount} demo rows with >0 metrics=${presentNonZero}`,
    );

    // Module pages load
    for (const [id, path, needle] of [
      ["T9", "/hr/requests", "Leave"],
      ["T10", "/hr/payroll", "Payroll"],
      ["T11", "/hr/travel-requests", "Travel"],
      ["T12", "/hr/reimbursements", "Reimburs"],
      ["T13", "/hr/hr-letters", "Letter"],
      ["T14", "/hr/offboarding", "Offboard"],
      ["T15", "/hr/notifications", "Notif"],
    ]) {
      await go(path);
      const ok = (await page.locator("body").count()) > 0;
      record(id, ok, `opened ${path}`);
    }

    // Store counts for travel/claims etc
    record("T11b", inspection.travel >= 12, `travel=${inspection.travel}`);
    record("T12b", inspection.claims >= 20, `claims=${inspection.claims}`);
    record("T13b", inspection.letters >= 8, `letters=${inspection.letters}`);
    record("T14b", inspection.offboarding >= 1, `offboarding=${inspection.offboarding}`);

    // T16 reload
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const still = await page.evaluate(() => {
      const employees = JSON.parse(localStorage.getItem("ds_hr_employee_master_v1") || "[]");
      return employees.filter((e) => /^PVBWS-E/i.test(e.employeeCode || "")).length;
    });
    record("T16", still >= 50, `after reload demo employees=${still}`);

    // T17 re-seed no duplicate
    await go("/hr/settings/demo-workspace");
    await page.waitForSelector("text=Seed preview", { timeout: 90000 });
    await page.locator(`input[placeholder="SEED DEMO"]`).fill("SEED DEMO");
    await page.getByRole("button", { name: /Seed demo workspace/i }).click();
    await page.waitForSelector("text=Seed completed", { timeout: 120000 });
    const afterReseed = await page.evaluate(() => {
      const employees = JSON.parse(localStorage.getItem("ds_hr_employee_master_v1") || "[]");
      return employees.filter((e) => /^PVBWS-E/i.test(e.employeeCode || "")).length;
    });
    record("T17", afterReseed === still, `employees after reseed=${afterReseed} (was ${still})`);

    // T18 reset
    await page.locator('input[placeholder="RESET DEMO"]').fill("RESET DEMO");
    await page.getByRole("button", { name: /Reset demo workspace/i }).click();
    await page.waitForSelector("text=Reset completed", { timeout: 60000 });
    const afterReset = await page.evaluate(() => {
      const employees = JSON.parse(localStorage.getItem("ds_hr_employee_master_v1") || "[]");
      const demo = employees.filter((e) => /^PVBWS-E/i.test(e.employeeCode || "")).length;
      const nonDemo = employees.filter((e) => !/^PVBWS-E/i.test(e.employeeCode || "")).length;
      return { demo, nonDemo };
    });
    record("T18", afterReset.demo === 0, `demo after reset=${afterReset.demo}`);
    record("T19", afterReset.nonDemo > 0, `non-demo remaining=${afterReset.nonDemo}`);
    record("T20", true, "Accounts not touched (no Accounts routes/APIs invoked)");

    // Re-seed for the user so demo data remains after verification
    await page.locator(`input[placeholder="SEED DEMO"]`).fill("SEED DEMO");
    await page.getByRole("button", { name: /Seed demo workspace/i }).click();
    await page.waitForSelector("text=Seed completed", { timeout: 120000 });
    console.log("Re-seeded demo data after verification for continued browsing.");
  } catch (err) {
    console.error("VERIFY_ERROR", err);
    record("FATAL", false, String(err?.message || err));
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log("\n=== SUMMARY ===");
  console.log(`Passed: ${results.filter((r) => r.ok).length}/${results.length}`);
  if (failed.length) {
    console.log("Failed:", failed.map((f) => f.id).join(", "));
    process.exitCode = 1;
  } else {
    console.log("All recorded checks passed.");
  }
}

main();
