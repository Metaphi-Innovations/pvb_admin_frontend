"use client";

import { useQuery } from "@tanstack/react-query";
import {
  LedgerService,
  type LedgerDetailWithTransactionsDto,
  type LedgerOpeningBalanceDto,
} from "@/services/ledger.service";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ledgerDetailKeys = {
  all: ["accounts", "chart-of-accounts", "selected-ledger-detail"] as const,
  view: (
    ledgerId: string | null,
    dateFrom: string,
    dateTo: string,
    financialYearId = "",
    refreshTick = 0,
  ) =>
    [
      ...ledgerDetailKeys.all,
      ledgerId,
      dateFrom,
      dateTo,
      financialYearId,
      refreshTick,
    ] as const,
};

/** Invalidate ledger statement caches (call after ledger create/update/opening change). */
export function invalidateLedgerDetailQueries(
  queryClient: { invalidateQueries: (opts: { queryKey: readonly unknown[] }) => unknown },
): void {
  void queryClient.invalidateQueries({ queryKey: ledgerDetailKeys.all });
}

function resolveLedgerOpeningBalance(
  detail: LedgerDetailWithTransactionsDto,
  financialYearId?: string,
): LedgerOpeningBalanceDto | null {
  if (financialYearId) {
    const match = detail.openingBalances?.find(
      (row) => row.financialYearId === financialYearId,
    );
    if (match) return match;
  }
  return detail.openingBalance ?? detail.openingBalances?.[0] ?? null;
}

export function useLedgerDetail(options: {
  ledgerId: string | null;
  dateFrom: string;
  dateTo: string;
  financialYearId?: string;
  enabled?: boolean;
  refreshTick?: number;
}) {
  const {
    ledgerId,
    dateFrom,
    dateTo,
    financialYearId,
    enabled = true,
    refreshTick = 0,
  } = options;

  const fyId =
    financialYearId && UUID_RE.test(financialYearId) ? financialYearId : undefined;

  return useQuery({
    queryKey: ledgerDetailKeys.view(
      ledgerId,
      dateFrom,
      dateTo,
      fyId ?? "",
      refreshTick,
    ),
    enabled: Boolean(enabled && ledgerId && dateFrom && dateTo),
    queryFn: async ({ signal }) => {
      if (!ledgerId) return null;
      const detail = await LedgerService.view(
        ledgerId,
        {
          dateFrom,
          dateTo,
          ...(fyId ? { financialYearId: fyId } : {}),
        },
        signal,
      );
      return {
        detail,
        openingBalance: resolveLedgerOpeningBalance(detail, fyId),
      };
    },
    placeholderData: (previous) => previous,
  });
}
