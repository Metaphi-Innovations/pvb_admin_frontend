"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { listPendingVendorBills } from "@/lib/accounts/purchases-workflow-data";

function exportPendingBillsCsv(rows: ReturnType<typeof listPendingVendorBills>) {
  const headers = ["GRN No.", "PO Number", "Supplier", "GRN Date", "Items", "Status"];
  const lines = rows.map((r) =>
    [r.grnNo, r.poNumber, r.vendorName, r.grnDate, r.itemCount, r.status]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pending-supplier-bills.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function PendingVendorBillsClient() {
  const [search, setSearch] = useState("");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const allRows = useMemo(() => listPendingVendorBills(), []);

  const filtered = useMemo(() => {
    let list = [...allRows];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.grnNo.toLowerCase().includes(q) ||
          r.poNumber.toLowerCase().includes(q) ||
          r.vendorName.toLowerCase().includes(q),
      );
    }
    if (dateFrom) list = list.filter((r) => r.grnDate >= dateFrom);
    if (dateTo) list = list.filter((r) => r.grnDate <= dateTo);
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
      breadcrumbs={accountsBreadcrumb("Purchases", "Pending Supplier Bills")}
      title="Pending Supplier Bills"
      description="GRN-completed receipts â†’ create purchase invoice â†’ posts to supplier ledger."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      actions={
        <Button asChild size="sm" className="h-9 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white gap-1">
          <Link href="/accounts/transactions/purchase/new">
            <Plus className="w-4 h-4" /> Create Purchase Invoice
          </Link>
        </Button>
      }
    >
      <AccountsTableListing
        toolbar={
          <AccountsTableToolbar
            search={{
              value: search,
              onChange: setSearch,
              placeholder: "Search GRN, PO, supplier…",
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
            onExcel={() => exportPendingBillsCsv(filtered)}
            onPdf={() => exportPendingBillsCsv(filtered)}
            exportDisabled={filtered.length === 0}
          />
        }
        footer={
          filtered.length > 0 ? (
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              recordLabel="bills"
            />
          ) : null
        }
      >
        <AccountsTable minWidth={800}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <AccountsTableHeadCell uppercase>GRN No.</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>PO Number</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase className="accounts-col-party">Supplier</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>GRN Date</AccountsTableHeadCell>
              <AccountsTableHeadCell align="center" uppercase>Items</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase className="accounts-col-status">Status</AccountsTableHeadCell>
              <AccountsTableHeadCell align="right" uppercase className="accounts-col-actions-wide" />
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {filtered.length === 0 ? (
              <AccountsTableEmpty
                colSpan={7}
                message="No GRN-completed receipts pending supplier bill."
                onClear={search || dateFrom || dateTo ? () => { setSearch(""); setDateFrom(""); setDateTo(""); } : undefined}
              />
            ) : (
              pagedRows.map((r) => (
                <AccountsTableRow key={r.grnNo}>
                  <AccountsTableCell mono>{r.grnNo}</AccountsTableCell>
                  <AccountsTableCell mono>{r.poNumber}</AccountsTableCell>
                  <AccountsTableCell className="accounts-col-party">{r.vendorName}</AccountsTableCell>
                  <AccountsTableCell className="tabular-nums">{r.grnDate}</AccountsTableCell>
                  <AccountsTableCell align="center">{r.itemCount}</AccountsTableCell>
                  <AccountsTableCell className="capitalize">{r.status.replace("_", " ")}</AccountsTableCell>
                  <AccountsTableCell align="right">
                    <Button asChild size="sm" variant="outline" className="h-7 text-sm">
                      <Link href={`/accounts/transactions/purchase/new?grn=${encodeURIComponent(r.grnNo)}`}>
                        Create Bill
                      </Link>
                    </Button>
                  </AccountsTableCell>
                </AccountsTableRow>
              ))
            )}
          </AccountsTableBody>
        </AccountsTable>
      </AccountsTableListing>
    </AccountsPageShell>
  );
}
