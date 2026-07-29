"use client";

import { useQuery } from "@tanstack/react-query";
import { ChartOfAccountsService } from "@/services/chart-of-accounts.service";
import { mapCoaApiTreeToRecords } from "@/lib/accounts/coa-api-mapper";

export const chartOfAccountsKeys = {
  all: ["accounts", "chart-of-accounts"] as const,
  tree: (params?: {
    financialYearId?: string;
    includeLedgers?: boolean;
    search?: string;
  }) => [...chartOfAccountsKeys.all, "tree", params ?? {}] as const,
};

export function useChartOfAccountsTree(options?: {
  enabled?: boolean;
  financialYearId?: string;
  includeLedgers?: boolean;
  /** Backend tree search (name/code). Empty = full tree. */
  search?: string;
}) {
  const enabled = options?.enabled ?? true;
  const financialYearId = options?.financialYearId;
  const includeLedgers = options?.includeLedgers ?? true;
  const search = options?.search?.trim() || undefined;

  return useQuery({
    queryKey: chartOfAccountsKeys.tree({ financialYearId, includeLedgers, search }),
    queryFn: async ({ signal }) => {
      const tree = await ChartOfAccountsService.getTree({
        includeLedgers,
        ...(search ? { search } : {}),
        // Only send FY when it is a real UUID — frontend FY store still uses labels like "2026-27".
        ...(financialYearId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          financialYearId,
        )
          ? { financialYearId }
          : {}),
        signal,
      });
      return mapCoaApiTreeToRecords(tree);
    },
    enabled,
    staleTime: search ? 0 : 30_000,
    placeholderData: (previous) => previous,
  });
}
