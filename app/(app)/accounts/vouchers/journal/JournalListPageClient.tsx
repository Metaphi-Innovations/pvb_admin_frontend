"use client";

import React, { useMemo, useState } from "react";
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
import { Download, Plus, Search } from "lucide-react";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb, JOURNAL_VOUCHER_HREF } from "@/lib/accounts/accounts-nav";
import { SortTh, StatusBadge } from "../../components/AccountsUI";
import { getJournalVouchers } from "../voucher-data";

const PAGE_SIZE = 15;

export default function JournalListPageClient() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const records = useMemo(() => getJournalVouchers(), []);

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
  }, [records, search, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 pl-8 text-xs bg-white"
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
        <SelectTrigger className="h-9 w-[130px] text-xs bg-white">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All Status</SelectItem>
          <SelectItem value="draft" className="text-xs">Draft</SelectItem>
          <SelectItem value="posted" className="text-xs">Posted</SelectItem>
          <SelectItem value="approved" className="text-xs">Approved</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const paginationFooter = (
    <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/5 text-xs text-muted-foreground">
      <span>
        {visible.length === 0
          ? "0 journals"
          : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, visible.length)} of ${visible.length}`}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </Button>
        <span className="text-[11px] tabular-nums">Page {page} of {totalPages}</span>
        <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
      </div>
    </div>
  );

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Transactions", "Journal Entry", JOURNAL_VOUCHER_HREF)}
      title="Journal Entry"
      description="Manual double-entry journal. Total debit must equal total credit before posting."
      actions={
        <>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={exportCsv}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1"
            asChild
          >
            <Link href="/accounts/vouchers/journal/new">
              <Plus className="w-3.5 h-3.5" /> Add Journal
            </Link>
          </Button>
        </>
      }
      filters={filterBar}
      footer={paginationFooter}
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-table min-w-[900px]">
          <thead className="bg-muted/20 border-b border-border/60 sticky top-0 z-10">
            <tr>
              <SortTh label="Voucher Number" colKey="voucherNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortTh label="Date" colKey="date" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Narration</th>
              <SortTh label="Total Amount" colKey="totalDebit" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
              <th className="px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
              <SortTh label="Created By" colKey="createdBy" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <p className="text-sm font-medium text-foreground">No journal vouchers yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create your first journal entry to get started.</p>
                  <Button
                    size="sm"
                    className="h-8 text-xs mt-3 bg-brand-600 text-white"
                    onClick={() => router.push("/accounts/vouchers/journal/new")}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Journal
                  </Button>
                </td>
              </tr>
            ) : (
              paged.map((v) => (
                <tr key={v.id} className="border-b border-border/40 hover:bg-brand-50/30 transition-colors">
                  <td className="px-4 py-3 text-xs font-medium">{v.voucherNumber}</td>
                  <td className="px-4 py-3 text-xs tabular-nums">{v.date}</td>
                  <td className="px-4 py-3 text-xs max-w-[280px] truncate">{v.narration || "—"}</td>
                  <td className="px-4 py-3.5 text-right">
                    <MoneyAmount amount={v.totalDebit} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{v.createdBy}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AccountsPageShell>
  );
}
