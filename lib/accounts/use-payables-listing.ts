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
  AgingApiReportTotals,
  ApiSupplierBillOutstandingRow,
  ApiVendorAgeingGroup,
  ApiVendorOutstandingRow,
  BillsApiTotals,
  SupplierSummaryApiTotals,
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
  const [summaryTotals, setSummaryTotals] = useState<SupplierSummaryApiTotals | null>(
    null,
  );
  const [billTotals, setBillTotals] = useState<BillsApiTotals | null>(null);
  const [ageingReportTotals, setAgeingReportTotals] =
    useState<AgingApiReportTotals | null>(null);

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

  const dueStatusParam = useMemo(() => {
    if (dueStatus === "overdue" || dueStatus === "not_due") return dueStatus;
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
            dueStatus: dueStatusParam,
            page,
            page_size: pageSize,
            sortBy: sortParams.sortBy,
            sortOrder: sortParams.sortOrder,
          });
          if (ac.signal.aborted) return;
          const rows = (res.data ?? []).map(mapSupplierSummaryRow);
          setSummaryRows(rows);
          setSummaryTotals(
            res.totals && "outstandingAmount" in res.totals && "overdueAmount" in res.totals
              ? {
                  outstandingAmount: Number(res.totals.outstandingAmount) || 0,
                  notDueAmount: Number(res.totals.notDueAmount) || 0,
                  overdueAmount: Number(res.totals.overdueAmount) || 0,
                }
              : null,
          );
          setBillTotals(null);
          setAgeingReportTotals(null);
          setTotal(res.pagination?.total ?? rows.length);
          return;
        }

        if (view === "bills") {
          const res = await PayablesService.listBills({
            search: debouncedSearch.trim() || undefined,
            supplierIds: selectedSupplierIds,
            asOfDate: asOnDate,
            dueStatus: dueStatusParam,
            page,
            page_size: pageSize,
            sortBy: sortParams.sortBy,
            sortOrder: sortParams.sortOrder,
          });
          if (ac.signal.aborted) return;
          const rows = (res.data ?? []).map(mapPayableBillRow);
          setBillRows(rows);
          setBillTotals(
            res.totals &&
              "outstandingAmount" in res.totals &&
              "originalAmount" in res.totals
              ? {
                  originalAmount: Number(res.totals.originalAmount) || 0,
                  paidAmount: Number(res.totals.paidAmount) || 0,
                  debitNoteAdjustment: Number(res.totals.debitNoteAdjustment) || 0,
                  outstandingAmount: Number(res.totals.outstandingAmount) || 0,
                }
              : null,
          );
          setSummaryTotals(null);
          setAgeingReportTotals(null);
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
        setAgeingReportTotals(
          res.totals && "totalOutstanding" in res.totals
            ? {
                totalOutstanding: Number(res.totals.totalOutstanding) || 0,
                notDueAmount: Number(res.totals.notDueAmount) || 0,
                buckets: res.totals.buckets ?? {},
              }
            : null,
        );
        setSummaryTotals(null);
        setBillTotals(null);
        setTotal(res.pagination?.total ?? rows.length);
      } catch (e) {
        if (ac.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Failed to load payables data.");
        setSummaryRows([]);
        setBillRows([]);
        setAgeingRows([]);
        setSummaryTotals(null);
        setBillTotals(null);
        setAgeingReportTotals(null);
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
    dueStatusParam,
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
    summaryTotals,
    billTotals,
    ageingReportTotals,
  };
}
