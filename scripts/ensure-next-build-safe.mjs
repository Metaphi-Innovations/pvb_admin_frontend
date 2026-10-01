/**
 * Guard for `npm run build`.
 *
 * Building while `next dev` is still running overwrites `.next` with production
 * assets. The live dev server then serves HTML for CSS/JS chunk URLs until the
 * cache is wiped — the recurring "unstyled app" failure.
 *
 * Refuse to build if something is already listening on the common Next ports.
 */
import net from "node:net";

const PORTS = [3000, 3001];

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
  });
}

const busy = [];
for (const port of PORTS) {
  if (await portInUse(port)) busy.push(port);
}

if (busy.length > 0) {
  console.error(
    `\n[ensure-next-build-safe] Refusing to run \`next build\` while port(s) ${busy.join(
      ", ",
    )} are in use.`,
  );
  console.error(
    "[ensure-next-build-safe] Stop \`npm run dev\` / \`next start\` first, then build.",
  );
  console.error(
    "[ensure-next-build-safe] Building over a live `.next` corrupts CSS/JS and",
  );
  console.error(
    "[ensure-next-build-safe] causes global styles to disappear in the browser.\n",
  );
  process.exit(1);
}
