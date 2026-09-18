/**
 * Balance Sheet display mapping tests.
 * Run: npx tsx app/(app)/accounts/reports/balance-sheet/balance-sheet-api-display.test.ts
 *
 * These assert the screen copies backend rows, totals, difference, and warnings.
 * They do not calculate Assets, Liabilities, Equity, Profit, or Difference.
 */
import assert from "node:assert/strict";
import {
  balanceSheetQueryKey,
  buildBalanceSheetExportBody,
  clearedBalanceSheetDisplayFilters,
  isBalanceSheetDisplayFilterActive,
} from "../../../../../lib/accounts/balance-sheet-query";
import type {
  BalanceSheetNode,
  BalanceSheetReportResult,
  BalanceSheetWarning,
} from "../../../../../types/balance-sheet.types";
import {
  balanceSheetRowHref,
  shouldShowUnpostedVoucherCount,
  toBalanceSheetScreen,
} from "./balance-sheet-api-display";

const LEDGER_ID = "8f1c2a44-6b10-4c3e-9a77-1d2e3f4a5b6c";
const GROUP_ID = "11111111-2222-4333-8444-555555555555";
const SUB_GROUP_ID = "66666666-7777-4888-8999-aaaaaaaaaaaa";

function node(partial: Partial<BalanceSheetNode> & Pick<BalanceSheetNode, "id" | "name" | "node_type">): BalanceSheetNode {
  return {
    code: null,
    side: "LIABILITIES",
    debit: "0.00",
    credit: "0.00",
    balance_amount: "0.00",
    balance_side: "CREDIT",
    signed_balance: "0.00",
    is_abnormal: false,
    ledger_id: null,
    ledger_code: null,
    ledger_name: null,
    group_id: null,
    sub_group_id: null,
    primary_head_id: null,
    primary_head_code: null,
    children: [],
    ...partial,
  };
}

function report(overrides: Partial<BalanceSheetReportResult> = {}): BalanceSheetReportResult {
  const base: BalanceSheetReportResult = {
    report_type: "DETAILED",
    scope: {
      financial_year_id: "fy-1",
      financial_year_code: "FY26",
      financial_year_name: "2026-27",
      as_on_date: "2026-09-17",
      movement_from_date: "2026-04-01",
      warehouse_id: null,
      warehouse_name: null,
      company_name: "PVB",
      opening_balance_mode: "COMPANY_LEDGER_OPENING_PLUS_LINES",
      generated_at: "2026-09-17T00:00:00.000Z",
    },
    filters: {
      group_id: null,
      sub_group_id: null,
      ledger_id: null,
      show_zero: false,
      filters_are_display_only: true,
    },
    liabilities: { rows: [], subtotal: "0.00", signed_subtotal: "0.00" },
    equity: {
      rows: [],
      subtotal: "0.00",
      signed_subtotal: "0.00",
      current_profit: "0.00",
      current_loss: "0.00",
    },
    liabilities_and_equity: { rows: [], subtotal: "0.00", signed_subtotal: "0.00" },
    assets: { rows: [], subtotal: "0.00", signed_subtotal: "0.00" },
    totals: {
      liabilities_and_equity: "0.00",
      assets: "0.00",
      difference: "0.00",
      is_balanced: true,
    },
    reconciliation: {
      profit_and_loss: {
        type: "NONE",
        amount: "0.00",
        applied_to_equity: false,
        source: "ProfitLossService.getReport",
      },
    },
    health: {
      is_balanced: true,
      difference: "0.00",
      unposted_voucher_count: null,
      suspense_row_created: false,
    },
    warnings: [],
    notes: {
      opening_balance_branch_limitation: null,
      equity_structure: "LIA-CAP",
      current_profit_treatment: "reporting-derived",
    },
  };
  return { ...base, ...overrides, scope: { ...base.scope, ...overrides.scope } };
}

const drill = {
  financialYearId: "fy-1",
  fromDate: "2026-04-01",
  toDate: "2026-09-17",
  warehouseId: "wh-1",
};

// Balanced fixture: official totals are copied, not recomputed from rows.
{
  const result = report({
    liabilities_and_equity: {
      rows: [
        node({
          id: "lia",
          name: "Current Liabilities",
          node_type: "GROUP",
          balance_amount: "1000.00",
        }),
      ],
      subtotal: "118000.00",
      signed_subtotal: "-118000.00",
    },
    assets: {
      rows: [
        node({
          id: "ast",
          name: "Current Assets",
          node_type: "GROUP",
          side: "ASSETS",
          balance_amount: "2000.00",
          balance_side: "DEBIT",
        }),
      ],
      subtotal: "118000.00",
      signed_subtotal: "118000.00",
    },
    totals: {
      liabilities_and_equity: "118000.00",
      assets: "118000.00",
      difference: "0.00",
      is_balanced: true,
    },
  });
  const screen = toBalanceSheetScreen(result);
  assert.equal(screen.totalAssets, "118000.00");
  assert.equal(screen.totalLiabilitiesAndEquity, "118000.00");
  assert.equal(screen.difference, "0.00");
  assert.equal(screen.isBalanced, true);
  assert.notEqual(screen.totalAssets, screen.assets[0]?.amount);
  assert.equal(screen.assets[0]?.amount, "2000.00");
}

// Unbalanced fixture: show backend difference; do not invent a balancing row.
{
  const result = report({
    totals: {
      liabilities_and_equity: "95000.00",
      assets: "100000.00",
      difference: "5000.00",
      is_balanced: false,
    },
    health: {
      is_balanced: false,
      difference: "5000.00",
      unposted_voucher_count: null,
      suspense_row_created: false,
    },
    liabilities_and_equity: {
      rows: [node({ id: "lia", name: "Liabilities", node_type: "GROUP", balance_amount: "95000.00" })],
      subtotal: "95000.00",
      signed_subtotal: "-95000.00",
    },
    assets: {
      rows: [
        node({
          id: "ast",
          name: "Assets",
          node_type: "GROUP",
          side: "ASSETS",
          balance_amount: "100000.00",
          balance_side: "DEBIT",
        }),
      ],
      subtotal: "100000.00",
      signed_subtotal: "100000.00",
    },
  });
  const screen = toBalanceSheetScreen(result);
  assert.equal(screen.totalAssets, "100000.00");
  assert.equal(screen.totalLiabilitiesAndEquity, "95000.00");
  assert.equal(screen.difference, "5000.00");
  assert.equal(screen.isBalanced, false);
  const names = [...screen.liabilities, ...screen.assets].map((row) => row.name);
  assert.equal(names.includes("Suspense"), false);
  assert.equal(names.includes("Difference Account"), false);
  assert.equal(names.includes("Balancing Figure"), false);
}

// Current Year Profit reporting row is shown and is not a General Ledger link.
{
  const profit = node({
    id: "reporting:current-year-profit",
    name: "Current Year Profit",
    node_type: "REPORTING_ROW",
    side: "EQUITY",
    balance_amount: "50000.00",
    ledger_id: null,
  });
  const screen = toBalanceSheetScreen(
    report({
      liabilities_and_equity: {
        rows: [profit],
        subtotal: "50000.00",
        signed_subtotal: "-50000.00",
      },
    }),
  );
  assert.equal(screen.liabilities[0]?.name, "Current Year Profit");
  assert.equal(screen.liabilities[0]?.amount, "50000.00");
  assert.equal(screen.liabilities[0]?.nodeType, "REPORTING_ROW");
  assert.equal(screen.liabilities[0]?.ledgerId, null);
  assert.equal(balanceSheetRowHref(screen.liabilities[0]!, drill), null);
}

// Branch opening-balance warning is preserved. No company opening row is injected.
{
  const warning: BalanceSheetWarning = {
    code: "BRANCH_OPENING_BALANCE_UNAVAILABLE",
    message: "Branch Balance Sheet cannot include company ledger opening balances.",
    severity: "WARNING",
  };
  const result = report({
    warnings: [warning],
    scope: {
      financial_year_id: "fy-1",
      financial_year_code: "FY26",
      financial_year_name: "2026-27",
      as_on_date: "2026-09-17",
      movement_from_date: "2026-04-01",
      warehouse_id: "wh-1",
      warehouse_name: "Branch A",
      company_name: "PVB",
      opening_balance_mode: "WAREHOUSE_LINES_ONLY",
      generated_at: "2026-09-17T00:00:00.000Z",
    },
    assets: {
      rows: [
        node({
          id: "cash",
          name: "Cash",
          node_type: "LEDGER",
          side: "ASSETS",
          balance_amount: "10.00",
          balance_side: "DEBIT",
          ledger_id: LEDGER_ID,
        }),
      ],
      subtotal: "10.00",
      signed_subtotal: "10.00",
    },
  });
  const screen = toBalanceSheetScreen(result);
  assert.equal(result.warnings[0]?.code, "BRANCH_OPENING_BALANCE_UNAVAILABLE");
  assert.equal(screen.assets.length, 1);
  assert.equal(screen.assets[0]?.name, "Cash");
  assert.equal(screen.assets.some((row) => row.name.includes("Opening")), false);
}

// Unposted count: null is hidden; a numeric count may be shown.
assert.equal(shouldShowUnpostedVoucherCount(null), false);
assert.equal(shouldShowUnpostedVoucherCount(undefined), false);
assert.equal(shouldShowUnpostedVoucherCount(25), true);
assert.equal(shouldShowUnpostedVoucherCount(0), true);
{
  const hidden = toBalanceSheetScreen(report());
  assert.equal(hidden.unpostedVoucherCount, null);
  assert.equal(shouldShowUnpostedVoucherCount(hidden.unpostedVoucherCount), false);
  const shown = toBalanceSheetScreen(
    report({
      health: {
        is_balanced: true,
        difference: "0.00",
        unposted_voucher_count: 25,
        suspense_row_created: false,
      },
    }),
  );
  assert.equal(shown.unpostedVoucherCount, 25);
}

// Ledger drill-down uses the explicit ledger id and FY start → as-on date.
{
  const ledger = node({
    id: "ledger-row",
    name: "Sundry Debtors",
    node_type: "LEDGER",
    side: "ASSETS",
    balance_side: "DEBIT",
    balance_amount: "400.00",
    ledger_id: LEDGER_ID,
    is_abnormal: true,
  });
  const href = balanceSheetRowHref(
    {
      id: ledger.id,
      name: ledger.name,
      amount: ledger.balance_amount,
      balanceSide: ledger.balance_side,
      isAbnormal: ledger.is_abnormal,
      nodeType: ledger.node_type,
      ledgerId: ledger.ledger_id,
      groupId: ledger.group_id,
      subGroupId: ledger.sub_group_id,
      children: [],
    },
    drill,
  );
  assert.ok(href);
  const url = new URL(href, "http://local");
  assert.equal(url.searchParams.get("ledgerId"), LEDGER_ID);
  assert.equal(url.searchParams.get("fy"), "fy-1");
  assert.equal(url.searchParams.get("fromDate"), "2026-04-01");
  assert.equal(url.searchParams.get("toDate"), "2026-09-17");
  assert.equal(url.searchParams.get("source"), "balance-sheet");
  assert.equal(url.searchParams.get("warehouse"), "wh-1");
}

// Group and sub-group links use explicit ids. Missing ids are not clickable.
{
  const group = node({
    id: "g",
    name: "Fixed Assets",
    node_type: "GROUP",
    side: "ASSETS",
    group_id: GROUP_ID,
  });
  const groupHref = balanceSheetRowHref(
    {
      id: group.id,
      name: group.name,
      amount: group.balance_amount,
      balanceSide: group.balance_side,
      isAbnormal: false,
      nodeType: "GROUP",
      ledgerId: null,
      groupId: GROUP_ID,
      subGroupId: null,
      children: [],
    },
    drill,
  );
  assert.ok(groupHref);
  assert.equal(new URL(groupHref, "http://local").searchParams.get("groupId"), GROUP_ID);

  const missing = balanceSheetRowHref(
    {
      id: "g2",
      name: "No id",
      amount: "0.00",
      balanceSide: "DEBIT",
      isAbnormal: false,
      nodeType: "GROUP",
      ledgerId: null,
      groupId: null,
      subGroupId: null,
      children: [],
    },
    drill,
  );
  assert.equal(missing, null);

  const subHref = balanceSheetRowHref(
    {
      id: "s",
      name: "Bank Accounts",
      amount: "1.00",
      balanceSide: "DEBIT",
      isAbnormal: false,
      nodeType: "SUB_GROUP",
      ledgerId: null,
      groupId: GROUP_ID,
      subGroupId: SUB_GROUP_ID,
      children: [],
    },
    drill,
  );
  assert.equal(new URL(subHref!, "http://local").searchParams.get("groupId"), SUB_GROUP_ID);
}

// Display filters do not change official totals. Clearing them does not reset scope.
{
  const filtered = report({
    filters: {
      group_id: GROUP_ID,
      sub_group_id: null,
      ledger_id: null,
      show_zero: false,
      filters_are_display_only: true,
    },
    assets: {
      rows: [
        node({
          id: "one",
          name: "Cash",
          node_type: "LEDGER",
          side: "ASSETS",
          balance_amount: "10.00",
          balance_side: "DEBIT",
          ledger_id: LEDGER_ID,
        }),
      ],
      subtotal: "118000.00",
      signed_subtotal: "118000.00",
    },
    totals: {
      liabilities_and_equity: "118000.00",
      assets: "118000.00",
      difference: "0.00",
      is_balanced: true,
    },
  });
  const screen = toBalanceSheetScreen(filtered);
  assert.equal(screen.totalAssets, "118000.00");
  assert.notEqual(screen.totalAssets, screen.assets[0]?.amount);
  assert.equal(
    isBalanceSheetDisplayFilterActive({
      groupId: GROUP_ID,
      subGroupId: "all",
      ledgerId: "all",
      showZero: false,
      showZeroDefault: false,
    }),
    true,
  );
  const cleared = clearedBalanceSheetDisplayFilters(false);
  assert.deepEqual(cleared, {
    groupId: "all",
    subGroupId: "all",
    ledgerId: "all",
    showZero: false,
  });
}

// Export body is the active scope only. Client totals are not sent.
{
  const body = buildBalanceSheetExportBody({
    report_type: "DETAILED",
    format: "EXCEL",
    financial_year_id: "fy-1",
    as_on_date: "2026-09-17",
    warehouse_id: "wh-1",
    group_id: GROUP_ID,
    sub_group_id: SUB_GROUP_ID,
    ledger_id: LEDGER_ID,
    show_zero: true,
  });
  assert.equal(body.financial_year_id, "fy-1");
  assert.equal(body.as_on_date, "2026-09-17");
  assert.equal(body.warehouse_id, "wh-1");
  assert.equal(body.report_type, "DETAILED");
  assert.equal(body.group_id, GROUP_ID);
  assert.equal(body.format, "EXCEL");
  assert.equal("total_assets" in body, false);
  assert.equal("total_liabilities" in body, false);
  assert.equal("difference" in body, false);
  assert.equal("current_profit" in body, false);
  const key = balanceSheetQueryKey({
    report_type: "DETAILED",
    financial_year_id: "fy-1",
    as_on_date: "2026-09-17",
    warehouse_id: "wh-1",
    show_zero: false,
  });
  assert.equal(key[0], "balance-sheet");
  assert.equal(key[1], "fy-1");
  assert.equal(key[2], "2026-09-17");
}

console.log("balance-sheet-api-display.test.ts passed");
