/**
 * Profit & Loss FY/date and display-filter scope tests.
 * Run: npx tsx lib/accounts/profit-loss-scope.test.ts
 */
import assert from "node:assert/strict";
import { formatMoneyString } from "./money-format";
import {
  canRequestProfitLoss,
  defaultProfitLossRange,
  disabledProfitLossPresets,
  presetFitsFinancialYear,
  rangeInsideFy,
  resolveProfitLossDates,
} from "./profit-loss-date-scope";
import {
  buildProfitLossExportBody,
  buildProfitLossSearchParams,
  clearedProfitLossDisplayFilters,
  isProfitLossDisplayFilterActive,
} from "./profit-loss-query";

const FY_2627 = { start: "2026-04-01", end: "2027-03-31" };
const FY_2526 = { start: "2025-04-01", end: "2026-03-31" };
const REF = new Date("2026-04-10T12:00:00");

assert.equal(presetFitsFinancialYear("last_month", FY_2627, REF), false);
assert.equal(presetFitsFinancialYear("today", FY_2627, REF), true);
assert.ok(disabledProfitLossPresets(FY_2627, REF).includes("last_month"));
assert.equal(canRequestProfitLoss({
  financialYearId: "fy-2627",
  from: "2026-03-01",
  to: "2026-03-31",
  bounds: FY_2627,
}), false);
assert.equal(canRequestProfitLoss({
  financialYearId: "fy-2627",
  from: "2026-04-01",
  to: "2026-09-17",
  bounds: FY_2627,
}), true);

const switched = resolveProfitLossDates({
  from: "2025-06-01",
  to: "2025-06-30",
  preset: "custom",
  bounds: FY_2627,
  today: "2026-09-17",
});
assert.equal(switched.normalized, true);
assert.equal(rangeInsideFy(switched.from, switched.to, FY_2627), true);
assert.notEqual(switched.from, "2025-06-01");
assert.equal(switched.from, "2026-04-01");
assert.equal(switched.to, "2026-09-17");

const kept = resolveProfitLossDates({
  from: "2026-05-01",
  to: "2026-08-15",
  preset: "custom",
  bounds: FY_2627,
  today: "2026-09-17",
});
assert.equal(kept.normalized, false);
assert.equal(kept.from, "2026-05-01");
assert.equal(kept.to, "2026-08-15");

const urlMismatch = resolveProfitLossDates({
  from: "2025-01-01",
  to: "2025-02-01",
  preset: "custom",
  bounds: FY_2627,
  today: "2026-09-17",
});
assert.equal(urlMismatch.normalized, true);
assert.equal(canRequestProfitLoss({
  financialYearId: "fy-2627",
  from: urlMismatch.from,
  to: urlMismatch.to,
  bounds: FY_2627,
}), true);

const futureFy = defaultProfitLossRange(FY_2627, "2026-01-01");
assert.equal(futureFy.from, FY_2627.start);
assert.equal(futureFy.to, FY_2627.end);
assert.equal(rangeInsideFy(futureFy.from, futureFy.to, FY_2627), true);

const active = isProfitLossDisplayFilterActive({
  groupId: "all",
  subGroupId: "all",
  ledgerId: "salary",
  showZero: false,
  showZeroDefault: false,
});
assert.equal(active, true);
const cleared = clearedProfitLossDisplayFilters(false);
assert.deepEqual(cleared, {
  groupId: "all",
  subGroupId: "all",
  ledgerId: "all",
  showZero: false,
});
assert.equal(isProfitLossDisplayFilterActive({ ...cleared, showZeroDefault: false }), false);

const params = buildProfitLossSearchParams({
  financialYearId: "fy-1",
  fromDate: "2026-04-01",
  toDate: "2026-09-17",
  reportType: "detailed",
  warehouseId: "wh-1",
  groupId: "all",
  subGroupId: "all",
  ledgerId: "all",
  showZero: false,
});
assert.equal(params.get("party"), null);
assert.equal(params.get("branch"), "wh-1");
assert.equal(params.get("branch")?.includes(","), false);

const body = buildProfitLossExportBody({
  report_type: "NORMAL",
  format: "EXCEL",
  financial_year_id: "fy-1",
  from_date: "2026-04-01",
  to_date: "2026-09-17",
  show_zero: false,
  warehouse_id: "wh-1",
});
assert.equal(typeof body.warehouse_id, "string");
assert.equal("party_id" in body, false);
assert.equal("party" in body, false);

assert.equal(formatMoneyString("13477841.00"), "₹\u00a01,34,77,841.00");
assert.equal(rangeInsideFy("2026-04-01", "2026-09-17", FY_2526), false);

console.log("profit-loss scope tests passed");
