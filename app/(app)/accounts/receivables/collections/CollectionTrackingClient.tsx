"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, History } from "lucide-react";
import { AccountsMoreActions } from "@/components/accounts/AccountsTableActions";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  StatusBadge,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import {
  loadCollectionFollowUps,
  loadCollectionFollowUpHistory,
  createCollectionFollowUp,
  updateCollectionFollowUp,
  getPostedSalesInvoices,
  type CollectionFollowUp,
  type CollectionFollowUpStatus,
} from "@/lib/accounts/receivables-data";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
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
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportCustomerMultiFilter,
  ReportBranchMultiFilter,
  ReportStatusMultiFilter,
  ReportMoreFilters,
  ReportFilterSummary,
  ReportSearchFilter,
  ReportFilterResetButton,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import { resetReportDateRange } from "@/lib/accounts/use-accounts-listing-reset";
import {
  buildBranchFilterSummary,
  buildEntityFilterSummary,
  countActiveMoreFilters,
  formatMultiSelectLabel,
  isMultiFilterActive,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";
import { StatusBadge as SharedStatusBadge } from "@/components/ui/StatusBadge";
import { collectionStatusToBadge } from "@/lib/accounts/accounts-status-badges";
import {
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
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

const COLLECTION_STATUS_FILTER_OPTIONS = STATUS_OPTIONS;

const STATUS_FILTER_OPTIONS = STATUS_OPTIONS.map((o) => o.value);

function computeOverdueDays(r: CollectionFollowUp): number {
  const today = new Date().toISOString().slice(0, 10);
  if (r.dueDate && r.outstandingAmount > 0 && r.dueDate < today) {
    return Math.floor((new Date(today).getTime() - new Date(r.dueDate).getTime()) / 86400000);
  }
  return 0;
}

function formatReportDate(value: string): string {
  if (!value || value === "—") return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}-${m}-${y}`;
}

function CollectionExport({
  exportMeta,
}: {
  exportMeta: {
    reportName: string;
    dateFrom: string;
    dateTo: string;
    customer: string;
    status: string;
    search: string;
  };
}) {
  const visible = useAccountsFilteredRows<CollectionFollowUp>([]);

  const handleExcel = () => {
    void exportReceivablesToExcel(
      visible.map((r) => ({
        Customer: r.customerName,
        "Invoice No.": r.invoiceNo || "—",
        "Outstanding Amount": formatExportAmount(r.outstandingAmount),
        "Due Date": r.dueDate || "—",
        "Overdue Days": computeOverdueDays(r),
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
      visible.map((r) => [
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

  return <AccountsExportMenu onExcel={handleExcel} onPdf={handlePdf} disabled={visible.length === 0} />;
}

function CollectionTable({
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onHistory,
  onQuickStatus,
  emptyMessage,
  hasFilters,
  onClearFilters,
}: {
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onEdit: (row: CollectionFollowUp) => void;
  onHistory: (row: CollectionFollowUp) => void;
  onQuickStatus: (row: CollectionFollowUp, status: CollectionFollowUpStatus) => void;
  emptyMessage: string;
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows<CollectionFollowUp>([]);

  const pagedRecords = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AccountsTableScroll className="flex-1 min-h-0">
        <AccountsTable minWidth={1280}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <SortTh label="Customer" colKey="customerName" />
              <SortTh label="Invoice No." colKey="invoiceNo" />
              <SortTh label="Outstanding Amount" colKey="outstandingAmount" filterType="amount" align="right" />
              <SortTh label="Due Date" colKey="dueDate" filterType="date" />
              <SortTh label="Overdue Days" colKey="overdueDays" filterType="number" align="center" />
              <SortTh label="Last Follow-up" colKey="followUpDate" filterType="date" />
              <SortTh label="Next Follow-up" colKey="nextFollowUpDate" filterType="date" />
              <SortTh label="Status" colKey="status" filterType="status" />
              <SortTh label="Assigned To" colKey="assignedTo" />
              <AccountsColumnHeader label="Remarks" colKey="remarks" sortable={false} />
              <AccountsColumnHeader
                label=""
                colKey="_actions"
                sortable={false}
                filterable={false}
                align="right"
              />
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {visible.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={11} className="accounts-table-empty">
                  <div className="flex flex-col items-center gap-1">
                    <span>{emptyMessage}</span>
                    {hasFilters ? (
                      <button
                        type="button"
                        className="text-xs text-brand-600 hover:underline mt-1"
                        onClick={onClearFilters}
                      >
                        Clear filters
                      </button>
                    ) : null}
                  </div>
                </AccountsTableCell>
              </AccountsTableRow>
            ) : (
              pagedRecords.map((r) => {
                const overdueDays = computeOverdueDays(r);
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
                      <span
                        className={
                          overdueDays > 0
                            ? "text-red-600 font-semibold tabular-nums"
                            : "text-muted-foreground"
                        }
                      >
                        {overdueDays > 0 ? overdueDays : "—"}
                      </span>
                    </AccountsTableCell>
                    <AccountsTableCell>{formatReportDate(r.followUpDate)}</AccountsTableCell>
                    <AccountsTableCell>{formatReportDate(r.nextFollowUpDate)}</AccountsTableCell>
                    <AccountsTableCell>
                      {(() => {
                        const badge = collectionStatusToBadge(r.status);
                        return <SharedStatusBadge status={badge.status} label={badge.label} size="sm" />;
                      })()}
                    </AccountsTableCell>
                    <AccountsTableCell>{r.assignedTo}</AccountsTableCell>
                    <AccountsTableCell>
                      <span className="text-xs max-w-[180px] truncate block" title={r.remarks}>
                        {r.remarks}
                      </span>
                    </AccountsTableCell>
                    <AccountsTableCell align="right">
                      <AccountsMoreActions contentClassName="w-52">
                        <DropdownMenuItem onClick={() => onEdit(r)}>Update Status</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onHistory(r)}>
                          <History className="w-4 h-4 mr-2" /> View History
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onQuickStatus(r, "promise_to_pay")}>
                          Mark Promise To Pay
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onQuickStatus(r, "closed")}>
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

export default function CollectionTrackingClient() {
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");
  const [customerIds, setCustomerIds] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { toast, showCreated, showUpdated, dismissToast } = useAccountsToast();

  const sectionRefresh = useAccountsSectionRefresh();

  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [sectionRefresh]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, customerIds, statuses, branchIds, search, pageSize]);

  const records = useMemo(() => loadCollectionFollowUps(), [refreshKey]);
  const customers = useMemo(() => loadCustomers(), []);
  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const invoices = useMemo(() => getPostedSalesInvoices(), [sectionRefresh]);

  const moreFiltersActiveCount = countActiveMoreFilters({ branch: branchIds, status: statuses });

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] =>
    [
      buildEntityFilterSummary(
        "customer",
        "Customers",
        customerIds,
        customers.map((c) => ({
          value: String(c.id),
          label: c.customerName,
          searchText: c.customerCode,
        })),
        () => setCustomerIds([]),
      ),
      buildBranchFilterSummary(branchIds, () => setBranchIds([])),
      buildEntityFilterSummary(
        "status",
        "Statuses",
        statuses,
        COLLECTION_STATUS_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
        () => setStatuses([]),
      ),
    ].filter((item): item is ReportFilterSummaryItem => item != null),
  [customerIds, customers, branchIds, statuses]);

  const toolbarFiltered = useMemo(() => {
    return records.filter((r) => {
      if (customerIds.length > 0 && !customerIds.includes(String(r.customerId))) return false;
      if (statuses.length > 0 && !statuses.includes(r.status)) return false;
      if (branchIds.length > 0) {
        const customer = customerById.get(r.customerId);
        const branch = customer?.branch?.trim() || customer?.stateName?.trim() || "—";
        if (!branchIds.includes(branch)) return false;
      }
      if (dateFrom && r.dueDate && r.dueDate < dateFrom) return false;
      if (dateTo && r.dueDate && r.dueDate > dateTo) return false;
      const q = search.trim().toLowerCase();
      if (q) {
        const hay = [r.customerName, r.invoiceNo, r.followUpNo, r.assignedTo, r.remarks]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, customerIds, branchIds, statuses, customerById, dateFrom, dateTo, search]);

  const hasToolbarFilters =
    search.trim() !== "" ||
    isMultiFilterActive(customerIds) ||
    isMultiFilterActive(statuses) ||
    isMultiFilterActive(branchIds) ||
    preset !== "this_month";

  const clearToolbarFilters = () => {
    setSearch("");
    setCustomerIds([]);
    setStatuses([]);
    setBranchIds([]);
    resetReportDateRange(setPreset, setDateFrom, setDateTo, "this_month");
  };

  const emptyMessage = hasToolbarFilters
    ? "No follow-ups match the selected filters."
    : "No collection follow-ups recorded yet.";

  const getCellValue = useCallback((row: CollectionFollowUp, key: string) => {
    if (key === "overdueDays") return computeOverdueDays(row);
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

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
    if (editing) showUpdated("Follow-up");
    else showCreated("Follow-up");
  };

  const quickStatus = (row: CollectionFollowUp, status: CollectionFollowUpStatus) => {
    updateCollectionFollowUp(row.id, { status });
    setRefreshKey((k) => k + 1);
    showUpdated("Follow-up status");
  };

  const exportMeta = useMemo(
    () => ({
      reportName: "Collection Tracking",
      dateFrom,
      dateTo,
      customer: formatMultiSelectLabel(
        customerIds,
        customers.map((c) => ({ value: String(c.id), label: c.customerName })),
        "Customer",
        "All customers",
      ),
      status: formatMultiSelectLabel(
        statuses,
        COLLECTION_STATUS_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
        "Status",
        "All statuses",
      ),
      search,
    }),
    [dateFrom, dateTo, customerIds, customers, statuses, search],
  );

  return (
    <AccountsColumnFilterProvider
      rows={toolbarFiltered}
      getCellValue={getCellValue}
      columnConfig={{
        customerName: { type: "text" },
        invoiceNo: { type: "text" },
        outstandingAmount: { type: "amount" },
        dueDate: { type: "date" },
        overdueDays: { type: "number" },
        followUpDate: { type: "date" },
        nextFollowUpDate: { type: "date" },
        assignedTo: { type: "text" },
        status: { type: "status", options: STATUS_FILTER_OPTIONS },
        remarks: { type: "text" },
      }}
      defaultSortKey="dueDate"
      defaultSortDir="desc"
    >
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
        <>
          <ReportFilterRow end={<CollectionExport exportMeta={exportMeta} />}>
            <ReportSearchFilter value={search} onChange={setSearch} placeholder="Search follow-ups…" />
            <ReportCustomerMultiFilter
              values={customerIds}
              onChange={setCustomerIds}
              customers={customers}
            />
            <ReportDateRangeFilter
              preset={preset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onPresetChange={setPreset}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
            <ReportMoreFilters activeCount={moreFiltersActiveCount}>
              <ReportBranchMultiFilter values={branchIds} onChange={setBranchIds} />
              <ReportStatusMultiFilter
                values={statuses}
                onChange={setStatuses}
                options={COLLECTION_STATUS_FILTER_OPTIONS}
                label="Collection Status"
              />
            </ReportMoreFilters>
            <ReportFilterResetButton
              showOnlyWhenActive
              active={hasToolbarFilters}
              onClick={clearToolbarFilters}
            />
          </ReportFilterRow>
          <ReportFilterSummary items={filterSummaryItems} />
        </>
      }
      layout="split"
      className="h-full min-h-0"
      >
        <CollectionTable
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onEdit={openEdit}
          onHistory={openHistory}
          onQuickStatus={quickStatus}
          emptyMessage={emptyMessage}
          hasFilters={hasToolbarFilters}
          onClearFilters={clearToolbarFilters}
        />

      <AccountsToast toast={toast} onDismiss={dismissToast} />

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
    </AccountsColumnFilterProvider>
  );
}
