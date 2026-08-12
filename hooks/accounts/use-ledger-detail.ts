"use client";

import { useQuery } from "@tanstack/react-query";
import {
  LedgerService,
  type LedgerDetailWithTransactionsDto,
  type LedgerOpeningBalanceDto,
} from "@/services/ledger.service";

export const ledgerDetailKeys = {
  all: ["accounts", "chart-of-accounts", "selected-ledger-detail"] as const,
  view: (
    ledgerId: string | null,
    dateFrom: string,
    dateTo: string,
    refreshTick = 0,
  ) => [...ledgerDetailKeys.all, ledgerId, dateFrom, dateTo, refreshTick] as const,
};

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
  enabled?: boolean;
  refreshTick?: number;
}) {
  const { ledgerId, dateFrom, dateTo, enabled = true, refreshTick = 0 } = options;

  return useQuery({
    queryKey: ledgerDetailKeys.view(ledgerId, dateFrom, dateTo, refreshTick),
    enabled: Boolean(enabled && ledgerId && dateFrom && dateTo),
    queryFn: async ({ signal }) => {
      if (!ledgerId) return null;
      const [detail, currentFy] = await Promise.all([
        LedgerService.view(ledgerId, { dateFrom, dateTo }, signal),
        LedgerService.getCurrentFinancialYear(),
      ]);
      return {
        detail,
        openingBalance: resolveLedgerOpeningBalance(
          detail,
          currentFy?.financialYearId,
        ),
      };
    },
    placeholderData: (previous) => previous,
  });
}
