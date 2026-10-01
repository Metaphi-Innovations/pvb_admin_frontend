/**
 * Bank Reconciliation — ensure each demo recon account resolves to a live COA bank ledger
 * and that Balance as per Books is derived from GL (opening + Debit − Credit).
 *
 * Does not post vouchers. Does not overwrite genuine non-demo user masters.
 */

import {
  loadChartOfAccounts,
  saveChartOfAccounts,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import { getLedgerVoucherMovement } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";
import { computeLedgerCurrentBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";
import {
  ensureBankAccountWithLedger,
  loadBankAccountMasters,
  saveBankAccountMasters,
  type BankAccountMaster,
} from "@/lib/accounts/bank-accounts-data";
import {
  ensureMasterCoaLedgerLink,
  resolveCoaLedgerForBankMaster,
} from "@/lib/accounts/bank-ledger-resolver";
import { CLIENT_REVIEW_BANK_SPECS } from "@/lib/accounts/banking-demo-spec";
import { seedBankingDemoData } from "@/lib/accounts/banking-demo-seed";
import { ensureClientReviewBankingSeed } from "@/lib/accounts/banking-client-review-seed";
import { roundMoney } from "@/lib/accounts/money-format";
import {
  FULLY_RECONCILED_ACCOUNT_ID,
  getFullyReconciledBookBalance,
  isFullyReconciledDemoAccount,
} from "@/lib/accounts/bank-recon-tally-fully-reconciled";
import {
  getManualDemoAccount,
  getManualDemoBookBalance,
  isManualDemoAccount,
} from "@/lib/accounts/bank-recon-manual-demo-overlay";
import { getBankReconAccountById } from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-v2-data";

/** Recon listing account id → bank-name key used to find masters/ledgers. */
const RECON_ACCOUNT_BANK_KEY: Record<string, string> = {
  "hdfc-current": "hdfc",
  "icici-collection": "icici",
  "sbi-cash-credit": "sbi",
};

/** Realistic openings when creating/repairing recon-linked demo ledgers. */
const RECON_DEMO_OPENINGS: Record<
  string,
  { bankName: string; nickname: string; accountNumber: string; ifsc: string; branch: string; opening: number }
> = {
  hdfc: {
    bankName: "HDFC Bank",
    nickname: "HDFC Current Account",
    accountNumber: CLIENT_REVIEW_BANK_SPECS[0]?.accountNumber ?? "50100234582",
    ifsc: "HDFC0001234",
    branch: "Mumbai Main Branch",
    opening: CLIENT_REVIEW_BANK_SPECS[0]?.openingBalance ?? 500_000,
  },
  icici: {
    bankName: "ICICI Bank",
    nickname: "ICICI Collection Account",
    accountNumber: CLIENT_REVIEW_BANK_SPECS[1]?.accountNumber ?? "00671234567",
    ifsc: "ICIC0000876",
    branch: "Ahmedabad Branch",
    opening: CLIENT_REVIEW_BANK_SPECS[1]?.openingBalance ?? 800_000,
  },
  sbi: {
    bankName: "SBI",
    nickname: "SBI Cash Credit",
    accountNumber: "30012345678",
    ifsc: "SBIN0000456",
    branch: "Pune Branch",
    opening: 1_250_000,
  },
};

export interface BankReconBookBalanceInfo {
  bankAccountId: string;
  linked: boolean;
  ledgerId: number | null;
  ledgerName: string | null;
  openingBalance: number;
  postedDebit: number;
  postedCredit: number;
  /** Derived GL balance when linked; null when not linked (UI must not show ₹0). */
  bookBalance: number | null;
}

function findMasterByBankKey(bankKey: string): BankAccountMaster | undefined {
  const spec = RECON_DEMO_OPENINGS[bankKey];
  if (!spec) return undefined;
  const masters = loadBankAccountMasters().filter((m) => m.status === "active");
  const byName = masters.find(
    (m) =>
      m.bankName.toLowerCase() === spec.bankName.toLowerCase() ||
      m.bankName.toLowerCase().includes(bankKey),
  );
  if (byName) return byName;
  return masters.find((m) => m.accountNumber.replace(/\D/g, "") === spec.accountNumber.replace(/\D/g, ""));
}

function findCoaBankLedgerByName(bankKey: string, bankName: string): ChartOfAccount | null {
  const coa = loadChartOfAccounts().filter(
    (r) => r.nodeLevel === "ledger" && r.status === "active" && (r.bankAccountFlag || r.accountType === "Asset"),
  );
  const key = bankKey.toLowerCase();
  const name = bankName.toLowerCase();
  return (
    coa.find((r) => r.accountName.toLowerCase().includes(key) && r.bankAccountFlag) ??
    coa.find((r) => r.accountName.toLowerCase().includes(name.split(/\s+/)[0] ?? key)) ??
    null
  );
}

/**
 * Sync COA ledger opening from bank master when the ledger opening is zero
 * but the master has a positive demo opening (stale/desynced COA).
 * Never overwrites a non-zero COA opening.
 */
function syncOpeningFromMaster(master: BankAccountMaster, ledger: ChartOfAccount): ChartOfAccount {
  const masterOpening = roundMoney(master.openingBalance ?? 0);
  const coaOpening = roundMoney(ledger.openingBalance ?? 0);
  if (coaOpening > 0.005 || masterOpening < 0.005) return ledger;

  const next = loadChartOfAccounts().map((r) =>
    r.id === ledger.id
      ? {
          ...r,
          openingBalance: masterOpening,
          balanceType: (master.balanceType ?? "Debit") as "Debit" | "Credit",
        }
      : r,
  );
  saveChartOfAccounts(next);
  return next.find((r) => r.id === ledger.id) ?? { ...ledger, openingBalance: masterOpening };
}

function ensureDemoMasterForKey(bankKey: string): BankAccountMaster | null {
  const spec = RECON_DEMO_OPENINGS[bankKey];
  if (!spec) return null;

  let master = findMasterByBankKey(bankKey);
  if (!master) {
    master = ensureBankAccountWithLedger({
      bankName: spec.bankName,
      accountNickname: spec.nickname,
      accountNumber: spec.accountNumber,
      ifsc: spec.ifsc,
      branchName: spec.branch,
      accountType: bankKey === "sbi" ? "CC" : "Current",
      openingBalance: spec.opening,
      openingBalanceDate: "2026-04-01",
      balanceType: "Debit",
      reconciliationEnabled: true,
      defaultForReceipts: bankKey === "icici",
      defaultForPayments: bankKey === "icici",
      status: "active",
      mappedWarehouseIds: [1],
    });
  } else if (roundMoney(master.openingBalance) < 0.005 && spec.opening > 0) {
    // Repair zero opening on demo master only (account numbers from known demo specs)
    const masters = loadBankAccountMasters();
    const idx = masters.findIndex((m) => m.id === master!.id);
    if (idx >= 0) {
      masters[idx] = { ...masters[idx], openingBalance: spec.opening, balanceType: "Debit" };
      saveBankAccountMasters(masters);
      master = masters[idx]!;
    }
  }

  return master;
}

/**
 * Ensure recon demo accounts can resolve to COA bank ledgers with realistic openings.
 * Safe to call repeatedly. Does not delete user data.
 */
let ledgerLinksEnsured = false;

export function ensureBankReconLedgerLinks(): void {
  if (typeof window === "undefined") return;
  if (ledgerLinksEnsured) return;
  ledgerLinksEnsured = true;

  try {
    ensureClientReviewBankingSeed();
    seedBankingDemoData();

    for (const bankKey of Object.keys(RECON_DEMO_OPENINGS)) {
      const master = ensureDemoMasterForKey(bankKey);
      if (!master) continue;

      let ledger =
        ensureMasterCoaLedgerLink(master) ??
        resolveCoaLedgerForBankMaster(master) ??
        findCoaBankLedgerByName(bankKey, RECON_DEMO_OPENINGS[bankKey]!.bankName);

      if (!ledger) {
        const created = ensureDemoMasterForKey(bankKey);
        if (created) {
          ledger = ensureMasterCoaLedgerLink(created) ?? resolveCoaLedgerForBankMaster(created);
        }
      }

      if (ledger && master) {
        syncOpeningFromMaster(master, ledger);
      }
    }
  } catch (err) {
    // Allow a later retry if first pass failed (e.g. COA not ready yet).
    ledgerLinksEnsured = false;
    console.error("[bank-recon] ledger link ensure failed:", err);
  }
}

export function resolveReconCoaLedger(bankAccountId: string): ChartOfAccount | null {
  if (isFullyReconciledDemoAccount(bankAccountId)) return null;
  if (isManualDemoAccount(bankAccountId)) return null;

  const account = getBankReconAccountById(bankAccountId);
  if (!account) return null;

  const bankKey = RECON_ACCOUNT_BANK_KEY[bankAccountId];
  if (bankKey) {
    const master = findMasterByBankKey(bankKey);
    if (master) {
      const linked =
        ensureMasterCoaLedgerLink(master) ?? resolveCoaLedgerForBankMaster(master);
      if (linked) return syncOpeningFromMaster(master, linked);
    }
    const byName = findCoaBankLedgerByName(bankKey, account.bankName);
    if (byName) return byName;
  }

  // Generic fallback by bank name on recon account
  const masters = loadBankAccountMasters().filter((m) => m.status === "active");
  const name = account.bankName.toLowerCase();
  const master =
    masters.find((m) => m.bankName.toLowerCase() === name) ??
    masters.find((m) => name.includes(m.bankName.toLowerCase().split(/\s+/)[0] ?? "")) ??
    masters.find((m) => m.bankName.toLowerCase().includes(name.split(/\s+/)[0] ?? ""));
  if (master) {
    return ensureMasterCoaLedgerLink(master) ?? resolveCoaLedgerForBankMaster(master);
  }

  return findCoaBankLedgerByName(name.split(/\s+/)[0] ?? "", account.bankName);
}

export function getBookBalanceInfo(bankAccountId: string): BankReconBookBalanceInfo {
  if (isFullyReconciledDemoAccount(bankAccountId)) {
    const balance = getFullyReconciledBookBalance();
    return {
      bankAccountId,
      linked: true,
      ledgerId: null,
      ledgerName: "Fully Reconciled Demo Bank",
      openingBalance: 1_000_000,
      postedDebit: 420_000,
      postedCredit: 150_500,
      bookBalance: balance,
    };
  }

  if (isManualDemoAccount(bankAccountId)) {
    const acct = getManualDemoAccount(bankAccountId);
    const balance = getManualDemoBookBalance(bankAccountId);
    return {
      bankAccountId,
      linked: true,
      ledgerId: null,
      ledgerName: acct?.accountNickname ?? bankAccountId,
      openingBalance: acct?.openingBalance ?? 0,
      postedDebit: 0,
      postedCredit: 0,
      bookBalance: balance,
    };
  }

  const ledger = resolveReconCoaLedger(bankAccountId);
  if (!ledger) {
    return {
      bankAccountId,
      linked: false,
      ledgerId: null,
      ledgerName: null,
      openingBalance: 0,
      postedDebit: 0,
      postedCredit: 0,
      bookBalance: null,
    };
  }

  const movements = getLedgerVoucherMovement(ledger.id);
  const bal = computeLedgerCurrentBalance(ledger);
  const bookBalance =
    bal.balanceType === "Debit" ? roundMoney(bal.amount) : roundMoney(-bal.amount);

  return {
    bankAccountId,
    linked: true,
    ledgerId: ledger.id,
    ledgerName: ledger.accountName,
    openingBalance: roundMoney(ledger.openingBalance ?? 0),
    postedDebit: roundMoney(movements.debit),
    postedCredit: roundMoney(movements.credit),
    bookBalance,
  };
}

export function getReconBankKey(bankAccountId: string): string | null {
  if (bankAccountId === FULLY_RECONCILED_ACCOUNT_ID) return "fully-reconciled";
  return RECON_ACCOUNT_BANK_KEY[bankAccountId] ?? null;
}
