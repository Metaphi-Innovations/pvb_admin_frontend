"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useClientMounted } from "@/lib/use-client-mounted";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  AccountsTableEmpty,
  AccountsTableListing,
  AccountsTablePagination,
  AccountsTableToolbar,
} from "@/components/accounts/AccountsTableListing";
import {
  ReportDateRangeFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import { resolveDateRangePreset } from "@/lib/accounts/report-date-presets";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { accountsDataService } from "@/lib/accounts/accounts-data-service";
import { listPendingTaxInvoices } from "@/lib/accounts/sales-workflow-data";
import { InvoiceTypeBadge } from "@/components/accounts/InvoiceTypeBadge";
import { INVOICE_TYPE_LABELS } from "@/lib/accounts/invoice-type";
import {
  formatInvoiceGstBreakup,
  getPendingRowGstBreakup,
} from "@/lib/accounts/invoice-gst-breakup";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";

type PendingRow = ReturnType<typeof listPendingTaxInvoices>[number];

function buildGenerateInvoiceHref(row: PendingRow) {
  const params = new URLSearchParams();
  params.set("dispatchId", row.dispatchId);
  if (row.salesOrderId) params.set("so", String(row.salesOrderId));
  params.set("dispatch", row.dispatchNo);
  return `/accounts/transactions/invoices/new?${params.toString()}`;
}

function exportPendingCsv(rows: PendingRow[]) {
  const headers = [
    "Type",
    "Source No",
    "Dispatch No",
    "Party",
    "Dispatch Date",
    "Taxable Value",
    "CGST",
    "SGST",
    "IGST",
    "Invoice Value",
    "Status",
  ];
  const lines = rows.map((r) => {
    const formatted = formatInvoiceGstBreakup(getPendingRowGstBreakup(r));
    return [
      INVOICE_TYPE_LABELS[r.invoiceType],
      r.soNumber,
      r.dispatchNo,
      r.customerName,
      r.dispatchDate,
      formatted.taxableValue,
      formatted.cgst,
      formatted.sgst,
      formatted.igst,
      formatted.invoiceTotal,
      r.status,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pending-invoices.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function PendingTaxInvoicesTable({
  mounted,
  toolbarRows,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  clearFilters,
  hasToolbarFilters,
}: {
  mounted: boolean;
  toolbarRows: PendingRow[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  clearFilters?: () => void;
  hasToolbarFilters: boolean;
}) {
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows(toolbarRows);
  const pagedRows = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  return (
    <AccountsTable minWidth={1240}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="Type" colKey="invoiceType" />
          <SortTh label="Source No" colKey="soNumber" />
          <SortTh label="Dispatch No" colKey="dispatchNo" />
          <SortTh label="Party" colKey="customerName" className="accounts-col-party" />
          <SortTh label="Dispatch Date" colKey="dispatchDate" filterType="date" />
          <SortTh label="Taxable Value" colKey="taxableValue" filterType="amount" align="right" />
          <SortTh label="CGST" colKey="cgst" filterType="amount" align="right" />
          <SortTh label="SGST" colKey="sgst" filterType="amount" align="right" />
          <SortTh label="IGST" colKey="igst" filterType="amount" align="right" />
          <SortTh label="Invoice Value" colKey="invoiceTotal" filterType="amount" align="right" />
          <AccountsColumnHeader
            label=""
            colKey="_actions"
            sortable={false}
            filterable={false}
            align="right"
            className="accounts-col-actions-wide"
          />
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {!mounted ? (
          <AccountsTableEmpty colSpan={11} message="Loading pending invoices…" />
        ) : toolbarRows.length === 0 ? (
          <AccountsTableEmpty
            colSpan={11}
            message="No dispatch-ready orders pending invoice generation."
            onClear={hasToolbarFilters ? clearFilters : undefined}
          />
        ) : visible.length === 0 ? (
          <AccountsTableEmpty colSpan={11} message="No records match the column filters." />
        ) : (
          pagedRows.map((r) => {
            const formatted = formatInvoiceGstBreakup(getPendingRowGstBreakup(r));
            return (
              <AccountsTableRow key={r.dispatchId}>
                <AccountsTableCell>
                  <InvoiceTypeBadge type={r.invoiceType} />
                </AccountsTableCell>
                <AccountsTableCell mono className="font-semibold text-brand-700">
                  {r.soNumber}
                </AccountsTableCell>
                <AccountsTableCell mono>{r.dispatchNo}</AccountsTableCell>
                <AccountsTableCell className="accounts-col-party">{r.customerName}</AccountsTableCell>
                <AccountsTableCell className="tabular-nums">{r.dispatchDate}</AccountsTableCell>
                <AccountsTableCell align="right" money>
                  {formatted.taxableValue}
                </AccountsTableCell>
                <AccountsTableCell align="right" money>
                  {formatted.cgst}
                </AccountsTableCell>
                <AccountsTableCell align="right" money>
                  {formatted.sgst}
                </AccountsTableCell>
                <AccountsTableCell align="right" money>
                  {formatted.igst}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="font-semibold">
                  {formatted.invoiceTotal}
                </AccountsTableCell>
                <AccountsTableCell align="right">
                  <Button
                    asChild
                    size="sm"
                    className="h-7 text-sm bg-brand-600 hover:bg-brand-700 text-white gap-1"
                  >
                    <Link href={buildGenerateInvoiceHref(r)}>
                      <FileText className="w-3 h-3" />
                      Generate Invoice
                    </Link>
                  </Button>
                </AccountsTableCell>
              </AccountsTableRow>
            );
          })
        )}
      </AccountsTableBody>
    </AccountsTable>
  );
}

function PendingTaxInvoicesContent({
  mounted,
  toolbarRows,
  search,
  setSearch,
  preset,
  setPreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
}: {
  mounted: boolean;
  toolbarRows: PendingRow[];
  search: string;
  setSearch: (s: string) => void;
  preset: ReturnType<typeof useReportDateRange>["preset"];
  setPreset: ReturnType<typeof useReportDateRange>["setPreset"];
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const visible = useAccountsFilteredRows(toolbarRows);

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, pageSize]);

  const clearFilters = () => {
    setSearch("");
    setPreset("last_month");
    const { from, to } = resolveDateRangePreset("last_month");
    setDateFrom(from);
    setDateTo(to);
  };

  const hasToolbarFilters = Boolean(search.trim()) || preset !== "last_month";

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Transactions", "Pending Invoices")}
      title="Pending Invoices"
      description="Dispatch-completed orders from Warehouse — generate tax invoice and post to ledger."
      hideDescription
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsTableListing
        toolbar={
          <AccountsTableToolbar
            search={{
              value: search,
              onChange: setSearch,
              placeholder: "Search source, dispatch, party…",
            }}
            filters={
              <ReportDateRangeFilter
                preset={preset}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onPresetChange={setPreset}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
              />
            }
            onExcel={() => exportPendingCsv(visible)}
            onPdf={() => exportPendingCsv(visible)}
            exportDisabled={visible.length === 0}
          />
        }
        footer={
          mounted && visible.length > 0 ? (
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={visible.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              recordLabel="invoices"
            />
          ) : null
        }
      >
        <PendingTaxInvoicesTable
          mounted={mounted}
          toolbarRows={toolbarRows}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          clearFilters={clearFilters}
          hasToolbarFilters={hasToolbarFilters}
        />
      </AccountsTableListing>
    </AccountsPageShell>
  );
}

export default function PendingTaxInvoicesClient() {
  const mounted = useClientMounted();
  const [search, setSearch] = useState("");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("last_month");

  const allRows = useMemo(
    () => (mounted ? accountsDataService.getPendingInvoices() : []),
    [mounted],
  );

  const toolbarRows = useMemo(() => {
    let list = [...allRows];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.soNumber.toLowerCase().includes(q) ||
          r.dispatchNo.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q) ||
          INVOICE_TYPE_LABELS[r.invoiceType].toLowerCase().includes(q),
      );
    }
    if (dateFrom) list = list.filter((r) => r.dispatchDate >= dateFrom);
    if (dateTo) list = list.filter((r) => r.dispatchDate <= dateTo);
    return list;
  }, [allRows, search, dateFrom, dateTo]);

  const getCellValue = useCallback((row: PendingRow, key: string) => {
    if (key === "invoiceType") return INVOICE_TYPE_LABELS[row.invoiceType];
    const gst = getPendingRowGstBreakup(row);
    const formatted = formatInvoiceGstBreakup(gst);
    if (key === "taxableValue") return formatted.taxableValue;
    if (key === "cgst") return formatted.cgst;
    if (key === "sgst") return formatted.sgst;
    if (key === "igst") return formatted.igst;
    if (key === "invoiceTotal") return formatted.invoiceTotal;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  return (
    <AccountsColumnFilterProvider
      rows={toolbarRows}
      getCellValue={getCellValue}
      columnConfig={{
        invoiceType: { type: "text" },
        soNumber: { type: "text" },
        dispatchNo: { type: "text" },
        customerName: { type: "text" },
        dispatchDate: { type: "date" },
        taxableValue: { type: "amount" },
        cgst: { type: "amount" },
        sgst: { type: "amount" },
        igst: { type: "amount" },
        invoiceTotal: { type: "amount" },
      }}
      defaultSortKey="dispatchDate"
      defaultSortDir="desc"
    >
      <PendingTaxInvoicesContent
        mounted={mounted}
        toolbarRows={toolbarRows}
        search={search}
        setSearch={setSearch}
        preset={preset}
        setPreset={setPreset}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
      />
    </AccountsColumnFilterProvider>
  );
}
