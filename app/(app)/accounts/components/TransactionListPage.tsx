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
import { LedgerImpactPreview, type LedgerImpactLine } from "@/components/accounts/LedgerImpactPreview";

export interface TransactionRow {
  id: string | number;
  number: string;
  date: string;
  party: string;
  amount: string;
  /** When set, list shows Taxable Value / GST Amount / Invoice Total columns. */
  taxableValue?: string;
  gstAmount?: string;
  invoiceTotal?: string;
  status: string;
  branch?: string;
  /** Sales invoice scheme settlement badge: Settlement Required | Settled | undefined (show —) */
  schemeSettlementLabel?: string | null;
  viewHref?: string;
  viewFields?: { label: string; value: string }[];
  impactLines?: LedgerImpactLine[];
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
  /** Show Post for draft rows when provided */
  onPost?: (id: string | number) => void;
  /** Show Delete for draft rows when provided */
  onDelete?: (id: string | number) => void;
  canPost?: (row: TransactionRow) => boolean;
  canDelete?: (row: TransactionRow) => boolean;
  canEdit?: (row: TransactionRow) => boolean;
  /** Show Scheme Settlement column (Sales Invoices). */
  showSchemeSettlementColumn?: boolean;
}

function isDraftStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s === "draft" || s === "pending_approval";
}

export function TransactionListPage<T>({ config }: { config: TransactionListConfig<T> }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [branch, setBranch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [viewRow, setViewRow] = useState<TransactionRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const allRows = useMemo(
    () => config.loadData().map(config.getRow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, refreshKey],
  );

  const bump = () => setRefreshKey((k) => k + 1);

  const statusTabs = config.statusTabs ?? [
    { id: "all", label: "All" },
    { id: "draft", label: "Draft" },
    { id: "approved", label: "Approved" },
    { id: "posted", label: "Posted" },
    { id: "sent", label: "Sent" },
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

  const rowCanPost = (r: TransactionRow) =>
    config.onPost && (config.canPost ? config.canPost(r) : isDraftStatus(r.status));

  const rowCanDelete = (r: TransactionRow) =>
    config.onDelete && (config.canDelete ? config.canDelete(r) : isDraftStatus(r.status));

  const rowCanEdit = (r: TransactionRow) =>
    config.editHref && (config.canEdit ? config.canEdit(r) : isDraftStatus(r.status));

  const showGstColumns = allRows.some(
    (r) => r.taxableValue != null && r.gstAmount != null && r.invoiceTotal != null,
  );
  const showSchemeSettlementColumn = config.showSchemeSettlementColumn ?? false;
  const colSpan = (showGstColumns ? 8 : 6) + (showSchemeSettlementColumn ? 1 : 0);

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
        className="h-full min-h-0"
      >
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-table">
            <thead className="bg-muted/20 border-b border-border/60 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Number</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Party</th>
                {showGstColumns ? (
                  <>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Taxable Value</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">GST Amount</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Invoice Total (Incl. GST)</th>
                  </>
                ) : (
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Amount</th>
                )}
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                {showSchemeSettlementColumn && (
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Scheme Settlement
                  </th>
                )}
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground min-w-[200px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-16 text-center">
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
                    {showGstColumns ? (
                      <>
                        <td className="px-4 py-2.5 text-xs text-right tabular-nums">{r.taxableValue}</td>
                        <td className="px-4 py-2.5 text-xs text-right tabular-nums">{r.gstAmount}</td>
                        <td className="px-4 py-2.5 text-xs text-right tabular-nums font-medium">{r.invoiceTotal}</td>
                      </>
                    ) : (
                      <td className="px-4 py-2.5 text-xs text-right tabular-nums">{r.amount}</td>
                    )}
                    <td className="px-4 py-2.5">
                      <StatusBadge status={r.status} />
                    </td>
                    {showSchemeSettlementColumn && (
                      <td className="px-4 py-2.5 text-xs">
                        {r.schemeSettlementLabel ? (
                          <span
                            className={cn(
                              "inline-flex h-5 items-center rounded-md border px-1.5 text-[10px] font-semibold whitespace-nowrap",
                              r.schemeSettlementLabel === "Settled"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-amber-200 bg-amber-50 text-amber-800",
                            )}
                          >
                            {r.schemeSettlementLabel}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px]"
                          onClick={() => setViewRow(r)}
                        >
                          View
                        </Button>
                        {rowCanEdit(r) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px]"
                            onClick={() => router.push(config.editHref!(r.id))}
                          >
                            Edit
                          </Button>
                        )}
                        {rowCanPost(r) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] text-brand-700"
                            onClick={() => {
                              config.onPost!(r.id);
                              bump();
                            }}
                          >
                            Post
                          </Button>
                        )}
                        {rowCanDelete(r) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] text-destructive"
                            onClick={() => {
                              if (window.confirm(`Delete ${r.number}?`)) {
                                config.onDelete!(r.id);
                                bump();
                              }
                            }}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
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
                  ...(viewRow.taxableValue != null
                    ? [
                        { label: "Taxable Value", value: viewRow.taxableValue },
                        { label: "GST Amount", value: viewRow.gstAmount ?? "—" },
                        { label: "Invoice Total (Incl. GST)", value: viewRow.invoiceTotal ?? viewRow.amount },
                      ]
                    : [{ label: "Amount", value: viewRow.amount }]),
                  ...(viewRow.branch ? [{ label: "Branch", value: viewRow.branch }] : []),
                ]).map((f) => (
                  <div key={f.label} className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">{f.label}</p>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        (f.label.includes("Value") ||
                          f.label.includes("GST") ||
                          f.label.includes("Total") ||
                          f.label === "Amount") &&
                          "tabular-nums",
                      )}
                    >
                      {f.value}
                    </p>
                  </div>
                ))}
                {viewRow.impactLines && viewRow.impactLines.length > 0 && (
                  <LedgerImpactPreview title="Ledger Impact Preview" lines={viewRow.impactLines} className="mt-2" />
                )}
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
            {viewRow && rowCanEdit(viewRow) && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => router.push(config.editHref!(viewRow.id))}
              >
                Edit
              </Button>
            )}
            {viewRow && rowCanPost(viewRow) && (
              <Button
                size="sm"
                className="h-8 text-xs bg-brand-600 text-white"
                onClick={() => {
                  config.onPost!(viewRow.id);
                  setViewRow(null);
                  bump();
                }}
              >
                Post
              </Button>
            )}
            {viewRow && rowCanDelete(viewRow) && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-destructive"
                onClick={() => {
                  if (window.confirm(`Delete ${viewRow.number}?`)) {
                    config.onDelete!(viewRow.id);
                    setViewRow(null);
                    bump();
                  }
                }}
              >
                Delete
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
