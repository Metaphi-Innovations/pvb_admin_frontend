"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useClientMounted } from "@/lib/use-client-mounted";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { AccountsListingDateFilter } from "@/components/accounts/AccountsListingFilter";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { listPendingTaxInvoices } from "@/lib/accounts/sales-workflow-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { NEAR_EXPIRY_SETTLEMENT_TOOLTIP } from "@/app/(app)/warehouse/dispatch/near-expiry-dispatch";

function buildGenerateInvoiceHref(row: ReturnType<typeof listPendingTaxInvoices>[number]) {
  const params = new URLSearchParams();
  params.set("dispatchId", row.dispatchId);
  if (row.salesOrderId) params.set("so", String(row.salesOrderId));
  params.set("dispatch", row.dispatchNo);
  return `/accounts/transactions/invoices/new?${params.toString()}`;
}

function exportPendingCsv(rows: ReturnType<typeof listPendingTaxInvoices>) {
  const headers = [
    "Sales Order No",
    "Dispatch No",
    "Customer",
    "Dispatch Date",
    "Taxable Value",
    "GST Amount",
    "Invoice Value",
    "Status",
    "Scheme",
    "Settlement",
  ];
  const lines = rows.map((r) =>
    [
      r.soNumber,
      r.dispatchNo,
      r.customerName,
      r.dispatchDate,
      r.taxableValue,
      r.gstAmount,
      r.invoiceValue,
      r.status,
      r.schemeLabel ?? "",
      r.settlementLabel ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pending-tax-invoices.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function PendingTaxInvoicesClient() {
  const mounted = useClientMounted();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const allRows = useMemo(
    () => (mounted ? listPendingTaxInvoices() : []),
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
          r.status.toLowerCase().includes(q),
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

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Transactions", "Pending Invoices")}
      title="Pending Invoices"
      description="Dispatch-completed orders from Warehouse — generate tax invoice and post to ledger."
      layout="split"
      className="h-full min-h-0"
      toolbar={
        <AccountsTableToolbar
          placement="page-header"
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search SO, dispatch, customer…",
          }}
          filters={
            <AccountsListingDateFilter
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
          }
          onExcel={() => exportPendingCsv(filtered)}
          onPdf={() => exportPendingCsv(filtered)}
          exportDisabled={filtered.length === 0}
        />
      }
    >
      <AccountsTableListing
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
        <AccountsTable minWidth={1060}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <AccountsTableHeadCell uppercase>Sales Order No</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Dispatch No</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase className="accounts-col-party">Customer</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Dispatch Date</AccountsTableHeadCell>
              <AccountsTableHeadCell align="right" uppercase>Taxable Value</AccountsTableHeadCell>
              <AccountsTableHeadCell align="right" uppercase>GST Amount</AccountsTableHeadCell>
              <AccountsTableHeadCell align="right" uppercase>Invoice Value</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase className="accounts-col-status">Status</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Scheme</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Settlement</AccountsTableHeadCell>
              <AccountsTableHeadCell align="right" uppercase className="accounts-col-actions-wide" />
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {!mounted ? (
              <AccountsTableEmpty colSpan={11} message="Loading pending invoices…" />
            ) : filtered.length === 0 ? (
              <AccountsTableEmpty
                colSpan={11}
                message="No dispatch-ready orders pending invoice generation."
                onClear={search || dateFrom || dateTo ? () => { setSearch(""); setDateFrom(""); setDateTo(""); } : undefined}
              />
            ) : (
              <TooltipProvider>
                {pagedRows.map((r) => (
                  <AccountsTableRow key={r.dispatchId}>
                    <AccountsTableCell mono className="font-semibold text-brand-700">
                      {r.soNumber}
                    </AccountsTableCell>
                    <AccountsTableCell mono>{r.dispatchNo}</AccountsTableCell>
                    <AccountsTableCell className="accounts-col-party">{r.customerName}</AccountsTableCell>
                    <AccountsTableCell className="tabular-nums">{r.dispatchDate}</AccountsTableCell>
                    <AccountsTableCell align="right" money>
                      {formatMoney(r.taxableValue)}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money>
                      {formatMoney(r.gstAmount)}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money className="font-semibold">
                      {formatMoney(r.invoiceValue)}
                    </AccountsTableCell>
                    <AccountsTableCell>{r.status}</AccountsTableCell>
                    <AccountsTableCell>
                      {r.schemeLabel ? (
                        <Badge
                          variant="outline"
                          className="h-5 px-1.5 text-[10px] font-semibold border-orange-200 bg-orange-50 text-orange-800 whitespace-nowrap"
                        >
                          {r.schemeLabel}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </AccountsTableCell>
                    <AccountsTableCell>
                      {r.settlementLabel ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className="h-5 px-1.5 text-[10px] font-semibold border-amber-200 bg-amber-50 text-amber-800 whitespace-nowrap cursor-help"
                            >
                              {r.settlementLabel}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            {NEAR_EXPIRY_SETTLEMENT_TOOLTIP}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </AccountsTableCell>
                    <AccountsTableCell align="right">
                      <Button
                        asChild
                        size="sm"
                        className="h-7 text-[11px] bg-brand-600 hover:bg-brand-700 text-white gap-1"
                      >
                        <Link href={buildGenerateInvoiceHref(r)}>
                          <FileText className="w-3 h-3" />
                          Generate Invoice
                        </Link>
                      </Button>
                    </AccountsTableCell>
                  </AccountsTableRow>
                ))}
              </TooltipProvider>
            )}
          </AccountsTableBody>
        </AccountsTable>
      </AccountsTableListing>
    </AccountsPageShell>
  );
}
