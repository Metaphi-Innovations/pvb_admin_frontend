"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, SlidersHorizontal, X } from "lucide-react";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import {
  AccountsListingFilterCard,
  AccountsListingTableCard,
  AccountsTableEmpty,
} from "@/components/accounts/AccountsTableListing";
import { accountsActionColClass } from "@/components/accounts/AccountsTableActions";
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

const SOURCE_FILTER_OPTIONS: { value: PendingCreditNoteSourceType; label: string }[] = [
  { value: "sales_return", label: "Sales Return" },
  { value: "scheme", label: "Scheme" },
];

const SOURCE_COLUMN_OPTIONS = ["sales_return", "scheme"];

function PendingCreditNotesTable({
  toolbarFiltered,
  onGenerate,
}: {
  toolbarFiltered: PendingCreditNoteRow[];
  onGenerate: (row: PendingCreditNoteRow) => void;
}) {
  const visible = useAccountsFilteredRows(toolbarFiltered);

  return (
    <AccountsTableScroll>
      <AccountsTable className="table-fixed w-full">
        <colgroup>
          <col className="w-[10%]" />
          <col className="w-[14%]" />
          <col className="w-[10%]" />
          <col className="w-[12%]" />
          <col className="w-[11%]" />
          <col className="w-[9%]" />
          <col className="w-[11%]" />
          <col className="w-[8%]" />
          <col className="w-[15%]" />
        </colgroup>
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
              label="Action"
              colKey="_actions"
              sortable={false}
              filterable={false}
              align="right"
              className={accountsActionColClass("multi")}
            />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {toolbarFiltered.length === 0 ? (
            <AccountsTableEmpty
              colSpan={8}
              message="No pending credit notes. Sales returns and scheme settlements appear here until a credit note is generated in Accounts."
            />
          ) : visible.length === 0 ? (
            <AccountsTableEmpty colSpan={8} message="No records match the column filters." />
          ) : (
            visible.map((row) => (
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
                    <span
                      className={cn(
                        "w-1 h-1 rounded-full flex-shrink-0",
                        row.sourceType === "sales_return" ? "bg-brand-500" : "bg-purple-500",
                      )}
                    />
                    {PENDING_CREDIT_SOURCE_LABELS[row.sourceType]}
                  </span>
                </AccountsTableCell>
                <AccountsTableCell className="accounts-col-party font-medium truncate" title={row.customerName}>
                  {row.customerName}
                </AccountsTableCell>
                <AccountsTableCell mono className="font-semibold text-brand-700 truncate">
                  {row.referenceNo}
                </AccountsTableCell>
                <AccountsTableCell mono className="truncate text-[11px]">
                  {row.linkedInvoiceNos.length ? row.linkedInvoiceNos.join(", ") : "—"}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="tabular-nums">
                  {formatINR(row.eligibleCreditAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="tabular-nums">
                  {formatINR(row.gstAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="font-medium tabular-nums">
                  {formatINR(row.totalAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" className={accountsActionColClass("multi")}>
                  <Button
                    size="sm"
                    className="h-7 px-2 text-[11px] bg-brand-600 hover:bg-brand-700 text-white gap-1 whitespace-nowrap"
                    onClick={() => onGenerate(row)}
                  >
                    <Plus className="w-3 h-3" /> Generate
                  </Button>
                </AccountsTableCell>
              </AccountsTableRow>
            ))
          )}
        </AccountsTableBody>
      </AccountsTable>
    </AccountsTableScroll>
  );
}

export function PendingCreditNotesPanel() {
  const router = useRouter();
  const [rows, setRows] = useState<PendingCreditNoteRow[]>([]);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

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
      sourceType: { type: "status" as const, options: SOURCE_COLUMN_OPTIONS },
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

  return (
    <div className="accounts-listing-card flex flex-col flex-1 min-h-0">
      <AccountsListingFilterCard>
        <ReportSearchFilter
          value={search}
          onChange={setSearch}
          placeholder="Search reference, customer, invoice, scheme…"
          className="min-w-[180px] flex-1 max-w-sm"
        />
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                activeSourceCount > 0
                  ? "border-brand-400 bg-brand-50 text-brand-700"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Source
              {activeSourceCount > 0 && (
                <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
                  {activeSourceCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-52 p-0">
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-xs font-semibold text-foreground">Filter by Source</p>
            </div>
            <div className="px-3 py-2.5 space-y-2">
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
            {sourceFilter !== "all" && (
              <div className="px-3 py-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setSourceFilter("all")}
                  className="text-xs text-brand-600 hover:underline"
                >
                  Clear filter
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>
        {sourceFilter !== "all" && (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
            {PENDING_CREDIT_SOURCE_LABELS[sourceFilter as PendingCreditNoteSourceType]}
            <button type="button" onClick={() => setSourceFilter("all")}>
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
      </AccountsListingFilterCard>

      <AccountsListingTableCard>
        <AccountsColumnFilterProvider
          rows={toolbarFiltered}
          getCellValue={getCellValue}
          columnConfig={columnConfig}
          defaultSortKey="referenceNo"
          defaultSortDir="asc"
        >
          <PendingCreditNotesTable toolbarFiltered={toolbarFiltered} onGenerate={handleGenerate} />
        </AccountsColumnFilterProvider>
      </AccountsListingTableCard>
    </div>
  );
}
