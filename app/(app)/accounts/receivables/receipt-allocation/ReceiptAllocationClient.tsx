"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  applyCustomerReceiptAllocation,
  getCustomerReceiptAllocationSummary,
  getOpenInvoicesForCustomer,
  loadReceiptAllocationRecords,
  type CustomerInvoiceOutstandingRow,
  type ReceiptAllocationRecord,
  type ReceiptAllocationStatus,
} from "@/lib/accounts/receivables-data";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import {
  ReportFilterRow,
  ReportFinancialYearFilter,
  ReportCustomerFilter,
  ReportSearchFilter,
  ReportDateRangeFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RECEIPT_STATUS_OPTIONS: { value: ReceiptAllocationStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "unallocated", label: "Unallocated" },
  { value: "partially_allocated", label: "Partially Allocated" },
  { value: "fully_allocated", label: "Fully Allocated" },
];

function formatReportDate(value: string): string {
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}-${m}-${y}`;
}

function AvailableReceiptsTable({
  onSelectCustomer,
}: {
  onSelectCustomer: (customerId: string) => void;
}) {
  const visible = useAccountsFilteredRows<ReceiptAllocationRecord>([]);

  return (
    <AccountsTable minWidth={640}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="Receipt No." colKey="receiptNo" />
          <SortTh label="Customer" colKey="customerName" />
          <SortTh label="Date" colKey="receiptDate" filterType="date" />
          <SortTh label="Unallocated" colKey="unallocatedAmount" filterType="amount" align="right" />
          <AccountsColumnHeader label="" colKey="_actions" sortable={false} filterable={false} align="right" />
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {visible.length === 0 ? (
          <AccountsTableRow>
            <AccountsTableCell colSpan={5} className="accounts-table-empty">
              No receipts match the filters.
            </AccountsTableCell>
          </AccountsTableRow>
        ) : (
          visible.map((r) => (
            <AccountsTableRow key={r.voucherId}>
              <AccountsTableCell>
                <span className="font-mono text-xs font-semibold">{r.receiptNo}</span>
              </AccountsTableCell>
              <AccountsTableCell>{r.customerName}</AccountsTableCell>
              <AccountsTableCell>{formatReportDate(r.receiptDate)}</AccountsTableCell>
              <AccountsTableCell align="right">
                <span className="tabular-nums">{formatMoney(r.unallocatedAmount)}</span>
              </AccountsTableCell>
              <AccountsTableCell align="right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-sm"
                  onClick={() => onSelectCustomer(String(r.customerId))}
                >
                  Allocate
                </Button>
              </AccountsTableCell>
            </AccountsTableRow>
          ))
        )}
      </AccountsTableBody>
    </AccountsTable>
  );
}

function OpenInvoicesAllocationTable({
  selected,
  amounts,
  activeReceipt,
  onToggleInvoice,
  onAmountChange,
}: {
  selected: Record<number, boolean>;
  amounts: Record<number, string>;
  activeReceipt: { unallocatedAmount: number } | undefined;
  onToggleInvoice: (invoiceId: number, outstanding: number) => void;
  onAmountChange: (invoiceId: number, value: string) => void;
}) {
  const visible = useAccountsFilteredRows<CustomerInvoiceOutstandingRow>([]);

  const totalAllocation = visible.reduce((s, inv) => {
    if (!selected[inv.invoiceId]) return s;
    const v = Number(amounts[inv.invoiceId] || 0);
    return s + (Number.isFinite(v) ? v : 0);
  }, 0);

  return (
    <AccountsTable minWidth={960}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <AccountsColumnHeader label="Select" colKey="_select" sortable={false} filterable={false} align="center" />
          <SortTh label="Invoice No." colKey="invoiceNo" />
          <SortTh label="Invoice Date" colKey="invoiceDate" filterType="date" />
          <SortTh label="Due Date" colKey="dueDate" filterType="date" />
          <SortTh label="Invoice Amount" colKey="invoiceAmount" filterType="amount" align="right" />
          <SortTh label="Outstanding" colKey="outstanding" filterType="amount" align="right" />
          <AccountsColumnHeader
            label="Allocate Amount"
            colKey="_allocate"
            sortable={false}
            filterable={false}
            align="right"
          />
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {visible.length === 0 ? (
          <AccountsTableRow>
            <AccountsTableCell colSpan={7} className="accounts-table-empty">
              No open invoices match the column filters.
            </AccountsTableCell>
          </AccountsTableRow>
        ) : (
          visible.map((inv) => (
            <AccountsTableRow key={inv.invoiceId}>
              <AccountsTableCell align="center">
                <Checkbox
                  checked={!!selected[inv.invoiceId]}
                  onCheckedChange={() => onToggleInvoice(inv.invoiceId, inv.outstanding)}
                  disabled={!activeReceipt}
                />
              </AccountsTableCell>
              <AccountsTableCell>
                <Link
                  href={`/accounts/receivables/outstanding/invoice/${inv.invoiceId}`}
                  className="text-xs font-mono font-semibold text-brand-700 hover:underline"
                >
                  {inv.invoiceNo}
                </Link>
              </AccountsTableCell>
              <AccountsTableCell>{formatReportDate(inv.invoiceDate)}</AccountsTableCell>
              <AccountsTableCell>{formatReportDate(inv.dueDate)}</AccountsTableCell>
              <AccountsTableCell align="right">
                <span className="tabular-nums">{formatMoney(inv.invoiceAmount)}</span>
              </AccountsTableCell>
              <AccountsTableCell align="right">
                <span className="tabular-nums font-semibold">{formatMoney(inv.outstanding)}</span>
              </AccountsTableCell>
              <AccountsTableCell align="right">
                <AccountsMoneyInput
                  className="h-9 text-sm font-medium w-28 ml-auto"
                  disabled={!selected[inv.invoiceId] || !activeReceipt}
                  value={amounts[inv.invoiceId] ?? ""}
                  onChange={(v) => onAmountChange(inv.invoiceId, String(v))}
                />
              </AccountsTableCell>
            </AccountsTableRow>
          ))
        )}
      </AccountsTableBody>
      <AccountsTableFoot>
        <AccountsTableRow>
          <AccountsTableCell colSpan={4} className="font-semibold text-xs">
            Summary
          </AccountsTableCell>
          <AccountsTableCell align="right" className="font-semibold text-xs tabular-nums">
            {formatMoney(visible.reduce((s, i) => s + i.invoiceAmount, 0))}
          </AccountsTableCell>
          <AccountsTableCell align="right" className="font-semibold text-xs tabular-nums">
            {formatMoney(visible.reduce((s, i) => s + i.outstanding, 0))}
          </AccountsTableCell>
          <AccountsTableCell align="right" className="font-semibold text-xs tabular-nums text-brand-700">
            {formatMoney(totalAllocation)}
          </AccountsTableCell>
        </AccountsTableRow>
      </AccountsTableFoot>
    </AccountsTable>
  );
}

export default function ReceiptAllocationClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");
  const [financialYear, setFinancialYear] = useState("all");
  const [customerId, setCustomerId] = useState(() => {
    const fromUrl = searchParams.get("customer");
    return fromUrl && fromUrl !== "all" ? fromUrl : "";
  });
  const [receiptStatus, setReceiptStatus] = useState<ReceiptAllocationStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedReceiptId, setSelectedReceiptId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const sectionRefresh = useAccountsSectionRefresh();

  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [sectionRefresh]);

  useEffect(() => {
    const fromUrl = searchParams.get("customer");
    if (fromUrl) setCustomerId(fromUrl);
  }, [searchParams]);

  const customers = useMemo(() => loadCustomers(), []);
  const allReceipts = useMemo(() => loadReceiptAllocationRecords(), [refreshKey]);

  const customerNumericId = customerId ? Number(customerId) : 0;
  const summary = useMemo(
    () => (customerNumericId ? getCustomerReceiptAllocationSummary(customerNumericId) : null),
    [customerNumericId, refreshKey],
  );

  const openInvoices = useMemo(
    () => (customerNumericId ? getOpenInvoicesForCustomer(customerNumericId) : []),
    [customerNumericId, refreshKey],
  );

  const filteredReceipts = useMemo(() => {
    let rows = allReceipts;
    if (customerId) rows = rows.filter((r) => String(r.customerId) === customerId);
    if (receiptStatus !== "all") rows = rows.filter((r) => r.status === receiptStatus);
    if (dateFrom) rows = rows.filter((r) => r.receiptDate >= dateFrom);
    if (dateTo) rows = rows.filter((r) => r.receiptDate <= dateTo);
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.receiptNo.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.referenceNo.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [allReceipts, customerId, receiptStatus, search, dateFrom, dateTo]);

  const getReceiptCellValue = useCallback(
    (row: ReceiptAllocationRecord, key: string) => (row as unknown as Record<string, unknown>)[key],
    [],
  );

  const getInvoiceCellValue = useCallback(
    (row: CustomerInvoiceOutstandingRow, key: string) => (row as unknown as Record<string, unknown>)[key],
    [],
  );

  useEffect(() => {
    if (!summary?.unallocatedReceipts.length) {
      setSelectedReceiptId(null);
      return;
    }
    const preferred =
      summary.unallocatedReceipts.find((r) => r.voucherId === selectedReceiptId) ??
      summary.unallocatedReceipts[0];
    setSelectedReceiptId(preferred.voucherId);
  }, [summary, customerNumericId]);

  useEffect(() => {
    setSelected({});
    setAmounts({});
    setError("");
  }, [customerId, selectedReceiptId]);

  const activeReceipt = summary?.unallocatedReceipts.find((r) => r.voucherId === selectedReceiptId);

  const totalSelected = openInvoices.filter((inv) => selected[inv.invoiceId]).length;
  const totalOutstandingSelected = openInvoices.reduce((s, inv) => {
    if (!selected[inv.invoiceId]) return s;
    return s + inv.outstanding;
  }, 0);
  const totalAllocation = openInvoices.reduce((s, inv) => {
    if (!selected[inv.invoiceId]) return s;
    const v = Number(amounts[inv.invoiceId] || 0);
    return s + (Number.isFinite(v) ? v : 0);
  }, 0);
  const remainingBalance = Math.max(0, (activeReceipt?.unallocatedAmount ?? 0) - totalAllocation);

  const toggleInvoice = (invoiceId: number, outstanding: number) => {
    setSelected((prev) => {
      const next = { ...prev, [invoiceId]: !prev[invoiceId] };
      if (next[invoiceId] && !amounts[invoiceId]) {
        const cap = activeReceipt?.unallocatedAmount ?? outstanding;
        setAmounts((a) => ({
          ...a,
          [invoiceId]: String(Math.min(outstanding, cap)),
        }));
      }
      return next;
    });
  };

  const saveAllocation = () => {
    if (!customerNumericId || !selectedReceiptId) {
      setError("Select a customer and receipt with unallocated balance.");
      return;
    }
    const allocations = openInvoices
      .filter((inv) => selected[inv.invoiceId] && Number(amounts[inv.invoiceId] || 0) > 0)
      .map((inv) => ({
        invoiceId: inv.invoiceId,
        amount: Number(amounts[inv.invoiceId] || 0),
      }));

    if (allocations.length === 0) {
      setError("Select at least one invoice with an allocation amount.");
      return;
    }

    const err = applyCustomerReceiptAllocation(customerNumericId, selectedReceiptId, allocations);
    if (err) {
      setError(err);
      return;
    }
    setRefreshKey((k) => k + 1);
    router.refresh();
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Receivables", "Receipt Allocation")}
      title="Receipt Allocation"
      description="Allocate customer receipt vouchers against open sales invoices."
      filters={
        <ReportFilterRow>
          <ReportDateRangeFilter
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPresetChange={setPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <ReportFinancialYearFilter value={financialYear} onChange={setFinancialYear} />
          <ReportCustomerFilter
            value={customerId || "all"}
            onChange={(v) => setCustomerId(v === "all" ? "" : v)}
            customers={customers}
          />
          <div className="space-y-1 min-w-[150px]">
            <label className="text-xs font-medium uppercase text-muted-foreground leading-none">
              Receipt Status
            </label>
            <select
              value={receiptStatus}
              onChange={(e) => setReceiptStatus(e.target.value as ReceiptAllocationStatus | "all")}
              className="h-7 w-full text-sm rounded-md border border-border bg-white px-2"
            >
              {RECEIPT_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <ReportSearchFilter value={search} onChange={setSearch} placeholder="Search receipt…" />
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
      footer={
        customerId ? (
          <div className="px-4 py-2.5 flex items-center justify-between gap-4 bg-muted/10 border-t border-border text-xs">
            <div className="flex flex-wrap gap-4">
              <span>
                Total Selected Invoices: <strong>{totalSelected}</strong>
              </span>
              <span>
                Total Outstanding: <strong>{formatMoney(totalOutstandingSelected)}</strong>
              </span>
              <span>
                Total Allocation: <strong>{formatMoney(totalAllocation)}</strong>
              </span>
              <span>
                Remaining Balance: <strong>{formatMoney(remainingBalance)}</strong>
              </span>
            </div>
            <Button
              size="sm"
              className="h-9 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white"
              disabled={!activeReceipt}
              onClick={saveAllocation}
            >
              Save Allocation
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col flex-1 min-h-0">
        {!customerId ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">Select a customer to allocate receipts</p>
              <p className="text-xs text-muted-foreground">
                Choose a customer from the filter above to view open invoices and allocate receipts.
              </p>
              {filteredReceipts.length > 0 && (
                <div className="mt-4 text-left max-w-lg mx-auto">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    Available Receipts
                  </p>
                  <AccountsColumnFilterProvider
                    rows={filteredReceipts}
                    getCellValue={getReceiptCellValue}
                    columnConfig={{
                      receiptNo: { type: "text" },
                      customerName: { type: "text" },
                      receiptDate: { type: "date" },
                      unallocatedAmount: { type: "amount" },
                    }}
                    defaultSortKey="receiptDate"
                    defaultSortDir="desc"
                  >
                    <AccountsTableScroll>
                      <AvailableReceiptsTable onSelectCustomer={setCustomerId} />
                    </AccountsTableScroll>
                  </AccountsColumnFilterProvider>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {summary && (
              <div className="flex-shrink-0 border-b border-border/60 bg-white px-4 py-3">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                  {[
                    ["Customer Name", summary.customerName],
                    ["Customer Code", summary.customerCode],
                    ["Total Outstanding", formatMoney(summary.totalOutstanding)],
                    ["Total Receipt Available", formatMoney(summary.totalReceiptAvailable)],
                    ["Unallocated Balance", formatMoney(summary.unallocatedBalance)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs uppercase text-muted-foreground font-semibold">{label}</p>
                      <p className="font-medium mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
                {summary.unallocatedReceipts.length > 1 && (
                  <div className="mt-3 max-w-xs">
                    <p className="text-xs uppercase text-muted-foreground font-semibold mb-1">
                      Receipt to Allocate
                    </p>
                    <Select
                      value={selectedReceiptId ? String(selectedReceiptId) : ""}
                      onValueChange={(v) => setSelectedReceiptId(Number(v))}
                    >
                      <SelectTrigger className="h-9 text-sm font-medium">
                        <SelectValue placeholder="Select receipt" />
                      </SelectTrigger>
                      <SelectContent>
                        {summary.unallocatedReceipts.map((r) => (
                          <SelectItem key={r.voucherId} value={String(r.voucherId)}>
                            {r.receiptNo} — {formatMoney(r.unallocatedAmount)} unallocated
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
              </div>
            )}

            <AccountsColumnFilterProvider
              rows={openInvoices}
              getCellValue={getInvoiceCellValue}
              columnConfig={{
                invoiceNo: { type: "text" },
                invoiceDate: { type: "date" },
                dueDate: { type: "date" },
                invoiceAmount: { type: "amount" },
                outstanding: { type: "amount" },
              }}
              defaultSortKey="dueDate"
              defaultSortDir="asc"
            >
              <AccountsTableScroll className="flex-1 min-h-0">
                <OpenInvoicesAllocationTable
                  selected={selected}
                  amounts={amounts}
                  activeReceipt={activeReceipt}
                  onToggleInvoice={toggleInvoice}
                  onAmountChange={(invoiceId, value) =>
                    setAmounts((a) => ({ ...a, [invoiceId]: value }))
                  }
                />
              </AccountsTableScroll>
            </AccountsColumnFilterProvider>
          </>
        )}
      </div>
    </AccountsPageShell>
  );
}
