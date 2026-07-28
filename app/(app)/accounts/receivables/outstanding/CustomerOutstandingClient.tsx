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
  computeCustomerOutstanding,
  computeInvoiceOutstanding,
  computeCustomerAgeingRows,
  computeReceiptAllocationSummary,
  createCollectionFollowUp,
  updateCollectionFollowUp,
  loadCollectionFollowUps,
  loadCollectionFollowUpHistory,
  type CustomerOutstandingRow,
  type InvoiceOutstandingRow,
  type CustomerAgeingRow,
  type CollectionFollowUp,
  type CollectionFollowUpStatus,
} from "@/lib/accounts/receivables-data";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { formatMoneyNumber, MONEY_CELL_CLASS } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
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
import {
  exportReceivablesToExcel,
  exportReceivablesToPdf,
  formatExportAmount,
  formatExportStatus,
} from "../receivables-export";

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

function FollowUpDialog({
  open,
  customerId: initialCustomerId,
  customerName: initialCustomerName,
  editing,
  customers,
  onClose,
  onSaved,
}: {
  open: boolean;
  customerId: number;
  customerName: string;
  editing?: CollectionFollowUp | null;
  customers: { id: number; customerName: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [customerName, setCustomerName] = useState(initialCustomerName);

  const history = useMemo(() => {
    if (!open) return [];
    const targetId =
      editing?.id ??
      loadCollectionFollowUps()
        .filter((f) => f.customerId === customerId)
        .sort((a, b) => b.followUpDate.localeCompare(a.followUpDate))[0]?.id;
    return targetId ? loadCollectionFollowUpHistory(targetId) : [];
  }, [customerId, editing, open]);

  const [status, setStatus] = useState<CollectionFollowUpStatus>("follow_up_scheduled");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [promiseToPayDate, setPromiseToPayDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [assignedTo, setAssignedTo] = useState("Collection Desk");
  const [error, setError] = useState("");

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
      setAssignedTo(editing.assignedTo || "Collection Desk");
    } else {
      setStatus("follow_up_scheduled");
      setNextFollowUpDate(new Date().toISOString().slice(0, 10));
      setPromiseToPayDate("");
      setRemarks("");
      setAssignedTo("Collection Desk");
    }
  }, [open, editing, initialCustomerId, initialCustomerName]);

  const save = () => {
    if (!customerId) {
      setError("Customer is required.");
      return;
    }
    const payload = {
      customerId,
      invoiceId: editing?.invoiceId ?? null,
      followUpDate: new Date().toISOString().slice(0, 10),
      assignedTo,
      status,
      remarks,
      nextFollowUpDate,
      promiseToPayDate: promiseToPayDate || undefined,
    };
    const err = editing
      ? updateCollectionFollowUp(editing.id, payload)
      : createCollectionFollowUp(payload);
    if (err) {
      setError(err);
      return;
    }
    onSaved();
    onClose();
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
                value={customerId ? String(customerId) : ""}
                onValueChange={(v) => {
                  const id = Number(v);
                  setCustomerId(id);
                  setCustomerName(customers.find((c) => c.id === id)?.customerName ?? "");
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select customer…" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
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
          {history.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/20 p-2.5 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Collection History
              </p>
              {history.slice(0, 6).map((h) => (
                <div key={h.id} className="text-[11px] flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">{formatReportDate(h.date)}</span>
                  <span className="font-medium truncate text-right">
                    {FOLLOW_UP_STATUS.find((s) => s.value === h.status)?.label ?? h.status}
                    {h.remarks ? ` · ${h.remarks}` : ""}
                  </span>
                </div>
              ))}
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
            onClick={save}
          >
            Save Follow-up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryTable({
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onFollowUp,
}: {
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onFollowUp: (row: CustomerOutstandingRow) => void;
}) {
  const router = useRouter();
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows<CustomerOutstandingRow>([]);
  const paged = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  const columns: AccountsRichColumnDef<CustomerOutstandingRow>[] = useMemo(
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
              title="Add follow-up"
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
    [router, onFollowUp],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AccountsTableScroll>
        <AccountsRichTable
          columns={columns}
          rows={paged}
          minWidth={1100}
          getRowKey={(r) => r.customerId}
          emptyMessage="No customers with outstanding balances."
          onRowClick={(r) => router.push(`/accounts/receivables/outstanding/${r.customerId}`)}
        />
      </AccountsTableScroll>
      {visible.length > 0 && (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={visible.length}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}

function InvoiceTable({
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const router = useRouter();
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows<InvoiceOutstandingRow>([]);
  const paged = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  const columns: AccountsRichColumnDef<InvoiceOutstandingRow>[] = useMemo(
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
        <AccountsRichTable
          columns={columns}
          rows={paged}
          minWidth={1100}
          getRowKey={(r) => r.invoiceId}
          emptyMessage="No open invoices."
          onRowClick={(r) =>
            router.push(`/accounts/receivables/outstanding/invoice/${r.invoiceId}`)
          }
        />
      </AccountsTableScroll>
      {visible.length > 0 && (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={visible.length}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}

function AgeingTable({
  columns,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  columns: AccountsRichColumnDef<CustomerAgeingRow>[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const router = useRouter();
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows<CustomerAgeingRow>([]);
  const paged = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AccountsTableScroll>
        <AccountsRichTable
          columns={columns}
          rows={paged}
          minWidth={1280}
          getRowKey={(r) => r.customerId}
          emptyMessage="No ageing balances."
          onRowClick={(r) => router.push(`/accounts/receivables/outstanding/${r.customerId}`)}
        />
      </AccountsTableScroll>
      {visible.length > 0 && (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={visible.length}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}

function CollectionTable({
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
}: {
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onEdit: (row: CollectionFollowUp) => void;
}) {
  const router = useRouter();
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows<CollectionFollowUp>([]);
  const paged = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  const columns: AccountsRichColumnDef<CollectionFollowUp>[] = useMemo(
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
        <AccountsRichTable
          columns={columns}
          rows={paged}
          minWidth={1100}
          getRowKey={(r) => r.id}
          emptyMessage="No collection follow-ups yet. Use Add Follow-up."
          onRowClick={onEdit}
        />
      </AccountsTableScroll>
      {visible.length > 0 && (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={visible.length}
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
  const { toast, showCreated, dismissToast } = useAccountsToast();

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
    customerId: number;
    customerName: string;
    editing?: CollectionFollowUp | null;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setView(resolveInitialView(new URLSearchParams(searchParams.toString())));
  }, [searchParams]);

  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [sectionRefresh]);

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

  const customers = useMemo(() => loadCustomers(), [refreshKey]);
  const salespersonOptions = useMemo(() => {
    const names = new Set<string>();
    for (const c of customers) {
      if (c.salesManName?.trim()) names.add(c.salesManName.trim());
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [customers]);

  const pendingAllocations = useMemo(() => {
    void refreshKey;
    return computeReceiptAllocationSummary().pendingAllocationCount;
  }, [refreshKey, sectionRefresh]);

  const summaryRows = useMemo(() => {
    void refreshKey;
    let rows = computeCustomerOutstanding(asOnDate).filter((r) => r.outstanding > 0.009);
    if (customerId !== "all") rows = rows.filter((r) => String(r.customerId) === customerId);
    if (salesperson !== "all") rows = rows.filter((r) => r.salesExecutive === salesperson);
    if (dueStatus === "overdue") rows = rows.filter((r) => r.overdueAmount > 0.009);
    if (dueStatus === "not_due") {
      rows = rows.filter((r) => r.notDueAmount > 0.009 && r.overdueAmount <= 0.009);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.customerName.toLowerCase().includes(q) ||
          r.customerCode.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [asOnDate, customerId, salesperson, dueStatus, search, refreshKey, sectionRefresh]);

  const invoiceRows = useMemo(() => {
    void refreshKey;
    let rows = computeInvoiceOutstanding(asOnDate).filter((r) => r.outstandingAmount > 0.009);
    if (customerId !== "all") rows = rows.filter((r) => String(r.customerId) === customerId);
    if (salesperson !== "all") {
      const custIds = new Set(
        customers
          .filter((c) => c.salesManName?.trim() === salesperson)
          .map((c) => c.id),
      );
      rows = rows.filter((r) => custIds.has(r.customerId));
    }
    if (dueStatus === "overdue") rows = rows.filter((r) => r.overdueDays > 0);
    if (dueStatus === "not_due") rows = rows.filter((r) => r.overdueDays <= 0);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.customerName.toLowerCase().includes(q) ||
          r.customerCode.toLowerCase().includes(q) ||
          r.invoiceNo.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [
    asOnDate,
    customerId,
    salesperson,
    dueStatus,
    search,
    customers,
    refreshKey,
    sectionRefresh,
  ]);

  const collectionRows = useMemo(() => {
    void refreshKey;
    let rows = loadCollectionFollowUps().filter((r) => r.status !== "closed");
    if (customerId !== "all") rows = rows.filter((r) => String(r.customerId) === customerId);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.customerName.toLowerCase().includes(q) ||
          (r.invoiceNo || "").toLowerCase().includes(q) ||
          (r.remarks || "").toLowerCase().includes(q),
      );
    }
    return rows.sort((a, b) =>
      (b.nextFollowUpDate || b.followUpDate).localeCompare(a.nextFollowUpDate || a.followUpDate),
    );
  }, [customerId, search, refreshKey, sectionRefresh]);

  const ageingRows = useMemo(() => {
    void refreshKey;
    let rows = computeCustomerAgeingRows(asOnDate, {}, appliedBreakpoints);
    if (customerId !== "all") rows = rows.filter((r) => String(r.customerId) === customerId);
    if (salesperson !== "all") rows = rows.filter((r) => r.salesExecutive === salesperson);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.customerName.toLowerCase().includes(q) ||
          r.customerCode.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [
    asOnDate,
    customerId,
    salesperson,
    search,
    appliedBreakpoints,
    refreshKey,
    sectionRefresh,
  ]);

  const bucketLabels = useMemo(
    () => getAgeingBucketLabels(appliedBreakpoints),
    [appliedBreakpoints],
  );
  /** Always show every standard bucket column (incl. zeros) — professional AR ageing layout. */
  const ageingBucketIndices = useMemo(
    () => appliedBreakpoints.map((_, index) => index),
    [appliedBreakpoints],
  );

  const ageingColumns: AccountsRichColumnDef<CustomerAgeingRow>[] = useMemo(() => {
    const bucketCount = ageingBucketIndices.length;
    const bucketColumns: AccountsRichColumnDef<CustomerAgeingRow>[] = ageingBucketIndices.map(
      (index) => ({
        key: ageingBucketColumnKey(index),
        label: bucketLabels[index] ?? "",
        align: "right" as const,
        filterType: "amount" as const,
        className: "min-w-[120px]",
        render: (r: CustomerAgeingRow) => {
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

  const getSummaryCell = useCallback((row: CustomerOutstandingRow, key: string) => {
    if (key === "status") return row.status;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const getInvoiceCell = useCallback((row: InvoiceOutstandingRow, key: string) => {
    if (key === "overdueDays") return row.outstandingAmount > 0 ? row.overdueDays : 0;
    if (key === "status") return row.status;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const getAgeingCell = useCallback((row: CustomerAgeingRow, key: string) => {
    const bucketMatch = /^bucket_(\d+)$/.exec(key);
    if (bucketMatch) return row.buckets[Number(bucketMatch[1])] ?? 0;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const handleExport = async () => {
    if (view === "summary") {
      await exportReceivablesToExcel(
        summaryRows.map((r) => ({
          "Customer Name": r.customerName,
          "Customer Code": r.customerCode,
          "Total Outstanding": formatExportAmount(r.outstanding),
          "Overdue Amount": formatExportAmount(r.overdueAmount),
          "Not Due Amount": formatExportAmount(r.notDueAmount),
          "Oldest Due": r.oldestDueDate,
          "Last Receipt Date": r.lastReceiptDate,
          Status: formatExportStatus(r.status),
        })),
        { reportName: "Customer Outstanding", asOnDate },
        "customer_outstanding",
      );
      return;
    }
    if (view === "invoice") {
      await exportReceivablesToExcel(
        invoiceRows.map((r) => ({
          Customer: r.customerName,
          "Invoice No.": r.invoiceNo,
          "Invoice Date": r.invoiceDate,
          "Due Date": r.dueDate,
          "Invoice Amount": formatExportAmount(r.invoiceAmount),
          Received: formatExportAmount(r.receivedAmount),
          Outstanding: formatExportAmount(r.outstandingAmount),
          Status: formatExportStatus(r.status),
        })),
        { reportName: "Invoice Outstanding", asOnDate },
        "invoice_outstanding",
      );
      return;
    }
    if (view === "collection") {
      await exportReceivablesToExcel(
        collectionRows.map((r) => ({
          Customer: r.customerName,
          Invoice: r.invoiceNo || "—",
          Outstanding: formatExportAmount(r.outstandingAmount),
          Status: FOLLOW_UP_STATUS.find((s) => s.value === r.status)?.label ?? r.status,
          "Promised Payment": r.promiseToPayDate || "—",
          "Next Follow-up": r.nextFollowUpDate || "—",
          Remarks: r.remarks || "—",
          "Assigned To": r.assignedTo || "—",
        })),
        { reportName: "Collection Follow-ups", asOnDate },
        "collection_followups",
      );
      return;
    }
    const exportBucketLabels = ageingBucketIndices.map((i) => bucketLabels[i] ?? "");
    await exportReceivablesToExcel(
      ageingRows.map((r) => {
        const row: Record<string, string | number> = {
          "Customer Name": r.customerName,
          "Total Outstanding": formatExportAmount(r.totalOutstanding),
        };
        ageingBucketIndices.forEach((index) => {
          row[bucketLabels[index] ?? ""] = formatExportAmount(r.buckets[index] ?? 0);
        });
        return row;
      }),
      {
        reportName: "Customer Ageing",
        asOnDate,
        ageingBuckets: exportBucketLabels.join(" · "),
      },
      "customer_ageing",
    );
  };

  const handlePdf = () => {
    if (view === "summary") {
      exportReceivablesToPdf(
        [
          "Customer",
          "Code",
          "Outstanding",
          "Overdue",
          "Not Due",
          "Oldest Due",
          "Last Receipt",
          "Status",
        ],
        summaryRows.map((r) => [
          r.customerName,
          r.customerCode,
          formatExportAmount(r.outstanding),
          formatExportAmount(r.overdueAmount),
          formatExportAmount(r.notDueAmount),
          formatReportDate(r.oldestDueDate),
          formatReportDate(r.lastReceiptDate),
          formatExportStatus(r.status),
        ]),
        { reportName: "Customer Outstanding", asOnDate },
      );
    }
  };

  const getCollectionCell = useCallback((row: CollectionFollowUp, key: string) => {
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

  const columnConfig: Record<string, { type: "text" | "amount" | "date" | "number" | "status" }> =
    view === "summary"
      ? {
          customerName: { type: "text" },
          outstanding: { type: "amount" },
          notDueAmount: { type: "amount" },
          overdueAmount: { type: "amount" },
          oldestDueDate: { type: "date" },
          lastReceiptDate: { type: "date" },
          status: { type: "status" },
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
            status: { type: "status" },
          }
        : view === "collection"
          ? {
              customerName: { type: "text" },
              invoiceNo: { type: "text" },
              outstandingAmount: { type: "amount" },
              status: { type: "status" },
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
                onClick={() => {
                  const selected =
                    customerId !== "all"
                      ? customers.find((c) => String(c.id) === customerId)
                      : undefined;
                  setFollowUpTarget({
                    customerId: selected?.id ?? 0,
                    customerName: selected?.customerName ?? "",
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
                onPdf={handlePdf}
                disabled={providerRows.length === 0}
              />
            }
          >
            <ReportSearchFilter
              value={search}
              onChange={setSearch}
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
              onChange={setCustomerId}
              customers={customers}
            />
            {view !== "collection" && (
              <ReportSalespersonFilter
                value={salesperson}
                onChange={setSalesperson}
                salespeople={salespersonOptions}
              />
            )}
            {view !== "ageing" && view !== "collection" && (
              <Select
                value={dueStatus}
                onValueChange={(v) => setDueStatus(v as DueStatusFilter)}
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
              <ReportAsOnDateFilter value={asOnDate} onChange={setAsOnDate} />
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
                    onApply={setAppliedBreakpoints}
                    error={breakpointError}
                    onErrorChange={setBreakpointError}
                  />
                </PopoverContent>
              </Popover>
            )}
          </AccountsListingTabsRow>
          {view === "summary" && (
            <SummaryTable
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              onFollowUp={(r) =>
                setFollowUpTarget({
                  customerId: r.customerId,
                  customerName: r.customerName,
                  editing: null,
                })
              }
            />
          )}
          {view === "invoice" && (
            <InvoiceTable
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
          {view === "ageing" && (
            <AgeingTable
              columns={ageingColumns}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
          {view === "collection" && (
            <CollectionTable
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              onEdit={(row) =>
                setFollowUpTarget({
                  customerId: row.customerId,
                  customerName: row.customerName,
                  editing: row,
                })
              }
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
          onClose={() => setFollowUpTarget(null)}
          onSaved={() => {
            setRefreshKey((k) => k + 1);
            showCreated("Follow-up");
          }}
        />
      )}
      <AccountsToast toast={toast} onDismiss={dismissToast} />
    </AccountsColumnFilterProvider>
  );
}
