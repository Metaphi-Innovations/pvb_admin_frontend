"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, History } from "lucide-react";
import { AccountsMoreActions } from "@/components/accounts/AccountsTableActions";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import {
  loadCollectionFollowUps,
  loadCollectionFollowUpHistory,
  createCollectionFollowUp,
  updateCollectionFollowUp,
  getPostedSalesInvoices,
  type CollectionFollowUp,
  type CollectionFollowUpStatus,
} from "@/lib/accounts/receivables-data";
import { ensureReceivablesDemoData } from "@/lib/accounts/receivables-demo-seed";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
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
import {
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportCustomerFilter,
  ReportSearchFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import {
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
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
import {
  exportReceivablesToExcel,
  exportReceivablesToPdf,
  formatExportAmount,
} from "../receivables-export";

const STATUS_OPTIONS: { value: CollectionFollowUpStatus; label: string }[] = [
  { value: "not_contacted", label: "Not Contacted" },
  { value: "follow_up_scheduled", label: "Follow-up Scheduled" },
  { value: "promise_to_pay", label: "Promise to Pay" },
  { value: "part_payment_received", label: "Part Payment Received" },
  { value: "escalated", label: "Escalated" },
  { value: "closed", label: "Closed" },
];

const COLLECTION_STATUS_FILTER: { value: CollectionFollowUpStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  ...STATUS_OPTIONS,
];

function formatReportDate(value: string): string {
  if (!value || value === "—") return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}-${m}-${y}`;
}

export default function CollectionTrackingClient() {
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");
  const [customerId, setCustomerId] = useState("all");
  const [collectionStatus, setCollectionStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    ensureReceivablesDemoData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, customerId, collectionStatus, search, pageSize]);

  const records = useMemo(() => loadCollectionFollowUps(), [refreshKey]);
  const customers = useMemo(() => loadCustomers(), []);
  const invoices = useMemo(() => getPostedSalesInvoices(), []);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (customerId !== "all" && String(r.customerId) !== customerId) return false;
      if (dateFrom && r.dueDate && r.dueDate < dateFrom) return false;
      if (dateTo && r.dueDate && r.dueDate > dateTo) return false;
      if (collectionStatus !== "all" && r.status !== collectionStatus) return false;
      const q = search.trim().toLowerCase();
      if (q) {
        const hay = [r.customerName, r.invoiceNo, r.followUpNo, r.assignedTo, r.remarks]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, customerId, dateFrom, dateTo, collectionStatus, search]);

  const pagedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<CollectionFollowUp | null>(null);
  const [editing, setEditing] = useState<CollectionFollowUp | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customerId: "",
    invoiceId: "",
    followUpDate: new Date().toISOString().slice(0, 10),
    assignedTo: "Rajesh Sharma",
    contactPerson: "",
    phone: "",
    promiseToPayDate: "",
    promiseAmount: "",
    status: "not_contacted" as CollectionFollowUpStatus,
    remarks: "",
    nextFollowUpDate: "",
  });

  const historyRows = useMemo(
    () => (historyTarget ? loadCollectionFollowUpHistory(historyTarget.id) : []),
    [historyTarget, refreshKey],
  );

  const openAdd = () => {
    setEditing(null);
    setError("");
    setForm({
      customerId: "",
      invoiceId: "",
      followUpDate: new Date().toISOString().slice(0, 10),
      assignedTo: "Rajesh Sharma",
      contactPerson: "",
      phone: "",
      promiseToPayDate: "",
      promiseAmount: "",
      status: "not_contacted",
      remarks: "",
      nextFollowUpDate: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (row: CollectionFollowUp) => {
    setEditing(row);
    setError("");
    setForm({
      customerId: String(row.customerId),
      invoiceId: row.invoiceId ? String(row.invoiceId) : "",
      followUpDate: row.followUpDate,
      assignedTo: row.assignedTo,
      contactPerson: row.contactPerson,
      phone: row.phone,
      promiseToPayDate: row.promiseToPayDate,
      promiseAmount: row.promiseAmount ? String(row.promiseAmount) : "",
      status: row.status,
      remarks: row.remarks,
      nextFollowUpDate: row.nextFollowUpDate,
    });
    setDialogOpen(true);
  };

  const openHistory = (row: CollectionFollowUp) => {
    setHistoryTarget(row);
    setHistoryOpen(true);
  };

  const customerInvoices = invoices.filter(
    (i) => form.customerId && i.customerId === Number(form.customerId),
  );

  const saveFollowUp = () => {
    const payload = {
      customerId: Number(form.customerId),
      invoiceId: form.invoiceId ? Number(form.invoiceId) : null,
      followUpDate: form.followUpDate,
      assignedTo: form.assignedTo,
      contactPerson: form.contactPerson,
      phone: form.phone,
      promiseToPayDate: form.promiseToPayDate,
      promiseAmount: form.promiseAmount ? Number(form.promiseAmount) : undefined,
      status: form.status,
      remarks: form.remarks,
      nextFollowUpDate: form.nextFollowUpDate,
    };

    const err = editing
      ? updateCollectionFollowUp(editing.id, payload)
      : createCollectionFollowUp(payload);

    if (err) {
      setError(err);
      return;
    }
    setDialogOpen(false);
    setRefreshKey((k) => k + 1);
  };

  const quickStatus = (row: CollectionFollowUp, status: CollectionFollowUpStatus) => {
    updateCollectionFollowUp(row.id, { status });
    setRefreshKey((k) => k + 1);
  };

  const exportMeta = {
    reportName: "Collection Tracking",
    dateFrom,
    dateTo,
    customer:
      customerId === "all"
        ? "All customers"
        : customers.find((c) => String(c.id) === customerId)?.customerName ?? "—",
    status:
      collectionStatus === "all"
        ? "All statuses"
        : COLLECTION_STATUS_FILTER.find((o) => o.value === collectionStatus)?.label ?? "—",
    search,
  };

  const handleExcel = () => {
    void exportReceivablesToExcel(
      filteredRecords.map((r) => ({
        Customer: r.customerName,
        "Invoice No.": r.invoiceNo || "—",
        "Outstanding Amount": formatExportAmount(r.outstandingAmount),
        "Due Date": r.dueDate || "—",
        "Overdue Days": r.dueDate
          ? Math.max(0, Math.floor((Date.now() - new Date(r.dueDate).getTime()) / 86400000))
          : 0,
        "Last Follow-up": r.followUpDate,
        "Next Follow-up": r.nextFollowUpDate || "—",
        "Assigned To": r.assignedTo,
        Status: STATUS_OPTIONS.find((s) => s.value === r.status)?.label ?? r.status,
        Remarks: r.remarks,
      })),
      exportMeta,
      "collection_tracking",
    );
  };

  const handlePdf = () => {
    exportReceivablesToPdf(
      [
        "Customer",
        "Invoice",
        "Outstanding",
        "Due Date",
        "Last Follow-up",
        "Next Follow-up",
        "Assigned To",
        "Status",
        "Remarks",
      ],
      filteredRecords.map((r) => [
        r.customerName,
        r.invoiceNo || "—",
        formatExportAmount(r.outstandingAmount),
        formatReportDate(r.dueDate),
        formatReportDate(r.followUpDate),
        formatReportDate(r.nextFollowUpDate),
        r.assignedTo,
        STATUS_OPTIONS.find((s) => s.value === r.status)?.label ?? r.status,
        r.remarks,
      ]),
      exportMeta,
    );
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Receivables", "Collection Tracking")}
      title="Collection Tracking"
      description="Track collection follow-ups for overdue and pending customer invoices."
      actions={
        <Button size="sm" className="h-9 text-sm font-medium gap-1 bg-brand-600 hover:bg-brand-700 text-white" onClick={openAdd}>
          <Plus className="w-4 h-4" /> Add Follow-up
        </Button>
      }
      filters={
        <ReportFilterRow
          end={<AccountsExportMenu onExcel={handleExcel} onPdf={handlePdf} disabled={filteredRecords.length === 0} />}
        >
          <ReportCustomerFilter value={customerId} onChange={setCustomerId} customers={customers} />
          <div className="space-y-1 min-w-[160px]">
            <Label className="text-xs font-medium uppercase text-muted-foreground leading-none">
              Follow-up Status
            </Label>
            <select
              value={collectionStatus}
              onChange={(e) => setCollectionStatus(e.target.value)}
              className="h-7 w-full text-sm rounded-md border border-border bg-white px-2"
            >
              {COLLECTION_STATUS_FILTER.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <ReportDateRangeFilter
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPresetChange={setPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <ReportSearchFilter value={search} onChange={setSearch} placeholder="Search follow-ups…" />
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <AccountsTableScroll className="flex-1 min-h-0">
          <AccountsTable minWidth={1280}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                {[
                  "Customer",
                  "Invoice No.",
                  "Outstanding Amount",
                  "Due Date",
                  "Overdue Days",
                  "Last Follow-up",
                  "Next Follow-up",
                  "Assigned To",
                  "Status",
                  "Remarks",
                  "",
                ].map((h) => (
                  <AccountsTableHeadCell
                    key={h || "act"}
                    align={h === "Outstanding Amount" ? "right" : h === "Overdue Days" ? "center" : "left"}
                  >
                    {h}
                  </AccountsTableHeadCell>
                ))}
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {pagedRecords.length === 0 ? (
                <AccountsTableRow>
                  <AccountsTableCell colSpan={11} className="accounts-table-empty">
                    No records found.
                  </AccountsTableCell>
                </AccountsTableRow>
              ) : (
                pagedRecords.map((r) => {
                  const today = new Date().toISOString().slice(0, 10);
                  const overdueDays =
                    r.dueDate && r.outstandingAmount > 0 && r.dueDate < today
                      ? Math.floor(
                          (new Date(today).getTime() - new Date(r.dueDate).getTime()) / 86400000,
                        )
                      : 0;
                  return (
                    <AccountsTableRow key={r.id} className="group">
                      <AccountsTableCell>
                        <Link
                          href={`/accounts/receivables/outstanding/${r.customerId}`}
                          className="text-xs font-medium text-brand-700 hover:underline"
                        >
                          {r.customerName}
                        </Link>
                      </AccountsTableCell>
                      <AccountsTableCell>
                        {r.invoiceNo ? (
                          <Link
                            href={`/accounts/receivables/outstanding/invoice/${r.invoiceId}`}
                            className="text-xs font-mono font-semibold text-brand-700 hover:underline"
                          >
                            {r.invoiceNo}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </AccountsTableCell>
                      <AccountsTableCell align="right">
                        <span className="tabular-nums">{formatMoney(r.outstandingAmount)}</span>
                      </AccountsTableCell>
                      <AccountsTableCell>{formatReportDate(r.dueDate)}</AccountsTableCell>
                      <AccountsTableCell align="center">
                        <span className={overdueDays > 0 ? "text-red-600 font-semibold tabular-nums" : "text-muted-foreground"}>
                          {overdueDays > 0 ? overdueDays : "—"}
                        </span>
                      </AccountsTableCell>
                      <AccountsTableCell>{formatReportDate(r.followUpDate)}</AccountsTableCell>
                      <AccountsTableCell>{formatReportDate(r.nextFollowUpDate)}</AccountsTableCell>
                      <AccountsTableCell>{r.assignedTo}</AccountsTableCell>
                      <AccountsTableCell>
                        <StatusBadge status={r.status} />
                      </AccountsTableCell>
                      <AccountsTableCell>
                        <span className="text-xs max-w-[180px] truncate block" title={r.remarks}>
                          {r.remarks}
                        </span>
                      </AccountsTableCell>
                      <AccountsTableCell align="right">
                        <AccountsMoreActions contentClassName="w-52">
                          <DropdownMenuItem onClick={() => openEdit(r)}>Update Status</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openHistory(r)}>
                            <History className="w-4 h-4 mr-2" /> View History
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => quickStatus(r, "promise_to_pay")}>
                            Mark Promise To Pay
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => quickStatus(r, "closed")}>
                            Mark Closed
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/accounts/receivables/outstanding/${r.customerId}`}>
                              View Customer Outstanding
                            </Link>
                          </DropdownMenuItem>
                        </AccountsMoreActions>
                      </AccountsTableCell>
                    </AccountsTableRow>
                  );
                })
              )}
            </AccountsTableBody>
          </AccountsTable>
        </AccountsTableScroll>
        {filteredRecords.length > 0 && (
          <AccountsTablePagination
            page={page}
            pageSize={pageSize}
            totalRecords={filteredRecords.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Update Follow-up" : "Add Follow-up"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label className="text-xs">Customer *</Label>
              <Select
                value={form.customerId}
                onValueChange={(v) => setForm((f) => ({ ...f, customerId: v, invoiceId: "" }))}
              >
                <SelectTrigger className="h-9 text-sm font-medium mt-1">
                  <SelectValue placeholder="Select customer" />
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
            <div>
              <Label className="text-xs">Invoice No (optional)</Label>
              <Select
                value={form.invoiceId || "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, invoiceId: v === "none" ? "" : v }))}
              >
                <SelectTrigger className="h-9 text-sm font-medium mt-1">
                  <SelectValue placeholder="All outstanding" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All outstanding</SelectItem>
                  {customerInvoices.map((i) => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      {i.invoiceNo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Follow-up Date *</Label>
                <Input
                  type="date"
                  className="h-9 text-sm font-medium mt-1"
                  value={form.followUpDate}
                  onChange={(e) => setForm((f) => ({ ...f, followUpDate: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Assigned To *</Label>
                <Select value={form.assignedTo} onValueChange={(v) => setForm((f) => ({ ...f, assignedTo: v }))}>
                  <SelectTrigger className="h-9 text-sm font-medium mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Rajesh Sharma", "Priya Singh", "Amit Verma", "Neha Patel", "Suresh Kumar"].map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as CollectionFollowUpStatus }))}
                >
                  <SelectTrigger className="h-9 text-sm font-medium mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Next Follow-up Date</Label>
                <Input
                  type="date"
                  className="h-9 text-sm font-medium mt-1"
                  value={form.nextFollowUpDate}
                  onChange={(e) => setForm((f) => ({ ...f, nextFollowUpDate: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Remarks</Label>
              <Textarea
                className="text-xs mt-1 min-h-[72px]"
                value={form.remarks}
                onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveFollowUp}>
              {editing ? "Save Changes" : "Add Follow-up"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Follow-up History</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {historyRows.length === 0 ? (
              <p className="text-xs text-muted-foreground">No history recorded yet.</p>
            ) : (
              historyRows.map((h) => (
                <div key={h.id} className="rounded-lg border border-border/60 p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={h.status} />
                    <span className="text-muted-foreground">{formatReportDate(h.date)}</span>
                  </div>
                  <p>{h.remarks}</p>
                  <p className="text-xs text-muted-foreground">By {h.updatedBy}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AccountsPageShell>
  );
}
