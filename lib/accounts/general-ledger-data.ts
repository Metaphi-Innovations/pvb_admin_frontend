/**
 * General Ledger routing helpers shared with other accounts screens.
 * Statement rows come from the General Ledger API.
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
} from "@/lib/accounts/general-ledger-types";

export { GENERAL_LEDGER_SOURCE_REPORTS } from "@/lib/accounts/general-ledger-types";

/** Legacy row shape used by shared transaction-detail drill-down. */
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
