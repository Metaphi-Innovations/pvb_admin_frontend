/**
 * Guard for `npm run dev`.
 *
 * Running `next build` (or `next start`) while a leftover production `.next`
 * is present causes the App Router to emit HTML documents for CSS URLs
 * (`Content-Type: text/html`). The browser then shows raw/unstyled pages
 * (serif headings, purple links, native buttons) until `.next` is cleared.
 *
 * If `.next` looks like a production build, wipe it before starting `next dev`.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const nextDir = path.join(root, ".next");

function isProductionNextCache(dir) {
  if (!fs.existsSync(dir)) return false;
  // Production `next build` always writes these; a healthy `next dev` cache
  // must not be treated as a deployable build output.
  const markers = [
    "BUILD_ID",
    "required-server-files.json",
    "prerender-manifest.json",
  ];
  return markers.every((name) => fs.existsSync(path.join(dir, name)));
}

if (isProductionNextCache(nextDir)) {
  console.warn(
    "\n[ensure-next-dev-cache] Production `.next` detected (BUILD_ID / required-server-files).",
  );
  console.warn(
    "[ensure-next-dev-cache] This is the usual cause of global CSS disappearing in dev",
  );
  console.warn(
    "[ensure-next-dev-cache] (CSS URLs returning HTML). Clearing `.next` before next dev…\n",
  );
  fs.rmSync(nextDir, { recursive: true, force: true });
}
