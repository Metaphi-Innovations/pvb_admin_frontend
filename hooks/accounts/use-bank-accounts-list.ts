"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BankAccountsListService,
  type BankAccountsListSortBy,
  type BankAccountsListSortOrder,
} from "@/services/bank-accounts-list.service";
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
        limit: params.limit,
        search: params.search,
        sortBy: params.sortBy as BankAccountsListSortBy,
        sortOrder: params.sortOrder as BankAccountsListSortOrder,
        status: params.status as "ACTIVE" | "INACTIVE" | undefined,
        detailsStatus: params.detailsStatus as "PENDING" | "COMPLETE" | undefined,
        accountType: params.accountType as
          | "CURRENT"
          | "SAVINGS"
          | "CASH_CREDIT"
          | "OVERDRAFT"
          | undefined,
        warehouseId: params.warehouseId,
        signal,
      }),
  });
}
