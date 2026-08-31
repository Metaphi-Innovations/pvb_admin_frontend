"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { MessageSquare, Plus, Settings2 } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsListingTableCard,
  AccountsListingTabsRow,
} from "@/components/accounts/AccountsListingHeader";
import { AgeingBreakpointPanel } from "@/components/accounts/AgeingBreakpointPanel";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  breakpointsToDraft,
  DEFAULT_AGEING_BREAKPOINTS,
  getAgeingBucketLabels,
  ageingBucketColumnKey,
  type AgeingBreakpoints,
} from "@/lib/accounts/ageing-breakpoints";
import {
  computeReceiptAllocationSummary,
  type CollectionFollowUpStatus,
} from "@/lib/accounts/receivables-data";
import type {
  ApiCollectionFollowUpRow,
  ApiCustomerAgeingRow,
  ApiCustomerOutstandingRow,
  ApiFollowUpContactMethod,
  ApiInvoiceOutstandingRow,
} from "@/types/receivables.types";
import {
  AGING_SORT_KEY_TO_API,
  FOLLOW_UP_SORT_KEY_TO_API,
  INVOICE_SORT_KEY_TO_API,
  isUuid,
  mapFollowUpHistoryRow,
  mapFollowUpRow,
  mapFollowUpStatusToApi,
  SUMMARY_SORT_KEY_TO_API,
} from "@/lib/accounts/receivables-api-mappers";
import type { ReceivablesExportView } from "@/types/receivables.types";
import { useReceivablesListing } from "@/lib/accounts/use-receivables-listing";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { CustomerListService } from "@/services/customer-list.service";
import { ReceivablesService } from "@/services/receivables.service";
import { formatMoneyNumber, MONEY_CELL_CLASS } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import {
  COLLECTION_FOLLOWUP_STATUS_COLUMN_FILTER,
  RECEIVABLE_STATUS_COLUMN_FILTER,
} from "@/lib/accounts/column-filter-presets";
import type { AccountsColumnFilterConfig } from "@/lib/accounts/column-filter-types";
import {
  AccountsColumnFilterProvider,
  SectionTabs,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import {
  ReportFilterRow,
  ReportAsOnDateFilter,
  ReportCustomerFilter,
  ReportSalespersonFilter,
  ReportSearchFilter,
  ReportFilterResetButton,
} from "@/components/accounts/ReportFilters";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  receivableStatusToBadge,
  collectionStatusToBadge,
} from "@/lib/accounts/accounts-status-badges";
import {
  AccountsRichTable,
  AccountsTableScroll,
  type AccountsRichColumnDef,
} from "@/components/accounts/AccountsTable";
import { AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import {
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";
import { cn } from "@/lib/utils";

type WorkspaceView = "summary" | "invoice" | "ageing" | "collection";
type DueStatusFilter = "all" | "overdue" | "not_due";

const VIEW_TABS = [
  { id: "summary", label: "Customer Summary" },
  { id: "invoice", label: "Invoice View" },
  { id: "ageing", label: "Ageing View" },
  { id: "collection", label: "Collection Follow-up" },
];

const FOLLOW_UP_STATUS: { value: CollectionFollowUpStatus; label: string }[] = [
  { value: "not_contacted", label: "Not Contacted" },
  { value: "follow_up_scheduled", label: "Follow-up Scheduled" },
  { value: "promise_to_pay", label: "Promise to Pay" },
  { value: "part_payment_received", label: "Part Payment Received" },
  { value: "escalated", label: "Escalated" },
  { value: "closed", label: "Closed" },
];

const FOLLOW_UP_CONTACT_METHOD: { value: ApiFollowUpContactMethod; label: string }[] = [
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "VISIT", label: "Visit" },
  { value: "SMS", label: "SMS" },
  { value: "OTHER", label: "Other" },
];

function contactMethodLabel(method?: ApiFollowUpContactMethod): string | null {
  if (!method) return null;
  return FOLLOW_UP_CONTACT_METHOD.find((o) => o.value === method)?.label ?? method;
}

function formatReportDate(value: string): string {
  if (!value || value === "—") return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}-${m}-${y}`;
}

function AmountCell({ amount, className }: { amount: number; className?: string }) {
  return (
    <span className={cn("inline-block whitespace-nowrap tabular-nums", MONEY_CELL_CLASS, className)}>
      ₹{formatMoneyNumber(amount)}
    </span>
  );
}

function parseViewParam(raw: string | null): WorkspaceView {
  if (raw === "invoice" || raw === "invoices") return "invoice";
  if (raw === "ageing" || raw === "aging") return "ageing";
  if (raw === "collection" || raw === "collections" || raw === "followup") return "collection";
  if (raw === "summary" || raw === "customers") return "summary";
  return "summary";
}

function resolveInitialView(searchParams: URLSearchParams): WorkspaceView {
  const view = searchParams.get("view");
  const tab = searchParams.get("tab");
  if (view) return parseViewParam(view);
  if (tab) return parseViewParam(tab);
  return "summary";
}

function ReceivablesListSortSync({
  sortKey,
  sortDir,
  onSortChange,
}: {
  sortKey: string;
  sortDir: "asc" | "desc";
  onSortChange: (sortKey: string, sortDir: "asc" | "desc") => void;
}) {
  const ctx = useAccountsColumnFilterContext();

  useEffect(() => {
    if (!ctx) return;
    const nextKey = ctx.sortKey || "";
    const nextDir = ctx.sortDir ?? "asc";
    if (nextKey !== sortKey || (nextKey !== "" && nextDir !== sortDir)) {
      onSortChange(nextKey, nextDir);
    }
  }, [ctx?.sortKey, ctx?.sortDir, sortKey, sortDir, onSortChange]);

  return null;
}

function FollowUpDialog({
  open,
  customerId: initialCustomerId,
  customerName: initialCustomerName,
  editing,
  customers,
  selectableCustomers,
  onClose,
  onSaved,
}: {
  open: boolean;
  customerId: string;
  customerName: string;
  editing?: ApiCollectionFollowUpRow | null;
  customers: { id: string; customerName: string }[];
  selectableCustomers: { id: string; customerName: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [history, setHistory] = useState<
    ReturnType<typeof mapFollowUpHistoryRow>[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [status, setStatus] = useState<CollectionFollowUpStatus>("follow_up_scheduled");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [promiseToPayDate, setPromiseToPayDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [contactMethod, setContactMethod] = useState<ApiFollowUpContactMethod | "">("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setCustomerId(initialCustomerId);
    setCustomerName(initialCustomerName);
    if (editing) {
      setStatus(editing.status);
      setNextFollowUpDate(editing.nextFollowUpDate || "");
      setPromiseToPayDate(editing.promiseToPayDate || "");
      setRemarks(editing.remarks || "");
      setAssignedTo(editing.assignedTo || "");
      setContactMethod("");
    } else {
      setStatus("follow_up_scheduled");
      setNextFollowUpDate(new Date().toISOString().slice(0, 10));
      setPromiseToPayDate("");
      setRemarks("");
      setAssignedTo("");
      setContactMethod("");
    }
  }, [open, editing, initialCustomerId, initialCustomerName]);

  useEffect(() => {
    if (!open || !editing?.id) {
      setHistory([]);
      return;
    }
    const followUpId = String(editing.id);
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      try {
        const rows = await ReceivablesService.getFollowUpHistory(followUpId);
        if (!cancelled) {
          const mapped = rows.map(mapFollowUpHistoryRow);
          setHistory(mapped);
          const latest = mapped[mapped.length - 1];
          if (latest?.contactMethod) {
            setContactMethod(latest.contactMethod);
          }
        }
      } catch {
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, editing?.id]);

  const save = async () => {
    if (!customerId) {
      setError("Customer is required.");
      return;
    }
    if (promiseToPayDate && nextFollowUpDate && promiseToPayDate < nextFollowUpDate) {
      // allow — no strict validation required
    }
    setSaving(true);
    setError("");
    try {
      const assignedToId = isUuid(assignedTo) ? assignedTo : null;
      const contactMethodPayload = contactMethod || null;
      if (editing?.id) {
        await ReceivablesService.updateFollowUp(String(editing.id), {
          status: mapFollowUpStatusToApi(status),
          nextFollowUpDate: nextFollowUpDate || null,
          promisedPaymentDate: promiseToPayDate || null,
          assignedTo: assignedToId,
          remarks: remarks || null,
          contactMethod: contactMethodPayload,
        });
      } else {
        await ReceivablesService.createFollowUp({
          customerId,
          openItemId: editing?.openItemId ?? null,
          status: mapFollowUpStatusToApi(status),
          nextFollowUpDate: nextFollowUpDate || null,
          promisedPaymentDate: promiseToPayDate || null,
          assignedTo: assignedToId,
          remarks: remarks || null,
          contactMethod: contactMethodPayload,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save follow-up.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="text-sm font-semibold text-foreground">
            {editing ? "Update Follow-up" : "Add Follow-up"}
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {customerName || "Select customer"} · Does not change outstanding or accounting
          </p>
        </DialogHeader>
        <div className="px-4 py-3 space-y-3 max-h-[60vh] overflow-y-auto">
          {!editing && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Customer</Label>
              <Select
                value={customerId || ""}
                onValueChange={(v) => {
                  setCustomerId(v);
                  setCustomerName(customers.find((c) => c.id === v)?.customerName ?? "");
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select customer…" />
                </SelectTrigger>
                <SelectContent>
                  {selectableCustomers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.customerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as CollectionFollowUpStatus)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FOLLOW_UP_STATUS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Contact Method</Label>
            <Select
              value={contactMethod || "none"}
              onValueChange={(v) =>
                setContactMethod(v === "none" ? "" : (v as ApiFollowUpContactMethod))
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select contact method…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {FOLLOW_UP_CONTACT_METHOD.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Next Follow-up Date</Label>
              <Input
                type="date"
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Promised Payment Date</Label>
              <Input
                type="date"
                value={promiseToPayDate}
                onChange={(e) => setPromiseToPayDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Assigned To</Label>
            <Input
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Remarks</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
          {(historyLoading || history.length > 0) && (
            <div className="rounded-lg border border-border bg-muted/20 p-2.5 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Collection History
              </p>
              {historyLoading ? (
                <p className="text-[11px] text-muted-foreground">Loading history…</p>
              ) : (
                history.slice(0, 6).map((h) => {
                  const methodLabel = contactMethodLabel(h.contactMethod);
                  const statusLabel =
                    FOLLOW_UP_STATUS.find((s) => s.value === h.status)?.label ?? h.status;
                  const detail = [statusLabel, methodLabel, h.remarks || ""]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                  <div key={h.id} className="text-[11px] flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">{formatReportDate(h.date)}</span>
                    <span className="font-medium truncate text-right">
                      {detail || "—"}
                    </span>
                  </div>
                  );
                })
              )}
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <DialogFooter className="px-4 py-3 border-t border-border bg-muted/20">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => void save()}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Follow-up"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryTable({
  rows,
  totalRecords,
  loading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onFollowUp,
  activeFollowUpCustomerIds,
}: {
  rows: ApiCustomerOutstandingRow[];
  totalRecords: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onFollowUp: (row: ApiCustomerOutstandingRow) => void;
  activeFollowUpCustomerIds: Set<string>;
}) {
  const router = useRouter();
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows(rows);

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  const columns: AccountsRichColumnDef<ApiCustomerOutstandingRow>[] = useMemo(
    () => [
      {
        key: "customerName",
        label: "Customer",
        filterType: "text",
        render: (r) => (
          <div className="min-w-0 py-0.5">
            <p className="text-sm font-semibold leading-snug line-clamp-1 text-foreground" title={r.customerName}>
              {r.customerName}
            </p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {r.customerCode}
              {r.salesExecutive && r.salesExecutive !== "—" ? ` · ${r.salesExecutive}` : ""}
            </p>
          </div>
        ),
      },
      {
        key: "outstanding",
        label: "Outstanding Amount",
        align: "right",
        filterType: "amount",
        render: (r) => <AmountCell amount={r.outstanding} className="font-semibold" />,
      },
      {
        key: "notDueAmount",
        label: "Not Due",
        align: "right",
        filterType: "amount",
        render: (r) => <AmountCell amount={r.notDueAmount} />,
      },
      {
        key: "overdueAmount",
        label: "Overdue",
        align: "right",
        filterType: "amount",
        render: (r) => <AmountCell amount={r.overdueAmount} />,
      },
      {
        key: "oldestDueDate",
        label: "Oldest Due",
        filterType: "date",
        render: (r) => (
          <span className="text-xs whitespace-nowrap">{formatReportDate(r.oldestDueDate)}</span>
        ),
      },
      {
        key: "lastReceiptDate",
        label: "Last Receipt",
        filterType: "date",
        render: (r) => (
          <span className="text-xs whitespace-nowrap">{formatReportDate(r.lastReceiptDate)}</span>
        ),
      },
      {
        key: "status",
        label: "Status",
        filterType: "status",
        render: (r) => {
          const badge = receivableStatusToBadge(r.status);
          return <StatusBadge status={badge.status} label={badge.label} size="sm" showDot />;
        },
      },
      {
        key: "_actions",
        label: "Actions",
        sortable: false,
        filterable: false,
        align: "right",
        className: accountsActionColClass("multi"),
        render: (r) => (
          <AccountsTableActionCell variant="multi">
            <AccountsViewAction
              title="View invoices"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/accounts/receivables/outstanding/${r.customerId}`);
              }}
            />
            <button
              type="button"
              title={
                activeFollowUpCustomerIds.has(String(r.customerId))
                  ? "Update follow-up"
                  : "Add follow-up"
              }
              className="p-1.5 hover:bg-muted rounded-md transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onFollowUp(r);
              }}
            >
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </AccountsTableActionCell>
        ),
      },
    ],
    [router, onFollowUp, activeFollowUpCustomerIds],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AccountsTableScroll>
        {loading && rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Loading customer summary…
          </div>
        ) : (
          <AccountsRichTable
            columns={columns}
            rows={visible}
            minWidth={1100}
            getRowKey={(r) => String(r.customerId)}
            emptyMessage="No customers with outstanding balances."
            onRowClick={(r) =>
              router.push(`/accounts/receivables/outstanding/${r.customerId}`)
            }
          />
        )}
      </AccountsTableScroll>
      {totalRecords > 0 && (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}

function InvoiceTable({
  rows,
  totalRecords,
  loading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  rows: ApiInvoiceOutstandingRow[];
  totalRecords: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const router = useRouter();
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows(rows);

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  const columns: AccountsRichColumnDef<ApiInvoiceOutstandingRow>[] = useMemo(
    () => [
      {
        key: "customerName",
        label: "Customer",
        filterType: "text",
        render: (r) => (
          <span className="text-xs font-medium leading-snug line-clamp-2">{r.customerName}</span>
        ),
      },
      {
        key: "invoiceNo",
        label: "Invoice No.",
        filterType: "text",
        render: (r) => (
          <span className="text-xs font-mono font-semibold text-brand-700">{r.invoiceNo}</span>
        ),
      },
      {
        key: "invoiceDate",
        label: "Invoice Date",
        filterType: "date",
        render: (r) => (
          <span className="text-xs whitespace-nowrap">{formatReportDate(r.invoiceDate)}</span>
        ),
      },
      {
        key: "dueDate",
        label: "Due Date",
        filterType: "date",
        render: (r) => (
          <span className="text-xs whitespace-nowrap">{formatReportDate(r.dueDate)}</span>
        ),
      },
      {
        key: "invoiceAmount",
        label: "Invoice Amount",
        align: "right",
        filterType: "amount",
        render: (r) => <AmountCell amount={r.invoiceAmount} />,
      },
      {
        key: "receivedAmount",
        label: "Received",
        align: "right",
        filterType: "amount",
        render: (r) => <AmountCell amount={r.receivedAmount} />,
      },
      {
        key: "outstandingAmount",
        label: "Outstanding",
        align: "right",
        filterType: "amount",
        render: (r) => <AmountCell amount={r.outstandingAmount} className="font-semibold" />,
      },
      {
        key: "overdueDays",
        label: "Overdue Days",
        align: "right",
        filterType: "number",
        render: (r) => (
          <span className="text-xs tabular-nums">
            {r.outstandingAmount > 0 ? r.overdueDays : "—"}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        filterType: "status",
        render: (r) => {
          const badge = receivableStatusToBadge(r.status);
          return <StatusBadge status={badge.status} label={badge.label} size="sm" showDot />;
        },
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AccountsTableScroll>
        {loading && rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Loading invoices…
          </div>
        ) : (
          <AccountsRichTable
            columns={columns}
            rows={visible}
            minWidth={1100}
            getRowKey={(r) => r.openItemId}
            emptyMessage="No open invoices."
            onRowClick={(r) =>
              router.push(`/accounts/receivables/outstanding/invoice/${r.openItemId}`)
            }
          />
        )}
      </AccountsTableScroll>
      {totalRecords > 0 && (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}

function AgeingTable({
  columns,
  rows,
  totalRecords,
  loading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  columns: AccountsRichColumnDef<ApiCustomerAgeingRow>[];
  rows: ApiCustomerAgeingRow[];
  totalRecords: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const router = useRouter();
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows(rows);

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AccountsTableScroll>
        {loading && rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Loading ageing data…
          </div>
        ) : (
          <AccountsRichTable
            columns={columns}
            rows={visible}
            minWidth={1280}
            getRowKey={(r) => String(r.customerId)}
            emptyMessage="No ageing balances."
            onRowClick={(r) => router.push(`/accounts/receivables/outstanding/${r.customerId}`)}
          />
        )}
      </AccountsTableScroll>
      {totalRecords > 0 && (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}

function CollectionTable({
  rows,
  totalRecords,
  loading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
}: {
  rows: ApiCollectionFollowUpRow[];
  totalRecords: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onEdit: (row: ApiCollectionFollowUpRow) => void;
}) {
  const router = useRouter();
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows(rows);

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  const columns: AccountsRichColumnDef<ApiCollectionFollowUpRow>[] = useMemo(
    () => [
      {
        key: "customerName",
        label: "Customer",
        filterType: "text",
        render: (r) => (
          <button
            type="button"
            className="text-xs font-medium text-brand-700 hover:underline text-left"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/accounts/receivables/outstanding/${r.customerId}`);
            }}
          >
            {r.customerName}
          </button>
        ),
      },
      {
        key: "invoiceNo",
        label: "Invoice",
        filterType: "text",
        render: (r) => (
          <span className="text-xs font-mono text-muted-foreground">{r.invoiceNo || "—"}</span>
        ),
      },
      {
        key: "outstandingAmount",
        label: "Outstanding",
        align: "right",
        filterType: "amount",
        render: (r) => <AmountCell amount={r.outstandingAmount} className="font-semibold" />,
      },
      {
        key: "status",
        label: "Follow-up",
        filterType: "status",
        render: (r) => {
          const badge = collectionStatusToBadge(r.status);
          return <StatusBadge status={badge.status} label={badge.label} size="sm" showDot />;
        },
      },
      {
        key: "promiseToPayDate",
        label: "Promised Payment",
        filterType: "date",
        render: (r) => (
          <span className="text-xs whitespace-nowrap">
            {formatReportDate(r.promiseToPayDate || "—")}
          </span>
        ),
      },
      {
        key: "nextFollowUpDate",
        label: "Next Follow-up",
        filterType: "date",
        render: (r) => (
          <span className="text-xs whitespace-nowrap">
            {formatReportDate(r.nextFollowUpDate || "—")}
          </span>
        ),
      },
      {
        key: "remarks",
        label: "Remarks",
        filterType: "text",
        render: (r) => (
          <span className="text-xs text-muted-foreground line-clamp-1" title={r.remarks}>
            {r.remarks || "—"}
          </span>
        ),
      },
      {
        key: "_actions",
        label: "Actions",
        sortable: false,
        filterable: false,
        align: "right",
        className: accountsActionColClass("single"),
        render: (r) => (
          <AccountsTableActionCell variant="single">
            <button
              type="button"
              title="Update follow-up"
              className="p-1.5 hover:bg-muted rounded-md transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(r);
              }}
            >
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </AccountsTableActionCell>
        ),
      },
    ],
    [router, onEdit],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AccountsTableScroll>
        {loading && rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Loading follow-ups…
          </div>
        ) : (
          <AccountsRichTable
            columns={columns}
            rows={visible}
            minWidth={1100}
            getRowKey={(r) => String(r.id)}
            emptyMessage="No collection follow-ups yet. Use Add Follow-up."
            onRowClick={onEdit}
          />
        )}
      </AccountsTableScroll>
      {totalRecords > 0 && (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}

export default function CustomerOutstandingClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sectionRefresh = useAccountsSectionRefresh("receivables");
  const { toast, showCreated, showUpdated, showExportCompleted, showToast, dismissToast } = useAccountsToast();
  const [exporting, setExporting] = useState(false);

  const [view, setView] = useState<WorkspaceView>(() =>
    resolveInitialView(new URLSearchParams(searchParams.toString())),
  );
  const [asOnDate, setAsOnDate] = useState(defaultAsOnDate());
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState("all");
  const [salesperson, setSalesperson] = useState("all");
  const [dueStatus, setDueStatus] = useState<DueStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [appliedBreakpoints, setAppliedBreakpoints] =
    useState<AgeingBreakpoints>(DEFAULT_AGEING_BREAKPOINTS);
  const [breakpointDraft, setBreakpointDraft] = useState(() =>
    breakpointsToDraft(DEFAULT_AGEING_BREAKPOINTS),
  );
  const [breakpointError, setBreakpointError] = useState<string | null>(null);
  const [followUpTarget, setFollowUpTarget] = useState<{
    customerId: string;
    customerName: string;
    editing?: ApiCollectionFollowUpRow | null;
  } | null>(null);
  const [activeFollowUpsByCustomerId, setActiveFollowUpsByCustomerId] = useState<
    Record<string, ApiCollectionFollowUpRow>
  >({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [customers, setCustomers] = useState<{ id: string; customerName: string }[]>([]);

  useEffect(() => {
    setView(resolveInitialView(new URLSearchParams(searchParams.toString())));
  }, [searchParams]);

  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [sectionRefresh]);

  const refreshActiveFollowUps = useCallback(async () => {
    try {
      const res = await ReceivablesService.getFollowUps({ page: 1, page_size: 100 });
      const map: Record<string, ApiCollectionFollowUpRow> = {};
      for (const row of (res.data ?? []).map(mapFollowUpRow)) {
        map[row.customerId] = row;
      }
      setActiveFollowUpsByCustomerId(map);
    } catch {
      setActiveFollowUpsByCustomerId({});
    }
  }, []);

  useEffect(() => {
    void refreshActiveFollowUps();
  }, [refreshKey, refreshActiveFollowUps]);

  const activeFollowUpCustomerIds = useMemo(
    () => new Set(Object.keys(activeFollowUpsByCustomerId)),
    [activeFollowUpsByCustomerId],
  );

  const customersWithoutActiveFollowUp = useMemo(
    () => customers.filter((c) => !activeFollowUpsByCustomerId[c.id]),
    [customers, activeFollowUpsByCustomerId],
  );

  const openFollowUpForCustomer = useCallback(
    (customerId: string, customerName: string) => {
      setFollowUpTarget({
        customerId,
        customerName,
        editing: activeFollowUpsByCustomerId[customerId] ?? null,
      });
    },
    [activeFollowUpsByCustomerId],
  );

  const setWorkspaceView = useCallback(
    (next: WorkspaceView) => {
      setView(next);
      setPage(1);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("tab");
      if (next === "summary") params.delete("view");
      else params.set("view", next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await CustomerListService.dropdown();
        if (cancelled) return;
        setCustomers(
          items.map((c) => ({
            id: c.customer_id,
            customerName: c.customer_name,
          })),
        );
      } catch {
        if (!cancelled) setCustomers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleSortChange = useCallback((key: string, dir: "asc" | "desc") => {
    setSortKey(key);
    setSortDir(dir);
    setPage(1);
  }, []);

  const {
    loading,
    error,
    total,
    summaryRows,
    invoiceRows,
    ageingRows,
    collectionRows,
    resolvedSalespersonId,
  } = useReceivablesListing({
    view,
    asOnDate,
    search,
    customerId,
    salesperson: salesperson !== "all" ? salesperson : undefined,
    dueStatus,
    page,
    pageSize,
    sortKey,
    sortDir,
    appliedBreakpoints,
    refreshKey,
  });

  const salespersonOptions = useMemo(() => {
    const names = new Set<string>();
    for (const row of summaryRows) {
      if (row.salesExecutive && row.salesExecutive !== "—") {
        names.add(row.salesExecutive);
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [summaryRows]);

  const pendingAllocations = useMemo(() => {
    void refreshKey;
    return computeReceiptAllocationSummary().pendingAllocationCount;
  }, [refreshKey, sectionRefresh]);

  const bucketLabels = useMemo(
    () => getAgeingBucketLabels(appliedBreakpoints),
    [appliedBreakpoints],
  );
  /** Always show every standard bucket column (incl. zeros) — professional AR ageing layout. */
  const ageingBucketIndices = useMemo(
    () => appliedBreakpoints.map((_, index) => index),
    [appliedBreakpoints],
  );

  const ageingColumns: AccountsRichColumnDef<ApiCustomerAgeingRow>[] = useMemo(() => {
    const bucketCount = ageingBucketIndices.length;
    const bucketColumns: AccountsRichColumnDef<ApiCustomerAgeingRow>[] = ageingBucketIndices.map(
      (index) => ({
        key: ageingBucketColumnKey(index),
        label: bucketLabels[index] ?? "",
        align: "right" as const,
        filterType: "amount" as const,
        className: "min-w-[120px]",
        render: (r: ApiCustomerAgeingRow) => {
          const amount = r.buckets[index] ?? 0;
          const isOldest = index === bucketCount - 1;
          const isLate = index === bucketCount - 2;
          return (
            <AmountCell
              amount={amount}
              className={cn(
                amount > 0 && isOldest && "font-semibold text-red-600",
                amount > 0 && isLate && "font-semibold text-brand-700",
              )}
            />
          );
        },
      }),
    );
    return [
      {
        key: "customerName",
        label: "Customer Name",
        filterType: "text",
        className: "min-w-[200px]",
        render: (r) => (
          <Link
            href={`/accounts/receivables/outstanding/${r.customerId}`}
            className="text-sm font-semibold text-brand-700 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {r.customerName}
          </Link>
        ),
      },
      {
        key: "totalOutstanding",
        label: "Total Outstanding",
        align: "right",
        filterType: "amount",
        className: "min-w-[140px]",
        render: (r) => <AmountCell amount={r.totalOutstanding} className="font-semibold text-sm" />,
      },
      ...bucketColumns,
    ];
  }, [bucketLabels, ageingBucketIndices]);

  const hasFilters =
    search.trim() !== "" ||
    customerId !== "all" ||
    salesperson !== "all" ||
    dueStatus !== "all";

  const clearFilters = () => {
    setSearch("");
    setCustomerId("all");
    setSalesperson("all");
    setDueStatus("all");
  };

  const getSummaryCell = useCallback((row: ApiCustomerOutstandingRow, key: string) => {
    if (key === "status") return row.status;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const getInvoiceCell = useCallback((row: ApiInvoiceOutstandingRow, key: string) => {
    if (key === "overdueDays") return row.outstandingAmount > 0 ? row.overdueDays : 0;
    if (key === "status") return row.status;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const getAgeingCell = useCallback((row: ApiCustomerAgeingRow, key: string) => {
    const bucketMatch = /^bucket_(\d+)$/.exec(key);
    if (bucketMatch) return row.buckets[Number(bucketMatch[1])] ?? 0;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const buildExportQuery = useCallback(() => {
    const viewMap: Record<WorkspaceView, ReceivablesExportView> = {
      summary: "summary",
      invoice: "invoice",
      ageing: "ageing",
      collection: "follow-ups",
    };
    const sortMap =
      view === "summary"
        ? SUMMARY_SORT_KEY_TO_API
        : view === "invoice"
          ? INVOICE_SORT_KEY_TO_API
          : view === "ageing"
            ? AGING_SORT_KEY_TO_API
            : FOLLOW_UP_SORT_KEY_TO_API;
    const apiSort = sortKey ? sortMap[sortKey] : undefined;
    return {
      view: viewMap[view],
      search: search.trim() || undefined,
      customerId: customerId !== "all" ? customerId : undefined,
      salespersonId: resolvedSalespersonId,
      asOfDate: asOnDate,
      dueStatus,
      excludeZeroBalance: true,
      agingBreakpoints: appliedBreakpoints.join(","),
      sortBy: apiSort,
      sortOrder: apiSort ? sortDir : undefined,
    };
  }, [
    view,
    search,
    customerId,
    resolvedSalespersonId,
    asOnDate,
    dueStatus,
    appliedBreakpoints,
    sortKey,
    sortDir,
  ]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await ReceivablesService.exportExcel(buildExportQuery());
      showExportCompleted();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to export receivables.", "error");
    } finally {
      setExporting(false);
    }
  };

  const handlePdf = async () => {
    setExporting(true);
    try {
      await ReceivablesService.exportPdf(buildExportQuery());
      showExportCompleted();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to export receivables.", "error");
    } finally {
      setExporting(false);
    }
  };

  const getCollectionCell = useCallback((row: ApiCollectionFollowUpRow, key: string) => {
    if (key === "status") return row.status;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const providerRows =
    view === "summary"
      ? summaryRows
      : view === "invoice"
        ? invoiceRows
        : view === "collection"
          ? collectionRows
          : ageingRows;

  const columnConfig: AccountsColumnFilterConfig =
    view === "summary"
      ? {
          customerName: { type: "text" },
          outstanding: { type: "amount" },
          notDueAmount: { type: "amount" },
          overdueAmount: { type: "amount" },
          oldestDueDate: { type: "date" },
          lastReceiptDate: { type: "date" },
          status: RECEIVABLE_STATUS_COLUMN_FILTER,
        }
      : view === "invoice"
        ? {
            customerName: { type: "text" },
            invoiceNo: { type: "text" },
            invoiceDate: { type: "date" },
            dueDate: { type: "date" },
            invoiceAmount: { type: "amount" },
            receivedAmount: { type: "amount" },
            outstandingAmount: { type: "amount" },
            overdueDays: { type: "number" },
            status: RECEIVABLE_STATUS_COLUMN_FILTER,
          }
        : view === "collection"
          ? {
              customerName: { type: "text" },
              invoiceNo: { type: "text" },
              outstandingAmount: { type: "amount" },
              status: COLLECTION_FOLLOWUP_STATUS_COLUMN_FILTER,
              promiseToPayDate: { type: "date" },
              nextFollowUpDate: { type: "date" },
              remarks: { type: "text" },
            }
          : {
              customerName: { type: "text" },
              totalOutstanding: { type: "amount" },
              ...Object.fromEntries(
                ageingBucketIndices.map((i) => [
                  ageingBucketColumnKey(i),
                  { type: "amount" as const },
                ]),
              ),
            };

  const getCellValue =
    view === "summary"
      ? getSummaryCell
      : view === "invoice"
        ? getInvoiceCell
        : view === "collection"
          ? getCollectionCell
          : getAgeingCell;

  const defaultSortKey =
    view === "summary"
      ? "outstanding"
      : view === "invoice"
        ? "invoiceDate"
        : view === "collection"
          ? "nextFollowUpDate"
          : "totalOutstanding";

  return (
    <AccountsColumnFilterProvider
      rows={providerRows as never[]}
      getCellValue={getCellValue as never}
      columnConfig={columnConfig}
      defaultSortKey={defaultSortKey}
      defaultSortDir="desc"
    >
      <ReceivablesListSortSync
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={handleSortChange}
      />
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Receivables", "Customer Outstanding")}
        title="Customer Outstanding"
        description="Customer-wise outstanding, invoices, ageing, and collection follow-up."
        hideDescription={false}
        actions={
          <div className="flex items-center gap-2">
            {pendingAllocations > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium gap-1.5 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                onClick={() => router.push("/accounts/receivables/receipt-allocation")}
              >
                Pending Receipt Allocations ({pendingAllocations})
              </Button>
            )}
            {view === "collection" && (
              <Button
                size="sm"
                className="h-8 text-xs font-medium gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
                disabled={customersWithoutActiveFollowUp.length === 0}
                onClick={() => {
                  const selected =
                    customerId !== "all"
                      ? customers.find((c) => String(c.id) === customerId)
                      : undefined;
                  if (selected && activeFollowUpsByCustomerId[selected.id]) {
                    openFollowUpForCustomer(selected.id, selected.customerName);
                    return;
                  }
                  const firstAvailable = selected
                    ? activeFollowUpsByCustomerId[selected.id]
                      ? undefined
                      : selected
                    : customersWithoutActiveFollowUp[0];
                  setFollowUpTarget({
                    customerId: firstAvailable?.id ?? "",
                    customerName: firstAvailable?.customerName ?? "",
                    editing: null,
                  });
                }}
              >
                <Plus className="w-3.5 h-3.5" /> Add Follow-up
              </Button>
            )}
          </div>
        }
        filters={
          <ReportFilterRow
            end={
              <AccountsExportMenu
                onExcel={() => void handleExport()}
                onPdf={() => void handlePdf()}
                disabled={loading || exporting}
              />
            }
          >
            <ReportSearchFilter
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder={
                view === "invoice"
                  ? "Search invoice, customer…"
                  : view === "collection"
                    ? "Search follow-ups…"
                    : "Search customer…"
              }
            />
            <ReportCustomerFilter
              value={customerId}
              onChange={(v) => {
                setCustomerId(v);
                setPage(1);
              }}
              customers={customers}
            />
            {view !== "collection" && (
              <ReportSalespersonFilter
                value={salesperson}
                onChange={(v) => {
                  setSalesperson(v);
                  setPage(1);
                }}
                salespeople={salespersonOptions}
              />
            )}
            {view !== "ageing" && view !== "collection" && (
              <Select
                value={dueStatus}
                onValueChange={(v) => {
                  setDueStatus(v as DueStatusFilter);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue placeholder="Due status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="not_due">Not Due</SelectItem>
                </SelectContent>
              </Select>
            )}
            {view !== "collection" && (
              <ReportAsOnDateFilter
                value={asOnDate}
                onChange={(v) => {
                  setAsOnDate(v);
                  setPage(1);
                }}
              />
            )}
            <ReportFilterResetButton
              showOnlyWhenActive
              active={hasFilters}
              onClick={clearFilters}
            />
          </ReportFilterRow>
        }
        layout="split"
        className="h-full min-h-0"
      >
        <AccountsListingTableCard className="flex flex-col flex-1 min-h-0">
          {error ? (
            <div className="px-4 py-3 text-xs text-red-600 bg-red-50 border-b border-red-100">
              {error}
            </div>
          ) : null}
          <AccountsListingTabsRow className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border/70">
            <SectionTabs
              tabs={VIEW_TABS}
              active={view}
              onChange={(id) => setWorkspaceView(id as WorkspaceView)}
            />
            {view === "ageing" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 shrink-0">
                    <Settings2 className="w-3.5 h-3.5" /> Ageing buckets
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[340px] p-3">
                  <AgeingBreakpointPanel
                    draft={breakpointDraft}
                    onDraftChange={setBreakpointDraft}
                    onApply={(bp) => {
                      setAppliedBreakpoints(bp);
                      setPage(1);
                    }}
                    error={breakpointError}
                    onErrorChange={setBreakpointError}
                  />
                </PopoverContent>
              </Popover>
            )}
          </AccountsListingTabsRow>
          {view === "summary" && (
            <SummaryTable
              rows={summaryRows}
              totalRecords={total}
              loading={loading}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              onFollowUp={(r) =>
                openFollowUpForCustomer(String(r.customerId), r.customerName)
              }
              activeFollowUpCustomerIds={activeFollowUpCustomerIds}
            />
          )}
          {view === "invoice" && (
            <InvoiceTable
              rows={invoiceRows}
              totalRecords={total}
              loading={loading}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          )}
          {view === "ageing" && (
            <AgeingTable
              columns={ageingColumns}
              rows={ageingRows}
              totalRecords={total}
              loading={loading}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          )}
          {view === "collection" && (
            <CollectionTable
              rows={collectionRows}
              totalRecords={total}
              loading={loading}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              onEdit={(row) => openFollowUpForCustomer(String(row.customerId), row.customerName)}
            />
          )}
        </AccountsListingTableCard>
      </AccountsPageShell>

      {followUpTarget && (
        <FollowUpDialog
          open={!!followUpTarget}
          customerId={followUpTarget.customerId}
          customerName={followUpTarget.customerName}
          editing={followUpTarget.editing}
          customers={customers}
          selectableCustomers={customersWithoutActiveFollowUp}
          onClose={() => setFollowUpTarget(null)}
          onSaved={() => {
            setRefreshKey((k) => k + 1);
            void refreshActiveFollowUps();
            if (followUpTarget.editing) {
              showUpdated("Follow-up");
            } else {
              showCreated("Follow-up");
            }
          }}
        />
      )}
      <AccountsToast toast={toast} onDismiss={dismissToast} />
    </AccountsColumnFilterProvider>
  );
}
