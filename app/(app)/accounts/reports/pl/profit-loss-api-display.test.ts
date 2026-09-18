/**
 * Profit & Loss display mapping tests.
 * Run: npx tsx app/(app)/accounts/reports/pl/profit-loss-api-display.test.ts
 *
 * These assert the screen copies backend rows and totals.
 * They do not calculate Gross Profit or Net Profit.
 */
import assert from "node:assert/strict";
import { buildGeneralLedgerHref } from "../../../../../lib/accounts/general-ledger-href";
import {
  buildProfitLossExportBody,
  profitLossQueryKey,
} from "../../../../../lib/accounts/profit-loss-query";
import type {
  ProfitLossReportResult,
  ProfitLossRow,
} from "../../../../../types/profit-loss.types";
import { findScreenRow, toProfitLossScreen } from "./profit-loss-api-display";

const LEDGER_ID = "8f1c2a44-6b10-4c3e-9a77-1d2e3f4a5b6c";

function row(partial: Partial<ProfitLossRow> & Pick<ProfitLossRow, "id" | "particular" | "row_kind" | "amount" | "side">): ProfitLossRow {
  return {
    code: null,
    signed_amount: partial.amount,
    nature: partial.side,
    ledger_id: null,
    ledger_code: null,
    ledger_name: null,
    group_id: null,
    sub_group_id: null,
    is_presentation: partial.row_kind === "PRESENTATION",
    ...partial,
  };
}

function section(particular: string, id: string, amount: string, side: "DEBIT" | "CREDIT"): ProfitLossRow {
  return row({
    id,
    particular,
    row_kind: "SECTION_TOTAL",
    amount,
    side,
  });
}

function fixture(overrides: Partial<ProfitLossReportResult> = {}): ProfitLossReportResult {
  const tradingDebit = [
    row({ id: "opening", particular: "Opening Stock", row_kind: "CATEGORY", amount: "10000.00", side: "DEBIT" }),
    row({ id: "purchases", particular: "Purchase Accounts", row_kind: "CATEGORY", amount: "50000.00", side: "DEBIT" }),
    row({ id: "direct-exp", particular: "Direct Expenses", row_kind: "CATEGORY", amount: "5000.00", side: "DEBIT" }),
    row({ id: "gp-co", particular: "Gross Profit c/o", row_kind: "PRESENTATION", amount: "30000.00", side: "DEBIT" }),
    section("Trading Total", "trading-dr-total", "95000.00", "DEBIT"),
  ];
  const tradingCredit = [
    row({ id: "closing", particular: "Closing Stock", row_kind: "CATEGORY", amount: "15000.00", side: "CREDIT" }),
    row({ id: "sales", particular: "Sales Accounts", row_kind: "CATEGORY", amount: "80000.00", side: "CREDIT" }),
    section("Trading Total", "trading-cr-total", "95000.00", "CREDIT"),
  ];
  const plDebit = [
    row({ id: "indirect-exp", particular: "Indirect Expenses", row_kind: "CATEGORY", amount: "10000.00", side: "DEBIT" }),
    row({ id: "np", particular: "Net Profit", row_kind: "PRESENTATION", amount: "20000.00", side: "DEBIT" }),
    section("Total", "pl-dr-total", "30000.00", "DEBIT"),
  ];
  const plCredit = [
    row({ id: "gp-bf", particular: "Gross Profit b/f", row_kind: "PRESENTATION", amount: "30000.00", side: "CREDIT" }),
    section("Total", "pl-cr-total", "30000.00", "CREDIT"),
  ];

  return {
    report_type: "NORMAL",
    scope: {
      financial_year_id: "fy-1",
      financial_year_code: "FY26",
      financial_year_name: "2026-27",
      from_date: "2026-04-01",
      to_date: "2026-09-17",
      warehouse_id: null,
      warehouse_name: null,
      company_name: "PVB",
      opening_stock_mode: "COMPANY_LEDGER_OPENING_PLUS_LINES",
    },
    filters: {
      group_id: null,
      sub_group_id: null,
      ledger_id: null,
      show_zero: false,
      filters_are_display_only: true,
    },
    summary: {
      opening_stock: "10000.00",
      net_purchases: "50000.00",
      net_sales: "80000.00",
      direct_income: "0.00",
      direct_expenses_excluding_cogs: "5000.00",
      closing_stock: "15000.00",
      gross_profit: "30000.00",
      gross_loss: "0.00",
      indirect_income: "0.00",
      indirect_expenses: "10000.00",
      net_profit: "20000.00",
      net_loss: "0.00",
      cogs_excluded: "0.00",
    },
    trading_account: {
      debit: tradingDebit,
      credit: tradingCredit,
      debit_total: "95000.00",
      credit_total: "95000.00",
      is_balanced: true,
      gross_result: { type: "PROFIT", amount: "30000.00" },
    },
    profit_and_loss_account: {
      debit: plDebit,
      credit: plCredit,
      debit_total: "30000.00",
      credit_total: "30000.00",
      is_balanced: true,
      net_result: { type: "PROFIT", amount: "20000.00" },
    },
    health: {
      stock_balance_abnormal: false,
      branch_stock_available: true,
      internal_transfer_excluded: false,
      product_stock_breakdown_available: false,
      cogs_excluded_from_trading: true,
      internal_transfer_branch_policy: "EXCLUDED_CONSOLIDATED",
      warnings: [],
    },
    reconciliation: { cogs_period_net: "0.00", note: "COGS excluded" },
    filtered_hierarchy: null,
    ...overrides,
  };
}

function labelOn(model: ReturnType<typeof toProfitLossScreen>, particular: string, side: "debit" | "credit") {
  return model.pairs.find((pair) => pair[side]?.particular === particular)?.[side];
}

// Normal report renders backend Gross Profit 30,000. No local formula.
{
  const screen = toProfitLossScreen(fixture());
  assert.equal(labelOn(screen, "Opening Stock", "debit")?.amount, "10000.00");
  assert.equal(labelOn(screen, "Purchase Accounts", "debit")?.amount, "50000.00");
  assert.equal(labelOn(screen, "Direct Expenses", "debit")?.amount, "5000.00");
  assert.equal(labelOn(screen, "Closing Stock", "credit")?.amount, "15000.00");
  assert.equal(labelOn(screen, "Sales Accounts", "credit")?.amount, "80000.00");
  assert.equal(labelOn(screen, "Gross Profit c/o", "debit")?.amount, "30000.00");
  assert.equal(labelOn(screen, "Gross Profit b/f", "credit")?.amount, "30000.00");
  assert.equal(labelOn(screen, "Net Profit", "debit")?.amount, "20000.00");
  assert.equal(screen.debitTotal, "30000.00");
  assert.equal(screen.creditTotal, "30000.00");
  assert.equal(screen.tradingDebitTotal, "95000.00");
  assert.equal(screen.tradingCreditTotal, "95000.00");
  const tradingPair = screen.pairs.find((pair) => pair.debit?.particular === "Trading Total");
  assert.equal(tradingPair?.credit?.particular, "Trading Total");
  assert.equal(labelOn(screen, "Total", "debit"), undefined);
}

// Gross Loss fixture: c/o on trading credit, b/f on final debit. No arithmetic.
{
  const report = fixture();
  report.trading_account.gross_result = { type: "LOSS", amount: "4000.00" };
  report.trading_account.debit = report.trading_account.debit.filter((item) => item.id !== "gp-co");
  report.trading_account.credit = [
    row({ id: "gl-co", particular: "Gross Loss c/o", row_kind: "PRESENTATION", amount: "4000.00", side: "CREDIT" }),
    ...report.trading_account.credit,
  ];
  report.profit_and_loss_account.credit = report.profit_and_loss_account.credit.filter((item) => item.id !== "gp-bf");
  report.profit_and_loss_account.debit = [
    row({ id: "gl-bf", particular: "Gross Loss b/f", row_kind: "PRESENTATION", amount: "4000.00", side: "DEBIT" }),
    ...report.profit_and_loss_account.debit,
  ];
  const screen = toProfitLossScreen(report);
  assert.equal(labelOn(screen, "Gross Loss c/o", "credit")?.amount, "4000.00");
  assert.equal(labelOn(screen, "Gross Loss b/f", "debit")?.amount, "4000.00");
  assert.equal(labelOn(screen, "Gross Profit c/o", "debit"), undefined);
}

// Net Loss appears on the credit side exactly as returned.
{
  const report = fixture();
  report.profit_and_loss_account.net_result = { type: "LOSS", amount: "1500.00" };
  report.profit_and_loss_account.debit = report.profit_and_loss_account.debit.filter((item) => item.id !== "np");
  report.profit_and_loss_account.credit = [
    ...report.profit_and_loss_account.credit.filter((item) => item.row_kind !== "SECTION_TOTAL"),
    row({ id: "nl", particular: "Net Loss", row_kind: "PRESENTATION", amount: "1500.00", side: "CREDIT" }),
    section("Total", "pl-cr-total", "31500.00", "CREDIT"),
  ];
  const screen = toProfitLossScreen(report);
  assert.equal(labelOn(screen, "Net Loss", "credit")?.amount, "1500.00");
  assert.equal(labelOn(screen, "Net Profit", "debit"), undefined);
}

// Detailed children indent under the parent. Ledger links only when ledger_id exists.
{
  const report = fixture({ report_type: "DETAILED" });
  report.health.product_stock_breakdown_available = true;
  report.trading_account.debit[0] = {
    ...report.trading_account.debit[0],
    children: [
      row({
        id: "opening-product",
        particular: "Computer Parts",
        row_kind: "REPORTING",
        amount: "10000.00",
        side: "DEBIT",
      }),
    ],
  };
  report.profit_and_loss_account.debit[0] = {
    ...report.profit_and_loss_account.debit[0],
    children: [
      row({
        id: "salary",
        particular: "Salary",
        row_kind: "LEDGER",
        amount: "10000.00",
        side: "DEBIT",
        ledger_id: LEDGER_ID,
        ledger_code: "EXP-SAL",
        ledger_name: "Salary",
      }),
    ],
  };
  const detailed = toProfitLossScreen(report);
  const product = findScreenRow(detailed, "opening-product");
  const salary = findScreenRow(detailed, "salary");
  assert.equal(product?.depth, 1);
  assert.equal(product?.ledgerId, null);
  assert.equal(salary?.ledgerId, LEDGER_ID);
  assert.equal(salary?.amount, "10000.00");
  assert.equal(findScreenRow(detailed, "indirect-exp")?.amount, "10000.00");

  const href = buildGeneralLedgerHref({
    ledgerId: salary?.ledgerId ?? "",
    fromDate: "2026-04-01",
    toDate: "2026-09-17",
    financialYearId: "fy-1",
    warehouse: "wh-1",
    source: "profit-loss",
  });
  assert.match(href, /\/accounts\/reports\/general-ledger\?/);
  assert.match(href, new RegExp(`ledgerId=${LEDGER_ID}`));
  assert.equal(href.includes("ledgerId=NaN"), false);
  assert.match(href, /source=profit-loss/);
  assert.match(href, /fy=fy-1/);
}

// Group and sub-group links use explicit ids only. Composite row ids are ignored.
{
  const report = fixture({ report_type: "DETAILED" });
  const groupUuid = "11111111-1111-4111-8111-111111111111";
  const subUuid = "22222222-2222-4222-8222-222222222222";
  report.profit_and_loss_account.debit[0] = {
    ...report.profit_and_loss_account.debit[0],
    children: [
      row({
        id: `indirect-group-${groupUuid}`,
        particular: "Indirect Expenses",
        row_kind: "GROUP",
        amount: "10000.00",
        side: "DEBIT",
        group_id: groupUuid,
        children: [
          row({
            id: `indirect-subgroup-${subUuid}`,
            particular: "Salary",
            row_kind: "SUB_GROUP",
            amount: "10000.00",
            side: "DEBIT",
            group_id: groupUuid,
            sub_group_id: subUuid,
          }),
        ],
      }),
      row({
        id: "unlinked-group-33333333-3333-4333-8333-333333333333",
        particular: "No explicit id",
        row_kind: "GROUP",
        amount: "1.00",
        side: "DEBIT",
        group_id: null,
      }),
    ],
  };
  const screen = toProfitLossScreen(report);
  const group = findScreenRow(screen, `indirect-group-${groupUuid}`);
  const sub = findScreenRow(screen, `indirect-subgroup-${subUuid}`);
  const missing = findScreenRow(screen, "unlinked-group-33333333-3333-4333-8333-333333333333");
  assert.equal(group?.groupId, groupUuid);
  assert.equal(group?.ledgerId, null);
  assert.equal(sub?.groupId, subUuid);
  assert.equal(missing?.groupId, null);
  assert.equal(missing?.ledgerId, null);
  const groupHref = buildGeneralLedgerHref({
    groupId: group?.groupId ?? "",
    fromDate: "2026-04-01",
    toDate: "2026-09-17",
    financialYearId: "fy-1",
    source: "profit-loss",
  });
  assert.match(groupHref, new RegExp(`groupId=${groupUuid}`));
  assert.equal(groupHref.includes("ledgerId="), false);
}

// Display filtering does not replace official net profit.
{
  const report = fixture();
  report.profit_and_loss_account.net_result = { type: "PROFIT", amount: "1000000.00" };
  report.profit_and_loss_account.debit_total = "1000000.00";
  report.profit_and_loss_account.credit_total = "1000000.00";
  report.filtered_hierarchy = {
    affects_net_profit: false,
    trading_account: report.trading_account,
    profit_and_loss_account: {
      ...report.profit_and_loss_account,
      debit: report.profit_and_loss_account.debit.filter((item) => item.id === "np" || item.row_kind === "SECTION_TOTAL"),
    },
  };
  const screen = toProfitLossScreen(report);
  assert.equal(screen.debitTotal, "1000000.00");
  assert.equal(labelOn(screen, "Indirect Expenses", "debit"), undefined);
  assert.equal(labelOn(screen, "Net Profit", "debit")?.amount, "20000.00");
}

// Missing product breakdown does not invent children. Warning text is passed through unchanged.
{
  const report = fixture();
  report.health.product_stock_breakdown_available = false;
  report.health.warnings = [
    {
      code: "PRODUCT_STOCK_BREAKDOWN_UNAVAILABLE",
      message: "Product-wise historical stock breakdown unavailable.",
    },
  ];
  const screen = toProfitLossScreen(report);
  assert.equal(labelOn(screen, "Opening Stock", "debit")?.amount, "10000.00");
  assert.equal(
    screen.pairs.some((pair) => pair.debit?.depth === 1 || pair.credit?.depth === 1),
    false,
  );
  assert.equal(report.health.warnings[0]?.message, "Product-wise historical stock breakdown unavailable.");
}

// Branch stock warning is exposed, not replaced with a fabricated opening.
{
  const report = fixture();
  report.health.branch_stock_available = false;
  report.health.warnings = [
    {
      code: "BRANCH_STOCK_OPENING_UNAVAILABLE",
      message: "Branch opening stock unavailable.",
    },
  ];
  const screen = toProfitLossScreen(report);
  assert.equal(screen.debitTotal, report.profit_and_loss_account.debit_total);
  assert.equal(report.health.warnings[0]?.code, "BRANCH_STOCK_OPENING_UNAVAILABLE");
  assert.equal(labelOn(screen, "Opening Stock", "debit")?.amount, "10000.00");
}

// Normal and Detailed share official totals. Display filters do not replace them.
{
  const normal = toProfitLossScreen(fixture({ report_type: "NORMAL" }));
  const detailedSource = fixture({ report_type: "DETAILED" });
  detailedSource.filtered_hierarchy = {
    affects_net_profit: false,
    trading_account: {
      ...detailedSource.trading_account,
      debit: detailedSource.trading_account.debit.filter((item) => item.id === "opening" || item.row_kind === "SECTION_TOTAL"),
    },
    profit_and_loss_account: detailedSource.profit_and_loss_account,
  };
  const detailed = toProfitLossScreen(detailedSource);
  assert.equal(normal.debitTotal, detailed.debitTotal);
  assert.equal(normal.creditTotal, detailed.creditTotal);
  assert.equal(normal.tradingDebitTotal, detailed.tradingDebitTotal);
  assert.equal(labelOn(detailed, "Purchase Accounts", "debit"), undefined);
  assert.equal(detailed.debitTotal, "30000.00");
}

// Export scope matches the listing query and never sends calculated profits.
{
  const scope = {
    report_type: "DETAILED" as const,
    financial_year_id: "fy-1",
    from_date: "2026-04-01",
    to_date: "2026-09-17",
    warehouse_id: "wh-1",
    group_id: "grp-1",
    sub_group_id: "sub-1",
    ledger_id: LEDGER_ID,
    show_zero: true,
  };
  const normalKey = profitLossQueryKey({ ...scope, report_type: "NORMAL" });
  const detailedKey = profitLossQueryKey(scope);
  assert.notDeepEqual(normalKey, detailedKey);
  assert.equal(normalKey[1], "NORMAL");
  assert.equal(detailedKey[1], "DETAILED");

  const body = buildProfitLossExportBody({ ...scope, format: "PDF" });
  assert.equal(body.report_type, "DETAILED");
  assert.equal(body.financial_year_id, "fy-1");
  assert.equal(body.from_date, "2026-04-01");
  assert.equal(body.to_date, "2026-09-17");
  assert.equal(body.warehouse_id, "wh-1");
  assert.equal(body.group_id, "grp-1");
  assert.equal(body.ledger_id, LEDGER_ID);
  assert.equal(body.show_zero, true);
  assert.equal(body.format, "PDF");
  assert.equal("gross_profit" in body, false);
  assert.equal("net_profit" in body, false);
  assert.equal("opening_stock" in body, false);
  assert.equal("closing_stock" in body, false);

  const excel = buildProfitLossExportBody({
    report_type: "NORMAL",
    financial_year_id: "fy-1",
    from_date: "2026-04-01",
    to_date: "2026-09-17",
    show_zero: false,
    format: "EXCEL",
  });
  assert.equal(excel.report_type, "NORMAL");
  assert.equal(excel.format, "EXCEL");
}

console.log("profit-loss frontend mapping tests passed");
