/**
 * Functional route smoke — opens LIVE HRMS routes in Chromium.
 * Does NOT claim full workflow PASS; records load + console errors.
 */
import { chromium } from "playwright";
import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const BASE = process.env.QA_BASE || "http://localhost:3000";

const ROUTES = [
  // Settings — Organization
  ["/hr/settings", "Settings Overview"],
  ["/hr/settings/organization/company", "Company Profile"],
  ["/hr/settings/organization/branches", "Branches"],
  ["/hr/settings/organization/departments", "Departments"],
  ["/hr/settings/organization/designations", "Designations"],
  ["/hr/settings/organization/employee-types", "Employee Types"],
  ["/hr/settings/organization/employment-statuses", "Employment Statuses"],
  // Onboarding
  ["/hr/settings/onboarding/mandatory-documents", "Mandatory Documents"],
  ["/hr/settings/onboarding/joining-checklist", "Joining Checklist"],
  ["/hr/settings/onboarding/welcome-workflow", "Welcome Workflow"],
  ["/hr/settings/onboarding/mandatory-profile", "Mandatory Profile Sections"],
  // Attendance settings
  ["/hr/settings/attendance/shift-setup", "Shift Setup"],
  ["/hr/settings/attendance/holiday-calendar", "Holiday Calendar"],
  ["/hr/settings/attendance/attendance-policy", "Attendance Policy"],
  ["/hr/settings/attendance/attendance-modes", "Attendance Modes"],
  // Leave settings
  ["/hr/settings/leave/leave-types", "Leave Types"],
  ["/hr/settings/leave/leave-policies", "Leave Policies"],
  // Payroll settings
  ["/hr/settings/payroll/salary-components", "Salary Components"],
  ["/hr/settings/payroll/salary-structures", "Salary Structures"],
  ["/hr/settings/payroll/payroll-cycle", "Payroll Cycle"],
  ["/hr/settings/payroll/lop-rules", "LOP Rules"],
  // Reimbursement settings
  ["/hr/settings/reimbursement/travel-policy", "Travel Policy"],
  // Statutory
  ["/hr/settings/statutory/pf", "PF"],
  ["/hr/settings/statutory/esi", "ESI"],
  ["/hr/settings/statutory/professional-tax", "Professional Tax"],
  ["/hr/settings/statutory/lwf", "LWF"],
  // Tax
  ["/hr/settings/tax/tax-regime", "Tax Regime"],
  ["/hr/settings/tax/tds", "TDS Settings"],
  // Templates / Notifications settings
  ["/hr/settings/templates", "Template Management"],
  ["/hr/settings/notifications", "HR Notification Settings"],
  // Core modules
  ["/hr/employees", "Employee Directory"],
  ["/hr/employees/new", "Add Employee"],
  ["/hr/attendance/dashboard", "Attendance Dashboard"],
  ["/hr/attendance/live", "Live Attendance"],
  ["/hr/attendance/daily", "Daily Attendance"],
  ["/hr/attendance/employees", "Employee Attendance"],
  ["/hr/attendance/roster", "Attendance Roster"],
  ["/hr/attendance/reports", "Attendance Reports"],
  ["/hr/attendance/sync", "Attendance Sync"],
  ["/hr/requests", "Leave Requests"],
  ["/hr/payroll", "Payroll"],
  ["/hr/payroll/run", "Run Payroll"],
  ["/hr/payroll/history", "Payroll History"],
  ["/hr/payroll/payslips", "Payslips"],
  ["/hr/reimbursements", "Reimbursements"],
  ["/hr/travel-requests", "Travel Requests"],
  ["/hr/hr-letters", "HR Letters"],
  ["/hr/offboarding", "Offboarding"],
  ["/hr/notifications", "Notifications"],
];

async function visit(page, path, label) {
  const errors = [];
  const pageErrors = [];
  const onConsole = (msg) => {
    if (msg.type() === "error") errors.push(msg.text().slice(0, 240));
  };
  const onPageError = (err) => pageErrors.push(String(err).slice(0, 240));
  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  let status = "FAIL";
  let detail = "";
  try {
    const res = await page.goto(`${BASE}${path}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    const http = res?.status() ?? 0;
    // Wait for possible Soft Nav / dynamic settle
    await page.waitForTimeout(1200);
    const bodyText = await page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
    const blank =
      !bodyText ||
      bodyText.trim().length < 20 ||
      /Application error|Unhandled Runtime Error|This page could not be found/i.test(bodyText);
    const overlayStuck = await page
      .locator('[data-navigation-pending], .navigation-pending')
      .count()
      .catch(() => 0);

    if (http >= 400) {
      status = "FAIL";
      detail = `HTTP ${http}`;
    } else if (blank) {
      status = "FAIL";
      detail = "blank/error page content";
    } else if (pageErrors.length) {
      status = "FAIL";
      detail = `pageerror: ${pageErrors[0]}`;
    } else {
      status = "PASS_LOAD";
      detail = `HTTP ${http}; consoleErrors=${errors.length}`;
    }
    if (overlayStuck > 0) detail += "; pending-overlay-present";
  } catch (e) {
    status = "FAIL";
    detail = String(e).slice(0, 200);
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }
  return { path, label, status, detail, consoleErrors: errors.slice(0, 3), pageErrors: pageErrors.slice(0, 3) };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];
  for (const [path, label] of ROUTES) {
    process.stderr.write(`… ${label}\n`);
    results.push(await visit(page, path, label));
  }

  // Extra: open first employee profile if directory has links
  try {
    await page.goto(`${BASE}/hr/employees`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1500);
    const href = await page
      .locator('a[href^="/hr/employees/"]')
      .first()
      .getAttribute("href")
      .catch(() => null);
    if (href && !href.endsWith("/new")) {
      results.push(await visit(page, href, "Employee Profile (first row)"));
      const editHref = href.replace(/\/?$/, "") + "/edit";
      results.push(await visit(page, editHref, "Employee Edit (first row)"));
    } else {
      results.push({
        path: "/hr/employees/[id]",
        label: "Employee Profile (first row)",
        status: "MANUAL",
        detail: "no employee link found",
        consoleErrors: [],
        pageErrors: [],
      });
    }
  } catch (e) {
    results.push({
      path: "/hr/employees/[id]",
      label: "Employee Profile drill",
      status: "FAIL",
      detail: String(e).slice(0, 200),
      consoleErrors: [],
      pageErrors: [],
    });
  }

  await browser.close();

  const fail = results.filter((r) => r.status === "FAIL");
  const pass = results.filter((r) => r.status === "PASS_LOAD");
  const manual = results.filter((r) => r.status === "MANUAL");
  const out = { summary: { pass: pass.length, fail: fail.length, manual: manual.length, total: results.length }, results };
  const outPath = join(tmpdir(), "pvb-qa-smoke.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log(JSON.stringify(out, null, 2));
  console.error(`Wrote ${outPath}`);
  process.exit(fail.length ? 2 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
