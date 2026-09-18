import type {
  BalanceSheetExportPayload,
  BalanceSheetQueryParams,
  BalanceSheetReportType,
} from "@/types/balance-sheet.types";

export interface FyDateBounds {
  start: string;
  end: string;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function dateInsideFy(date: string, bounds: FyDateBounds): boolean {
  return isIsoDate(date) && date >= bounds.start && date <= bounds.end;
}

/** Approved default: today when it is inside the FY, otherwise the nearer FY boundary. */
export function defaultAsOnDate(bounds: FyDateBounds, today: string): string {
  if (!isIsoDate(today) || today < bounds.start) return bounds.start;
  if (today > bounds.end) return bounds.end;
  return today;
}

/**
 * Keep a valid in-FY as-on date. An out-of-FY date is replaced so the report
 * request is not fired with a date the backend will reject.
 */
export function resolveAsOnDate(input: {
  date: string;
  bounds: FyDateBounds;
  today: string;
}): { asOn: string; normalized: boolean } {
  if (dateInsideFy(input.date, input.bounds)) {
    return { asOn: input.date, normalized: false };
  }
  return { asOn: defaultAsOnDate(input.bounds, input.today), normalized: true };
}

export function canRequestBalanceSheet(input: {
  financialYearId: string;
  asOnDate: string;
  bounds: FyDateBounds | null;
}): boolean {
  if (!input.financialYearId || input.financialYearId === "all" || !input.bounds) return false;
  return dateInsideFy(input.asOnDate, input.bounds);
}

export function balanceSheetQueryKey(params: BalanceSheetQueryParams): readonly unknown[] {
  return [
    "balance-sheet",
    params.financial_year_id,
    params.as_on_date,
    params.warehouse_id ?? null,
    params.report_type,
    params.group_id ?? null,
    params.sub_group_id ?? null,
    params.ledger_id ?? null,
    params.show_zero,
  ] as const;
}

export function buildBalanceSheetSearchParams(input: {
  financialYearId: string;
  asOnDate: string;
  reportType: BalanceSheetReportType;
  warehouseId: string;
  groupId: string;
  subGroupId: string;
  ledgerId: string;
  showZero: boolean;
}): URLSearchParams {
  const params = new URLSearchParams();
  params.set("fy", input.financialYearId);
  params.set("asOnDate", input.asOnDate);
  params.set("reportType", input.reportType);
  if (input.warehouseId !== "all") params.set("branch", input.warehouseId);
  if (input.groupId !== "all") params.set("groupId", input.groupId);
  if (input.subGroupId !== "all") params.set("subGroupId", input.subGroupId);
  if (input.ledgerId !== "all") params.set("ledgerId", input.ledgerId);
  if (input.showZero) params.set("showZero", "true");
  return params;
}

export function isBalanceSheetDisplayFilterActive(input: {
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

export function clearedBalanceSheetDisplayFilters(showZeroDefault: boolean): {
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
export function buildBalanceSheetExportBody(
  payload: BalanceSheetExportPayload,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    report_type: payload.report_type,
    format: payload.format,
    financial_year_id: payload.financial_year_id,
    as_on_date: payload.as_on_date,
    show_zero: payload.show_zero,
  };
  if (payload.warehouse_id) body.warehouse_id = payload.warehouse_id;
  if (payload.group_id) body.group_id = payload.group_id;
  if (payload.sub_group_id) body.sub_group_id = payload.sub_group_id;
  if (payload.ledger_id) body.ledger_id = payload.ledger_id;
  return body;
}
