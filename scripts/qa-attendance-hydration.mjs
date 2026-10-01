/**
 * Re-check Live / Daily / Dashboard attendance after hydration fix.
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const ROUTES = [
  ["/hr/attendance/dashboard", "Attendance Dashboard"],
  ["/hr/attendance/live", "Live Attendance"],
  ["/hr/attendance/daily", "Daily Attendance"],
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const out = [];
  for (const [path, label] of ROUTES) {
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 200)));
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 90000 }).catch(async () => {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    });
    await page.waitForTimeout(2000);
    const text = await page.locator("body").innerText();
    const ok =
      pageErrors.length === 0 &&
      text.length > 40 &&
      !/Unhandled Runtime Error|This page could not be found/i.test(text);
    out.push({ label, path, ok, pageErrors, snippet: text.slice(0, 120).replace(/\s+/g, " ") });
    page.removeAllListeners("pageerror");
  }
  await browser.close();
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.every((r) => r.ok) ? 0 : 2);
})();
