"use client";

import { useEffect, useMemo, useState } from "react";
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
  AccountsTableHeadCell,
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

function buildGenerateInvoiceHref(row: ReturnType<typeof listPendingTaxInvoices>[number]) {
  const params = new URLSearchParams();
  params.set("dispatchId", row.dispatchId);
  if (row.salesOrderId) params.set("so", String(row.salesOrderId));
  params.set("dispatch", row.dispatchNo);
  return `/accounts/transactions/invoices/new?${params.toString()}`;
}

function exportPendingCsv(rows: ReturnType<typeof listPendingTaxInvoices>) {
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

export default function PendingTaxInvoicesClient() {
  const mounted = useClientMounted();
  const [search, setSearch] = useState("");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("last_month");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const allRows = useMemo(
    () => (mounted ? accountsDataService.getPendingInvoices() : []),
    [mounted],
  );

  const filtered = useMemo(() => {
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

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, pageSize]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const clearFilters = () => {
    setSearch("");
    setPreset("last_month");
    const { from, to } = resolveDateRangePreset("last_month");
    setDateFrom(from);
    setDateTo(to);
  };

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
            onExcel={() => exportPendingCsv(filtered)}
            onPdf={() => exportPendingCsv(filtered)}
            exportDisabled={filtered.length === 0}
          />
        }
        footer={
          mounted && filtered.length > 0 ? (
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              recordLabel="invoices"
            />
          ) : null
        }
      >
        <AccountsTable minWidth={1240}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <AccountsTableHeadCell uppercase>Type</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Source No</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Dispatch No</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase className="accounts-col-party">Party</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Dispatch Date</AccountsTableHeadCell>
              <AccountsTableHeadCell align="right" uppercase>Taxable Value</AccountsTableHeadCell>
              <AccountsTableHeadCell align="right" uppercase>CGST</AccountsTableHeadCell>
              <AccountsTableHeadCell align="right" uppercase>SGST</AccountsTableHeadCell>
              <AccountsTableHeadCell align="right" uppercase>IGST</AccountsTableHeadCell>
              <AccountsTableHeadCell align="right" uppercase>Invoice Value</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase className="accounts-col-status">Status</AccountsTableHeadCell>
              <AccountsTableHeadCell align="right" uppercase className="accounts-col-actions-wide" />
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {!mounted ? (
              <AccountsTableEmpty colSpan={12} message="Loading pending invoices…" />
            ) : filtered.length === 0 ? (
              <AccountsTableEmpty
                colSpan={12}
                message="No dispatch-ready orders pending invoice generation."
                onClear={search || preset !== "last_month" ? clearFilters : undefined}
              />
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
                  <AccountsTableCell>{r.status}</AccountsTableCell>
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
      </AccountsTableListing>
    </AccountsPageShell>
  );
}
