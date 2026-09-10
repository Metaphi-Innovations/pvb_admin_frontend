"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { BankAccountsListService } from "@/services/bank-accounts-list.service";
import {
  accountsKeys,
  type BankAccountsListKeyParams,
} from "@/lib/accounts/accounts-query-keys";

export function useBankAccountsList(params: BankAccountsListKeyParams) {
  return useQuery({
    queryKey: accountsKeys.bankAccounts.list(params),
    queryFn: ({ signal }) =>
      BankAccountsListService.list({
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        ordering: params.ordering,
        apiFilters: params.apiFilters,
        financialYearId: params.financialYearId,
        signal,
      }),
  });
}

export function useBankAccountFilterOptions(fieldName: string, enabled = true) {
  return useQuery({
    queryKey: accountsKeys.bankAccounts.filterDropdown(fieldName),
    queryFn: ({ signal }) =>
      BankAccountsListService.getFilterDropdown(fieldName, signal),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: Boolean(fieldName) && enabled,
  });
}

export function useExportBankAccounts() {
  return useMutation({
    mutationFn: (params: {
      search?: string;
      ordering?: string;
      apiFilters?: Record<string, unknown>;
      financialYearId?: string | null;
    }) => BankAccountsListService.export(params),
  });
}

export function useBankAccountOptions(
  params?: {
    warehouseId?: string | null;
    usage?: "RECEIPT" | "PAYMENT";
    enabled?: boolean;
  },
) {
  const warehouseId = params?.warehouseId?.trim() || undefined;
  const usage = params?.usage;
  const enabled = params?.enabled ?? true;
  return useQuery({
    queryKey: accountsKeys.bankAccounts.options({ warehouseId, usage }),
    queryFn: ({ signal }) =>
      BankAccountsListService.getOptions({ warehouseId, usage, signal }),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled,
  });
}
