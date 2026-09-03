"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsTablePagination,
  ACCOUNTS_DEFAULT_PAGE_SIZE,
} from "@/components/accounts/AccountsTableListing";
import { BillOutstandingDetailsSheet } from "@/components/accounts/outstanding/BillOutstandingDetailsSheet";
import { OutstandingBillsTable } from "@/components/accounts/outstanding/OutstandingBillsTable";
import {
  defaultOutstandingFiltersState,
  OutstandingFiltersBar,
  resolveCurrentFinancialYear,
  type OutstandingFiltersState,
} from "@/components/accounts/outstanding/OutstandingFiltersBar";
import { OutstandingSummaryCards } from "@/components/accounts/outstanding/OutstandingSummaryCards";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  EMPTY_OUTSTANDING_SUMMARY,
  mapPayableBillToDisplay,
} from "@/lib/accounts/bill-wise-outstanding-display";
import { useDebouncedValue } from "@/app/(app)/accounts/reports/pl/pl-hooks";
import { useFY } from "@/lib/fy-store";
import { PayablesService } from "@/services/payables.service";
import type {
  OutstandingBillDisplayRow,
  OutstandingBillSummaryDisplay,
} from "@/types/bill-wise-outstanding.types";

/**
 * Vendor/supplier bill-wise outstanding.
 * Uses Payables bills API (as-of settlement recalculation) because the new
 * Bill-wise Outstanding backend endpoint is receivables-only.
 */
export function PayablesBillWiseOutstandingPanel({
  supplierId,
  partyCode,
  partyName,
  backHref,
  refreshKey,
  compact = false,
}: {
  supplierId?: string | null;
  partyCode?: string;
  partyName?: string;
  backHref?: string;
  refreshKey?: number | string;
  compact?: boolean;
}) {
  const { selectedFY, allFYs } = useFY();
  const currentFy = useMemo(
    () => resolveCurrentFinancialYear(allFYs, selectedFY),
    [allFYs, selectedFY],
  );
  const [filters, setFilters] = useState<OutstandingFiltersState>(() =>
    defaultOutstandingFiltersState(currentFy),
  );
  const fySyncedRef = useRef(false);

  useEffect(() => {
    if (!currentFy?.id || fySyncedRef.current) return;
    fySyncedRef.current = true;
    setFilters(defaultOutstandingFiltersState(currentFy));
  }, [currentFy]);

  const [sortBy, setSortBy] = useState("invoiceDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(ACCOUNTS_DEFAULT_PAGE_SIZE);
  const [rows, setRows] = useState<OutstandingBillDisplayRow[]>([]);
  const [summary, setSummary] = useState<OutstandingBillSummaryDisplay>(
    EMPTY_OUTSTANDING_SUMMARY,
  );
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<OutstandingBillDisplayRow | null>(
    null,
  );

  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const resetPage = useCallback(() => setPage(1), []);
  const pageMode = Boolean(backHref) && !compact;
  const apiStatus =
    filters.statuses.length === 1 ? filters.statuses[0] : undefined;

  useEffect(() => {
    resetPage();
  }, [
    filters.startDate,
    filters.endDate,
    filters.asOfDate,
    filters.statuses,
    debouncedSearch,
    sortBy,
    sortOrder,
    resetPage,
  ]);

  useEffect(() => {
    if (!supplierId) {
      setRows([]);
      setSummary(EMPTY_OUTSTANDING_SUMMARY);
      setTotalRecords(0);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [result, detail] = await Promise.all([
          PayablesService.listBills({
            supplierId,
            asOfDate: filters.asOfDate || filters.endDate || undefined,
            invoiceDateFrom: filters.startDate || undefined,
            invoiceDateTo: filters.endDate || undefined,
            status: apiStatus,
            search: debouncedSearch.trim() || undefined,
            page,
            page_size: limit,
            sortBy,
            sortOrder,
          }),
          PayablesService.getSupplierOutstanding(
            supplierId,
            filters.asOfDate || filters.endDate || undefined,
          ),
        ]);
        if (cancelled) return;
        let mapped = result.data.map(mapPayableBillToDisplay);
        if (filters.statuses.length > 1) {
          const allowed = new Set(
            filters.statuses.map((s) => s.toUpperCase().replace(/\s+/g, "_")),
          );
          mapped = mapped.filter((r) =>
            allowed.has(
              String(r.displayStatus).toUpperCase().replace(/\s+/g, "_"),
            ),
          );
        }
        setRows(mapped);
        setTotalRecords(
          filters.statuses.length > 1
            ? mapped.length
            : result.pagination.total,
        );
        setSummary({
          totalBills:
            filters.statuses.length > 1
              ? mapped.length
              : result.pagination.total,
          totalInvoiceAmount: detail.totalPurchases,
          totalAdjustedAmount: detail.totalPayments + (detail.debitNotes ?? 0),
          totalOutstandingAmount: detail.currentOutstanding,
          totalOverdueAmount: mapped
            .filter((r) => r.isOverdue)
            .reduce((s, r) => s + r.outstandingAmount, 0),
        });
      } catch (e) {
        if (!cancelled) {
          setRows([]);
          setSummary(EMPTY_OUTSTANDING_SUMMARY);
          setTotalRecords(0);
          setError(
            e instanceof Error
              ? e.message
              : "Failed to load supplier bill outstanding.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    supplierId,
    filters.startDate,
    filters.endDate,
    filters.asOfDate,
    filters.statuses,
    apiStatus,
    debouncedSearch,
    page,
    limit,
    sortBy,
    sortOrder,
    refreshKey,
  ]);

  const handleSort = useCallback(
    (key: string) => {
      if (sortBy === key) {
        setSortOrder((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(key);
        setSortOrder("desc");
      }
      resetPage();
    },
    [sortBy, resetPage],
  );

  const filtersNode = (
    <OutstandingFiltersBar
      value={filters}
      onChange={setFilters}
      onResetPage={resetPage}
      docLabel="Bill"
    />
  );

  const tableBlock = (
    <>
      <OutstandingBillsTable
        rows={rows}
        loading={loading}
        error={error}
        docLabel="Bill"
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onView={setDetailRow}
        emptyMessage="No bill outstanding records for the selected filters."
      />
      <AccountsTablePagination
        page={page}
        pageSize={limit || ACCOUNTS_DEFAULT_PAGE_SIZE}
        totalRecords={totalRecords}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setLimit(size);
          setPage(1);
        }}
        recordLabel="bills"
      />
      <BillOutstandingDetailsSheet
        open={detailRow != null}
        onOpenChange={(open) => {
          if (!open) setDetailRow(null);
        }}
        row={detailRow}
        mode="payables"
        asOfDate={filters.asOfDate || filters.endDate}
        docLabel="Bill"
      />
    </>
  );

  if (pageMode && backHref) {
    return (
      <AccountsPageShell
        breadcrumbs={[
          ...accountsBreadcrumb(
            "Chart of Accounts",
            partyName || "Ledger",
            backHref,
          ),
          { label: "Bill-wise Outstanding" },
        ]}
        title="Bill-wise Outstanding"
        description={`${partyCode || "—"} · ${partyName || "Ledger"} · Supplier`}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            asChild
          >
            <Link href={backHref}>
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Link>
          </Button>
        }
        filters={supplierId ? filtersNode : undefined}
        layout="split"
        className="h-full min-h-0"
      >
        {!supplierId ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Supplier is required to load bill-wise outstanding.
          </div>
        ) : (
          <>
            <div className="flex-shrink-0 border-b border-border/60 bg-white px-4 py-3">
              <OutstandingSummaryCards summary={summary} loading={loading} />
            </div>
            <div className="flex-1 min-h-0 flex flex-col bg-white">
              {tableBlock}
            </div>
          </>
        )}
      </AccountsPageShell>
    );
  }

  return (
    <div className="flex flex-col gap-3 min-h-0">
      {filtersNode}
      <OutstandingSummaryCards summary={summary} loading={loading} />
      <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden flex flex-col min-h-0">
        {tableBlock}
      </div>
    </div>
  );
}
