"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  applyVendorPaymentAllocation,
  computePaymentAllocationVendors,
  getPayablesFilterOptions,
  getVendorAllocationContext,
  type PaymentAllocationStatus,
  type PaymentAllocationVendorRow,
} from "@/lib/accounts/payables-data";
import { ensurePayablesDemoOnPageLoad } from "@/lib/accounts/payables-demo-seed";
import {
  exportPaymentAllocationToExcel,
  exportPaymentAllocationToPdf,
} from "@/lib/accounts/payables-export";
import { formatMoney, MONEY_CELL_CLASS } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import {
  ReportFilterRow,
  ReportFinancialYearFilter,
  ReportVendorFilter,
} from "@/components/accounts/ReportFilters";
import {
  AccountsRichTable,
  AccountsTableScroll,
  type AccountsRichColumnDef,
} from "@/components/accounts/AccountsTable";
import {
  AccountsTablePagination,
  AccountsTableToolbar,
} from "@/components/accounts/AccountsTableListing";
import { cn } from "@/lib/utils";

const ALLOCATION_STATUS_OPTIONS: { value: PaymentAllocationStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "unallocated", label: "Unallocated" },
  { value: "partially_allocated", label: "Partially Allocated" },
  { value: "fully_allocated", label: "Fully Allocated" },
];

function AllocationWorkspace({
  vendorId,
  onBack,
  onSaved,
}: {
  vendorId: number;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [asOnDate] = useState(defaultAsOnDate());
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const context = useMemo(
    () => getVendorAllocationContext(vendorId, asOnDate),
    [vendorId, asOnDate],
  );

  const totalSelected = useMemo(() => {
    return (context?.openBills ?? []).reduce((s, bill) => {
      if (!selected[bill.billId]) return s;
      const v = Number(amounts[bill.billId] || 0);
      return s + (Number.isFinite(v) ? v : 0);
    }, 0);
  }, [context, selected, amounts]);

  const selectedCount = useMemo(
    () => Object.keys(selected).filter((k) => selected[Number(k)]).length,
    [selected],
  );

  const totalOutstandingSelected = useMemo(() => {
    return (context?.openBills ?? []).reduce((s, bill) => {
      if (!selected[bill.billId]) return s;
      return s + bill.outstanding;
    }, 0);
  }, [context, selected]);

  const remainingBalance = Math.max(0, (context?.unallocatedBalance ?? 0) - totalSelected);

  const toggleBill = (billId: number, outstanding: number) => {
    setSelected((prev) => {
      const next = { ...prev, [billId]: !prev[billId] };
      if (next[billId] && !amounts[billId]) {
        const pool = (context?.unallocatedBalance ?? 0) - totalSelected;
        setAmounts((a) => ({
          ...a,
          [billId]: String(Math.min(outstanding, Math.max(0, pool + Number(a[billId] || 0)))),
        }));
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!context) return;
    setSaving(true);
    setError("");
    const allocations = context.openBills
      .filter((b) => selected[b.billId] && Number(amounts[b.billId] || 0) > 0)
      .map((b) => ({ billId: b.billId, amount: Number(amounts[b.billId] || 0) }));

    const err = applyVendorPaymentAllocation(vendorId, allocations);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    onSaved();
  };

  if (!context) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Supplier not found.{" "}
        <button type="button" onClick={onBack} className="text-brand-600 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-shrink-0 px-2 py-1.5 border-b border-border/60 bg-white flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5" /> All Suppliers
        </Button>
      </div>

      <div className="flex-1 overflow-auto min-h-0 p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-xl border border-border bg-muted/10 p-4 text-xs">
          {[
            ["Supplier Name", context.vendorName],
            ["Supplier Code", context.vendorCode],
            ["Total Outstanding", formatMoney(context.totalOutstanding)],
            ["Total Payment Available", formatMoney(context.totalPaymentAvailable)],
            ["Unallocated Balance", formatMoney(context.unallocatedBalance)],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold">{label}</p>
              <p className="font-semibold mt-0.5 tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="accounts-table w-full text-table min-w-[1000px]">
              <thead className="border-b bg-muted/20">
                <tr>
                  {[
                    "Select",
                    "Invoice No.",
                    "Invoice Date",
                    "Due Date",
                    "Invoice Amount",
                    "Outstanding",
                    "Allocate Amount",
                  ].map((h) => (
                    <th key={h} className="text-left whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {context.openBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-xs text-muted-foreground">
                      No open invoices for this supplier.
                    </td>
                  </tr>
                ) : (
                  context.openBills.map((bill) => (
                    <tr key={bill.billId} className="border-b border-border/40 hover:bg-muted/20">
                      <td className="px-3 py-2.5">
                        <Checkbox
                          checked={!!selected[bill.billId]}
                          onCheckedChange={() => toggleBill(bill.billId, bill.outstanding)}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono font-semibold text-brand-700">
                        {bill.billNo}
                      </td>
                      <td className="px-3 py-2.5 text-xs tabular-nums">{bill.billDate}</td>
                      <td className="px-3 py-2.5 text-xs tabular-nums">{bill.dueDate}</td>
                      <td className={cn("px-3 py-2.5 text-xs text-right", MONEY_CELL_CLASS)}>
                        {formatMoney(bill.billAmount)}
                      </td>
                      <td className={cn("px-3 py-2.5 text-xs text-right font-semibold", MONEY_CELL_CLASS)}>
                        {formatMoney(bill.outstanding)}
                      </td>
                      <td className="px-3 py-2.5">
                        <AccountsMoneyInput
                          className="h-8 text-xs w-32"
                          disabled={!selected[bill.billId]}
                          value={amounts[bill.billId] ?? ""}
                          onChange={(v) => {
                            const num = Number(v) || 0;
                            const capped = Math.min(num, bill.outstanding);
                            setAmounts((a) => ({ ...a, [bill.billId]: String(capped) }));
                          }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-border bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-xs">
          <span>
            Selected Invoices: <strong>{selectedCount}</strong>
          </span>
          <span>
            Total Outstanding (selected): <strong className="tabular-nums">{formatMoney(totalOutstandingSelected)}</strong>
          </span>
          <span>
            Total Allocation: <strong className="tabular-nums">{formatMoney(totalSelected)}</strong>
          </span>
          <span>
            Remaining Balance: <strong className="tabular-nums">{formatMoney(remainingBalance)}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/accounts/payables/outstanding/${vendorId}`}>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              View Outstanding
            </Button>
          </Link>
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            onClick={handleSave}
            disabled={saving || totalSelected <= 0 || context.unallocatedBalance <= 0}
          >
            {saving ? "Saving…" : "Save Allocation"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentAllocationClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vendorParam = searchParams.get("vendorId");

  const [refreshKey, setRefreshKey] = useState(0);
  const [financialYearId, setFinancialYearId] = useState("all");
  const [vendorId, setVendorId] = useState("all");
  const [allocationStatus, setAllocationStatus] = useState<PaymentAllocationStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);
  const [activeVendorId, setActiveVendorId] = useState<number | null>(
    vendorParam ? Number(vendorParam) : null,
  );

  useEffect(() => {
    ensurePayablesDemoOnPageLoad();
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (vendorParam) setActiveVendorId(Number(vendorParam));
  }, [vendorParam]);

  useEffect(() => {
    const activeFyId = getActiveFinancialYearId();
    const years = loadFinancialYears();
    const activeFy = years.find((fy) => fy.id === activeFyId) ?? years.find((fy) => fy.status === "active");
    if (activeFy) setFinancialYearId(String(activeFy.id));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [financialYearId, vendorId, allocationStatus, search, pageSize, refreshKey]);

  const filterOptions = useMemo(() => getPayablesFilterOptions(), [refreshKey]);

  const rows = useMemo(() => {
    return computePaymentAllocationVendors(defaultAsOnDate(), {
      vendorId: vendorId === "all" ? undefined : Number(vendorId),
      status: allocationStatus,
      financialYearId: financialYearId === "all" ? undefined : Number(financialYearId),
      search,
    });
  }, [financialYearId, vendorId, allocationStatus, search, refreshKey]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const exportMeta = useMemo(() => {
    const fy =
      financialYearId === "all"
        ? "All years"
        : (loadFinancialYears().find((y) => String(y.id) === financialYearId)?.name ?? "All years");
    const vendor =
      vendorId === "all"
        ? "All suppliers"
        : (filterOptions.vendors.find((v) => String(v.id) === vendorId)?.vendorName ?? "All suppliers");
    const statusLabel =
      ALLOCATION_STATUS_OPTIONS.find((o) => o.value === allocationStatus)?.label ?? "All statuses";
    return {
      reportName: "Payment Allocation",
      financialYear: fy,
      supplier: vendor,
      paymentStatus: statusLabel,
      search,
    };
  }, [financialYearId, vendorId, allocationStatus, search, filterOptions.vendors]);

  const handleExportExcel = useCallback(async () => {
    setExporting(true);
    try {
      await exportPaymentAllocationToExcel(rows, exportMeta);
    } finally {
      setExporting(false);
    }
  }, [rows, exportMeta]);

  const handleExportPdf = useCallback(() => {
    exportPaymentAllocationToPdf(rows, exportMeta);
  }, [rows, exportMeta]);

  const columns = useMemo((): AccountsRichColumnDef<PaymentAllocationVendorRow>[] => [
    {
      key: "vendorName",
      label: "Supplier",
      render: (r) => <span className="text-xs font-medium">{r.vendorName}</span>,
    },
    {
      key: "vendorCode",
      label: "Supplier Code",
      render: (r) => <span className="font-mono text-[11px] text-muted-foreground">{r.vendorCode}</span>,
    },
    {
      key: "totalOutstanding",
      label: "Total Outstanding",
      align: "right",
      render: (r) => <span className={MONEY_CELL_CLASS}>{formatMoney(r.totalOutstanding)}</span>,
    },
    {
      key: "totalPaymentAvailable",
      label: "Payment Available",
      align: "right",
      render: (r) => <span className={MONEY_CELL_CLASS}>{formatMoney(r.totalPaymentAvailable)}</span>,
    },
    {
      key: "unallocatedBalance",
      label: "Unallocated Balance",
      align: "right",
      render: (r) => (
        <span className={cn(MONEY_CELL_CLASS, "font-semibold text-foreground")}>
          {formatMoney(r.unallocatedBalance)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "action",
      label: "Action",
      align: "right",
      uppercase: false,
      render: (r) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] text-brand-700"
          onClick={(e) => {
            e.stopPropagation();
            setActiveVendorId(r.vendorId);
          }}
        >
          Allocate
        </Button>
      ),
    },
  ], []);

  if (activeVendorId && Number.isFinite(activeVendorId)) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Payables", "Payment Allocation")}
        title="Payment Allocation"
        description="Allocate supplier payments against open purchase invoices."
        layout="split"
        className="h-full min-h-0"
      >
        <AllocationWorkspace
          vendorId={activeVendorId}
          onBack={() => {
            setActiveVendorId(null);
            router.replace("/accounts/payables/payment-allocation");
          }}
          onSaved={() => {
            setRefreshKey((k) => k + 1);
            router.push(`/accounts/payables/outstanding/${activeVendorId}`);
          }}
        />
      </AccountsPageShell>
    );
  }

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Payables", "Payment Allocation")}
      title="Payment Allocation"
      description="Select a supplier to allocate unallocated payment vouchers against open purchase invoices."
      filters={
        <ReportFilterRow>
          <ReportFinancialYearFilter value={financialYearId} onChange={setFinancialYearId} />
          <ReportVendorFilter value={vendorId} onChange={setVendorId} vendors={filterOptions.vendors} />
          <div className="space-y-1 min-w-[160px]">
            <Label className="text-[10px] font-medium uppercase text-muted-foreground leading-none">
              Payment Status
            </Label>
            <Select
              value={allocationStatus}
              onValueChange={(v) => setAllocationStatus(v as PaymentAllocationStatus | "all")}
            >
              <SelectTrigger className="h-7 text-xs mt-0 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALLOCATION_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <AccountsTableToolbar
          search={{ value: search, onChange: setSearch, placeholder: "Search supplier…" }}
          onExcel={handleExportExcel}
          onPdf={handleExportPdf}
          exportDisabled={exporting || rows.length === 0}
        />
        <AccountsTableScroll>
          <AccountsRichTable
            columns={columns}
            rows={pagedRows}
            minWidth={1000}
            getRowKey={(r) => r.vendorId}
            emptyMessage="No suppliers with payment allocation data found."
            onRowClick={(r) => setActiveVendorId(r.vendorId)}
          />
        </AccountsTableScroll>
        {rows.length > 0 && (
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
  );
}
