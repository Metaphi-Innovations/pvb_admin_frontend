/**
 * One-time HR demo data bootstrap — runs without opening Demo Workspace.
 * Clients get seeded employees / payroll / payslips / letters / Form 16 on first HR visit.
 */

import {
  DEMO_WORKSPACE_SEEDED_EVENT,
  isHrDemoWorkspaceEnabled,
} from "./demo-workspace-constants";
import { loadDemoManifest } from "./demo-workspace-manifest";
import { runDemoWorkspaceSeed } from "./demo-workspace-seed";

/** Bump to force one more silent auto-seed after seed/pipeline fixes. */
export const HR_DEMO_AUTO_SEED_REVISION = 6;
const AUTO_SEED_REV_KEY = "ds_hr_demo_auto_seed_rev_v1";

function readAutoSeedRev(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(window.localStorage.getItem(AUTO_SEED_REV_KEY) || "0") || 0;
  } catch {
    return 0;
  }
}

function writeAutoSeedRev(rev: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTO_SEED_REV_KEY, String(rev));
  } catch {
    /* ignore quota on tiny key */
  }
}

export function shouldAutoSeedHrDemo(): boolean {
  if (typeof window === "undefined") return false;
  if (!isHrDemoWorkspaceEnabled()) return false;
  if (readAutoSeedRev() >= HR_DEMO_AUTO_SEED_REVISION) return false;
  return true;
}

/**
 * Ensure demo data exists once per browser (revision-gated).
 * Safe to call on every HR layout mount — no-ops after successful auto-seed.
 */
export function ensureHrDemoDataOnce(): {
  ran: boolean;
  ok: boolean;
  error?: string;
  warnings?: string[];
} {
  if (!shouldAutoSeedHrDemo()) {
    return { ran: false, ok: true };
  }

  try {
    const result = runDemoWorkspaceSeed();
    if (result.ok) {
      writeAutoSeedRev(HR_DEMO_AUTO_SEED_REVISION);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(DEMO_WORKSPACE_SEEDED_EVENT, {
            detail: { counts: result.manifest.counts, auto: true },
          }),
        );
      }
      return { ran: true, ok: true, warnings: result.warnings };
    }

    // If seed failed but a prior manifest exists, don't hammer every navigation
    if (loadDemoManifest()) {
      writeAutoSeedRev(HR_DEMO_AUTO_SEED_REVISION);
    }
    return {
      ran: true,
      ok: false,
      error: result.error || "Demo seed failed.",
      warnings: result.warnings,
    };
  } catch (err) {
    return {
      ran: true,
      ok: false,
      error: err instanceof Error ? err.message : "Demo seed failed.",
    };
  }
}
