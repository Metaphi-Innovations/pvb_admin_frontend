"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { StatusBadge, SectionTabs } from "./AccountsUI";
import { cn } from "@/lib/utils";

export interface TransactionRow {
  id: string | number;
  number: string;
  date: string;
  party: string;
  amount: string;
  status: string;
  branch?: string;
  viewHref?: string;
  viewFields?: { label: string; value: string }[];
}

export interface TransactionListConfig<T> {
  section: string;
  title: string;
  description: string;
  loadData: () => T[];
  newHref?: string;
  editHref?: (id: string | number) => string;
  statusTabs?: { id: string; label: string }[];
  getStatus?: (item: T) => string;
  getRow: (item: T) => TransactionRow;
}

export function TransactionListPage<T>({ config }: { config: TransactionListConfig<T> }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [branch, setBranch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [viewRow, setViewRow] = useState<TransactionRow | null>(null);

  const allRows = useMemo(() => config.loadData().map(config.getRow), [config]);

  const statusTabs = config.statusTabs ?? [
    { id: "all", label: "All" },
    { id: "draft", label: "Draft" },
    { id: "approved", label: "Approved" },
    { id: "posted", label: "Posted" },
    { id: "paid", label: "Paid" },
    { id: "cancelled", label: "Cancelled" },
  ];

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allRows.length };
    for (const r of allRows) {
      const s = r.status.toLowerCase().replace(/\s+/g, "_");
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }, [allRows]);

  const rows = useMemo(() => {
    let list = [...allRows];
    if (statusTab !== "all") {
      list = list.filter((r) => r.status.toLowerCase().replace(/\s+/g, "_") === statusTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.number.toLowerCase().includes(q) ||
          r.party.toLowerCase().includes(q),
      );
    }
    if (dateFrom) list = list.filter((r) => r.date >= dateFrom);
    if (dateTo) list = list.filter((r) => r.date <= dateTo);
    if (branch.trim()) {
      const b = branch.toLowerCase();
      list = list.filter((r) => (r.branch ?? "").toLowerCase().includes(b));
    }
    return list;
  }, [allRows, statusTab, search, dateFrom, dateTo, branch]);

  return (
    <>
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb(config.section, config.title)}
        title={config.title}
        description={config.description}
        actions={
          config.newHref ? (
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 text-white gap-1"
              onClick={() => router.push(config.newHref!)}
            >
              <Plus className="w-3.5 h-3.5" /> New
            </Button>
          ) : undefined
        }
        filters={
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  className="h-8 text-xs pl-8"
                  placeholder="Search number, party..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Input type="date" className="h-8 text-xs w-36" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <Input type="date" className="h-8 text-xs w-36" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              <Input className="h-8 text-xs w-28" placeholder="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} />
            </div>
            <SectionTabs tabs={statusTabs} active={statusTab} onChange={setStatusTab} counts={tabCounts} />
          </div>
        }
        layout="split"
      >
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-table">
            <thead className="bg-muted/20 border-b border-border/60 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Number</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Party</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Amount</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <p className="text-sm font-medium text-foreground">No records found</p>
                    <p className="text-xs text-muted-foreground mt-1">Adjust filters or create a new entry.</p>
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/40 hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-xs font-mono font-semibold">
                      {r.viewHref ? (
                        <Link href={r.viewHref} className="text-brand-700 hover:underline">{r.number}</Link>
                      ) : (
                        r.number
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs">{r.date}</td>
                    <td className="px-4 py-2.5 text-xs">{r.party}</td>
                    <td className="px-4 py-2.5 text-xs text-right tabular-nums">{r.amount}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px]"
                        onClick={() => setViewRow(r)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AccountsPageShell>

      <Sheet open={!!viewRow} onOpenChange={(o) => !o && setViewRow(null)}>
        <SheetContent className="max-w-[400px] w-full sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle className="text-base">{viewRow?.number}</SheetTitle>
            <SheetDescription className="text-xs">Transaction details (read-only preview)</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {viewRow && (
              <>
                <div className="flex items-center gap-2">
                  <StatusBadge status={viewRow.status} />
                </div>
                {(viewRow.viewFields ?? [
                  { label: "Date", value: viewRow.date },
                  { label: "Party", value: viewRow.party },
                  { label: "Amount", value: viewRow.amount },
                  ...(viewRow.branch ? [{ label: "Branch", value: viewRow.branch }] : []),
                ]).map((f) => (
                  <div key={f.label} className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">{f.label}</p>
                    <p className={cn("text-sm font-medium", f.label === "Amount" && "tabular-nums")}>{f.value}</p>
                  </div>
                ))}
              </>
            )}
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setViewRow(null)}>
              Close
            </Button>
            {viewRow?.viewHref && (
              <Button
                size="sm"
                className="h-8 text-xs bg-brand-600 text-white"
                onClick={() => {
                  router.push(viewRow.viewHref!);
                  setViewRow(null);
                }}
              >
                Full Details
              </Button>
            )}
            {viewRow && config.editHref && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => router.push(config.editHref!(viewRow.id))}
              >
                Edit
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
