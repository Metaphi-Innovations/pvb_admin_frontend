// One-shot: wrap sync Client imports in accounts page.tsx with lazy loaders.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "app", "(app)", "accounts");

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, files);
    else if (ent.name === "page.tsx") files.push(full);
  }
  return files;
}

function transform(content) {
  if (/lazyAccountsPage|createLazyClientPage/.test(content)) return null;
  if (/\bdynamic\s*\(/.test(content)) return null;
  if (/redirect\s*\(/.test(content)) return null;
  if (/AccountsPageShell/.test(content) && !/import\s+\w+Client/.test(content)) return null;

  const defaultImportRe = /^import\s+(\w+)\s+from\s+["']([^"']+)["'];?\r?\n/m;
  const m = content.match(defaultImportRe);
  if (!m) return null;

  const [, compName, importPath] = m;
  if (!compName.endsWith("Client")) return null;

  const isUseClient = content.trimStart().startsWith('"use client"');
  const body = content.replace(defaultImportRe, "").replace(/^"use client";\s*\r?\n?/, "").trim();

  if (isUseClient) {
    return `"use client";

import { createLazyClientPage } from "@/lib/createLazyClientPage";

const ${compName} = createLazyClientPage(() => import("${importPath}"));

${body}
`;
  }

  return `import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const ${compName} = lazyAccountsPage(() => import("${importPath}"));

${body}
`;
}

let count = 0;
for (const file of walk(root)) {
  const content = fs.readFileSync(file, "utf8");
  const next = transform(content);
  if (!next) continue;
  fs.writeFileSync(file, next);
  console.log("updated", path.relative(root, file));
  count += 1;
}
console.log("total updated:", count);
