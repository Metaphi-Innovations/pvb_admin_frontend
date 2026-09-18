import type { ProfitLossReportResult, ProfitLossRow, ProfitLossRowKind } from "@/types/profit-loss.types";

export type PlScreenEmphasis = "category" | "detail" | "presentation" | "section";

export interface PlScreenRow {
  id: string;
  particular: string;
  /** Backend amount string. Display only — never a frontend sum. */
  amount: string;
  depth: number;
  emphasis: PlScreenEmphasis;
  ledgerId: string | null;
  /** Explicit backend group or sub-group UUID for General Ledger group mode. */
  groupId: string | null;
}

export interface PlScreenPair {
  debit: PlScreenRow | null;
  credit: PlScreenRow | null;
}

export interface PlScreenModel {
  pairs: PlScreenPair[];
  /** Official final P&L totals from the backend. Not a sum of visible rows. */
  debitTotal: string;
  creditTotal: string;
  tradingDebitTotal: string;
  tradingCreditTotal: string;
  tradingBalanced: boolean;
  finalBalanced: boolean;
}

function emphasisOf(kind: ProfitLossRowKind): PlScreenEmphasis {
  if (kind === "PRESENTATION") return "presentation";
  if (kind === "SECTION_TOTAL") return "section";
  if (kind === "CATEGORY") return "category";
  return "detail";
}

function isFooterTotal(row: ProfitLossRow): boolean {
  return row.row_kind === "SECTION_TOTAL" && row.particular === "Total";
}

function drillTarget(row: ProfitLossRow): { ledgerId: string | null; groupId: string | null } {
  if (row.row_kind === "LEDGER" && row.ledger_id) {
    return { ledgerId: row.ledger_id, groupId: null };
  }
  if (row.row_kind === "GROUP" && row.group_id) {
    return { ledgerId: null, groupId: row.group_id };
  }
  // General Ledger group mode accepts an account-subgroup UUID as groupId.
  if (row.row_kind === "SUB_GROUP" && row.sub_group_id) {
    return { ledgerId: null, groupId: row.sub_group_id };
  }
  return { ledgerId: null, groupId: null };
}

/**
 * Flatten backend rows in returned order.
 * Children are rendered only when the backend included them.
 * Drill-down ids come only from explicit fields, never from composite row ids.
 */
function flattenSide(rows: ProfitLossRow[], depth = 0): PlScreenRow[] {
  const out: PlScreenRow[] = [];
  for (const row of rows) {
    if (isFooterTotal(row)) continue;
    out.push({
      id: row.id,
      particular: row.particular,
      amount: row.amount,
      depth,
      emphasis: emphasisOf(row.row_kind),
      ...drillTarget(row),
    });
    if (row.children?.length) {
      out.push(...flattenSide(row.children, depth + 1));
    }
  }
  return out;
}

/**
 * Keep a section total on the same visual row even when one side has more children.
 * Amounts are copied from backend rows. Nothing is summed.
 */
function zipAligned(left: PlScreenRow[], right: PlScreenRow[]): PlScreenPair[] {
  const leftTotal = left[left.length - 1]?.emphasis === "section" ? left[left.length - 1] : null;
  const rightTotal = right[right.length - 1]?.emphasis === "section" ? right[right.length - 1] : null;
  const leftBody = leftTotal ? left.slice(0, -1) : left;
  const rightBody = rightTotal ? right.slice(0, -1) : right;
  const count = Math.max(leftBody.length, rightBody.length);
  const pairs: PlScreenPair[] = Array.from({ length: count }, (_, index) => ({
    debit: leftBody[index] ?? null,
    credit: rightBody[index] ?? null,
  }));
  if (leftTotal || rightTotal) {
    pairs.push({ debit: leftTotal, credit: rightTotal });
  }
  return pairs;
}

export function toProfitLossScreen(report: ProfitLossReportResult): PlScreenModel {
  const trading = report.filtered_hierarchy?.trading_account ?? report.trading_account;
  const finalAccount =
    report.filtered_hierarchy?.profit_and_loss_account ?? report.profit_and_loss_account;

  return {
    pairs: [
      ...zipAligned(flattenSide(trading.debit), flattenSide(trading.credit)),
      ...zipAligned(flattenSide(finalAccount.debit), flattenSide(finalAccount.credit)),
    ],
    debitTotal: report.profit_and_loss_account.debit_total,
    creditTotal: report.profit_and_loss_account.credit_total,
    tradingDebitTotal: report.trading_account.debit_total,
    tradingCreditTotal: report.trading_account.credit_total,
    tradingBalanced: report.trading_account.is_balanced,
    finalBalanced: report.profit_and_loss_account.is_balanced,
  };
}

export function findScreenRow(model: PlScreenModel, id: string): PlScreenRow | undefined {
  for (const pair of model.pairs) {
    if (pair.debit?.id === id) return pair.debit;
    if (pair.credit?.id === id) return pair.credit;
  }
  return undefined;
}
