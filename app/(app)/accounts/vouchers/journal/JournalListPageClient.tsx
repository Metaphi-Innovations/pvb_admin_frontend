"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Search } from "lucide-react";
import { useClientMounted } from "@/lib/use-client-mounted";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingDateFilter } from "@/components/accounts/AccountsListingFilter";
import { accountsBreadcrumb, JOURNAL_VOUCHER_HREF } from "@/lib/accounts/accounts-nav";
import { SortTh, StatusBadge } from "../../components/AccountsUI";
import { getJournalVouchers, canEditVoucher } from "../voucher-data";

import { AccountsTablePagination, ACCOUNTS_DEFAULT_PAGE_SIZE } from "@/components/accounts/AccountsTableListing";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";

const DEFAULT_PAGE_SIZE = ACCOUNTS_DEFAULT_PAGE_SIZE;
export default function JournalListPageClient() {
  const router = useRouter();
  const mounted = useClientMounted();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const records = useMemo(() => (mounted ? getJournalVouchers() : []), [mounted]);

  const visible = useMemo(() => {
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
    r.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av ?? "").localeCompare(String(bv ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return r;
  }, [records, search, statusFilter, dateFrom, dateTo, sortKey, sortDir]);

  const paged = visible.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateFrom, dateTo, pageSize]);

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

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

  const filterBar = (
    <div className="flex flex-wrap gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-7 pl-8 text-sm bg-white"
          placeholder="Search voucher no., narration, created by…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <Select
        value={statusFilter}
        onValueChange={(v) => {
          setStatusFilter(v);
          setPage(1);
        }}
      >
        <SelectTrigger className="h-7 w-[120px] text-sm bg-white">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All Status</SelectItem>
          <SelectItem value="draft" className="text-xs">Draft</SelectItem>
          <SelectItem value="posted" className="text-xs">Posted</SelectItem>
          <SelectItem value="approved" className="text-xs">Approved</SelectItem>
        </SelectContent>
      </Select>
      <AccountsListingDateFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />
    </div>
  );

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
      <div className="flex flex-col flex-1 min-h-0">
      <AccountsTableScroll>
        <AccountsTable minWidth={900}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <SortTh label="Voucher Number" colKey="voucherNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortTh label="Date" colKey="date" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <AccountsTableHeadCell uppercase className="accounts-col-narration">Narration</AccountsTableHeadCell>
              <SortTh label="Total Amount" colKey="totalDebit" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
              <AccountsTableHeadCell align="center" uppercase className="accounts-col-status">Status</AccountsTableHeadCell>
              <SortTh label="Created By" colKey="createdBy" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <AccountsTableHeadCell align="right" uppercase className={accountsActionColClass("multi")}>Actions</AccountsTableHeadCell>
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {!mounted ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={7} className="accounts-table-empty">
                  Loading…
                </AccountsTableCell>
              </AccountsTableRow>
            ) : paged.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={7} className="accounts-table-empty">
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
                  <AccountsTableCell className="accounts-col-narration max-w-[280px] truncate">{v.narration || "—"}</AccountsTableCell>
                  <AccountsTableCell align="right" money>
                    <MoneyAmount amount={v.totalDebit} />
                  </AccountsTableCell>
                  <AccountsTableCell align="center">
                    <StatusBadge status={v.status} />
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
      </AccountsTableScroll>      {mounted && visible.length > 0 && (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={visible.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          recordLabel="journals"
        />
      )}
      </div>
    </AccountsPageShell>
  );
}
