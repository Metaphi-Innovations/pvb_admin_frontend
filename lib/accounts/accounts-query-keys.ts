/** Stable TanStack Query keys for Accounts modules. */

export type BankAccountsListKeyParams = {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  status?: string;
  detailsStatus?: string;
  accountType?: string;
  warehouseId?: string;
};

export const accountsKeys = {
  all: ["accounts"] as const,

  bankAccounts: {
    all: () => [...accountsKeys.all, "bank-accounts"] as const,
    lists: () => [...accountsKeys.bankAccounts.all(), "list"] as const,
    list: (params: BankAccountsListKeyParams) =>
      [...accountsKeys.bankAccounts.lists(), params] as const,
    details: () => [...accountsKeys.bankAccounts.all(), "detail"] as const,
    detail: (ledgerId: string) =>
      [...accountsKeys.bankAccounts.details(), ledgerId] as const,
  },
};
