"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Pencil, Plus, Search } from "lucide-react";
import { useClientMounted } from "@/lib/use-client-mounted";
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
import { AccountsTableScroll, AccountsTable, AccountsTableHead, AccountsTableHeadRow, AccountsTableHeadCell, AccountsTableBody, AccountsTableRow, AccountsTableCell } from "@/components/accounts/AccountsTable";
import { AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { SectionTabs } from "./AccountsUI";
import { AccountsVoucherStatusBadge } from "@/components/accounts/AccountsVoucherStatusBadge";
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
  return s === "draft" || s === "sent_back";
}

export function TransactionListPage<T>({ config }: { config: TransactionListConfig<T> }) {
  const router = useRouter();
  const mounted = useClientMounted();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [branch, setBranch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [viewRow, setViewRow] = useState<TransactionRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const allRows = useMemo(
    () => (mounted ? config.loadData().map(config.getRow) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, refreshKey, mounted],
  );

  const bump = () => setRefreshKey((k) => k + 1);

  const statusTabs = config.statusTabs ?? [
    { id: "all", label: "All" },
    { id: "draft", label: "Draft" },
    { id: "pending_approval", label: "Pending Approval" },
    { id: "sent_back", label: "Sent Back" },
    { id: "posted", label: "Posted" },
    { id: "sent", label: "Posted" },
    { id: "approved", label: "Posted" },
    { id: "rejected", label: "Rejected" },
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

  useEffect(() => {
    setPage(1);
  }, [statusTab, search, dateFrom, dateTo, branch, pageSize]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const rowCanEdit = (r: TransactionRow) =>
    config.editHref &&
    (config.canEdit ? config.canEdit(r) : isDraftStatus(r.status) || r.status.toLowerCase() === "sent_back");

  const rowCanPost = (r: TransactionRow) =>
    config.onPost && (config.canPost ? config.canPost(r) : false);

  const rowCanDelete = (r: TransactionRow) =>
    config.onDelete && (config.canDelete ? config.canDelete(r) : isDraftStatus(r.status));

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
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-end gap-2">
              <div className="relative flex-1 min-w-[160px] max-w-xs">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  className="h-7 text-xs pl-7"
                  placeholder="Search number, party..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Input type="date" className="h-7 text-xs w-32" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <Input type="date" className="h-7 text-xs w-32" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              <Input className="h-7 text-xs w-24" placeholder="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} />
            </div>
            <SectionTabs tabs={statusTabs} active={statusTab} onChange={setStatusTab} counts={tabCounts} compact />
          </div>
        }
        layout="split"
        className="h-full min-h-0"
      >
        <div className="flex flex-col flex-1 min-h-0">
        <AccountsTableScroll>
          <AccountsTable>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <AccountsTableHeadCell uppercase>Number</AccountsTableHeadCell>
                <AccountsTableHeadCell uppercase>Date</AccountsTableHeadCell>
                <AccountsTableHeadCell uppercase className="accounts-col-wide">Party</AccountsTableHeadCell>
                {showGstColumns ? (
                  <>
                    <AccountsTableHeadCell align="right" uppercase>Taxable Value</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" uppercase>GST Amount</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" uppercase>Invoice Total (Incl. GST)</AccountsTableHeadCell>
                  </>
                ) : (
                  <AccountsTableHeadCell align="right" uppercase>Amount</AccountsTableHeadCell>
                )}
                <AccountsTableHeadCell uppercase className="accounts-col-status">Status</AccountsTableHeadCell>
                {showSchemeSettlementColumn && (
                  <AccountsTableHeadCell uppercase>Scheme Settlement</AccountsTableHeadCell>
                )}
                <AccountsTableHeadCell align="right" uppercase className="accounts-col-actions min-w-[100px]">Actions</AccountsTableHeadCell>
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {!mounted ? (
                <AccountsTableRow>
                  <AccountsTableCell colSpan={colSpan} className="accounts-table-empty">
                    <p className="text-xs text-muted-foreground">Loading records…</p>
                  </AccountsTableCell>
                </AccountsTableRow>
              ) : rows.length === 0 ? (
                <AccountsTableRow>
                  <AccountsTableCell colSpan={colSpan} className="accounts-table-empty">
                    No records found.
                  </AccountsTableCell>
                </AccountsTableRow>
              ) : (
                pagedRows.map((r) => (
                  <AccountsTableRow key={r.id}>
                    <AccountsTableCell mono className="font-semibold text-brand-700">
                      {r.viewHref ? (
                        <Link href={r.viewHref} className="text-brand-700 hover:underline">{r.number}</Link>
                      ) : (
                        r.number
                      )}
                    </AccountsTableCell>
                    <AccountsTableCell>{r.date}</AccountsTableCell>
                    <AccountsTableCell>{r.party}</AccountsTableCell>
                    {showGstColumns ? (
                      <>
                        <AccountsTableCell align="right" className="tabular-nums">{r.taxableValue}</AccountsTableCell>
                        <AccountsTableCell align="right" className="tabular-nums">{r.gstAmount}</AccountsTableCell>
                        <AccountsTableCell align="right" className="tabular-nums font-medium">{r.invoiceTotal}</AccountsTableCell>
                      </>
                    ) : (
                      <AccountsTableCell align="right" money>{r.amount}</AccountsTableCell>
                    )}
                    <AccountsTableCell>
                      <AccountsVoucherStatusBadge legacyStatus={r.status} />
                    </AccountsTableCell>
                    {showSchemeSettlementColumn && (
                      <AccountsTableCell>
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
                      </AccountsTableCell>
                    )}
                    <AccountsTableCell align="right">
                      <div className="flex items-center justify-end gap-0.5 flex-wrap">
                        <button
                          type="button"
                          title="View"
                          className="p-1.5 hover:bg-muted rounded-md transition-colors"
                          onClick={() => {
                            if (r.viewHref) router.push(r.viewHref);
                            else setViewRow(r);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        {rowCanEdit(r) && (
                          <button
                            type="button"
                            title="Edit"
                            className="p-1.5 hover:bg-muted rounded-md transition-colors"
                            onClick={() => router.push(config.editHref!(r.id))}
                          >
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
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
                    </AccountsTableCell>
                  </AccountsTableRow>
                ))
              )}
            </AccountsTableBody>
          </AccountsTable>
        </AccountsTableScroll>
        {mounted && rows.length > 0 && (
          <AccountsTablePagination
            page={page}
            pageSize={pageSize}
            totalRecords={rows.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
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
                  <AccountsVoucherStatusBadge legacyStatus={viewRow.status} />
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
                className="h-8 text-xs gap-1.5"
                onClick={() => router.push(config.editHref!(viewRow.id))}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
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
