/**
 * Profit & Loss report API types — mirrors the future backend response contract.
 */

export type PandLReportSide = "income" | "expense";

export type PandLReportNodeLevel = "account_group" | "sub_group" | "ledger";

/** Single row in the P&L hierarchy (group, sub-group, or ledger). */
export interface PandLReportNode {
  id: string;
  code: string;
  particular: string;
  side: PandLReportSide;
  level: PandLReportNodeLevel;
  /** Signed amount — negative for returns / contra lines */
  signedAmount: number;
  isReturn?: boolean;
  ledgerId?: number;
  sortOrder: number;
  children?: PandLReportNode[];
}

export interface PandLReportMeta {
  periodFrom: string;
  periodTo: string;
  financialYearLabel: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  balancedDebitTotal: number;
  balancedCreditTotal: number;
  isBalanced: boolean;
}

/** Full P&L report payload returned by GET /accounts/reports/profit-loss */
export interface PandLReportResponse {
  meta: PandLReportMeta;
  expenses: PandLReportNode[];
  income: PandLReportNode[];
}
