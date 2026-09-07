"use client";

import { useEffect, useMemo, useState } from "react";
import { useDebouncedValue } from "@/app/(app)/accounts/reports/pl/pl-hooks";
import type { AgeingBreakpoints } from "@/lib/accounts/ageing-breakpoints";
import {
  AGING_SORT_KEY_TO_API,
  FOLLOW_UP_SORT_KEY_TO_API,
  INVOICE_SORT_KEY_TO_API,
  mapAgingCustomerGroup,
  mapCustomerSummaryRow,
  mapFollowUpRow,
  mapReceivableInvoiceRow,
  SUMMARY_SORT_KEY_TO_API,
} from "@/lib/accounts/receivables-api-mappers";
import type {
  ApiCollectionFollowUpRow,
  ApiCustomerAgeingGroup,
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
  ageingRows: ApiCustomerAgeingGroup[];
  collectionRows: ApiCollectionFollowUpRow[];
}

export function useReceivablesListing(options: {
  view: WorkspaceView;
  asOnDate: string;
  search: string;
  customerIds: string[];
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
    customerIds,
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
  const [ageingRows, setAgeingRows] = useState<ApiCustomerAgeingGroup[]>([]);
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

  const customerIdsKey = customerIds.join(",");

  useEffect(() => {
    const ac = new AbortController();
    const selectedCustomerIds = customerIds.length > 0 ? customerIds : undefined;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (view === "summary") {
          const res = await ReceivablesService.getCustomerSummary({
            search: debouncedSearch.trim() || undefined,
            customerIds: selectedCustomerIds,
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
            customerIds: selectedCustomerIds,
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
            customerIds: selectedCustomerIds,
            salespersonId: resolvedSalespersonId,
            asOfDate: asOnDate,
            excludeZeroBalance: true,
            status: dueStatusApi,
            agingBreakpoints: appliedBreakpoints.join(","),
            page,
            page_size: pageSize,
            sortBy: sortParams.sortBy,
            sortOrder: sortParams.sortOrder,
          });
          if (ac.signal.aborted) return;
          const rows = (res.data ?? []).map((row) =>
            mapAgingCustomerGroup(row, appliedBreakpoints),
          );
          setAgeingRows(rows);
          setTotal(res.pagination?.total ?? rows.length);
          return;
        }

        const res = await ReceivablesService.getFollowUps({
          search: debouncedSearch.trim() || undefined,
          customerId: selectedCustomerIds?.[0],
          page,
          page_size: pageSize,
          sortBy: sortParams.sortBy,
          sortOrder: sortParams.sortOrder,
        });
        if (ac.signal.aborted) return;
        let rows = (res.data ?? []).map(mapFollowUpRow);
        if (selectedCustomerIds && selectedCustomerIds.length > 1) {
          const set = new Set(selectedCustomerIds);
          rows = rows.filter((r) => set.has(String(r.customerId)));
        }
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
    customerIdsKey,
    resolvedSalespersonId,
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
    invoiceRows,
    ageingRows,
    collectionRows,
    resolvedSalespersonId,
  };
}
