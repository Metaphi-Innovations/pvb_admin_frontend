"use client";

import { useQuery } from "@tanstack/react-query";
import {
  LedgerService,
  type LedgerPeriodBalanceDto,
} from "@/services/ledger.service";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ledgerBalanceKeys = {
  all: ["accounts", "chart-of-accounts", "ledger-balances"] as const,
  list: (
    ledgerIds: string[],
    dateFrom: string,
    dateTo: string,
    refreshTick = 0,
  ) => [...ledgerBalanceKeys.all, ledgerIds, dateFrom, dateTo, refreshTick] as const,
};

export function useLedgerBalances(options: {
  ledgerIds: string[];
  dateFrom: string;
  dateTo: string;
  enabled?: boolean;
  refreshTick?: number;
}) {
  const {
    ledgerIds,
    dateFrom,
    dateTo,
    enabled = true,
    refreshTick = 0,
  } = options;

  const uuidIds = [...new Set(ledgerIds.filter((id) => UUID_RE.test(id)))].sort();

  return useQuery({
    queryKey: ledgerBalanceKeys.list(uuidIds, dateFrom, dateTo, refreshTick),
    enabled: Boolean(enabled && uuidIds.length > 0 && dateFrom && dateTo),
    queryFn: async ({ signal }) => {
      const rows = await LedgerService.getBalances(
        { ledgerIds: uuidIds, dateFrom, dateTo },
        signal,
      );
      return rows;
    },
    placeholderData: (previous) => previous,
  });
}

export function ledgerBalancesById(
  rows: LedgerPeriodBalanceDto[] | undefined,
): Map<string, LedgerPeriodBalanceDto> {
  const map = new Map<string, LedgerPeriodBalanceDto>();
  for (const row of rows ?? []) {
    map.set(row.ledgerId, row);
  }
  return map;
}
