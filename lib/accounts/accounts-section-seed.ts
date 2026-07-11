/**
 * Lazy, section-scoped demo data bootstrap for the Accounts module.
 * Each nav group loads only its own seed — never the full accounts ecosystem at once.
 */

import type { AccountsNavGroupId } from "./accounts-nav";
import { isAccountsSectionStored } from "./accounts-section-storage";

const bootstrappedSections = new Set<AccountsNavGroupId>();
const inflightSections = new Set<AccountsNavGroupId>();

export const ACCOUNTS_SECTION_SEEDED_EVENT = "ds-accounts-section-seeded";
export const ACCOUNTS_VOUCHERS_UPDATED_EVENT = "ds-accounts-vouchers-updated";

export function isAccountsSectionBootstrapped(groupId: AccountsNavGroupId): boolean {
  return bootstrappedSections.has(groupId);
}

/** Queue section seed once — no-op if already bootstrapped, in flight, or stored in localStorage. */
export function scheduleAccountsSectionSeed(groupId: AccountsNavGroupId): void {
  if (typeof window === "undefined") return;
  if (bootstrappedSections.has(groupId) || inflightSections.has(groupId)) return;

  if (isAccountsSectionStored(groupId)) {
    bootstrappedSections.add(groupId);
    const dispatch = () => {
      window.dispatchEvent(
        new CustomEvent(ACCOUNTS_SECTION_SEEDED_EVENT, { detail: { groupId } }),
      );
    };
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(dispatch, { timeout: 500 });
    } else {
      window.setTimeout(dispatch, 0);
    }
    return;
  }

  const run = () => ensureAccountsSectionData(groupId);
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 10000 });
  } else {
    window.setTimeout(run, 200);
  }
}

export function ensureAccountsSectionData(groupId: AccountsNavGroupId): void {
  if (typeof window === "undefined") return;
  if (bootstrappedSections.has(groupId) || inflightSections.has(groupId)) return;
  inflightSections.add(groupId);

  const finish = () => {
    bootstrappedSections.add(groupId);
    inflightSections.delete(groupId);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(ACCOUNTS_SECTION_SEEDED_EVENT, { detail: { groupId } }),
      );
    }
  };

  switch (groupId) {
    case "coa":
      void import("./accounts-demo-seed")
        .then((m) => m.seedCoaSectionDemoData())
        .then(finish)
        .catch((err) => {
          inflightSections.delete(groupId);
          console.error("[accounts] COA section bootstrap failed:", err);
        });
      break;
    case "transactions":
      void import("./accounts-demo-seed")
        .then((m) => m.seedTransactionsSectionDemoData())
        .then(finish)
        .catch((err) => {
          inflightSections.delete(groupId);
          console.error("[accounts] transactions section bootstrap failed:", err);
        });
      break;
    case "receivables":
      void import("./accounts-demo-seed")
        .then((m) => m.seedTransactionsSectionDemoData())
        .then(() => import("./receivables-demo-seed"))
        .then((m) => m.ensureReceivablesDemoData())
        .then(finish)
        .catch((err) => {
          inflightSections.delete(groupId);
          console.error("[accounts] receivables section bootstrap failed:", err);
        });
      break;
    case "payables":
      void import("./accounts-demo-seed")
        .then((m) => m.ensureAccountsCoreDemoData())
        .then(() => import("./payables-demo-seed"))
        .then((m) => m.ensurePayablesDemoOnPageLoad())
        .then(finish)
        .catch((err) => {
          inflightSections.delete(groupId);
          console.error("[accounts] payables section bootstrap failed:", err);
        });
      break;
    case "banking":
      void import("./accounts-demo-seed")
        .then((m) => m.ensureAccountsCoreDemoData())
        .then(() => import("./banking-demo-seed"))
        .then((m) => {
          m.ensureBankingDemoOnPageLoad();
        })
        .then(finish)
        .catch((err) => {
          inflightSections.delete(groupId);
          console.error("[accounts] banking section bootstrap failed:", err);
        });
      break;
    case "reports":
      void import("./accounts-demo-seed")
        .then((m) => {
          if (!isAccountsSectionStored("transactions")) {
            m.seedTransactionsSectionDemoData();
          }
          if (!isAccountsSectionStored("reports")) {
            m.seedReportsSectionDemoData();
          }
        })
        .then(() => import("@/app/(app)/accounts/reports/bank-book/bank-book-demo-seed"))
        .then((m) => m.ensureBankBookDemoOnPageLoad())
        .then(() => import("@/app/(app)/accounts/reports/cash-book/cash-book-demo-seed"))
        .then((m) => m.ensureCashBookDemoOnPageLoad())
        .then(() => import("./general-ledger-demo-seed"))
        .then((m) => m.ensureGeneralLedgerDemoOnPageLoad())
        .then(finish)
        .catch((err) => {
          inflightSections.delete(groupId);
          console.error("[accounts] reports section bootstrap failed:", err);
        });
      break;
    default:
      finish();
      break;
  }
}

/** Clear in-memory bootstrap cache (e.g. after full demo reset). */
export function resetAccountsSectionBootstrapCache(): void {
  bootstrappedSections.clear();
  inflightSections.clear();
}
