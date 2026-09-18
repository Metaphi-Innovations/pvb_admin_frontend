import { buildGeneralLedgerHref } from "@/lib/accounts/general-ledger-href";
import type {
  BalanceSheetNode,
  BalanceSheetNodeType,
  BalanceSheetReportResult,
} from "@/types/balance-sheet.types";

export interface BalanceSheetScreenRow {
  id: string;
  name: string;
  amount: string;
  balanceSide: "DEBIT" | "CREDIT";
  isAbnormal: boolean;
  nodeType: BalanceSheetNodeType;
  ledgerId: string | null;
  groupId: string | null;
  subGroupId: string | null;
  children: BalanceSheetScreenRow[];
}

export interface BalanceSheetScreenModel {
  liabilities: BalanceSheetScreenRow[];
  assets: BalanceSheetScreenRow[];
  totalLiabilitiesAndEquity: string;
  totalAssets: string;
  difference: string;
  isBalanced: boolean;
  unpostedVoucherCount: number | null;
  companyName: string;
  financialYearName: string;
  asOnDate: string;
  warehouseName: string | null;
}

export interface BalanceSheetDrillScope {
  financialYearId: string;
  fromDate: string;
  toDate: string;
  warehouseId?: string;
}

function mapNode(node: BalanceSheetNode): BalanceSheetScreenRow {
  return {
    id: node.id,
    name: node.name,
    amount: node.balance_amount,
    balanceSide: node.balance_side,
    isAbnormal: node.is_abnormal,
    nodeType: node.node_type,
    ledgerId: node.ledger_id,
    groupId: node.group_id,
    subGroupId: node.sub_group_id,
    children: (node.children ?? []).map(mapNode),
  };
}

/** Presentation only. Totals are copied from the backend response. */
export function toBalanceSheetScreen(report: BalanceSheetReportResult): BalanceSheetScreenModel {
  return {
    liabilities: report.liabilities_and_equity.rows.map(mapNode),
    assets: report.assets.rows.map(mapNode),
    totalLiabilitiesAndEquity: report.totals.liabilities_and_equity,
    totalAssets: report.totals.assets,
    difference: report.totals.difference,
    isBalanced: report.totals.is_balanced,
    unpostedVoucherCount: report.health.unposted_voucher_count,
    companyName: report.scope.company_name,
    financialYearName:
      report.scope.financial_year_name ?? report.scope.financial_year_code ?? "",
    asOnDate: report.scope.as_on_date,
    warehouseName: report.scope.warehouse_name,
  };
}

/**
 * null means the backend did not count unposted vouchers.
 * Only a real number may be shown. Zero is a number and may be shown.
 */
export function shouldShowUnpostedVoucherCount(
  count: number | null | undefined,
): count is number {
  return typeof count === "number" && Number.isFinite(count);
}

export function collectExpandableIds(nodes: BalanceSheetScreenRow[]): string[] {
  const ids: string[] = [];
  const walk = (rows: BalanceSheetScreenRow[]) => {
    for (const row of rows) {
      if (row.children.length > 0) {
        ids.push(row.id);
        walk(row.children);
      }
    }
  };
  walk(nodes);
  return ids;
}

/**
 * Ledger rows open General Ledger. Group and sub-group rows open GL only
 * when the backend supplied an explicit UUID. Reporting rows never do.
 */
export function balanceSheetRowHref(
  row: BalanceSheetScreenRow,
  scope: BalanceSheetDrillScope,
): string | null {
  if (row.nodeType === "REPORTING_ROW") return null;
  if (row.nodeType === "LEDGER") {
    if (!row.ledgerId) return null;
    return buildGeneralLedgerHref({
      ledgerId: row.ledgerId,
      fromDate: scope.fromDate,
      toDate: scope.toDate,
      financialYearId: scope.financialYearId,
      warehouse: scope.warehouseId,
      source: "balance-sheet",
    });
  }
  const groupTarget =
    row.nodeType === "SUB_GROUP" ? row.subGroupId : row.groupId;
  if (!groupTarget) return null;
  return buildGeneralLedgerHref({
    groupId: groupTarget,
    fromDate: scope.fromDate,
    toDate: scope.toDate,
    financialYearId: scope.financialYearId,
    warehouse: scope.warehouseId,
    source: "balance-sheet",
  });
}
