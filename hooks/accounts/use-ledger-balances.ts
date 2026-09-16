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
    financialYearId = "",
    refreshTick = 0,
  ) =>
    [
      ...ledgerBalanceKeys.all,
      ledgerIds,
      dateFrom,
      dateTo,
      financialYearId,
      refreshTick,
    ] as const,
};

export function useLedgerBalances(options: {
  ledgerIds: string[];
  dateFrom: string;
  dateTo: string;
  financialYearId?: string;
  enabled?: boolean;
  refreshTick?: number;
}) {
  const {
    ledgerIds,
    dateFrom,
    dateTo,
    financialYearId,
    enabled = true,
    refreshTick = 0,
  } = options;

  const uuidIds = [...new Set(ledgerIds.filter((id) => UUID_RE.test(id)))].sort();
  const fyId =
    financialYearId && UUID_RE.test(financialYearId) ? financialYearId : undefined;

  return useQuery({
    queryKey: ledgerBalanceKeys.list(
      uuidIds,
      dateFrom,
      dateTo,
      fyId ?? "",
      refreshTick,
    ),
    enabled: Boolean(enabled && uuidIds.length > 0 && dateFrom && dateTo),
    queryFn: async ({ signal }) => {
      const rows = await LedgerService.getBalances(
        {
          ledgerIds: uuidIds,
          dateFrom,
          dateTo,
          ...(fyId ? { financialYearId: fyId } : {}),
        },
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
