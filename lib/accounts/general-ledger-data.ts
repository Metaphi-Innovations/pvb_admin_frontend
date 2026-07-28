/**
 * General Ledger — routing helpers and shared re-exports.
 */

import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import type { GeneralLedgerDrillDownParams } from "@/lib/accounts/general-ledger-types";

export const GENERAL_LEDGER_HREF = "/accounts/reports/general-ledger";

export const GENERAL_LEDGER_LEGACY_HREF = "/accounts/reports/ledger";

export function buildGeneralLedgerHref(
  params: number | GeneralLedgerDrillDownParams,
): string {
  const p: GeneralLedgerDrillDownParams =
    typeof params === "number" ? { ledgerId: params } : params;

  const search = new URLSearchParams();

  if (p.ledgerId != null) search.set("ledgerId", String(p.ledgerId));
  if (p.groupId != null) search.set("groupId", String(p.groupId));
  if (p.fromDate) search.set("fromDate", p.fromDate);
  if (p.toDate) search.set("toDate", p.toDate);
  if (p.source) search.set("source", p.source);
  if (p.groupName) search.set("groupName", p.groupName);
  if (p.branch && p.branch !== "all") search.set("branch", p.branch);
  if (p.warehouse && p.warehouse !== "all") search.set("warehouse", p.warehouse);
  if (p.company && p.company !== "all") search.set("company", p.company);
  if (p.partyId && p.partyId !== "all") search.set("party", p.partyId);
  if (p.ledgerType && p.ledgerType !== "all") search.set("ledgerType", p.ledgerType);
  if (p.financialYearId && p.financialYearId !== "all") {
    search.set("fy", p.financialYearId);
  }

  // Backward-compatible aliases used by existing report links
  if (p.ledgerId != null && !search.has("ledger")) search.set("ledger", String(p.ledgerId));
  if (p.fromDate && !search.has("from")) search.set("from", p.fromDate);
  if (p.toDate && !search.has("to")) search.set("to", p.toDate);

  const qs = search.toString();
  return qs ? `${GENERAL_LEDGER_HREF}?${qs}` : GENERAL_LEDGER_HREF;
}

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
  voucherId?: number;
  lineOrder?: number;
  viewHref?: string;
  viewLabel?: string;
  contraLedger?: string;
}
