/**
 * Defer heavy localStorage demo seeding so route clicks stay responsive.
 */

const inflight = new Set<string>();

export function scheduleDeferredDemoSeed(key: string, task: () => void): void {
  if (typeof window === "undefined") return;
  if (inflight.has(key)) return;
  inflight.add(key);

  const run = () => {
    try {
      task();
    } catch (err) {
      console.error(`[accounts] deferred seed "${key}" failed:`, err);
    } finally {
      inflight.delete(key);
    }
  };

  window.setTimeout(run, 0);
}
