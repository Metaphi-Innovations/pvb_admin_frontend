"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import { ReportSearchFilter } from "@/components/accounts/ReportFilters";
import { cn } from "@/lib/utils";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import {
  filterPendingCreditNotes,
  listPendingCreditNotes,
  PENDING_CREDIT_SOURCE_LABELS,
  type PendingCreditNoteRow,
  type PendingCreditNoteSourceType,
} from "../pending-credit-notes-data";
import { CREDIT_NOTES_LIST_PATH, formatINR } from "../note-utils";
import { ReportMoreFilters } from "@/components/accounts/ReportMoreFilters";
import { X } from "lucide-react";

const SOURCE_FILTER_OPTIONS: { value: PendingCreditNoteSourceType; label: string }[] = [
  { value: "sales_return", label: "Sales Return" },
  { value: "scheme", label: "Scheme" },
];

const SOURCE_COLUMN_OPTIONS = ["sales_return", "scheme"];

function PendingCreditNotesTable({
  toolbarFiltered,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onGenerate,
}: {
  toolbarFiltered: PendingCreditNoteRow[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onGenerate: (row: PendingCreditNoteRow) => void;
}) {
  const visible = useAccountsFilteredRows(toolbarFiltered);
  const pagedRows = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  return (
    <>
      <AccountsTable minWidth={980}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <AccountsColumnHeader
              label="Source"
              colKey="sourceType"
              filterType="status"
              sortable={false}
              statusOptions={SOURCE_COLUMN_OPTIONS}
            />
            <SortTh label="Customer" colKey="customerName" className="accounts-col-party" />
            <SortTh label="Reference" colKey="referenceNo" />
            <SortTh label="Invoice(s)" colKey="linkedInvoices" />
            <SortTh label="Eligible" colKey="eligibleCreditAmount" filterType="amount" align="right" />
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
          {toolbarFiltered.length === 0 ? (
            <AccountsTableEmpty
              colSpan={8}
              message="No pending credit notes. Sales returns and scheme settlements appear here until a credit note is generated."
            />
          ) : visible.length === 0 ? (
            <AccountsTableEmpty colSpan={8} message="No records match the column filters." />
          ) : (
            pagedRows.map((row) => (
              <AccountsTableRow key={row.id}>
                <AccountsTableCell>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap",
                      row.sourceType === "sales_return"
                        ? "bg-brand-50 text-brand-700"
                        : "bg-purple-50 text-purple-700",
                    )}
                  >
                    {PENDING_CREDIT_SOURCE_LABELS[row.sourceType]}
                  </span>
                </AccountsTableCell>
                <AccountsTableCell className="accounts-col-party font-medium truncate text-xs" title={row.customerName}>
                  {row.customerName}
                </AccountsTableCell>
                <AccountsTableCell mono className="font-semibold text-brand-700 truncate text-xs">
                  {row.referenceNo}
                </AccountsTableCell>
                <AccountsTableCell mono className="truncate text-xs">
                  {row.linkedInvoiceNos.length ? row.linkedInvoiceNos.join(", ") : "—"}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="text-xs tabular-nums">
                  {formatINR(row.eligibleCreditAmount)}
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
                      title="Generate Credit Note"
                      onClick={() => onGenerate(row)}
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
          recordLabel="pending items"
        />
      ) : null}
    </>
  );
}

export function PendingCreditNotesPanel() {
  const router = useRouter();
  const [rows, setRows] = useState<PendingCreditNoteRow[]>([]);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const refresh = useCallback(() => setRows(listPendingCreditNotes()), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const toolbarFiltered = useMemo(
    () => filterPendingCreditNotes(rows, search, sourceFilter),
    [rows, search, sourceFilter],
  );

  const getCellValue = useCallback((row: PendingCreditNoteRow, key: string) => {
    if (key === "sourceType") return PENDING_CREDIT_SOURCE_LABELS[row.sourceType];
    if (key === "linkedInvoices") return row.linkedInvoiceNos.join(", ");
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const columnConfig = useMemo(
    () => ({
      sourceType: { type: "text" as const },
      customerName: { type: "text" as const },
      referenceNo: { type: "text" as const },
      linkedInvoices: { type: "text" as const },
      eligibleCreditAmount: { type: "amount" as const },
      gstAmount: { type: "amount" as const },
      totalAmount: { type: "amount" as const },
    }),
    [],
  );

  const activeSourceCount = sourceFilter !== "all" ? 1 : 0;

  const toggleSourceFilter = (value: PendingCreditNoteSourceType) => {
    setSourceFilter((cur) => (cur === value ? "all" : value));
  };

  const handleGenerate = (row: PendingCreditNoteRow) => {
    if (row.sourceType === "sales_return" && row.returnId) {
      router.push(`${CREDIT_NOTES_LIST_PATH}/new?returnId=${encodeURIComponent(row.returnId)}&mode=return`);
      return;
    }
    if (row.schemeSettlementKey) {
      router.push(`${CREDIT_NOTES_LIST_PATH}/new?schemeKey=${encodeURIComponent(row.schemeSettlementKey)}&mode=scheme`);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, sourceFilter, pageSize]);

  return (
    <AccountsTableListing
      toolbar={
        <AccountsListingFilterCard>
          <ReportSearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Search reference, customer, invoice, scheme…"
            className="min-w-[180px] flex-1 max-w-sm"
          />
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
              {PENDING_CREDIT_SOURCE_LABELS[sourceFilter as PendingCreditNoteSourceType]}
              <button type="button" onClick={() => setSourceFilter("all")}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </AccountsListingFilterCard>
      }
    >
      <AccountsColumnFilterProvider
        rows={toolbarFiltered}
        getCellValue={getCellValue}
        columnConfig={columnConfig}
        defaultSortKey="referenceNo"
        defaultSortDir="asc"
      >
        <PendingCreditNotesTable
          toolbarFiltered={toolbarFiltered}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onGenerate={handleGenerate}
        />
      </AccountsColumnFilterProvider>
    </AccountsTableListing>
  );
}
