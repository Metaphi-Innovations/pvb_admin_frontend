import fs from "fs";
import path from "path";

const root = path.resolve(".");
const files = [
  "lib/accounts/day-book-demo-data.ts",
  "app/(app)/accounts/reports/sales-register/sales-register-data.ts",
  "app/(app)/accounts/reports/purchase-register/purchase-register-data.ts",
  "app/(app)/accounts/reports/inventory-register/inventory-register-data.ts",
  "app/(app)/accounts/reports/stock-valuation/stock-valuation-data.ts",
  "app/(app)/accounts/expenses/expense-data.ts",
  "app/(app)/accounts/data.ts",
];

const importLine =
  "import { demoDateAt } from \"@/lib/accounts/demo-date-utils\";\n";

for (const rel of files) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  let c = fs.readFileSync(file, "utf8");
  if (!c.includes("demo-date-utils")) {
    c = importLine + c;
  }
  let idx = 0;
  c = c.replace(/"20(25|26)-[^"]+"/g, () => `demoDateAt(${idx++})`);
  fs.writeFileSync(file, c);
  console.log("Updated", rel, idx);
}
