"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AccountsGenerateAction,
  AccountsTableActionCell,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  AccountsListingFilterCard,
  AccountsTableEmpty,
  AccountsTableListing,
  AccountsTableLoading,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import { ReportSearchFilter } from "@/components/accounts/ReportFilters";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import type { AccountsColumnFilterConfig } from "@/lib/accounts/column-filter-types";
import {
  DEBIT_NOTES_LIST_PATH,
  debitNotesListHref,
  formatINR,
  withReturnTo,
} from "../note-utils";
import { formatDisplayDate, toIsoDateOnly } from "@/lib/accounts/date-display";
import { DebitNoteService } from "@/services/debit-note.service";
import { showToast } from "@/lib/toast";
import { useDebouncedValue } from "@/app/(app)/accounts/reports/pl/pl-hooks";
import { useDebitNoteListingState } from "@/app/(app)/accounts/transactions/debit-notes/debit-note-listing-state-context";

interface PendingDebitNoteRow {
  returnId: string;
  returnNumber: string;
  returnDate: string;
  supplierName: string;
  poNumber: string;
  grnNo: string;
  dispatchNo: string;
  totalReturnQty: number;
  taxableAmount: number;
  gstAmount: number;
  totalAmount: number;
}

function matchesPendingSearch(row: PendingDebitNoteRow, q: string): boolean {
  if (!q) return true;
  const hay = [
    row.returnNumber,
    row.supplierName,
    row.poNumber,
    row.grnNo,
    row.dispatchNo,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function mapPendingApiRow(raw: any): PendingDebitNoteRow {
  const refs: Array<{ reference_type?: string; reference_code?: string | null }> =
    raw.references || [];
  const poFromRef = refs.find((r) => r.reference_type === "PURCHASE_ORDER")?.reference_code;
  const grnCodes = refs
    .filter((r) => r.reference_type === "GRN" && r.reference_code)
    .map((r) => r.reference_code as string);
  const returnDateRaw = raw.purchase_return?.return_date || raw.eligibility_date || null;
  const lines: Array<{ quantity?: string | number }> = raw.lines || [];
  const qtySum = lines.reduce(
    (acc, line) => acc + parseFloat(String(line.quantity || "0")),
    0,
  );
  const gstFromSplit =
    parseFloat(raw.cgst_amount || "0") +
    parseFloat(raw.sgst_amount || "0") +
    parseFloat(raw.igst_amount || "0");

  return {
    returnId: raw.pending_debit_note_id,
    returnNumber: raw.purchase_return_number || raw.purchase_return?.return_no || "—",
    returnDate: toIsoDateOnly(returnDateRaw),
    supplierName: raw.supplier_name || raw.supplier?.supplier_name || "—",
    poNumber: raw.purchase_return?.purchase_order?.po_no || poFromRef || "—",
    grnNo: grnCodes.length ? grnCodes.join(", ") : "—",
    dispatchNo: raw.dispatch?.dispatch_number || raw.dispatch?.challan_number || "—",
    totalReturnQty: qtySum,
    taxableAmount: parseFloat(raw.taxable_amount || "0"),
    gstAmount:
      parseFloat(raw.gst_amount || "0") > 0
        ? parseFloat(raw.gst_amount || "0")
        : gstFromSplit,
    totalAmount: parseFloat(raw.eligible_dn_amount || "0"),
  };
}

function PendingNotesSortSync({
  sortKey,
  sortDir,
  columnFilters,
  onSortChange,
  onFilterChange,
}: {
  sortKey: string;
  sortDir: "asc" | "desc";
  columnFilters: Record<string, unknown>;
  onSortChange: (sortKey: string, sortDir: "asc" | "desc") => void;
  onFilterChange: (filters: Record<string, unknown>) => void;
}) {
  const ctx = useAccountsColumnFilterContext();

  useEffect(() => {
    if (!ctx) return;
    const nextKey = ctx.sortKey || "";
    const nextDir = ctx.sortDir ?? "asc";
    if (nextKey !== sortKey || (nextKey !== "" && nextDir !== sortDir)) {
      onSortChange(nextKey, nextDir);
    }
  }, [ctx?.sortKey, ctx?.sortDir, sortKey, sortDir, onSortChange]);

  useEffect(() => {
    if (!ctx) return;
    const ctxFiltersStr = JSON.stringify(ctx.columnFilters || {});
    const propFiltersStr = JSON.stringify(columnFilters || {});
    if (ctxFiltersStr !== propFiltersStr) {
      onFilterChange(ctx.columnFilters || {});
    }
  }, [ctx?.columnFilters, columnFilters, onFilterChange]);

  return null;
}

function PendingDebitNotesTable({
  loading,
  toolbarFiltered,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onCreate,
}: {
  loading: boolean;
  toolbarFiltered: PendingDebitNoteRow[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onCreate: (row: PendingDebitNoteRow) => void;
}) {
  const visible = useAccountsFilteredRows(toolbarFiltered);
  const ctx = useAccountsColumnFilterContext();
  const pagedRows = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  return (
    <>
      <AccountsTable minWidth={1100}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Return No." colKey="returnNumber" />
            <SortTh label="Date" colKey="returnDate" filterType="date" />
            <SortTh label="Supplier" colKey="supplierName" className="accounts-col-party" />
            <SortTh label="PO No." colKey="poNumber" />
            <SortTh label="GRN No." colKey="grnNo" />
            <SortTh label="Dispatch" colKey="dispatchNo" />
            <SortTh label="Qty" colKey="totalReturnQty" filterType="amount" align="right" />
            <SortTh
              label="Taxable"
              colKey="taxableAmount"
              filterType="amount"
              align="right"
              className="min-w-[6.5rem]"
            />
            <SortTh
              label="GST"
              colKey="gstAmount"
              filterType="amount"
              align="right"
              className="min-w-[5.5rem]"
            />
            <SortTh
              label="Total"
              colKey="totalAmount"
              filterType="amount"
              align="right"
              className="min-w-[6.5rem]"
            />
            <AccountsColumnHeader
              label="Actions"
              colKey="_actions"
              sortable={false}
              filterable={false}
              align="right"
              className={accountsActionColClass("single")}
            />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {loading && toolbarFiltered.length === 0 ? (
            <AccountsTableLoading colSpan={11} message="Loading pending returns…" />
          ) : toolbarFiltered.length === 0 ? (
            <AccountsTableEmpty
              colSpan={11}
              message="No purchase returns pending debit note."
            />
          ) : visible.length === 0 ? (
            <AccountsTableEmpty colSpan={11} message="No records match the column filters." />
          ) : (
            pagedRows.map((row) => (
              <AccountsTableRow key={row.returnId}>
                <AccountsTableCell mono className="font-semibold text-brand-700 truncate text-xs">
                  {row.returnNumber}
                </AccountsTableCell>
                <AccountsTableCell className="tabular-nums text-xs whitespace-nowrap">
                  {formatDisplayDate(row.returnDate)}
                </AccountsTableCell>
                <AccountsTableCell
                  className="accounts-col-party font-medium truncate text-xs"
                  title={row.supplierName}
                >
                  {row.supplierName}
                </AccountsTableCell>
                <AccountsTableCell mono className="truncate text-xs">
                  {row.poNumber}
                </AccountsTableCell>
                <AccountsTableCell mono className="truncate text-xs">
                  {row.grnNo || "—"}
                </AccountsTableCell>
                <AccountsTableCell mono className="truncate text-xs">
                  {row.dispatchNo || "—"}
                </AccountsTableCell>
                <AccountsTableCell align="right" className="tabular-nums text-xs">
                  {row.totalReturnQty}
                </AccountsTableCell>
                <AccountsTableCell
                  align="right"
                  money
                  className="text-xs tabular-nums min-w-[6.5rem]"
                >
                  {formatINR(row.taxableAmount)}
                </AccountsTableCell>
                <AccountsTableCell
                  align="right"
                  money
                  className="text-xs tabular-nums min-w-[5.5rem]"
                >
                  {formatINR(row.gstAmount)}
                </AccountsTableCell>
                <AccountsTableCell
                  align="right"
                  money
                  className="text-xs font-medium tabular-nums min-w-[6.5rem]"
                >
                  {formatINR(row.totalAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" className={accountsActionColClass("single")}>
                  <AccountsTableActionCell variant="single">
                    <AccountsGenerateAction
                      title="Create Debit Note"
                      onClick={() => onCreate(row)}
                    />
                  </AccountsTableActionCell>
                </AccountsTableCell>
              </AccountsTableRow>
            ))
          )}
        </AccountsTableBody>
      </AccountsTable>
      {visible.length > 0 ? (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={visible.length}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          recordLabel="pending returns"
        />
      ) : null}
    </>
  );
}

export function PendingDebitNotesPanel({
  onCountChange,
  refreshTick = 0,
}: {
  onCountChange?: (count: number) => void;
  /** Bump to re-fetch (header refresh / accounts data changed). */
  refreshTick?: number;
}) {
  const router = useRouter();
  const {
    pending: listing,
    setPending: setListing,
    pendingFilterEpoch,
  } = useDebitNoteListingState();
  const search = listing.search;
  const page = listing.page;
  const pageSize = listing.pageSize;
  const setSearch = useCallback(
    (value: string) => {
      setListing((prev) =>
        prev.search === value ? prev : { ...prev, search: value },
      );
    },
    [setListing],
  );
  const setPage = useCallback(
    (next: number) => {
      setListing((prev) => (prev.page === next ? prev : { ...prev, page: next }));
    },
    [setListing],
  );
  const setPageSize = useCallback(
    (next: number) => {
      setListing((prev) =>
        prev.pageSize === next ? prev : { ...prev, pageSize: next, page: 1 },
      );
    },
    [setListing],
  );
  const handleSortChange = useCallback(
    (sortKey: string, sortDir: "asc" | "desc") => {
      setListing((prev) => ({ ...prev, sortKey, sortDir, page: 1 }));
    },
    [setListing],
  );
  const handleColumnFilterChange = useCallback(
    (columnFilters: Record<string, unknown>) => {
      setListing((prev) => ({ ...prev, columnFilters, page: 1 }));
    },
    [setListing],
  );
  const [rows, setRows] = useState<PendingDebitNoteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);
  const searchHydratingRef = useRef(false);
  const prevSearchRef = useRef(search);
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;

  // Avoid writing a stale debounced search into listing when returning to this tab.
  useEffect(() => {
    if (prevSearchRef.current !== search) {
      searchHydratingRef.current = true;
      prevSearchRef.current = search;
    }
    if (searchHydratingRef.current && debouncedSearch === search) {
      searchHydratingRef.current = false;
    }
  }, [search, debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await DebitNoteService.listPending({
          page: 1,
          page_size: 100,
          status: "PENDING",
        });
        if (cancelled) return;

        const mapped = (res.items ?? []).map(mapPendingApiRow);
        setRows(mapped);
        onCountChangeRef.current?.(res.pagination?.total ?? mapped.length);
      } catch (e: any) {
        if (cancelled) return;
        showToast(e.message || "Failed to load pending debit notes.", "error");
        setRows([]);
        onCountChangeRef.current?.(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  useEffect(() => {
    if (searchHydratingRef.current) return;
    setPage(1);
  }, [debouncedSearch, pageSize, setPage]);

  const toolbarFiltered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => matchesPendingSearch(row, q));
  }, [rows, debouncedSearch]);

  const getCellValue = useCallback((row: PendingDebitNoteRow, key: string) => {
    if (key === "dispatchNo") return row.dispatchNo || "";
    if (key === "grnNo") return row.grnNo || "";
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const columnConfig = useMemo(
    (): AccountsColumnFilterConfig => ({
      returnNumber: { type: "text" },
      returnDate: { type: "date" },
      supplierName: { type: "text" },
      poNumber: { type: "text" },
      grnNo: { type: "text" },
      dispatchNo: { type: "text" },
      totalReturnQty: { type: "amount" },
      taxableAmount: { type: "amount" },
      gstAmount: { type: "amount" },
      totalAmount: { type: "amount" },
    }),
    [],
  );

  const handleCreate = (row: PendingDebitNoteRow) => {
    router.push(
      withReturnTo(
        `${DEBIT_NOTES_LIST_PATH}/new?pendingId=${encodeURIComponent(row.returnId)}`,
        debitNotesListHref("pending"),
      ),
    );
  };

  return (
    <AccountsTableListing
      toolbar={
        <AccountsListingFilterCard>
          <ReportSearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Search return no., supplier, PO, GRN…"
            className="min-w-[180px] flex-1 max-w-sm"
          />
        </AccountsListingFilterCard>
      }
    >
      <AccountsColumnFilterProvider
        key={`pending-${pendingFilterEpoch}`}
        rows={toolbarFiltered}
        getCellValue={getCellValue}
        columnConfig={columnConfig}
        defaultSortKey="returnDate"
        defaultSortDir="desc"
        initialColumnFilters={listing.columnFilters as Record<string, any>}
        initialSortKey={listing.sortKey || null}
        initialSortDir={listing.sortDir || "desc"}
      >
        <PendingNotesSortSync
          sortKey={listing.sortKey}
          sortDir={listing.sortDir}
          columnFilters={listing.columnFilters}
          onSortChange={handleSortChange}
          onFilterChange={handleColumnFilterChange}
        />
        <PendingDebitNotesTable
          loading={loading}
          toolbarFiltered={toolbarFiltered}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onCreate={handleCreate}
        />
      </AccountsColumnFilterProvider>
    </AccountsTableListing>
  );
}
