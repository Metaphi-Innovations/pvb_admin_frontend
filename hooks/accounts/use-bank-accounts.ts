"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BankAccountsListService,
  type CompleteBankAccountDetailsPayload,
  type CreateBankAccountPayload,
} from "@/services/bank-accounts-list.service";
import { accountsKeys } from "@/lib/accounts/accounts-query-keys";

export function useBankAccountByLedgerId(
  ledgerId: string | null | undefined,
  options?: { financialYearId?: string | null; enabled?: boolean },
) {
  return useQuery({
    queryKey: accountsKeys.bankAccounts.detail(ledgerId ?? ""),
    queryFn: ({ signal }) =>
      BankAccountsListService.getByLedgerId(ledgerId!, {
        signal,
        financialYearId: options?.financialYearId,
      }),
    enabled: Boolean(ledgerId) && (options?.enabled ?? true),
  });
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      financialYearId,
    }: {
      payload: CreateBankAccountPayload;
      financialYearId?: string | null;
    }) => BankAccountsListService.create(payload, { financialYearId }),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accountsKeys.bankAccounts.lists() }),
        queryClient.invalidateQueries({
          queryKey: accountsKeys.bankAccounts.detail(result.data.ledgerId),
        }),
      ]);
    },
  });
}

export function useCompleteBankAccountDetails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ledgerId,
      payload,
      financialYearId,
    }: {
      ledgerId: string;
      payload: CompleteBankAccountDetailsPayload;
      financialYearId?: string | null;
    }) =>
      BankAccountsListService.completeDetails(ledgerId, payload, {
        financialYearId,
      }),
    onSuccess: async (result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accountsKeys.bankAccounts.lists() }),
        queryClient.invalidateQueries({
          queryKey: accountsKeys.bankAccounts.detail(variables.ledgerId),
        }),
        queryClient.invalidateQueries({
          queryKey: accountsKeys.bankAccounts.detail(result.data.ledgerId),
        }),
      ]);
    },
  });
}
