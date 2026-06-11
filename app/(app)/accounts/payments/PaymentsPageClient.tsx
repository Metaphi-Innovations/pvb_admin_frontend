"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ModuleFiltersBar } from "@/components/module/ModuleFiltersBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Banknote, Eye, FileSpreadsheet, MoreVertical, Pencil, Plus, XCircle } from "lucide-react";
import { SectionTabs } from "../components/AccountsUI";
import {
  addPaymentInstallment,
  cancelCompanyPayment,
  computePaymentTabCounts,
  filterCompanyPayments,
  getPaymentRowActions,
  loadCompanyPayments,
  payeeDisplay,
  PAYMENT_MODES,
  sourceTypeLabel,
  SOURCE_TYPE_OPTIONS,
  type CompanyPaymentRecord,
} from "./payments-data";
import { PaymentStatusBadge } from "./components/PaymentStatusBadge";
import { PaymentInstallmentModal } from "./components/PaymentInstallmentModal";
import { exportPaymentsToExcel } from "./payments-export";
import { ThreeWayMatchStatusBadge } from "@/components/erp/ThreeWayMatchStatusBadge";
import { getPurchasePaymentMatchContext } from "@/lib/erp/payment-match-context";
import { formatINR, PAYMENTS_BREADCRUMB, PAYMENTS_LIST_PATH } from "./payment-utils";

const TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "partially_paid", label: "Partially Paid" },
  { id: "paid", label: "Paid" },
  { id: "cancelled", label: "Cancelled" },
];

export default function PaymentsPageClient() {
  const [records, setRecords] = useState<CompanyPaymentRecord[]>([]);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [paymentMode, setPaymentMode] = useState("all");
  const [sourceType, setSourceType] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [payTarget, setPayTarget] = useState<CompanyPaymentRecord | null>(null);
  const [exporting, setExporting] = useState(false);

  const refresh = useCallback(() => setRecords(loadCompanyPayments()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const listFilters = useMemo(
    () => ({ tab, search, paymentMode, sourceType, dateFrom, dateTo, statusFilter }),
    [tab, search, paymentMode, sourceType, dateFrom, dateTo, statusFilter],
  );
  const visible = useMemo(() => filterCompanyPayments(records, listFilters), [records, listFilters]);
  const counts = useMemo(() => computePaymentTabCounts(records), [records]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportPaymentsToExcel(visible);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-[1680px] mx-auto space-y-3">
        <PageHeader
          title="Payments"
          description="Process and track outgoing payments for purchases and approved TA/DA claims."
          breadcrumbs={PAYMENTS_BREADCRUMB}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                disabled={exporting || visible.length === 0}
                onClick={handleExport}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {exporting ? "Exporting…" : "Export Excel"}
              </Button>
              <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white" asChild>
                <Link href={`${PAYMENTS_LIST_PATH}/new`}>
                  <Plus className="w-3.5 h-3.5" />
                  Record Payment
                </Link>
              </Button>
            </div>
          }
        />

        <SectionTabs tabs={TABS} active={tab} onChange={setTab} counts={counts} />

        <ModuleFiltersBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Payment no., payee, source ref…">
          <Select value={sourceType} onValueChange={setSourceType}>
            <SelectTrigger className="h-8 w-[150px] text-xs bg-white">
              <SelectValue placeholder="Source type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All source types</SelectItem>
              {SOURCE_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentMode} onValueChange={setPaymentMode}>
            <SelectTrigger className="h-8 w-[130px] text-xs bg-white">
              <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All modes</SelectItem>
              {PAYMENT_MODES.map((m) => (
                <SelectItem key={m} value={m} className="text-xs">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All statuses</SelectItem>
              <SelectItem value="payment_pending" className="text-xs">Pending</SelectItem>
              <SelectItem value="partially_paid" className="text-xs">Partially Paid</SelectItem>
              <SelectItem value="payment_done" className="text-xs">Paid</SelectItem>
              <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" className="h-8 w-[130px] text-xs bg-white" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" className="h-8 w-[130px] text-xs bg-white" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </ModuleFiltersBar>

        <div className="page-shell overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-300px)]">
            <table className="w-full text-table min-w-[1700px]">
              <thead className="sticky top-0 z-10 bg-white border-b">
                <tr>
                  {[
                    "Payment No.",
                    "Payment Date",
                    "Payee",
                    "Source Type",
                    "PO No.",
                    "Vendor Inv. No.",
                    "Purchase No.",
                    "3-Way Match",
                    "Source Reference",
                    "Amount",
                    "Paid Amount",
                    "Balance",
                    "Status",
                    "",
                  ].map((h) => (
                    <th
                      key={h || "a"}
                      className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-xs text-muted-foreground">
                      No payments. Approved claims and purchase invoices sync here automatically.
                    </td>
                  </tr>
                ) : (
                  visible.map((r) => {
                    const matchCtx = getPurchasePaymentMatchContext(r);
                    return (
                    <tr key={r.id} className="border-b hover:bg-brand-50/25">
                      <td className="px-2.5 py-2 text-xs font-mono font-medium">{r.paymentNo}</td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{r.paymentDate}</td>
                      <td className="px-2.5 py-2 text-xs">{payeeDisplay(r)}</td>
                      <td className="px-2.5 py-2 text-xs">{sourceTypeLabel(r.sourceType)}</td>
                      <td className="px-2.5 py-2 text-xs font-mono">{matchCtx?.poNumber ?? "—"}</td>
                      <td className="px-2.5 py-2 text-xs font-mono">{matchCtx?.vendorInvoiceNo ?? "—"}</td>
                      <td className="px-2.5 py-2 text-xs font-mono">{matchCtx?.purchaseNo ?? "—"}</td>
                      <td className="px-2.5 py-2">
                        {matchCtx ? (
                          <ThreeWayMatchStatusBadge status={matchCtx.matchStatus} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-2.5 py-2 text-xs font-mono">{r.sourceReferenceNo || "—"}</td>
                      <td className="px-2.5 py-2 text-xs text-right font-medium tabular-nums">{formatINR(r.approvedAmount)}</td>
                      <td className="px-2.5 py-2 text-xs text-right font-medium tabular-nums">{formatINR(r.paidAmount)}</td>
                      <td className="px-2.5 py-2 text-xs text-right font-medium tabular-nums">{formatINR(r.balanceAmount)}</td>
                      <td className="px-2.5 py-2">
                        <PaymentStatusBadge status={r.paymentStatus} />
                      </td>
                      <td className="px-2.5 py-2 sticky right-0 bg-white">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {getPaymentRowActions(r).map((a) => {
                              if (a === "view")
                                return (
                                  <DropdownMenuItem key="view" asChild>
                                    <Link href={`${PAYMENTS_LIST_PATH}/${r.id}`} className="text-xs gap-2">
                                      <Eye className="w-3.5 h-3.5" /> View
                                    </Link>
                                  </DropdownMenuItem>
                                );
                              if (a === "edit")
                                return (
                                  <DropdownMenuItem key="edit" asChild>
                                    <Link href={`${PAYMENTS_LIST_PATH}/${r.id}/edit`} className="text-xs gap-2">
                                      <Pencil className="w-3.5 h-3.5" /> Edit
                                    </Link>
                                  </DropdownMenuItem>
                                );
                              if (a === "pay")
                                return (
                                  <DropdownMenuItem key="pay" className="text-xs gap-2 text-brand-700" onClick={() => setPayTarget(r)}>
                                    <Banknote className="w-3.5 h-3.5" /> Record Payment
                                  </DropdownMenuItem>
                                );
                              if (a === "cancel")
                                return (
                                  <DropdownMenuItem
                                    key="cancel"
                                    className="text-xs gap-2 text-red-600"
                                    onClick={() => {
                                      if (confirm("Cancel this payment record?")) {
                                        cancelCompanyPayment(r.id);
                                        refresh();
                                      }
                                    }}
                                  >
                                    <XCircle className="w-3.5 h-3.5" /> Cancel
                                  </DropdownMenuItem>
                                );
                              return null;
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <PaymentInstallmentModal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        record={payTarget}
        onConfirm={(payload) => {
          if (!payTarget) return;
          addPaymentInstallment(payTarget.id, payload);
          refresh();
          setPayTarget(null);
        }}
      />
    </AppLayout>
  );
}
