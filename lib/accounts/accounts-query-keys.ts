/** Stable TanStack Query keys for Accounts modules. */

export type BankAccountsListKeyParams = {
  page: number;
  pageSize: number;
  search?: string;
  ordering?: string;
  apiFilters: Record<string, unknown>;
  financialYearId?: string | null;
};

export const accountsKeys = {
  all: ["accounts"] as const,

  bankAccounts: {
    all: () => [...accountsKeys.all, "bank-accounts"] as const,
    lists: () => [...accountsKeys.bankAccounts.all(), "list"] as const,
    list: (params: BankAccountsListKeyParams) =>
      [...accountsKeys.bankAccounts.lists(), params] as const,
    filterDropdowns: () =>
      [...accountsKeys.bankAccounts.all(), "filter-dropdown"] as const,
    filterDropdown: (fieldName: string) =>
      [...accountsKeys.bankAccounts.filterDropdowns(), fieldName] as const,
    options: () => [...accountsKeys.bankAccounts.all(), "options"] as const,
    details: () => [...accountsKeys.bankAccounts.all(), "detail"] as const,
    detail: (ledgerId: string) =>
      [...accountsKeys.bankAccounts.details(), ledgerId] as const,
  },
};
