import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;
const BASE = process.env.NOTE_BASE_URL || "http://localhost:3000";

async function waitReady(page) {
  await page.waitForSelector("text=Particulars", { timeout: 45000 });
  await page.waitForTimeout(600);
}

async function clickSegment(page, label) {
  await page.getByRole("radio", { name: label, exact: true }).click();
  await page.waitForTimeout(400);
}

async function selectFirstOption(page, placeholder) {
  const trigger = page.getByRole("button", { name: placeholder }).first();
  await trigger.click();
  await page.waitForTimeout(300);
  const options = page.locator('[role="option"], button').filter({ hasText: /.+/ });
  // Prefer options inside the open popover
  const popoverBtns = page.locator('[data-radix-popper-content-wrapper] button');
  const count = await popoverBtns.count();
  if (count > 0) {
    // skip search input area — pick first list button with meaningful text
    for (let i = 0; i < count; i++) {
      const txt = (await popoverBtns.nth(i).innerText()).trim();
      if (txt && !/^search/i.test(txt) && txt.length > 1) {
        await popoverBtns.nth(i).click();
        await page.waitForTimeout(700);
        return txt;
      }
    }
  }
  // fallback: first visible list row after search input
  const listBtn = page.locator(".max-h-\\[220px\\] button, [class*='overflow-y-auto'] button").first();
  if (await listBtn.count()) {
    const txt = await listBtn.innerText();
    await listBtn.click();
    await page.waitForTimeout(700);
    return txt;
  }
  throw new Error(`No options for placeholder: ${placeholder}`);
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log("saved", name);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });

  // —— Credit Note ——
  await page.goto(`${BASE}/accounts/transactions/credit-notes/new?mode=fresh`, {
    waitUntil: "networkidle",
    timeout: 90000,
  });
  await waitReady(page);
  await shot(page, "cn-direct.png");

  await clickSegment(page, "Sales Invoice");
  await page.waitForTimeout(300);
  try {
    await selectFirstOption(page, "Select invoice");
  } catch (e) {
    console.warn("CN SI select:", e.message);
  }
  await page.waitForTimeout(800);
  await shot(page, "cn-sales-invoice.png");

  await clickSegment(page, "Sales Return");
  await page.waitForTimeout(300);
  try {
    await selectFirstOption(page, "Select sales return");
  } catch (e) {
    console.warn("CN SR select:", e.message);
  }
  await page.waitForTimeout(800);
  await shot(page, "cn-sales-return.png");

  // —— Debit Note ——
  await page.goto(`${BASE}/accounts/transactions/debit-notes/new`, {
    waitUntil: "networkidle",
    timeout: 90000,
  });
  await waitReady(page);
  await shot(page, "dn-direct.png");

  await clickSegment(page, "Purchase Invoice");
  await page.waitForTimeout(300);
  try {
    await selectFirstOption(page, "Select purchase invoice");
  } catch (e) {
    console.warn("DN PI select:", e.message);
  }
  await page.waitForTimeout(800);
  await shot(page, "dn-purchase-invoice.png");

  await clickSegment(page, "Purchase Return");
  await page.waitForTimeout(300);
  try {
    await selectFirstOption(page, "Select purchase return");
  } catch (e) {
    console.warn("DN PR select:", e.message);
  }
  await page.waitForTimeout(800);
  await shot(page, "dn-purchase-return.png");

  await browser.close();
  console.log("done");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
