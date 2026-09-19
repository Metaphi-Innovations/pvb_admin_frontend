/**
 * Cash Flow date-scope helpers.
 * Same FY-aware rules as Profit & Loss — do not invent separate clamping.
 */
export {
  canRequestProfitLoss as canRequestCashFlow,
  dateInsideFy,
  defaultProfitLossRange as defaultCashFlowRange,
  disabledProfitLossPresets as disabledCashFlowPresets,
  presetFitsFinancialYear,
  rangeInsideFy,
  resolveProfitLossDates as resolveCashFlowDates,
  type FyDateBounds,
  type ProfitLossDateState as CashFlowDateState,
} from "@/lib/accounts/profit-loss-date-scope";
