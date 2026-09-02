"use client";

import { useCallback, useEffect, useState } from "react";
import { useDebouncedValue } from "@/app/(app)/accounts/reports/pl/pl-hooks";
import {
  EMPTY_OUTSTANDING_SUMMARY,
  mapBillWiseApiRow,
  mapBillWiseSummary,
} from "@/lib/accounts/bill-wise-outstanding-display";
import { BillWiseOutstandingService } from "@/services/bill-wise-outstanding.service";
import type {
  BillWiseOutstandingListQuery,
  OutstandingBillDisplayRow,
  OutstandingBillSummaryDisplay,
} from "@/types/bill-wise-outstanding.types";

export interface UseBillWiseOutstandingFilters {
  partyLedgerId?: string;
  financialYearId?: string;
  startDate?: string;
  endDate?: string;
  asOfDate?: string;
  branchId?: string;
  status?: string;
  search?: string;
  openOutstandingOnly?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  /** When false, skip fetching (e.g. ledger UUID not resolved yet). */
  enabled?: boolean;
  refreshKey?: number | string;
}

export function useBillWiseOutstanding(filters: UseBillWiseOutstandingFilters) {
  const enabled = filters.enabled !== false;
  const debouncedSearch = useDebouncedValue(filters.search ?? "", 300);

  const [rows, setRows] = useState<OutstandingBillDisplayRow[]>([]);
  const [summary, setSummary] = useState<OutstandingBillSummaryDisplay>(
    EMPTY_OUTSTANDING_SUMMARY,
  );
  const [page, setPageState] = useState(filters.page ?? 1);
  const [limit, setLimitState] = useState(filters.limit ?? 10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep local page/limit in sync when parent resets them
  useEffect(() => {
    if (filters.page != null) setPageState(filters.page);
  }, [filters.page]);

  useEffect(() => {
    if (filters.limit != null) setLimitState(filters.limit);
  }, [filters.limit]);

  const load = useCallback(async () => {
    if (!enabled) {
      setRows([]);
      setSummary(EMPTY_OUTSTANDING_SUMMARY);
      setTotalRecords(0);
      setTotalPages(0);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const query: BillWiseOutstandingListQuery = {
        financialYearId: filters.financialYearId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        asOfDate: filters.asOfDate,
        branchId: filters.branchId,
        partyLedgerId: filters.partyLedgerId,
        status:
          filters.status && filters.status !== "ALL"
            ? filters.status
            : undefined,
        search: debouncedSearch.trim() || undefined,
        openOutstandingOnly: filters.openOutstandingOnly,
        page,
        limit,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      const result = filters.partyLedgerId
        ? await BillWiseOutstandingService.listByParty(
            filters.partyLedgerId,
            query,
          )
        : await BillWiseOutstandingService.list(query);

      setRows(result.records.map(mapBillWiseApiRow));
      setSummary(mapBillWiseSummary(result.summary));
      setTotalRecords(result.pagination.totalRecords);
      setTotalPages(result.pagination.totalPages);
    } catch (e) {
      setRows([]);
      setSummary(EMPTY_OUTSTANDING_SUMMARY);
      setTotalRecords(0);
      setTotalPages(0);
      setError(
        e instanceof Error ? e.message : "Failed to load bill-wise outstanding.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    enabled,
    filters.financialYearId,
    filters.startDate,
    filters.endDate,
    filters.asOfDate,
    filters.branchId,
    filters.partyLedgerId,
    filters.status,
    filters.openOutstandingOnly,
    filters.sortBy,
    filters.sortOrder,
    filters.refreshKey,
    debouncedSearch,
    page,
    limit,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const setPage = useCallback((next: number) => {
    setPageState(Math.max(1, next));
  }, []);

  const setLimit = useCallback((next: number) => {
    setLimitState(next);
    setPageState(1);
  }, []);

  const resetPage = useCallback(() => setPageState(1), []);

  return {
    rows,
    summary,
    page,
    limit,
    totalRecords,
    totalPages,
    loading,
    error,
    setPage,
    setLimit,
    resetPage,
    reload: load,
  };
}
