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
} from "@/app/(app)/accounts/components/AccountsUI";
import { DEBIT_NOTES_LIST_PATH, formatINR } from "../note-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACCOUNTS_FILTER_LABEL_CLASS } from "@/lib/accounts/accounts-typography";
import { Label } from "@/components/ui/label";
import { DebitNoteService } from "@/services/debit-note.service";
import { showToast } from "@/lib/toast";
import { useDebouncedValue } from "@/app/(app)/accounts/reports/pl/pl-hooks";

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

function PendingDebitNotesTable({
  loading,
  toolbarFiltered,
  page,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  onCreate,
}: {
  loading: boolean;
  toolbarFiltered: PendingDebitNoteRow[];
  page: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onCreate: (row: PendingDebitNoteRow) => void;
}) {
  const visible = toolbarFiltered;
  const pagedRows = toolbarFiltered;

  return (
    <>
      <AccountsTable minWidth={1040}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Return No." colKey="returnNumber" />
            <SortTh label="Date" colKey="returnDate" filterType="date" />
            <SortTh label="Supplier" colKey="supplierName" className="accounts-col-party" />
            <SortTh label="PO No." colKey="poNumber" />
            <SortTh label="GRN No." colKey="grnNo" />
            <SortTh label="Dispatch" colKey="dispatchNo" />
            <SortTh label="Qty" colKey="totalReturnQty" filterType="amount" align="right" />
            <SortTh label="Taxable" colKey="taxableAmount" filterType="amount" align="right" />
            <SortTh label="GST" colKey="gstAmount" filterType="amount" align="right" />
            <SortTh label="Total" colKey="totalAmount" filterType="amount" align="right" />
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
          ) : (
            pagedRows.map((row) => (
              <AccountsTableRow key={row.returnId}>
                <AccountsTableCell mono className="font-semibold text-brand-700 truncate text-xs">
                  {row.returnNumber}
                </AccountsTableCell>
                <AccountsTableCell className="tabular-nums text-xs whitespace-nowrap">
                  {row.returnDate}
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
                <AccountsTableCell align="right" money className="text-xs tabular-nums">
                  {formatINR(row.taxableAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="text-xs tabular-nums">
                  {formatINR(row.gstAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="text-xs font-medium tabular-nums">
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
          totalRecords={totalRecords}
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
  const [rows, setRows] = useState<PendingDebitNoteRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [dispatchFilter, setDispatchFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const debouncedSearch = useDebouncedValue(search, 300);
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;
  const pendingQueryKeyRef = useRef("");
  const pendingQueryKey = `${page}|${pageSize}|${debouncedSearch.trim()}`;

  useEffect(() => {
    setPage((p) => (p === 1 ? p : 1));
  }, [debouncedSearch, dispatchFilter, pageSize]);

  useEffect(() => {
    if (page !== 1 && pendingQueryKeyRef.current !== pendingQueryKey) {
      pendingQueryKeyRef.current = pendingQueryKey;
      return;
    }
    pendingQueryKeyRef.current = pendingQueryKey;

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await DebitNoteService.listPending({
          page,
          page_size: pageSize,
          search: debouncedSearch.trim() || undefined,
          status: "PENDING",
        });
        if (cancelled) return;

        const mapped = res.items.map((raw: any) => {
          const refs: Array<{ reference_type?: string; reference_code?: string | null }> =
            raw.references || [];
          const poFromRef = refs.find((r) => r.reference_type === "PURCHASE_ORDER")?.reference_code;
          const grnCodes = refs
            .filter((r) => r.reference_type === "GRN" && r.reference_code)
            .map((r) => r.reference_code as string);
          const returnDateRaw =
            raw.purchase_return?.return_date || raw.eligibility_date || null;
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
            returnNumber:
              raw.purchase_return_number || raw.purchase_return?.return_no || "—",
            returnDate: returnDateRaw
              ? new Date(returnDateRaw).toLocaleDateString()
              : "—",
            supplierName: raw.supplier_name || raw.supplier?.supplier_name || "—",
            poNumber: raw.purchase_return?.purchase_order?.po_no || poFromRef || "—",
            grnNo: grnCodes.length ? grnCodes.join(", ") : "—",
            dispatchNo:
              raw.dispatch?.dispatch_number || raw.dispatch?.challan_number || "—",
            totalReturnQty: qtySum,
            taxableAmount: parseFloat(raw.taxable_amount || "0"),
            gstAmount:
              parseFloat(raw.gst_amount || "0") > 0
                ? parseFloat(raw.gst_amount || "0")
                : gstFromSplit,
            totalAmount: parseFloat(raw.eligible_dn_amount || "0"),
          };
        });

        setRows(mapped);
        setTotalRecords(res.pagination.total);
        onCountChangeRef.current?.(res.pagination.total);
      } catch (e: any) {
        if (cancelled) return;
        showToast(e.message || "Failed to load pending debit notes.", "error");
        onCountChangeRef.current?.(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, debouncedSearch, refreshTick, pendingQueryKey]);

  const getCellValue = useCallback((row: PendingDebitNoteRow, key: string) => {
    if (key === "dispatchNo") return row.dispatchNo || "";
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const columnConfig = useMemo(
    () => ({
      returnNumber: { type: "text" as const },
      returnDate: { type: "date" as const },
      supplierName: { type: "text" as const },
      poNumber: { type: "text" as const },
      grnNo: { type: "text" as const },
      dispatchNo: { type: "text" as const },
      totalReturnQty: { type: "amount" as const },
      taxableAmount: { type: "amount" as const },
      gstAmount: { type: "amount" as const },
      totalAmount: { type: "amount" as const },
    }),
    [],
  );

  const handleCreate = (row: PendingDebitNoteRow) => {
    router.push(`${DEBIT_NOTES_LIST_PATH}/new?pendingId=${encodeURIComponent(row.returnId)}`);
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
          <div className="space-y-0.5 flex-shrink-0">
            <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Dispatch</Label>
            <Select value={dispatchFilter} onValueChange={setDispatchFilter}>
              <SelectTrigger className="h-8 w-[148px] text-xs">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All statuses
                </SelectItem>
                <SelectItem value="Ready for Dispatch" className="text-xs">
                  Ready for Dispatch
                </SelectItem>
                <SelectItem value="Dispatched" className="text-xs">
                  Dispatched
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </AccountsListingFilterCard>
      }
    >
      <AccountsColumnFilterProvider
        rows={rows}
        getCellValue={getCellValue}
        columnConfig={columnConfig}
        defaultSortKey="returnDate"
        defaultSortDir="desc"
      >
        <PendingDebitNotesTable
          loading={loading}
          toolbarFiltered={rows}
            page={page}
            pageSize={pageSize}
            totalRecords={totalRecords}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onCreate={handleCreate}
          />
        </AccountsColumnFilterProvider>
    </AccountsTableListing>
  );
}
