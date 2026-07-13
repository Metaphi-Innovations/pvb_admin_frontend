/**
 * Traditional P&L mock source — FY 2026–27 demo period (client Excel format).
 */

import type { PandLTraditionalSource } from "./pl-traditional";

export const PL_MOCK_PERIOD_FROM = "2026-04-01";
export const PL_MOCK_PERIOD_TO = "2026-07-13";
export const PL_MOCK_FY_LABEL = "FY 2026–27";

/** Immutable demo trading + P&L source data. */
export function getPlTraditionalMockSource(): PandLTraditionalSource {
  return {
    openingStock: {
      id: "pl-opening-stock",
      particular: "Opening Stock",
      sortOrder: 10,
      ledgers: [
        {
          id: "pl-opening-computer",
          particular: "Computer Parts",
          amount: 45_700,
          ledgerId: 900_001,
          sortOrder: 11,
        },
        {
          id: "pl-opening-cameras",
          particular: "Digital Cameras",
          amount: 150_000,
          ledgerId: 900_002,
          sortOrder: 12,
        },
      ],
    },
    purchaseAccounts: {
      id: "pl-purchase-acct",
      particular: "Purchase Accounts",
      sortOrder: 20,
      ledgers: [
        {
          id: "pl-purchases",
          particular: "Purchases",
          amount: 9_213_800,
          ledgerId: 900_101,
          sortOrder: 21,
        },
      ],
    },
    closingStock: {
      id: "pl-closing-stock",
      particular: "Closing Stock",
      sortOrder: 110,
      ledgers: [
        {
          id: "pl-closing-computer",
          particular: "Computer Parts",
          amount: 974_147.33,
          ledgerId: 900_003,
          sortOrder: 111,
        },
        {
          id: "pl-closing-cameras",
          particular: "Digital Cameras",
          amount: 394_545.65,
          ledgerId: 900_004,
          sortOrder: 112,
        },
      ],
    },
    salesAccounts: {
      id: "pl-sales-acct",
      particular: "Sales Accounts",
      sortOrder: 120,
      ledgers: [
        {
          id: "pl-sales",
          particular: "Sales",
          amount: 10_067_300,
          ledgerId: 900_301,
          sortOrder: 121,
        },
      ],
    },
    indirectExpenses: {
      id: "pl-indirect-exp",
      particular: "Indirect Expenses",
      sortOrder: 210,
      ledgers: [
        { id: "pl-adv", particular: "Advertising Expenses", amount: 29_000, ledgerId: 900_201, sortOrder: 211 },
        { id: "pl-bank", particular: "Bank Charges", amount: 2_478, ledgerId: 900_202, sortOrder: 212 },
        { id: "pl-courier", particular: "Courier Charges", amount: 2_500, ledgerId: 900_203, sortOrder: 213 },
        { id: "pl-office", particular: "Office Expenses", amount: 81_370, ledgerId: 900_204, sortOrder: 214 },
        { id: "pl-rent", particular: "Rent", amount: 190_000, ledgerId: 900_205, sortOrder: 215 },
        {
          id: "pl-repairs",
          particular: "Repairs and Maintenance Charges",
          amount: 32_650,
          ledgerId: 900_206,
          sortOrder: 216,
        },
        { id: "pl-salary", particular: "Salary", amount: 330_000, ledgerId: 900_207, sortOrder: 217 },
      ],
    },
    indirectIncomes: {
      id: "pl-indirect-inc",
      particular: "Indirect Incomes",
      sortOrder: 220,
      ledgers: [
        {
          id: "pl-interest-bank",
          particular: "Interest From Bank",
          amount: 15_355.04,
          ledgerId: 900_303,
          sortOrder: 221,
        },
      ],
    },
    directExpenses: 0,
  };
}

/** Node codes for search filter. */
export function getPlTraditionalMockCodes(): Map<string, string> {
  const map = new Map<string, string>();
  const source = getPlTraditionalMockSource();
  const groups = [
    source.openingStock,
    source.purchaseAccounts,
    source.closingStock,
    source.salesAccounts,
    source.indirectExpenses,
    source.indirectIncomes,
  ];
  for (const group of groups) {
    map.set(group.id, group.particular.toLowerCase());
    for (const ledger of group.ledgers) {
      map.set(ledger.id, ledger.particular.toLowerCase());
    }
  }
  return map;
}
