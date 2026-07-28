/**
 * Centralized Profit & Loss mock dataset — FY 2026–27 demo period.
 * Amounts are signed; returns are negative signedAmount with isReturn=true.
 */

import { roundMoney } from "@/lib/accounts/money-format";
import type { PandLReportNode, PandLReportResponse } from "./pl-report-types";

export const PL_MOCK_PERIOD_FROM = "2026-04-01";
export const PL_MOCK_PERIOD_TO = "2026-07-13";
export const PL_MOCK_FY_LABEL = "FY 2026–27";

const MOCK_EXPENSES: PandLReportNode[] = [
  {
    id: "pl-exp-direct",
    code: "PL-4100",
    particular: "Direct Expenses",
    side: "expense",
    level: "account_group",
    signedAmount: 290_000,
    sortOrder: 10,
    children: [
      {
        id: "pl-exp-purchase-acct",
        code: "PL-4101",
        particular: "Purchase Account",
        side: "expense",
        level: "sub_group",
        signedAmount: 265_000,
        sortOrder: 11,
        children: [
          {
            id: "pl-exp-purchases",
            code: "PL-4110",
            particular: "Purchases",
            side: "expense",
            level: "ledger",
            signedAmount: 280_000,
            ledgerId: 900_101,
            sortOrder: 12,
          },
          {
            id: "pl-exp-purchase-return",
            code: "PL-4111",
            particular: "Purchase Return",
            side: "expense",
            level: "ledger",
            signedAmount: -15_000,
            isReturn: true,
            ledgerId: 900_102,
            sortOrder: 13,
          },
        ],
      },
      {
        id: "pl-exp-freight-inward",
        code: "PL-4113",
        particular: "Freight Inward",
        side: "expense",
        level: "ledger",
        signedAmount: 18_000,
        ledgerId: 900_103,
        sortOrder: 14,
      },
      {
        id: "pl-exp-carriage-inward",
        code: "PL-4116",
        particular: "Carriage Inward",
        side: "expense",
        level: "ledger",
        signedAmount: 7_000,
        ledgerId: 900_104,
        sortOrder: 15,
      },
    ],
  },
  {
    id: "pl-exp-indirect",
    code: "PL-4200",
    particular: "Indirect Expenses",
    side: "expense",
    level: "account_group",
    signedAmount: 125_000,
    sortOrder: 20,
    children: [
      {
        id: "pl-exp-admin",
        code: "PL-4220",
        particular: "Administrative Expenses",
        side: "expense",
        level: "sub_group",
        signedAmount: 83_000,
        sortOrder: 21,
        children: [
          {
            id: "pl-exp-salary",
            code: "PL-42201",
            particular: "Salary Expense",
            side: "expense",
            level: "ledger",
            signedAmount: 55_000,
            ledgerId: 900_201,
            sortOrder: 22,
          },
          {
            id: "pl-exp-rent",
            code: "PL-42202",
            particular: "Rent Expense",
            side: "expense",
            level: "ledger",
            signedAmount: 20_000,
            ledgerId: 900_202,
            sortOrder: 23,
          },
          {
            id: "pl-exp-electricity",
            code: "PL-42203",
            particular: "Electricity Expense",
            side: "expense",
            level: "ledger",
            signedAmount: 8_000,
            ledgerId: 900_203,
            sortOrder: 24,
          },
        ],
      },
      {
        id: "pl-exp-selling",
        code: "PL-4231",
        particular: "Selling Expenses",
        side: "expense",
        level: "sub_group",
        signedAmount: 22_000,
        sortOrder: 25,
        children: [
          {
            id: "pl-exp-freight-out",
            code: "PL-42304",
            particular: "Freight Outward",
            side: "expense",
            level: "ledger",
            signedAmount: 12_000,
            ledgerId: 900_204,
            sortOrder: 26,
          },
          {
            id: "pl-exp-advertisement",
            code: "PL-42301",
            particular: "Advertisement Expense",
            side: "expense",
            level: "ledger",
            signedAmount: 10_000,
            ledgerId: 900_205,
            sortOrder: 27,
          },
        ],
      },
      {
        id: "pl-exp-financial",
        code: "PL-4241",
        particular: "Financial Expenses",
        side: "expense",
        level: "sub_group",
        signedAmount: 8_000,
        sortOrder: 28,
        children: [
          {
            id: "pl-exp-bank-charges",
            code: "PL-42402",
            particular: "Bank Charges",
            side: "expense",
            level: "ledger",
            signedAmount: 3_000,
            ledgerId: 900_206,
            sortOrder: 29,
          },
          {
            id: "pl-exp-interest",
            code: "PL-42401",
            particular: "Interest Expense",
            side: "expense",
            level: "ledger",
            signedAmount: 5_000,
            ledgerId: 900_207,
            sortOrder: 30,
          },
        ],
      },
      {
        id: "pl-exp-depreciation",
        code: "PL-4270",
        particular: "Depreciation",
        side: "expense",
        level: "sub_group",
        signedAmount: 12_000,
        sortOrder: 31,
        children: [
          {
            id: "pl-exp-depreciation-ledger",
            code: "PL-42701",
            particular: "Depreciation Expense",
            side: "expense",
            level: "ledger",
            signedAmount: 12_000,
            ledgerId: 900_208,
            sortOrder: 32,
          },
        ],
      },
    ],
  },
];

const MOCK_INCOME: PandLReportNode[] = [
  {
    id: "pl-inc-direct",
    code: "PL-3100",
    particular: "Direct Income",
    side: "income",
    level: "account_group",
    signedAmount: 475_000,
    sortOrder: 110,
    children: [
      {
        id: "pl-inc-sales-acct",
        code: "PL-3101",
        particular: "Sales Account",
        side: "income",
        level: "sub_group",
        signedAmount: 475_000,
        sortOrder: 111,
        children: [
          {
            id: "pl-inc-sales",
            code: "PL-3110",
            particular: "Sales",
            side: "income",
            level: "ledger",
            signedAmount: 500_000,
            ledgerId: 900_301,
            sortOrder: 112,
          },
          {
            id: "pl-inc-sales-return",
            code: "PL-3111",
            particular: "Sales Return",
            side: "income",
            level: "ledger",
            signedAmount: -25_000,
            isReturn: true,
            ledgerId: 900_302,
            sortOrder: 113,
          },
        ],
      },
    ],
  },
  {
    id: "pl-inc-indirect",
    code: "PL-3200",
    particular: "Indirect Income",
    side: "income",
    level: "account_group",
    signedAmount: 20_000,
    sortOrder: 120,
    children: [
      {
        id: "pl-inc-discount",
        code: "PL-3213",
        particular: "Discount Received",
        side: "income",
        level: "ledger",
        signedAmount: 12_000,
        ledgerId: 900_303,
        sortOrder: 121,
      },
      {
        id: "pl-inc-interest",
        code: "PL-3210",
        particular: "Interest Received",
        side: "income",
        level: "ledger",
        signedAmount: 8_000,
        ledgerId: 900_304,
        sortOrder: 122,
      },
    ],
  },
];

function cloneNodes(nodes: PandLReportNode[]): PandLReportNode[] {
  return JSON.parse(JSON.stringify(nodes)) as PandLReportNode[];
}

function indexNodeCodes(
  nodes: PandLReportNode[],
  into: Map<string, string>,
): void {
  for (const node of nodes) {
    into.set(node.id, node.code.toLowerCase());
    if (node.children?.length) indexNodeCodes(node.children, into);
  }
}

let mockCodeIndex: Map<string, string> | null = null;

/** Ledger / group codes for mock rows — used by search filter. */
export function getPlMockNodeCodes(): Map<string, string> {
  if (!mockCodeIndex) {
    mockCodeIndex = new Map();
    indexNodeCodes(MOCK_EXPENSES, mockCodeIndex);
    indexNodeCodes(MOCK_INCOME, mockCodeIndex);
  }
  return mockCodeIndex;
}

/** Immutable demo payload — clone before returning to callers. */
export function getPlMockReportResponse(): PandLReportResponse {
  const totalIncome = 495_000;
  const totalExpenses = 415_000;
  const netProfit = roundMoney(totalIncome - totalExpenses);
  const balancedTotal = totalIncome;

  return {
    meta: {
      periodFrom: PL_MOCK_PERIOD_FROM,
      periodTo: PL_MOCK_PERIOD_TO,
      financialYearLabel: PL_MOCK_FY_LABEL,
      totalIncome,
      totalExpenses,
      netProfit,
      balancedDebitTotal: balancedTotal,
      balancedCreditTotal: balancedTotal,
      isBalanced: true,
    },
    expenses: cloneNodes(MOCK_EXPENSES),
    income: cloneNodes(MOCK_INCOME),
  };
}
