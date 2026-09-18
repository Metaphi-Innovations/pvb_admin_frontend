import type { ProfitLossExportPayload, ProfitLossQueryParams } from "@/types/profit-loss.types";

/** React Query-shaped key. Normal and Detailed never share an entry. */
export function profitLossQueryKey(params: ProfitLossQueryParams): readonly unknown[] {
  return [
    "profit-loss",
    params.report_type,
    params.financial_year_id,
    params.from_date,
    params.to_date,
    params.warehouse_id ?? null,
    params.group_id ?? null,
    params.sub_group_id ?? null,
    params.ledger_id ?? null,
    params.show_zero,
  ] as const;
}

export function buildProfitLossSearchParams(input: {
  financialYearId: string;
  fromDate: string;
  toDate: string;
  reportType: string;
  warehouseId: string;
  groupId: string;
  subGroupId: string;
  ledgerId: string;
  showZero: boolean;
}): URLSearchParams {
  const params = new URLSearchParams();
  params.set("fy", input.financialYearId);
  params.set("fromDate", input.fromDate);
  params.set("toDate", input.toDate);
  params.set("reportType", input.reportType);
  if (input.warehouseId !== "all") params.set("branch", input.warehouseId);
  if (input.groupId !== "all") params.set("groupId", input.groupId);
  if (input.subGroupId !== "all") params.set("subGroupId", input.subGroupId);
  if (input.ledgerId !== "all") params.set("ledgerId", input.ledgerId);
  if (input.showZero) params.set("showZero", "true");
  return params;
}

export function isProfitLossDisplayFilterActive(input: {
  groupId: string;
  subGroupId: string;
  ledgerId: string;
  showZero: boolean;
  showZeroDefault: boolean;
}): boolean {
  return (
    input.groupId !== "all" ||
    input.subGroupId !== "all" ||
    input.ledgerId !== "all" ||
    input.showZero !== input.showZeroDefault
  );
}

export function clearedProfitLossDisplayFilters(showZeroDefault: boolean): {
  groupId: string;
  subGroupId: string;
  ledgerId: string;
  showZero: boolean;
} {
  return {
    groupId: "all",
    subGroupId: "all",
    ledgerId: "all",
    showZero: showZeroDefault,
  };
}

/** Scope sent to export. Financial results are never included. */
export function buildProfitLossExportBody(
  payload: ProfitLossExportPayload,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    report_type: payload.report_type,
    format: payload.format,
    financial_year_id: payload.financial_year_id,
    from_date: payload.from_date,
    to_date: payload.to_date,
    show_zero: payload.show_zero,
  };
  if (payload.warehouse_id) body.warehouse_id = payload.warehouse_id;
  if (payload.group_id) body.group_id = payload.group_id;
  if (payload.sub_group_id) body.sub_group_id = payload.sub_group_id;
  if (payload.ledger_id) body.ledger_id = payload.ledger_id;
  return body;
}
