/**
 * Resolve demo bank COA ledgers from bank account masters (by bank name).
 * Avoids fragile account-number suffix matching.
 */

import { loadChartOfAccounts, type ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  loadBankAccountMasters,
  saveBankAccountMasters,
  type BankAccountMaster,
} from "@/lib/accounts/bank-accounts-data";
import { isBankAccountLedger } from "@/lib/accounts/bank-coa-utils";

export function findDemoBankLedgerByBankName(bankName: string): ChartOfAccount | null {
  const normalized = bankName.trim().toLowerCase();
  const master =
    loadBankAccountMasters().find(
      (m) => m.status === "active" && m.bankName.toLowerCase() === normalized,
    ) ??
    loadBankAccountMasters().find(
      (m) => m.status === "active" && m.bankName.toLowerCase().includes(normalized),
    );
  if (!master) return null;
  return loadChartOfAccounts().find((r) => r.id === master.coaLedgerId) ?? null;
}

export function getDemoBankLedgers(): {
  hdfc: ChartOfAccount | null;
  icici: ChartOfAccount | null;
  sbi: ChartOfAccount | null;
  axis: ChartOfAccount | null;
  kotak: ChartOfAccount | null;
} {
  return {
    hdfc: findDemoBankLedgerByBankName("HDFC Bank"),
    icici: findDemoBankLedgerByBankName("ICICI Bank"),
    sbi: findDemoBankLedgerByBankName("SBI"),
    axis: findDemoBankLedgerByBankName("Axis Bank"),
    kotak: findDemoBankLedgerByBankName("Kotak Bank"),
  };
}

/** Default HDFC ledger for receipt/payment demo vouchers. */
export function resolveDefaultDemoBankLedger(): ChartOfAccount | null {
  const masters = loadBankAccountMasters().filter((m) => m.status === "active");
  const defaultMaster =
    masters.find((m) => m.defaultForReceipts) ?? masters.find((m) => m.bankName.includes("HDFC")) ?? masters[0];
  if (!defaultMaster) return null;
  return resolveCoaLedgerForBankMaster(defaultMaster);
}

/** Resolve the COA ledger for a bank master (handles stale coaLedgerId links). */
export function resolveCoaLedgerForBankMaster(master: BankAccountMaster): ChartOfAccount | null {
  const coa = loadChartOfAccounts();
  const activeLedgers = coa.filter((r) => r.nodeLevel === "ledger" && r.status === "active");

  if (master.coaLedgerId) {
    const direct = activeLedgers.find((r) => r.id === master.coaLedgerId);
    if (direct) return direct;
  }

  const bankKey = master.bankName.trim().toLowerCase().split(/\s+/)[0] ?? "";
  const nickname = master.accountNickname?.trim().toLowerCase() ?? "";
  const bankLedgers = activeLedgers.filter((r) => isBankAccountLedger(r) || r.bankAccountFlag);

  let match =
    bankLedgers.find(
      (r) =>
        r.accountName.toLowerCase().includes(bankKey) &&
        (!nickname || r.accountName.toLowerCase().includes(nickname)),
    ) ?? bankLedgers.find((r) => r.accountName.toLowerCase().includes(bankKey));

  const acctSuffix = master.accountNumber.replace(/\D/g, "").slice(-4);
  if (!match && acctSuffix.length >= 4) {
    match = bankLedgers.find((r) => r.accountName.replace(/\D/g, "").includes(acctSuffix));
  }

  return match ?? null;
}

/** Fix master.coaLedgerId when it points at a missing or wrong ledger. */
export function ensureMasterCoaLedgerLink(master: BankAccountMaster): ChartOfAccount | null {
  const ledger = resolveCoaLedgerForBankMaster(master);
  if (!ledger) return null;
  if (master.coaLedgerId !== ledger.id) {
    const masters = loadBankAccountMasters();
    const idx = masters.findIndex((m) => m.id === master.id);
    if (idx >= 0) {
      masters[idx] = { ...masters[idx], coaLedgerId: ledger.id };
      saveBankAccountMasters(masters);
    }
  }
  return ledger;
}
