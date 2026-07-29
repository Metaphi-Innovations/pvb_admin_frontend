"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { listPendingVendorBills } from "@/lib/accounts/purchases-workflow-data";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";

type PendingBillRow = ReturnType<typeof listPendingVendorBills>[number];

function exportPendingBillsCsv(rows: PendingBillRow[]) {
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

function PendingVendorBillsTable({
  toolbarRows,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  clearToolbarFilters,
}: {
  toolbarRows: PendingBillRow[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  clearToolbarFilters?: () => void;
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
    <AccountsTable minWidth={800}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="GRN No." colKey="grnNo" />
          <SortTh label="PO Number" colKey="poNumber" />
          <SortTh label="Supplier" colKey="vendorName" className="accounts-col-party" />
          <SortTh label="GRN Date" colKey="grnDate" filterType="date" />
          <SortTh label="Items" colKey="itemCount" filterType="amount" align="center" />
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
        {toolbarRows.length === 0 ? (
          <AccountsTableEmpty
            colSpan={6}
            message="No GRN-completed receipts pending supplier bill."
            onClear={clearToolbarFilters}
          />
        ) : visible.length === 0 ? (
          <AccountsTableEmpty colSpan={6} message="No records match the column filters." />
        ) : (
          pagedRows.map((r) => (
            <AccountsTableRow key={r.grnNo}>
              <AccountsTableCell mono>{r.grnNo}</AccountsTableCell>
              <AccountsTableCell mono>{r.poNumber}</AccountsTableCell>
              <AccountsTableCell className="accounts-col-party">{r.vendorName}</AccountsTableCell>
              <AccountsTableCell className="tabular-nums">{r.grnDate}</AccountsTableCell>
              <AccountsTableCell align="center">{r.itemCount}</AccountsTableCell>
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
  );
}

function PendingVendorBillsContent({
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
  toolbarRows: PendingBillRow[];
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

  const clearToolbarFilters =
    search || dateFrom || dateTo
      ? () => {
          setSearch("");
          setDateFrom("");
          setDateTo("");
        }
      : undefined;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Purchases", "Pending Supplier Bills")}
      title="Pending Supplier Bills"
      description="GRN-completed receipts → create purchase invoice → posts to supplier ledger."
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
            onExcel={() => exportPendingBillsCsv(visible)}
            onPdf={() => exportPendingBillsCsv(visible)}
            exportDisabled={visible.length === 0}
          />
        }
        footer={
          visible.length > 0 ? (
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={visible.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              recordLabel="bills"
            />
          ) : null
        }
      >
        <PendingVendorBillsTable
          toolbarRows={toolbarRows}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          clearToolbarFilters={clearToolbarFilters}
        />
      </AccountsTableListing>
    </AccountsPageShell>
  );
}

export default function PendingVendorBillsClient() {
  const [search, setSearch] = useState("");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");

  const allRows = useMemo(() => listPendingVendorBills(), []);

  const toolbarRows = useMemo(() => {
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

  const getCellValue = useCallback(
    (row: PendingBillRow, key: string) => (row as unknown as Record<string, unknown>)[key],
    [],
  );

  return (
    <AccountsColumnFilterProvider
      rows={toolbarRows}
      getCellValue={getCellValue}
      columnConfig={{
        grnNo: { type: "text" },
        poNumber: { type: "text" },
        vendorName: { type: "text" },
        grnDate: { type: "date" },
        itemCount: { type: "amount" },
      }}
      defaultSortKey="grnDate"
      defaultSortDir="desc"
    >
      <PendingVendorBillsContent
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
