/**
 * Deeper functional smoke — interactions that can be automated safely.
 * Does NOT finalize payroll / complete offboarding (destructive demo risk).
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function check(page, name, fn) {
  try {
    const detail = await fn();
    return { name, status: "PASS", detail: detail || "ok" };
  } catch (e) {
    return { name, status: "FAIL", detail: String(e).slice(0, 240) };
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];

  results.push(
    await check(page, "Roster shows Not Assigned or shift labels", async () => {
      await page.goto(`${BASE}/hr/attendance/roster`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(1500);
      const text = await page.locator("body").innerText();
      if (!/Attendance Roster/i.test(text)) throw new Error("title missing");
      if (!/Not Assigned|Assigned Shift/i.test(text)) throw new Error("assignment columns missing");
      if (!/Employee Profile → Attendance/i.test(text)) throw new Error("footer instruction missing");
      return "roster UI ok";
    }),
  );

  results.push(
    await check(page, "Directory has no locked workspace tabs", async () => {
      await page.goto(`${BASE}/hr/employees`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(1500);
      const text = await page.locator("body").innerText();
      if (/Profile Sections|locked/i.test(text) && /coming soon/i.test(text)) {
        throw new Error("locked fake tabs present");
      }
      if (!/Employee|Directory|Add/i.test(text)) throw new Error("directory shell missing");
      return "directory ok";
    }),
  );

  results.push(
    await check(page, "Employee Edit is full profile mode", async () => {
      await page.goto(`${BASE}/hr/employees/1/edit`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(2000);
      const text = await page.locator("body").innerText();
      const keys = ["Personal", "Employment", "Bank", "Education", "Experience"];
      const missing = keys.filter((k) => !new RegExp(k, "i").test(text));
      if (missing.length) throw new Error(`missing sections: ${missing.join(",")}`);
      return "edit profile sections present";
    }),
  );

  results.push(
    await check(page, "Leave requests page loads pending UI", async () => {
      await page.goto(`${BASE}/hr/requests`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(1500);
      const text = await page.locator("body").innerText();
      if (!/Pending|Leave|History|Approvals/i.test(text)) throw new Error("leave UI missing");
      return "leave requests ok";
    }),
  );

  results.push(
    await check(page, "Payroll page tabs present", async () => {
      await page.goto(`${BASE}/hr/payroll`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(1500);
      const text = await page.locator("body").innerText();
      if (!/Payroll/i.test(text)) throw new Error("payroll title missing");
      if (!/Process|History|Run/i.test(text)) throw new Error("payroll tabs/actions missing");
      return "payroll shell ok";
    }),
  );

  results.push(
    await check(page, "HR Letters loads without hang", async () => {
      await page.goto(`${BASE}/hr/hr-letters`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(2000);
      const text = await page.locator("body").innerText();
      if (!/Letter|Employee|Template|Generate/i.test(text)) throw new Error("hr letters UI missing");
      return "hr letters ok";
    }),
  );

  results.push(
    await check(page, "Reimbursements loads", async () => {
      await page.goto(`${BASE}/hr/reimbursements`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(1500);
      const text = await page.locator("body").innerText();
      if (!/Reimbursement|Pending|Processing|Claim/i.test(text)) throw new Error("reimb UI missing");
      return "reimbursements ok";
    }),
  );

  results.push(
    await check(page, "Travel Requests loads", async () => {
      await page.goto(`${BASE}/hr/travel-requests`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(1500);
      const text = await page.locator("body").innerText();
      if (!/Travel/i.test(text)) throw new Error("travel UI missing");
      return "travel ok";
    }),
  );

  results.push(
    await check(page, "Offboarding loads", async () => {
      await page.goto(`${BASE}/hr/offboarding`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(1500);
      const text = await page.locator("body").innerText();
      if (!/Offboarding|Pending|Active|Completed/i.test(text)) throw new Error("offboarding UI missing");
      return "offboarding ok";
    }),
  );

  results.push(
    await check(page, "Notifications center loads", async () => {
      await page.goto(`${BASE}/hr/notifications`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(1500);
      const text = await page.locator("body").innerText();
      if (!/Notification/i.test(text)) throw new Error("notifications UI missing");
      return "notifications ok";
    }),
  );

  results.push(
    await check(page, "Sidebar Attendance order labels", async () => {
      await page.goto(`${BASE}/hr/attendance/dashboard`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(1200);
      const nav = await page.locator("aside, nav").first().innerText().catch(() => "");
      const body = await page.locator("body").innerText();
      const hay = nav + "\n" + body;
      const order = [
        "Attendance Dashboard",
        "Live Attendance",
        "Daily Attendance",
        "Employee Attendance",
        "Attendance Roster",
        "Attendance Reports",
        "Attendance Sync",
      ];
      let last = -1;
      for (const label of order) {
        const idx = hay.indexOf(label);
        if (idx < 0) throw new Error(`missing nav label: ${label}`);
        if (idx < last) throw new Error(`order wrong around ${label}`);
        last = idx;
      }
      if (/Company Roster/.test(hay)) throw new Error("old Company Roster label still present");
      return "sidebar order ok";
    }),
  );

  results.push(
    await check(page, "Nav: Payroll → HR Letters no blank", async () => {
      await page.goto(`${BASE}/hr/payroll`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(1000);
      await page.goto(`${BASE}/hr/hr-letters`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(1500);
      const text = await page.locator("body").innerText();
      if (text.trim().length < 40) throw new Error("blank after nav");
      if (!/Letter/i.test(text)) throw new Error("hr letters not rendered");
      return "cross-nav ok";
    }),
  );

  await browser.close();
  const fail = results.filter((r) => r.status === "FAIL");
  console.log(JSON.stringify({ fail: fail.length, pass: results.length - fail.length, results }, null, 2));
  process.exit(fail.length ? 2 : 0);
})();
