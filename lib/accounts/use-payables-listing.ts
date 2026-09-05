"use client";

import { useEffect, useMemo, useState } from "react";
import { useDebouncedValue } from "@/app/(app)/accounts/reports/pl/pl-hooks";
import type { AgeingBreakpoints } from "@/lib/accounts/ageing-breakpoints";
import {
  AGING_SORT_KEY_TO_API,
  BILLS_SORT_KEY_TO_API,
  mapAgingVendorGroup,
  mapPayableBillRow,
  mapSupplierSummaryRow,
  SUMMARY_SORT_KEY_TO_API,
} from "@/lib/accounts/payables-api-mappers";
import type {
  ApiSupplierBillOutstandingRow,
  ApiVendorAgeingGroup,
  ApiVendorOutstandingRow,
} from "@/types/payables.types";
import { PayablesService } from "@/services/payables.service";

type WorkspaceView = "summary" | "bills" | "ageing";

export function usePayablesListing(options: {
  view: WorkspaceView;
  asOnDate: string;
  search: string;
  supplierIds: string[];
  dueStatus: "all" | "overdue" | "not_due";
  page: number;
  pageSize: number;
  sortKey: string;
  sortDir: "asc" | "desc";
  appliedBreakpoints: AgeingBreakpoints;
  refreshKey: number;
}) {
  const {
    view,
    asOnDate,
    search,
    supplierIds,
    dueStatus,
    page,
    pageSize,
    sortKey,
    sortDir,
    appliedBreakpoints,
    refreshKey,
  } = options;

  const debouncedSearch = useDebouncedValue(search, 300);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [summaryRows, setSummaryRows] = useState<ApiVendorOutstandingRow[]>([]);
  const [billRows, setBillRows] = useState<ApiSupplierBillOutstandingRow[]>([]);
  const [ageingRows, setAgeingRows] = useState<ApiVendorAgeingGroup[]>([]);

  const sortParams = useMemo(() => {
    const map =
      view === "summary"
        ? SUMMARY_SORT_KEY_TO_API
        : view === "bills"
          ? BILLS_SORT_KEY_TO_API
          : AGING_SORT_KEY_TO_API;
    const apiSort = sortKey ? map[sortKey] : undefined;
    return {
      sortBy: apiSort,
      sortOrder: apiSort ? sortDir : undefined,
    };
  }, [view, sortKey, sortDir]);

  const dueStatusApi = useMemo(() => {
    if (dueStatus === "overdue") return "OVERDUE";
    return undefined;
  }, [dueStatus]);

  const supplierIdsKey = supplierIds.join(",");

  useEffect(() => {
    const ac = new AbortController();
    const selectedSupplierIds = supplierIds.length > 0 ? supplierIds : undefined;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (view === "summary") {
          const res = await PayablesService.getSupplierSummary({
            search: debouncedSearch.trim() || undefined,
            supplierIds: selectedSupplierIds,
            asOfDate: asOnDate,
            excludeZeroBalance: true,
            status: dueStatusApi,
            page,
            page_size: pageSize,
            sortBy: sortParams.sortBy,
            sortOrder: sortParams.sortOrder,
          });
          if (ac.signal.aborted) return;
          let rows = (res.data ?? []).map(mapSupplierSummaryRow);
          if (dueStatus === "not_due") {
            rows = rows.filter(
              (r) => r.overdueAmount <= 0.009 && r.outstanding > 0.009,
            );
          }
          setSummaryRows(rows);
          setTotal(res.pagination?.total ?? rows.length);
          return;
        }

        if (view === "bills") {
          const res = await PayablesService.listBills({
            search: debouncedSearch.trim() || undefined,
            supplierIds: selectedSupplierIds,
            asOfDate: asOnDate,
            status: dueStatusApi,
            page,
            page_size: pageSize,
            sortBy: sortParams.sortBy,
            sortOrder: sortParams.sortOrder,
          });
          if (ac.signal.aborted) return;
          let rows = (res.data ?? []).map(mapPayableBillRow);
          if (dueStatus === "not_due") {
            rows = rows.filter((r) => r.overdueDays <= 0 && r.outstanding > 0.009);
          }
          setBillRows(rows);
          setTotal(res.pagination?.total ?? rows.length);
          return;
        }

        const res = await PayablesService.getAging({
          search: debouncedSearch.trim() || undefined,
          supplierIds: selectedSupplierIds,
          asOfDate: asOnDate,
          agingBreakpoints: appliedBreakpoints.join(","),
          page,
          page_size: pageSize,
          sortBy: sortParams.sortBy,
          sortOrder: sortParams.sortOrder,
        });
        if (ac.signal.aborted) return;
        const rows = (res.data ?? []).map((row) =>
          mapAgingVendorGroup(row, appliedBreakpoints),
        );
        setAgeingRows(rows);
        setTotal(res.pagination?.total ?? rows.length);
      } catch (e) {
        if (ac.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Failed to load payables data.");
        setSummaryRows([]);
        setBillRows([]);
        setAgeingRows([]);
        setTotal(0);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [
    view,
    debouncedSearch,
    supplierIdsKey,
    dueStatus,
    dueStatusApi,
    asOnDate,
    page,
    pageSize,
    sortParams.sortBy,
    sortParams.sortOrder,
    appliedBreakpoints,
    refreshKey,
  ]);

  return {
    loading,
    error,
    total,
    summaryRows,
    billRows,
    ageingRows,
  };
}
