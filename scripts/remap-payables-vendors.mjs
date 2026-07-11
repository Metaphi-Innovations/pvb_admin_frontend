import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const file = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../lib/accounts/payables-demo-seed.ts",
);
let content = fs.readFileSync(file, "utf8");
content = content.replace(/vendorId: ([3-8])/g, (_match, id) => {
  const n = Number(id);
  return `vendorId: ${n % 2 === 0 ? 2 : 1}`;
});
content = content.replace(
  'PAYABLES_PAGE_SEED_VERSION = "relative-dates-v3"',
  'PAYABLES_PAGE_SEED_VERSION = "clean-coa-v1"',
);
fs.writeFileSync(file, content);
console.log("Remapped vendorIds in payables-demo-seed.ts");
