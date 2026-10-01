import fs from "fs";
import path from "path";

const root = path.resolve(".");
const files = [
  "lib/accounts/banking-demo-seed.ts",
  "lib/accounts/ledger-balance-seed.ts",
  "lib/accounts/day-book-demo-seed.ts",
  "lib/accounts/general-ledger-demo-seed.ts",
  "lib/accounts/manual-bank-reconciliation-demo-seed.ts",
  "lib/accounts/pending-invoice-seed.ts",
  "lib/accounts/accounts-mock-data.ts",
  "lib/accounts/audit-trail-data.ts",
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
  c = c.replace(/date: "2026-[^"]+"/g, () => `date: demoDateAt(${next()})`);
  c = c.replace(/invoiceDate: "2026-[^"]+"/g, () => `invoiceDate: demoDateAt(${next()})`);
  c = c.replace(/dueDate: "2026-[^"]+"/g, () => `dueDate: demoAddDays(demoDateAt(${next()}), 30)`);
  c = c.replace(/dispatchDate: "2026-[^"]+"/g, () => `dispatchDate: demoDateAt(${next()})`);
  c = c.replace(/creditNoteDate: "2026-[^"]+"/g, () => `creditNoteDate: demoDateAt(${next()})`);
  c = c.replace(/followUpDate: "2026-[^"]+"/g, () => `followUpDate: demoDateAt(${next()})`);
  c = c.replace(/nextFollowUpDate: "2026-[^"]+"/g, () => `nextFollowUpDate: demoDateAt(${next()})`);
  c = c.replace(/promiseToPayDate: "2026-[^"]+"/g, () => `promiseToPayDate: demoDateAt(${next()})`);
  c = c.replace(/lastCollection: "2026-[^"]+"/g, () => `lastCollection: demoDateAt(${next()})`);
  c = c.replace(/createdDate: "2026-[^"]+"/g, () => `createdDate: demoToday()`);
  c = c.replace(/updatedDate: "2026-[^"]+"/g, () => `updatedDate: demoToday()`);
  c = c.replace(/dateTime: "2026-[^"]+"/g, () => `dateTime: demoTimestamp(demoDateAt(${next()}))`);
  c = c.replace(/openingBalanceDate: "2026-[^"]+"/g, () => `openingBalanceDate: demoFinancialYearStart()`);
  c = c.replace('const FY_OPENING_DATE = "2026-04-01";', "const FY_OPENING_DATE = demoFinancialYearStart();");
  c = c.replace(/postBalancedJournal\("2026-[^"]+"/g, (m) =>
    m.replace(/"2026-[^"]+"/, `demoDateAt(${next()})`),
  );
  c = c.replace(/BANKING_DEMO_SEED_VERSION = "2026[^"]+"/g, 'BANKING_DEMO_SEED_VERSION = "relative-dates-v1"');
  c = c.replace(/FUND_TRANSFER_DEMO_SEED_VERSION = "2026[^"]+"/g, 'FUND_TRANSFER_DEMO_SEED_VERSION = "relative-dates-v1"');
  c = c.replace(/DAY_BOOK_DEMO_SEED_VERSION = "2026[^"]+"/g, 'DAY_BOOK_DEMO_SEED_VERSION = "relative-dates-v1"');
  c = c.replace(/GENERAL_LEDGER_DEMO_SEED_VERSION = "2026[^"]+"/g, 'GENERAL_LEDGER_DEMO_SEED_VERSION = "relative-dates-v1"');
  c = c.replace(/MANUAL_RECON_DEMO_VERSION = "2026[^"]+"/g, 'MANUAL_RECON_DEMO_VERSION = "relative-dates-v1"');
  c = c.replace(/MOCK_SEED_VERSION = 2/g, "MOCK_SEED_VERSION = 3");
  c = c.replace(/SEED_VERSION = 1/g, "SEED_VERSION = 2");
  c = c.replace(/PENDING_INVOICE_SEED_VERSION = 3/g, "PENDING_INVOICE_SEED_VERSION = 4");
  fs.writeFileSync(file, c);
  console.log("Updated", rel, "date replacements:", idx);
}
