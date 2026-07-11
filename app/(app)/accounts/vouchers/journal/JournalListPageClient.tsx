"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AccountsEditAction,
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import { Plus } from "lucide-react";
import { useClientMounted } from "@/lib/use-client-mounted";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { VoucherFormToastHost } from "@/components/accounts/voucher-form/VoucherFormToastHost";
import { accountsBreadcrumb, JOURNAL_VOUCHER_HREF } from "@/lib/accounts/accounts-nav";
import {
  ACCOUNTS_FILTER_CONTROL_CLASS,
  ACCOUNTS_FILTER_LABEL_CLASS,
  ACCOUNTS_FILTER_SELECT_CLASS,
} from "@/lib/accounts/accounts-typography";
import {
  ReportDateRangeFilter,
  ReportFilterRow,
  ReportSearchFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import {
  AccountsColumnHeader,
  SortTh,
  AccountsColumnFilterProvider,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "../../components/AccountsUI";
import { getJournalVouchers, canEditVoucher } from "../voucher-data";
import { cn } from "@/lib/utils";

import { AccountsTablePagination, ACCOUNTS_DEFAULT_PAGE_SIZE, AccountsTableListing } from "@/components/accounts/AccountsTableListing";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";

const DEFAULT_PAGE_SIZE = ACCOUNTS_DEFAULT_PAGE_SIZE;

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "posted", label: "Posted" },
  { value: "approved", label: "Approved" },
] as const;

type JournalRow = ReturnType<typeof getJournalVouchers>[number];

function JournalListTable({
  mounted,
  page,
  pageSize,
  toolbarFiltered,
  onPageChange,
  onPageSizeChange,
}: {
  mounted: boolean;
  page: number;
  pageSize: number;
  toolbarFiltered: JournalRow[];
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const router = useRouter();
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows(toolbarFiltered);

  const paged = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  return (
    <>
      <AccountsTable minWidth={900}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Voucher Number" colKey="voucherNumber" />
            <SortTh label="Date" colKey="date" filterType="date" />
            <AccountsColumnHeader
              label="Narration"
              colKey="narration"
              sortable={false}
              className="accounts-col-narration"
            />
            <SortTh label="Total Amount" colKey="totalDebit" filterType="amount" align="right" />
            <SortTh label="Created By" colKey="createdBy" />
            <AccountsColumnHeader
              label="Actions"
              colKey="_actions"
              sortable={false}
              filterable={false}
              align="right"
              className={accountsActionColClass("multi")}
            />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {!mounted ? (
            <AccountsTableRow>
              <AccountsTableCell colSpan={6} className="accounts-table-empty">
                Loading…
              </AccountsTableCell>
            </AccountsTableRow>
          ) : visible.length === 0 ? (
            <AccountsTableRow>
              <AccountsTableCell colSpan={6} className="accounts-table-empty">
                No records found.
              </AccountsTableCell>
            </AccountsTableRow>
          ) : (
            paged.map((v) => (
              <AccountsTableRow key={v.id} className="group">
                <AccountsTableCell mono>
                  <Link
                    href={`/accounts/vouchers/view/${v.id}`}
                    className="text-brand-700 hover:underline font-mono text-xs font-semibold"
                  >
                    {v.voucherNumber}
                  </Link>
                </AccountsTableCell>
                <AccountsTableCell className="tabular-nums">{v.date}</AccountsTableCell>
                <AccountsTableCell className="accounts-col-narration max-w-[280px] truncate">
                  {v.narration || "—"}
                </AccountsTableCell>
                <AccountsTableCell align="right" money>
                  <MoneyAmount amount={v.totalDebit} />
                </AccountsTableCell>
                <AccountsTableCell className="text-muted-foreground">{v.createdBy}</AccountsTableCell>
                <AccountsTableCell align="right" className={accountsActionColClass("multi")}>
                  <AccountsTableActionCell>
                    <AccountsViewAction
                      title="View"
                      onClick={() => router.push(`/accounts/vouchers/view/${v.id}`)}
                    />
                    {canEditVoucher(v) && (
                      <AccountsEditAction
                        title="Edit"
                        onClick={() => router.push(`/accounts/vouchers/edit/${v.id}`)}
                      />
                    )}
                  </AccountsTableActionCell>
                </AccountsTableCell>
              </AccountsTableRow>
            ))
          )}
        </AccountsTableBody>
      </AccountsTable>
      {mounted && visible.length > 0 ? (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={visible.length}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      ) : null}
    </>
  );
}

function JournalListContent({
  mounted,
  filterBar,
  page,
  pageSize,
  toolbarFiltered,
  setPage,
  setPageSize,
}: {
  mounted: boolean;
  filterBar: React.ReactNode;
  page: number;
  pageSize: number;
  toolbarFiltered: JournalRow[];
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
}) {
  const visible = useAccountsFilteredRows(toolbarFiltered);

  const exportCsv = () => {
    const header = "Voucher Number,Date,Narration,Total Amount,Status,Created By\n";
    const rows = visible
      .map((v) =>
        [
          `"${v.voucherNumber}"`,
          v.date,
          `"${(v.narration || "").replace(/"/g, '""')}"`,
          v.totalDebit.toFixed(2),
          v.status,
          `"${v.createdBy}"`,
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "journal-vouchers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Transactions", "Journal Entry", JOURNAL_VOUCHER_HREF)}
      title="Journal Entry"
      description="Manual double-entry journal. Total debit must equal total credit before posting."
      actions={
        <>
          <AccountsExportMenu onExcel={exportCsv} />
          <Button
            size="sm"
            className="h-9 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white gap-1"
            asChild
          >
            <Link href="/accounts/vouchers/journal/new">
              <Plus className="w-4 h-4" /> Add Journal
            </Link>
          </Button>
        </>
      }
      filters={filterBar}
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsTableListing>
        <JournalListTable
          mounted={mounted}
          page={page}
          pageSize={pageSize}
          toolbarFiltered={toolbarFiltered}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </AccountsTableListing>
    </AccountsPageShell>
  );
}

export default function JournalListPageClient() {
  const mounted = useClientMounted();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } =
    useReportDateRange("this_year");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const records = useMemo(() => (mounted ? getJournalVouchers() : []), [mounted]);

  const getCellValue = useCallback(
    (row: JournalRow, key: string) => (row as unknown as Record<string, unknown>)[key],
    [],
  );

  const toolbarFiltered = useMemo(() => {
    let r = [...records];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (v) =>
          v.voucherNumber.toLowerCase().includes(q) ||
          v.narration.toLowerCase().includes(q) ||
          v.createdBy.toLowerCase().includes(q) ||
          v.referenceNo.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      r = r.filter((v) => v.status === statusFilter);
    }
    if (dateFrom) r = r.filter((v) => v.date >= dateFrom);
    if (dateTo) r = r.filter((v) => v.date <= dateTo);
    return r;
  }, [records, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateFrom, dateTo, pageSize]);

  const filterBar = (
    <ReportFilterRow>
      <ReportSearchFilter
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="Search voucher no., narration, created by…"
        className="min-w-[200px] flex-1 max-w-sm"
      />
      <div className="space-y-0.5 shrink-0">
        <span className={ACCOUNTS_FILTER_LABEL_CLASS}>Status</span>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger
            className={cn(
              ACCOUNTS_FILTER_CONTROL_CLASS,
              ACCOUNTS_FILTER_SELECT_CLASS,
              "w-[128px]",
            )}
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ReportDateRangeFilter
        preset={preset}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onPresetChange={setPreset}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />
    </ReportFilterRow>
  );

  return (
    <AccountsColumnFilterProvider
      rows={toolbarFiltered}
      getCellValue={getCellValue}
      columnConfig={{
        voucherNumber: { type: "text" },
        date: { type: "date" },
        narration: { type: "text" },
        totalDebit: { type: "amount" },
        createdBy: { type: "text" },
      }}
      defaultSortKey="date"
      defaultSortDir="desc"
    >
      <JournalListContent
        mounted={mounted}
        filterBar={filterBar}
        page={page}
        pageSize={pageSize}
        toolbarFiltered={toolbarFiltered}
        setPage={setPage}
        setPageSize={setPageSize}
      />
      <VoucherFormToastHost />
    </AccountsColumnFilterProvider>
  );
}
