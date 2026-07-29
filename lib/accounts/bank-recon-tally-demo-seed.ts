/**
 * Manual Bank Reconciliation demo seed.
 * Seeds Bank-Date reconciliation links from recon-only overlay fixtures.
 * Does not post vouchers, create COA ledgers, or seed statement uploads for the client flow.
 */

import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import {
  getAllManualDemoMovements,
  getManualDemoMovements,
  isManualDemoAccount,
  MANUAL_DEMO_ACCOUNTS,
  manualDemoBookId,
  manualDemoVoucherId,
} from "@/lib/accounts/bank-recon-manual-demo-overlay";
import {
  beginTallySeed,
  endTallySeed,
  getTallySeedVersion,
  notifyTallyUpdated,
  resetBankReconciliationDemoStorage,
  saveTallyLinks,
  saveTallySuggestions,
  setTallySeedVersion,
  TALLY_SEED_VERSION,
  createTallyLinkId,
} from "@/lib/accounts/bank-recon-tally-store";
import { ensureManualDemoDisplayVouchers } from "@/lib/accounts/bank-recon-display";
import type { BankReconTallyLink } from "@/lib/accounts/bank-recon-tally-types";

function buildManualSeedLinks(): BankReconTallyLink[] {
  const now = "2026-06-28T11:00:00";
  const links: BankReconTallyLink[] = [];

  for (const acct of MANUAL_DEMO_ACCOUNTS) {
    const movements = getManualDemoMovements(acct.id);
    movements.forEach((m, index) => {
      if (!m.seedBankDate) return;
      links.push({
        id: createTallyLinkId(),
        bankAccountId: acct.id,
        bookTransactionId: manualDemoBookId(acct.id, m.key),
        bankStatementTransactionId: null,
        voucherId: manualDemoVoucherId(acct.id, index),
        bankDate: m.seedBankDate,
        status: "RECONCILED",
        reconciledAmount: m.deposit || m.withdrawal,
        reconciledBy: "Priya Sharma",
        reconciledAt: `${m.seedBankDate}T11:00:00`,
        remarks: "Manual demo — bank date cleared",
        reviewReason: null,
        importBatchId: null,
        undoReason: null,
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  return links;
}

/**
 * Ensure manual demo links are seeded once per TALLY_SEED_VERSION.
 * Never writes vouchers / COA / bank masters.
 */
export function ensureBankReconTallySeeded(): void {
  if (typeof window === "undefined") return;
  if (getTallySeedVersion() === TALLY_SEED_VERSION) return;
  if (!beginTallySeed()) return;

  try {
    setTallySeedVersion(TALLY_SEED_VERSION);

    const links = buildManualSeedLinks();
    saveTallyLinks(links, { silent: true });
    saveTallySuggestions([], { silent: true });
    ensureManualDemoDisplayVouchers();

    // Touch overlay so tree-shaken counters stay accurate in checks.
    void getAllManualDemoMovements().length;
    void ACCOUNTS_CURRENT_USER;
    void isManualDemoAccount;

    notifyTallyUpdated();
  } catch (err) {
    console.error("[bank-recon] manual demo seed failed:", err);
    localStorage.removeItem("dharitri_bank_recon_tally_seed_version");
  } finally {
    endTallySeed();
  }
}

/**
 * Dev-only: clear recon localStorage keys and re-seed manual demo links.
 * Does not touch voucher / COA / bank account master storage.
 */
export function resetBankReconciliationDemoData(): void {
  if (typeof window === "undefined") return;
  resetBankReconciliationDemoStorage();
  ensureBankReconTallySeeded();
  ensureManualDemoDisplayVouchers();
}
