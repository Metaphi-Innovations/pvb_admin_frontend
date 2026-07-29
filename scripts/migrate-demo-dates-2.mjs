import fs from "fs";
import path from "path";

const root = path.resolve(".");
const files = [
  "lib/accounts/manual-bank-reconciliation-demo-seed.ts",
  "app/(app)/accounts/reports/cash-book/cash-book-demo-seed.ts",
  "app/(app)/accounts/reports/bank-book/bank-book-demo-seed.ts",
  "app/(app)/accounts/reports/stock-ledger/stock-ledger-data.ts",
  "app/(app)/accounts/reports/inventory-register/inventory-register-data.ts",
  "app/(app)/accounts/reports/stock-valuation/stock-valuation-data.ts",
  "app/(app)/accounts/reports/sales-register/sales-register-data.ts",
  "app/(app)/accounts/reports/purchase-register/purchase-register-data.ts",
  "lib/accounts/day-book-demo-data.ts",
  "app/(app)/accounts/purchase-invoices/purchase-invoice-seed.ts",
  "app/(app)/accounts/masters/chart-of-accounts/coa-demo-transactions.ts",
  "app/(app)/accounts/expenses/expense-data.ts",
];

const importLine =
  "import { demoAddDays, demoDateAt, demoFinancialYearStart, demoToday, demoTimestamp } from \"@/lib/accounts/demo-date-utils\";\n";

for (const rel of files) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.log("Skip missing", rel);
    continue;
  }
  let c = fs.readFileSync(file, "utf8");
  if (!c.includes("demo-date-utils")) {
    c = importLine + c;
  }
  let idx = 0;
  const next = () => idx++;
  c = c.replace(/transactionDate: "2026-[^"]+"/g, () => `transactionDate: demoDateAt(${next()})`);
  c = c.replace(/date: "2026-[^"]+"/g, () => `date: demoDateAt(${next()})`);
  c = c.replace(/invoiceDate: "2026-[^"]+"/g, () => `invoiceDate: demoDateAt(${next()})`);
  c = c.replace(/dueDate: "2026-[^"]+"/g, () => `dueDate: demoAddDays(demoDateAt(${next()}), 30)`);
  c = c.replace(/asOnDate: "2026-[^"]+"/g, () => `asOnDate: demoToday()`);
  c = c.replace(/BANK_BOOK_DEMO_VERSION = "2026[^"]+"/g, 'BANK_BOOK_DEMO_VERSION = "relative-dates-v1"');
  c = c.replace(/ds_cash_book_demo_seed_v2/g, "ds_cash_book_demo_seed_v3");
  fs.writeFileSync(file, c);
  console.log("Updated", rel, "replacements:", idx);
}
