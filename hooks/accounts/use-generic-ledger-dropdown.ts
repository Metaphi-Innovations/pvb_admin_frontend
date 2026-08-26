"use client";

import { useQuery } from "@tanstack/react-query";
import {
  LedgerService,
  type LedgerDropdownResponse,
  type GenericLedgerDropdownQuery,
} from "@/services/ledger.service";

export const genericLedgerDropdownKeys = {
  all: ["accounts", "ledgers", "generic-dropdown"] as const,
  list: (params: GenericLedgerDropdownQuery) => [...genericLedgerDropdownKeys.all, params] as const,
};

export function useGenericLedgerDropdown(options?: {
  enabled?: boolean;
  query?: GenericLedgerDropdownQuery;
}) {
  const enabled = options?.enabled ?? true;
  const query = options?.query ?? {};

  return useQuery<LedgerDropdownResponse>({
    queryKey: genericLedgerDropdownKeys.list(query),
    queryFn: ({ signal }) => LedgerService.getGenericDropdown(query, signal),
    enabled,
    staleTime: 60_000,
  });
}
