/**
 * Lazy, section-scoped demo data bootstrap for the Accounts module.
 * Each nav group loads only its own seed — never the full accounts ecosystem at once.
 */

import type { AccountsNavGroupId } from "./accounts-nav";

const bootstrappedSections = new Set<AccountsNavGroupId>();

export function isAccountsSectionBootstrapped(groupId: AccountsNavGroupId): boolean {
  return bootstrappedSections.has(groupId);
}

/** Queue section seed once — no-op if already bootstrapped. */
export function scheduleAccountsSectionSeed(groupId: AccountsNavGroupId): void {
  if (typeof window === "undefined") return;
  if (bootstrappedSections.has(groupId)) return;

  const run = () => ensureAccountsSectionData(groupId);
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 3000 });
    return;
  }
  window.setTimeout(run, 200);
}

export function ensureAccountsSectionData(groupId: AccountsNavGroupId): void {
  if (typeof window === "undefined") return;
  if (bootstrappedSections.has(groupId)) return;
  bootstrappedSections.add(groupId);

  switch (groupId) {
    case "coa":
      void import("./accounts-demo-seed")
        .then((m) => {
          m.seedCoaSectionDemoData();
          return import("./gst-coa-sync");
        })
        .then((m) => m.syncGstCoaFromMaster())
        .catch((err) => console.error("[accounts] COA section bootstrap failed:", err));
      break;
    case "transactions":
      void import("./accounts-demo-seed")
        .then((m) => m.seedTransactionsSectionDemoData())
        .catch((err) => console.error("[accounts] transactions section bootstrap failed:", err));
      break;
    case "receivables":
      void import("./accounts-demo-seed")
        .then((m) => m.seedTransactionsSectionDemoData())
        .then(() => import("./receivables-demo-seed"))
        .then((m) => m.ensureReceivablesDemoData())
        .catch((err) => console.error("[accounts] receivables section bootstrap failed:", err));
      break;
    case "payables":
      void import("./accounts-demo-seed")
        .then((m) => m.ensureAccountsCoreDemoData())
        .then(() => import("./payables-demo-seed"))
        .then((m) => m.ensurePayablesDemoOnPageLoad())
        .catch((err) => console.error("[accounts] payables section bootstrap failed:", err));
      break;
    case "banking":
      void import("./accounts-demo-seed")
        .then((m) => m.ensureAccountsCoreDemoData())
        .then(() => import("./banking-demo-seed"))
        .then((m) => m.ensureBankingDemoOnPageLoad())
        .catch((err) => console.error("[accounts] banking section bootstrap failed:", err));
      break;
    case "reports":
      void import("./accounts-demo-seed")
        .then((m) => {
          m.seedTransactionsSectionDemoData();
          m.seedReportsSectionDemoData();
        })
        .catch((err) => console.error("[accounts] reports section bootstrap failed:", err));
      break;
    default:
      break;
  }
}

/** Clear in-memory bootstrap cache (e.g. after full demo reset). */
export function resetAccountsSectionBootstrapCache(): void {
  bootstrappedSections.clear();
}
