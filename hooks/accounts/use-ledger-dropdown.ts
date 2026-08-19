"use client";

import { useQuery } from "@tanstack/react-query";
import {
  LedgerService,
  type LedgerDropdownQuery,
  type LedgerDropdownResponse,
} from "@/services/ledger.service";

export const ledgerDropdownKeys = {
  all: ["accounts", "ledgers", "dropdown"] as const,
  list: (params: LedgerDropdownQuery) => [...ledgerDropdownKeys.all, params] as const,
};

export function useLedgerDropdown(options?: {
  enabled?: boolean;
  query?: LedgerDropdownQuery;
}) {
  const enabled = options?.enabled ?? true;
  const query = options?.query ?? {};

  return useQuery<LedgerDropdownResponse>({
    queryKey: ledgerDropdownKeys.list(query),
    queryFn: ({ signal }) => LedgerService.getDropdown(query, signal),
    enabled,
    staleTime: 60_000,
  });
}
