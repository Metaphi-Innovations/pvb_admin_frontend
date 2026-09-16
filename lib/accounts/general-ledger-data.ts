/**
 * General Ledger — routing helpers and shared re-exports.
 */

import { loadChartOfAccounts } from "@/app/(app)/accounts/data";

export {
  GENERAL_LEDGER_HREF,
  GENERAL_LEDGER_LEGACY_HREF,
  buildGeneralLedgerHref,
} from "@/lib/accounts/general-ledger-href";

export function resolveLedgerIdByName(name: string): number | null {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "—") return null;

  const records = loadChartOfAccounts();
  const exact = records.find(
    (r) => r.nodeLevel === "ledger" && r.accountName.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exact) return exact.id;

  const partial = records.find(
    (r) =>
      r.nodeLevel === "ledger" &&
      (r.accountName.toLowerCase().includes(trimmed.toLowerCase()) ||
        trimmed.toLowerCase().includes(r.accountName.toLowerCase())),
  );
  return partial?.id ?? null;
}

export function defaultGeneralLedgerDemoLedgerId(): number | null {
  return resolveLedgerIdByName("ABC Agro Distributor");
}

export {
  formatGeneralLedgerDate,
  formatGlParticulars,
  resolveContraLedgerNames,
  buildGeneralLedgerStatementFromLedger,
  buildGeneralLedgerGroupDrillDown,
  ledgerClosingMatchesTrialBalance,
} from "@/lib/accounts/general-ledger-compute";

export type {
  GeneralLedgerDrillDownParams,
  GeneralLedgerDisplayRow,
  GeneralLedgerFilters,
  GeneralLedgerGroupChildRow,
  GeneralLedgerGroupDrillDown,
  GeneralLedgerLedgerOption,
  GeneralLedgerLedgerType,
  GeneralLedgerRowKind,
  GeneralLedgerSourceReport,
  GeneralLedgerStatement,
  GeneralLedgerSummary,
  GeneralLedgerDemoScenario,
} from "@/lib/accounts/general-ledger-types";

export { GENERAL_LEDGER_SOURCE_REPORTS } from "@/lib/accounts/general-ledger-types";

// Legacy type alias used by transaction-detail-data
export interface GeneralLedgerRow {
  date: string;
  voucherNo: string;
  voucherType: string;
  referenceNo: string;
  narration: string;
  debit: number;
  credit: number;
  runningBalance: number;
  runningBalanceType: "Debit" | "Credit";
  isOpeningRow?: boolean;
  voucherId?: number | string;
  lineOrder?: number;
  viewHref?: string;
  viewLabel?: string;
  contraLedger?: string;
}
