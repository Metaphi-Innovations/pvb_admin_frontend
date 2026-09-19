import type {
  CashFlowActivityFilter,
  CashFlowExportPayload,
  CashFlowQueryParams,
} from "@/types/cash-flow.types";

/** Query key including every server-side filter. */
export function cashFlowQueryKey(params: CashFlowQueryParams): readonly unknown[] {
  return [
    "cash-flow",
    params.financial_year_id,
    params.from_date,
    params.to_date,
    params.warehouse_id ?? null,
    params.activity_type ?? "ALL",
    params.cash_bank_ledger_id ?? null,
  ] as const;
}

export function buildCashFlowSearchParams(input: {
  financialYearId: string;
  fromDate: string;
  toDate: string;
  warehouseId: string;
  activityType: CashFlowActivityFilter;
  cashBankLedgerId: string;
}): URLSearchParams {
  const params = new URLSearchParams();
  params.set("fy", input.financialYearId);
  params.set("fromDate", input.fromDate);
  params.set("toDate", input.toDate);
  if (input.warehouseId !== "all") params.set("branch", input.warehouseId);
  if (input.activityType !== "ALL") params.set("activityType", input.activityType);
  if (input.cashBankLedgerId !== "all") {
    params.set("cashBankLedgerId", input.cashBankLedgerId);
  }
  return params;
}

/** Scope sent to export. Financial results are never included. */
export function buildCashFlowExportBody(
  payload: CashFlowExportPayload,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    format: payload.format,
    financial_year_id: payload.financial_year_id,
    from_date: payload.from_date,
    to_date: payload.to_date,
  };
  if (payload.warehouse_id) body.warehouse_id = payload.warehouse_id;
  if (payload.activity_type && payload.activity_type !== "ALL") {
    body.activity_type = payload.activity_type;
  }
  if (payload.cash_bank_ledger_id) {
    body.cash_bank_ledger_id = payload.cash_bank_ledger_id;
  }
  return body;
}
