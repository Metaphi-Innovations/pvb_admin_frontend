/**
 * TDS ledger resolution for voucher posting.
 * Ledgers are auto-synced from TDS Master under TDS Receivable & TDS Payable.
 */

import {
  loadChartOfAccounts,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import {
  getTdsSectionCode,
  loadTDSMasters,
  type TDSMaster,
} from "@/app/(app)/masters/tds/tds-data";
import {
  syncTdsCoaFromMaster,
  TDS_PAYABLE_GROUP,
  TDS_RECEIVABLE_GROUP,
  tdsLedgerKindAlias,
  type TdsLedgerKind,
} from "@/lib/accounts/tds-coa-sync";

export { TDS_RECEIVABLE_GROUP, TDS_PAYABLE_GROUP };

/** Sync TDS Master → COA ledgers. */
export function ensureTdsAccountingLedgers(): void {
  syncTdsCoaFromMaster();
}

function findCanonicalTdsLedger(
  records: ChartOfAccount[],
  kind: TdsLedgerKind,
): ChartOfAccount | undefined {
  const name = kind === "receivable" ? TDS_RECEIVABLE_GROUP : TDS_PAYABLE_GROUP;
  return records.find(
    (r) =>
      r.nodeLevel === "ledger" &&
      r.alias === tdsLedgerKindAlias(kind) &&
      r.accountName === name &&
      r.status === "active",
  );
}

function masterById(masterId: number): TDSMaster | undefined {
  return loadTDSMasters().find((m) => m.id === masterId);
}

function masterBySectionCode(sectionCode: string): TDSMaster | undefined {
  const code = sectionCode.trim().toUpperCase();
  return loadTDSMasters().find((m) => getTdsSectionCode(m).toUpperCase() === code);
}

function resolveTdsLedger(kind: TdsLedgerKind, master: TDSMaster): ChartOfAccount | null {
  ensureTdsAccountingLedgers();
  const sectionCode = getTdsSectionCode(master);
  if (!sectionCode) return null;

  const records = loadChartOfAccounts();
  return findCanonicalTdsLedger(records, kind) ?? null;
}

/** Resolve TDS Payable ledger for a TDS section (by master id or section code). */
export function resolveTdsPayableLedger(
  masterIdOrSectionCode: number | string,
): ChartOfAccount | null {
  const master =
    typeof masterIdOrSectionCode === "number"
      ? masterById(masterIdOrSectionCode)
      : masterBySectionCode(masterIdOrSectionCode);
  if (!master || master.status !== "active") return null;
  return resolveTdsLedger("payable", master);
}

/** Resolve TDS Receivable ledger for a TDS section (by master id or section code). */
export function resolveTdsReceivableLedger(
  masterIdOrSectionCode: number | string,
): ChartOfAccount | null {
  const master =
    typeof masterIdOrSectionCode === "number"
      ? masterById(masterIdOrSectionCode)
      : masterBySectionCode(masterIdOrSectionCode);
  if (!master || master.status !== "active") return null;
  return resolveTdsLedger("receivable", master);
}

/** Build voucher line input for TDS payable credit (payment / purchase). */
export function tdsPayablePostingLine(
  masterId: number,
  amount: number,
  remarks = "TDS",
): { ledgerId: number; debit: number; credit: number; remarks: string } | null {
  if (amount <= 0) return null;
  const ledger = resolveTdsPayableLedger(masterId);
  if (!ledger) return null;
  return { ledgerId: ledger.id, debit: 0, credit: amount, remarks };
}

/** Build voucher line input for TDS receivable debit (receipt). */
export function tdsReceivablePostingLine(
  masterId: number,
  amount: number,
  remarks = "TDS",
): { ledgerId: number; debit: number; credit: number; remarks: string } | null {
  if (amount <= 0) return null;
  const ledger = resolveTdsReceivableLedger(masterId);
  if (!ledger) return null;
  return { ledgerId: ledger.id, debit: amount, credit: 0, remarks };
}
