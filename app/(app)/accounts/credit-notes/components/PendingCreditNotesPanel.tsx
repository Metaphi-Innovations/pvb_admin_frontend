"use client";

/**
 * Pending Credit Notes panel — GET /accounts/credit-note/pending.
 * Generate navigates with pendingId=<UUID> only.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import {
  AccountsGenerateAction,
  AccountsTableActionCell,
  ACCOUNTS_ACTION_BTN_CLASS,
  ACCOUNTS_ACTION_ICON_CLASS,
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
  AccountsTableLoading,
  AccountsTableListing,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import { ReportSearchFilter } from "@/components/accounts/ReportFilters";
import { cn } from "@/lib/utils";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import type { AccountsColumnFilterConfig } from "@/lib/accounts/column-filter-types";
import {
  canGeneratePendingCreditNote,
  filterPendingCreditNotes,
  mapPendingListRow,
  PENDING_CREDIT_SOURCE_LABELS,
  type PendingCreditNoteRow,
} from "../pending-credit-notes-data";
import { CREDIT_NOTES_LIST_PATH, formatINR } from "../note-utils";
import { formatDisplayDate, toIsoDateOnly } from "@/lib/accounts/date-display";
import { CreditNoteListApi, creditNoteListApiError } from "../credit-note-list-api";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";

/* Toolbar Source options — restore with ReportMoreFilters when needed.
const SOURCE_FILTER_OPTIONS: { value: Exclude<PendingSourceFilter, "all">; label: string }[] = [
  { value: "sales_return", label: "Sales Return" },
  { value: "scheme", label: "Scheme" },
];
*/

const SOURCE_COLUMN_OPTIONS = [
  "SALES_RETURN",
  "SPECIAL_SCHEME",
  "NEAR_EXPIRY",
  "CASH_DISCOUNT",
  "TURNOVER_DISCOUNT",
];

function statusBadgeClass(status: string): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-700";
    case "CONVERTED":
      return "bg-emerald-50 text-emerald-700";
    case "CANCELLED":
      return "bg-red-50 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function PendingCreditNotesTable({
  toolbarFiltered,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onGenerate,
  onViewCreditNote,
  schemeFocused,
  loading,
}: {
  toolbarFiltered: PendingCreditNoteRow[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onGenerate: (row: PendingCreditNoteRow) => void;
  onViewCreditNote: (row: PendingCreditNoteRow) => void;
  schemeFocused: boolean;
  loading: boolean;
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

  const colSpan = schemeFocused ? 11 : 8;

  return (
    <>
      <AccountsTable minWidth={schemeFocused ? 1180 : 1040}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            {schemeFocused ? (
              <>
                <SortTh label="Eligible Date" colKey="eligibleDate" />
                <SortTh label="Customer" colKey="customerName" className="accounts-col-party" />
                <SortTh label="Scheme Type" colKey="schemeType" />
                <SortTh label="Scheme Name" colKey="schemeName" />
                <SortTh label="Scheme Code" colKey="schemeCode" />
                <SortTh label="Period / Ref." colKey="schemePeriod" />
                <SortTh label="Eligible Base" colKey="eligibleBaseAmount" filterType="amount" align="right" />
                <SortTh label="Credit Note Amt" colKey="totalAmount" filterType="amount" align="right" />
                <AccountsColumnHeader
                  label="Status"
                  colKey="status"
                  filterType="status"
                  sortable={false}
                  statusOptions={["PENDING", "CONVERTED", "CANCELLED"]}
                />
              </>
            ) : (
              <>
                <AccountsColumnHeader
                  label="Source"
                  colKey="sourceType"
                  filterType="status"
                  statusOptions={SOURCE_COLUMN_OPTIONS.map(
                    (k) => PENDING_CREDIT_SOURCE_LABELS[k] || k,
                  )}
                />
                <SortTh label="Customer" colKey="customerName" className="accounts-col-party" />
                <SortTh label="Reference" colKey="referenceNo" />
                <SortTh label="Invoice(s)" colKey="linkedInvoices" />
                <SortTh label="Eligible" colKey="eligibleCreditAmount" filterType="amount" align="right" className="min-w-[6.5rem]" />
                <SortTh label="GST" colKey="gstAmount" filterType="amount" align="right" className="min-w-[5.5rem]" />
                <SortTh label="Total" colKey="totalAmount" filterType="amount" align="right" className="min-w-[6.5rem]" />
              </>
            )}
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
            <AccountsTableLoading colSpan={colSpan} message="Loading pending credit notes…" />
          ) : toolbarFiltered.length === 0 ? (
            <AccountsTableEmpty colSpan={colSpan} message="No pending credit notes found." />
          ) : visible.length === 0 ? (
            <AccountsTableEmpty colSpan={colSpan} message="No records match the column filters." />
          ) : (
            pagedRows.map((row) => {
              const generate = canGeneratePendingCreditNote(row);
              const viewConverted = row.status === "CONVERTED" && Boolean(row.credit_note_id);
              return (
                <AccountsTableRow key={row.pending_credit_note_id}>
                  {schemeFocused ? (
                    <>
                      <AccountsTableCell className="text-xs tabular-nums whitespace-nowrap">
                        {formatDisplayDate(row.eligibleDate)}
                      </AccountsTableCell>
                      <AccountsTableCell
                        className="accounts-col-party font-medium truncate text-xs"
                        title={row.customerName}
                      >
                        {row.customerName}
                      </AccountsTableCell>
                      <AccountsTableCell className="text-xs truncate">
                        {row.schemeType || "—"}
                      </AccountsTableCell>
                      <AccountsTableCell className="text-xs font-medium truncate" title={row.schemeName}>
                        {row.schemeName || "—"}
                      </AccountsTableCell>
                      <AccountsTableCell mono className="font-semibold text-brand-700 truncate text-xs">
                        {row.schemeCode || row.referenceNo}
                      </AccountsTableCell>
                      <AccountsTableCell className="text-xs truncate" title={row.schemePeriod}>
                        {row.schemePeriod || "—"}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className="text-xs tabular-nums">
                        {formatINR(row.eligibleBaseAmount ?? row.eligibleCreditAmount)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className="text-xs font-medium tabular-nums">
                        {formatINR(row.totalAmount)}
                      </AccountsTableCell>
                      <AccountsTableCell>
                        <span
                          className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap",
                            statusBadgeClass(String(row.status)),
                          )}
                        >
                          {row.status}
                        </span>
                      </AccountsTableCell>
                    </>
                  ) : (
                    <>
                      <AccountsTableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap",
                            row.sourceType === "SALES_RETURN"
                              ? "bg-brand-50 text-brand-700"
                              : "bg-purple-50 text-purple-700",
                          )}
                        >
                          {PENDING_CREDIT_SOURCE_LABELS[row.sourceType] || row.sourceType}
                        </span>
                      </AccountsTableCell>
                      <AccountsTableCell
                        className="accounts-col-party font-medium truncate text-xs"
                        title={row.customerName}
                      >
                        {row.customerName}
                      </AccountsTableCell>
                      <AccountsTableCell mono className="font-semibold text-brand-700 truncate text-xs">
                        {row.referenceNo}
                      </AccountsTableCell>
                      <AccountsTableCell mono className="truncate text-xs" title={row.linkedInvoiceNos.join(", ") || undefined}>
                        {row.linkedInvoiceNos.length
                          ? row.linkedInvoiceNos.join(", ")
                          : "—"}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className="text-xs tabular-nums min-w-[6.5rem]">
                        {formatINR(row.eligibleCreditAmount)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className="text-xs tabular-nums min-w-[5.5rem]">
                        {formatINR(row.gstAmount)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className="text-xs font-medium tabular-nums min-w-[6.5rem]">
                        {formatINR(row.totalAmount)}
                      </AccountsTableCell>
                    </>
                  )}
                  <AccountsTableCell align="right" className={accountsActionColClass("single")}>
                    <AccountsTableActionCell variant="single">
                      {generate ? (
                        <AccountsGenerateAction
                          title="Generate Credit Note"
                          onClick={() => onGenerate(row)}
                        />
                      ) : viewConverted ? (
                        <button
                          type="button"
                          title="View Credit Note"
                          className={ACCOUNTS_ACTION_BTN_CLASS}
                          onClick={() => onViewCreditNote(row)}
                        >
                          <Eye className={ACCOUNTS_ACTION_ICON_CLASS} />
                        </button>
                      ) : null}
                    </AccountsTableActionCell>
                  </AccountsTableCell>
                </AccountsTableRow>
              );
            })
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
          recordLabel="pending items"
        />
      ) : null}
    </>
  );
}

export function PendingCreditNotesPanel({
  onCountChange,
}: {
  onCountChange?: (count: number) => void;
}) {
  const router = useRouter();
  const { toast, showToast, dismissToast } = useAccountsToast();
  const [rows, setRows] = useState<PendingCreditNoteRow[]>([]);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await CreditNoteListApi.listPending({ page: 1, page_size: 100 });
      const next = (result.items ?? []).map(mapPendingListRow);
      setRows(next);
      onCountChange?.(result.pagination?.total ?? next.length);
    } catch (e) {
      setRows([]);
      onCountChange?.(0);
      showToast(creditNoteListApiError(e, "Failed to load pending credit notes."), "error");
    } finally {
      setLoading(false);
    }
  }, [onCountChange, showToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toolbarFiltered = useMemo(
    () => filterPendingCreditNotes(rows, search, sourceFilter),
    [rows, search, sourceFilter],
  );

  const schemeFocused = sourceFilter === "scheme";

  const getCellValue = useCallback((row: PendingCreditNoteRow, key: string) => {
    if (key === "sourceType") return PENDING_CREDIT_SOURCE_LABELS[row.sourceType] || row.sourceType;
    if (key === "linkedInvoices") return row.linkedInvoiceNos.join(", ");
    if (key === "schemeCode") return row.schemeCode || row.referenceNo;
    if (key === "eligibleDate") return toIsoDateOnly(row.eligibleDate);
    if (key === "eligibleBaseAmount") return row.eligibleBaseAmount ?? row.eligibleCreditAmount;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const columnConfig = useMemo((): AccountsColumnFilterConfig => {
    if (schemeFocused) {
      return {
        eligibleDate: { type: "date" },
        customerName: { type: "text" },
        schemeType: { type: "text" },
        schemeName: { type: "text" },
        schemeCode: { type: "text" },
        schemePeriod: { type: "text" },
        eligibleBaseAmount: { type: "amount" },
        totalAmount: { type: "amount" },
        status: { type: "text" },
      };
    }
    return {
      sourceType: { type: "text" },
      customerName: { type: "text" },
      referenceNo: { type: "text" },
      linkedInvoices: { type: "text" },
      eligibleCreditAmount: { type: "amount" },
      gstAmount: { type: "amount" },
      totalAmount: { type: "amount" },
    };
  }, [schemeFocused]);

  const handleGenerate = (row: PendingCreditNoteRow) => {
    if (!canGeneratePendingCreditNote(row)) return;
    router.push(
      `${CREDIT_NOTES_LIST_PATH}/new?pendingId=${encodeURIComponent(row.pending_credit_note_id)}`,
    );
  };

  const handleViewCreditNote = (row: PendingCreditNoteRow) => {
    if (!row.credit_note_id) return;
    router.push(`${CREDIT_NOTES_LIST_PATH}/${row.credit_note_id}`);
  };

  useEffect(() => {
    setPage(1);
  }, [search, sourceFilter, pageSize]);

  return (
    <>
      <AccountsTableListing
        toolbar={
          <AccountsListingFilterCard>
            <ReportSearchFilter
              value={search}
              onChange={setSearch}
              placeholder="Search reference, customer, invoice, scheme…"
              className="min-w-[180px] flex-1 max-w-sm"
            />
            {/* Toolbar Source / More Filters — same filter lives on the Source column.
            <ReportMoreFilters activeCount={activeSourceCount}>
              <div className="px-1 space-y-2">
                <p className="text-xs font-semibold text-foreground">Source</p>
                {SOURCE_FILTER_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-brand-600"
                      checked={sourceFilter === opt.value}
                      onChange={() => toggleSourceFilter(opt.value)}
                    />
                    <span className="text-xs text-foreground">{opt.label}</span>
                  </label>
                ))}
              </div>
            </ReportMoreFilters>
            {sourceFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
                {PENDING_CREDIT_SOURCE_LABELS[sourceFilter] || sourceFilter}
                <button type="button" onClick={() => setSourceFilter("all")}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            */}
          </AccountsListingFilterCard>
        }
      >
        <AccountsColumnFilterProvider
          rows={toolbarFiltered}
          getCellValue={getCellValue}
          columnConfig={columnConfig}
          defaultSortKey={schemeFocused ? "eligibleDate" : "referenceNo"}
          defaultSortDir="desc"
        >
          <PendingCreditNotesTable
            toolbarFiltered={toolbarFiltered}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onGenerate={handleGenerate}
            onViewCreditNote={handleViewCreditNote}
            schemeFocused={schemeFocused}
            loading={loading}
          />
        </AccountsColumnFilterProvider>
      </AccountsTableListing>
      <AccountsToast toast={toast} onDismiss={dismissToast} />
    </>
  );
}
