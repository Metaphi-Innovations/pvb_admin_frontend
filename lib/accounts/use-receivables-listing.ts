"use client";

import { useEffect, useMemo, useState } from "react";
import { useDebouncedValue } from "@/app/(app)/accounts/reports/pl/pl-hooks";
import type { AgeingBreakpoints } from "@/lib/accounts/ageing-breakpoints";
import {
  AGING_SORT_KEY_TO_API,
  FOLLOW_UP_SORT_KEY_TO_API,
  INVOICE_SORT_KEY_TO_API,
  mapAgingRow,
  mapCustomerSummaryRow,
  mapFollowUpRow,
  mapReceivableInvoiceRow,
  SUMMARY_SORT_KEY_TO_API,
} from "@/lib/accounts/receivables-api-mappers";
import type {
  ApiCollectionFollowUpRow,
  ApiCustomerAgeingRow,
  ApiCustomerOutstandingRow,
  ApiInvoiceOutstandingRow,
} from "@/types/receivables.types";
import { ReceivablesService } from "@/services/receivables.service";

type WorkspaceView = "summary" | "invoice" | "ageing" | "collection";

export interface ReceivablesListingState {
  loading: boolean;
  error: string | null;
  total: number;
  summaryRows: ApiCustomerOutstandingRow[];
  invoiceRows: ApiInvoiceOutstandingRow[];
  ageingRows: ApiCustomerAgeingRow[];
  collectionRows: ApiCollectionFollowUpRow[];
}

export function useReceivablesListing(options: {
  view: WorkspaceView;
  asOnDate: string;
  search: string;
  customerId: string;
  salesperson?: string;
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
    customerId,
    salesperson,
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
  const [summaryRows, setSummaryRows] = useState<ApiCustomerOutstandingRow[]>([]);
  const [invoiceRows, setInvoiceRows] = useState<ApiInvoiceOutstandingRow[]>([]);
  const [ageingRows, setAgeingRows] = useState<ApiCustomerAgeingRow[]>([]);
  const [collectionRows, setCollectionRows] = useState<ApiCollectionFollowUpRow[]>([]);
  const [salespersonIdMap, setSalespersonIdMap] = useState<Record<string, string>>({});

  const sortParams = useMemo(() => {
    const map =
      view === "summary"
        ? SUMMARY_SORT_KEY_TO_API
        : view === "invoice"
          ? INVOICE_SORT_KEY_TO_API
          : view === "ageing"
            ? AGING_SORT_KEY_TO_API
            : FOLLOW_UP_SORT_KEY_TO_API;
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

  const resolvedSalespersonId =
    salesperson && salesperson !== "all" ? salespersonIdMap[salesperson] : undefined;

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (view === "summary") {
          const res = await ReceivablesService.getCustomerSummary({
            search: debouncedSearch.trim() || undefined,
            customerId: customerId !== "all" ? customerId : undefined,
            salespersonId: resolvedSalespersonId,
            asOfDate: asOnDate,
            excludeZeroBalance: true,
            status: dueStatusApi,
            page,
            page_size: pageSize,
            sortBy: sortParams.sortBy,
            sortOrder: sortParams.sortOrder,
          });
          if (ac.signal.aborted) return;
          const apiRows = res.data ?? [];
          setSalespersonIdMap((prev) => {
            const next = { ...prev };
            for (const row of apiRows) {
              if (row.salesperson?.id && row.salesperson?.name) {
                next[row.salesperson.name] = row.salesperson.id;
              }
            }
            return next;
          });
          let rows = apiRows.map(mapCustomerSummaryRow);
          if (dueStatus === "not_due") {
            rows = rows.filter((r) => r.overdueAmount <= 0.009 && r.outstanding > 0.009);
          }
          setSummaryRows(rows);
          setTotal(res.pagination?.total ?? rows.length);
          return;
        }

        if (view === "invoice") {
          const res = await ReceivablesService.getInvoices({
            search: debouncedSearch.trim() || undefined,
            customerId: customerId !== "all" ? customerId : undefined,
            asOfDate: asOnDate,
            status: dueStatusApi,
            page,
            page_size: pageSize,
            sortBy: sortParams.sortBy,
            sortOrder: sortParams.sortOrder,
          });
          if (ac.signal.aborted) return;
          let rows = (res.data ?? []).map(mapReceivableInvoiceRow);
          if (dueStatus === "not_due") {
            rows = rows.filter((r) => r.overdueDays <= 0 && r.outstandingAmount > 0.009);
          }
          setInvoiceRows(rows);
          setTotal(res.pagination?.total ?? rows.length);
          return;
        }

        if (view === "ageing") {
          const res = await ReceivablesService.getAging({
            search: debouncedSearch.trim() || undefined,
            customerId: customerId !== "all" ? customerId : undefined,
            asOfDate: asOnDate,
            agingBreakpoints: appliedBreakpoints.join(","),
            page,
            page_size: pageSize,
            sortBy: sortParams.sortBy,
            sortOrder: sortParams.sortOrder,
          });
          if (ac.signal.aborted) return;
          const rows = (res.data ?? []).map((row) => mapAgingRow(row, appliedBreakpoints));
          setAgeingRows(rows);
          setTotal(res.pagination?.total ?? rows.length);
          return;
        }

        const res = await ReceivablesService.getFollowUps({
          search: debouncedSearch.trim() || undefined,
          customerId: customerId !== "all" ? customerId : undefined,
          page,
          page_size: pageSize,
          sortBy: sortParams.sortBy,
          sortOrder: sortParams.sortOrder,
        });
        if (ac.signal.aborted) return;
        const rows = (res.data ?? []).map(mapFollowUpRow);
        setCollectionRows(rows);
        setTotal(res.pagination?.total ?? rows.length);
      } catch (e) {
        if (ac.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Failed to load receivables data.");
        setSummaryRows([]);
        setInvoiceRows([]);
        setAgeingRows([]);
        setCollectionRows([]);
        setTotal(0);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [
    view,
    debouncedSearch,
    customerId,
    salesperson,
    dueStatus,
    dueStatusApi,
    asOnDate,
    page,
    pageSize,
    sortParams.sortBy,
    sortParams.sortOrder,
    appliedBreakpoints,
    refreshKey,
    resolvedSalespersonId,
  ]);

  return {
    loading,
    error,
    total,
    summaryRows,
    invoiceRows,
    ageingRows,
    collectionRows,
    resolvedSalespersonId,
  };
}
