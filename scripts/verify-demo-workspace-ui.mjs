/**
 * Focused UI checks for Employee Directory + Attendance Dashboard after demo seed.
 */
import { chromium } from "playwright";

const BASE = process.env.DEMO_VERIFY_BASE || "http://localhost:3000";

async function go(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
}

async function ensureSeeded(page) {
  await go(page, "/hr/settings/demo-workspace");
  await page.waitForSelector("text=Seed preview", { timeout: 90000 });
  const demoCount = await page.evaluate(() => {
    const emps = JSON.parse(localStorage.getItem("ds_hr_employee_master_v1") || "[]");
    return emps.filter((e) => /^PVBWS-E/i.test(e.employeeCode || "")).length;
  });
  if (demoCount >= 50) {
    console.log(`Already seeded (${demoCount} demo employees)`);
    return;
  }
  await page.locator('input[placeholder="SEED DEMO"]').fill("SEED DEMO");
  await page.getByRole("button", { name: /Seed demo workspace/i }).click();
  await page.waitForSelector("text=Seed completed", { timeout: 180000 });
  console.log("Seeded");
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(120000);

  try {
    await ensureSeeded(page);

    // Store-level attendance metric sample for current month
    const storeCheck = await page.evaluate(() => {
      const emps = JSON.parse(localStorage.getItem("ds_hr_employee_master_v1") || "[]");
      const demo = emps.filter((e) => /^PVBWS-E/i.test(e.employeeCode || ""));
      const att = JSON.parse(localStorage.getItem("ds_hr_attendance_records_v2") || "[]");
      const now = new Date();
      const mk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const monthRows = att.filter(
        (r) => /^PVBWS-E/i.test(r.employeeCode || "") && String(r.date || "").startsWith(mk),
      );
      const withPunches = monthRows.filter((r) => (r.punches || []).length > 0).length;
      const withShift = demo.filter(
        (e) => e.profileSummaries?.attendance?.shiftId != null,
      ).length;
      return {
        demo: demo.length,
        withShift,
        monthKey: mk,
        monthRows: monthRows.length,
        withPunches,
        sample: demo.slice(0, 3).map((e) => ({
          code: e.employeeCode,
          shiftId: e.profileSummaries?.attendance?.shiftId,
          shift: e.profileSummaries?.attendance?.shift,
        })),
      };
    });
    console.log("STORE", JSON.stringify(storeCheck, null, 2));

    // T6: search directory for PVBWS
    await go(page, "/hr/employees");
    await page.waitForTimeout(2000);
    const search = page.locator('input[placeholder*="Search"]').first();
    if (await search.count()) {
      await search.fill("PVBWS");
      await page.waitForTimeout(1000);
    }
    const body = await page.locator("body").innerText();
    const t6 = body.includes("PVBWS") || /employee00\d@example\.com/i.test(body);
    const footerMatch = body.match(/of\s+(\d+)\s+records/i);
    console.log(t6 ? "PASS T6" : "FAIL T6", `footer=${footerMatch?.[0] || "n/a"} hasPVBWS=${body.includes("PVBWS")}`);

    // T7: attendance dashboard — wait for employee count
    await go(page, "/hr/attendance/dashboard");
    await page.waitForTimeout(5000);
    // Wait until footer shows many employees (resolver can be slow)
    let dashOk = false;
    let detail = "";
    for (let i = 0; i < 12; i++) {
      const text = await page.locator("body").innerText();
      const m = text.match(/(\d+)\s+employees/i);
      const count = m ? Number(m[1]) : 0;
      const hasDemo = text.includes("PVBWS");
      const nonzero = await page.evaluate(() => {
        let n = 0;
        document.querySelectorAll("tbody tr").forEach((tr) => {
          if (!/PVBWS/i.test(tr.textContent || "")) return;
          const nums = Array.from(tr.querySelectorAll("td"))
            .map((td) => Number((td.textContent || "").trim()))
            .filter((x) => Number.isFinite(x) && x > 0);
          if (nums.length) n++;
        });
        return n;
      });
      detail = `employees=${count} hasDemo=${hasDemo} nonzeroRows=${nonzero}`;
      if (count >= 40 && hasDemo && nonzero > 0) {
        dashOk = true;
        break;
      }
      await page.waitForTimeout(2000);
    }
    console.log(dashOk ? "PASS T7" : "FAIL T7", detail);

    // Screenshot for evidence
    await page.screenshot({
      path: "scripts/verify-attendance-dashboard.png",
      fullPage: true,
    });
    console.log("Wrote scripts/verify-attendance-dashboard.png");

    if (!t6 || !dashOk) process.exitCode = 1;
  } catch (e) {
    console.error("ERROR", e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
