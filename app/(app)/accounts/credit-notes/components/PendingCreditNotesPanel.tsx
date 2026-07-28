"use client";

/**
 * Pending Credit Notes panel — Sales Return + Scheme (entitlement Review / legacy Generate).
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
import type { AccountsColumnFilterConfig } from "@/lib/accounts/column-filter-types";
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
import { schemeClaimReviewHref } from "@/lib/accounts/scheme-entitlement-demo";

const SOURCE_FILTER_OPTIONS: { value: PendingCreditNoteSourceType; label: string }[] = [
  { value: "sales_return", label: "Sales Return" },
  { value: "scheme", label: "Scheme" },
];

const SOURCE_COLUMN_OPTIONS = ["sales_return", "scheme"];

function statusBadgeClass(status: string): string {
  switch (status) {
    case "Approved":
      return "bg-emerald-50 text-emerald-700";
    case "Sent Back":
      return "bg-amber-50 text-amber-700";
    case "Rejected":
      return "bg-red-50 text-red-700";
    case "Pending Review":
      return "bg-navy-50 text-navy-700";
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
  onReview,
  schemeFocused,
}: {
  toolbarFiltered: PendingCreditNoteRow[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onGenerate: (row: PendingCreditNoteRow) => void;
  onReview: (row: PendingCreditNoteRow) => void;
  schemeFocused: boolean;
}) {
  const visible = useAccountsFilteredRows(toolbarFiltered);
  const pagedRows = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  const colSpan = schemeFocused ? 11 : 8;

  return (
    <>
      <AccountsTable minWidth={schemeFocused ? 1180 : 980}>
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
                  statusOptions={[
                    "Pending",
                    "Pending Review",
                    "Sent Back",
                    "Approved",
                  ]}
                />
              </>
            ) : (
              <>
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
          {toolbarFiltered.length === 0 ? (
            <AccountsTableEmpty
              colSpan={colSpan}
              message="No pending credit notes. Sales returns and scheme claims appear here until a credit note is generated."
            />
          ) : visible.length === 0 ? (
            <AccountsTableEmpty colSpan={colSpan} message="No records match the column filters." />
          ) : (
            pagedRows.map((row) => {
              const isEntitlement = row.schemeClaimKind === "entitlement" && Boolean(row.schemeEntitlementId);
              return (
                <AccountsTableRow key={row.id}>
                  {schemeFocused ? (
                    <>
                      <AccountsTableCell className="text-xs tabular-nums whitespace-nowrap">
                        {row.eligibleDate || row.returnDate || "—"}
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
                            row.sourceType === "sales_return"
                              ? "bg-brand-50 text-brand-700"
                              : "bg-purple-50 text-purple-700",
                          )}
                        >
                          {PENDING_CREDIT_SOURCE_LABELS[row.sourceType]}
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
                    </>
                  )}
                  <AccountsTableCell align="right" className={accountsActionColClass("single")}>
                    <AccountsTableActionCell variant="single">
                      {isEntitlement ? (
                        <button
                          type="button"
                          title="Review"
                          className={ACCOUNTS_ACTION_BTN_CLASS}
                          onClick={() => onReview(row)}
                        >
                          <Eye className={ACCOUNTS_ACTION_ICON_CLASS} />
                        </button>
                      ) : (
                        <AccountsGenerateAction
                          title="Generate Credit Note"
                          onClick={() => onGenerate(row)}
                        />
                      )}
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

  const schemeFocused = sourceFilter === "scheme";

  const getCellValue = useCallback((row: PendingCreditNoteRow, key: string) => {
    if (key === "sourceType") return PENDING_CREDIT_SOURCE_LABELS[row.sourceType];
    if (key === "linkedInvoices") return row.linkedInvoiceNos.join(", ");
    if (key === "schemeCode") return row.schemeCode || row.referenceNo;
    if (key === "eligibleDate") return row.eligibleDate || row.returnDate || "";
    if (key === "eligibleBaseAmount") return row.eligibleBaseAmount ?? row.eligibleCreditAmount;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const columnConfig = useMemo((): AccountsColumnFilterConfig => {
    if (schemeFocused) {
      return {
        eligibleDate: { type: "text" },
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
      router.push(
        `${CREDIT_NOTES_LIST_PATH}/new?schemeKey=${encodeURIComponent(row.schemeSettlementKey)}&mode=scheme`,
      );
    }
  };

  const handleReview = (row: PendingCreditNoteRow) => {
    if (row.schemeEntitlementId) {
      router.push(schemeClaimReviewHref(row.schemeEntitlementId));
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
          onReview={handleReview}
          schemeFocused={schemeFocused}
        />
      </AccountsColumnFilterProvider>
    </AccountsTableListing>
  );
}
