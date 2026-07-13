/**
 * Profit & Loss data layer — traditional four-column statement.
 */

import { GENERAL_LEDGER_HREF } from "@/lib/accounts/general-ledger-data";
import type { PandLFilters } from "@/lib/accounts/pl-compute";
import {
  fetchPandLTraditionalSource,
  getPlDemoTraditionalSourceIfPeriodOverlaps,
} from "@/lib/accounts/pl-report-service";
import { getPlTraditionalMockCodes } from "@/lib/accounts/pl-traditional-mock";
import {
  buildEmptyPandLStatement,
  buildTraditionalPandLStatement,
  filterPandLStatement as filterTraditionalStatement,
  flattenPandLHorizontalForExport,
  type PandLDrillDownFilters,
  type PandLFilterParams,
  type PandLHorizontalExportRow,
  type PandLStatement,
  type PandLTab,
} from "@/lib/accounts/pl-traditional";

export type { PandLFilters } from "@/lib/accounts/pl-compute";
export type {
  PandLDrillDownFilters,
  PandLFilterParams,
  PandLHorizontalExportRow,
  PandLStatement,
  PandLTab,
  PandLSideDisplayRow,
} from "@/lib/accounts/pl-traditional";

export function buildPandLStatement(filters: PandLFilters): PandLStatement {
  const source =
    fetchPandLTraditionalSource(filters) ??
    getPlDemoTraditionalSourceIfPeriodOverlaps(filters);

  if (source) {
    return buildTraditionalPandLStatement(source, filters.viewType);
  }

  return buildEmptyPandLStatement();
}

export function filterPandLStatement(
  statement: PandLStatement,
  filters: PandLFilterParams,
): PandLStatement {
  return filterTraditionalStatement(statement, filters, getPlTraditionalMockCodes());
}

export { flattenPandLHorizontalForExport };

export function buildPandLLedgerHref(
  ledgerId: number,
  filters: PandLDrillDownFilters,
): string {
  const params = new URLSearchParams();
  params.set("ledger", String(ledgerId));
  if (filters.dateFrom) params.set("from", filters.dateFrom);
  if (filters.dateTo) params.set("to", filters.dateTo);
  if (filters.branch && filters.branch !== "all") params.set("branch", filters.branch);
  if (filters.warehouse && filters.warehouse !== "all") {
    params.set("warehouse", filters.warehouse);
  }
  if (filters.partyId && filters.partyId !== "all") params.set("party", filters.partyId);
  params.set("source", "profit-loss");
  return `${GENERAL_LEDGER_HREF}?${params.toString()}`;
}

export {
  getPandLActivePartyOptions,
  getPandLBranchOptions,
  getPandLLedgerGroupOptions,
  getPandLLedgerOptions,
  getPandLPartyOptions,
  getPandLWarehouseOptions,
  resolveFinancialYearLabel,
  resolvePartyFilterLabel,
} from "@/lib/accounts/pl-compute";
