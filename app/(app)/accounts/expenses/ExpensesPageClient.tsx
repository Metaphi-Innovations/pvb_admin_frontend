"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ModuleFiltersBar } from "@/components/module/ModuleFiltersBar";
import { AccountsListingDateFilter } from "@/components/accounts/AccountsListingFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AccountsMoreActions,
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import { Wallet, Banknote, FileSpreadsheet } from "lucide-react";
import { SectionTabs } from "../components/AccountsUI";
import {
  filterPayments,
  computePaymentTabCounts,
  getPaymentActions,
  getPendingPaymentAmount,
  getRejectedAmount,
  loadAccountPayments,
  markPaymentPaid,
  saveAccountPayments,
  type AccountPaymentRecord,
} from "./accounts-payment-data";
import { FinancePaymentStatusBadge } from "./components/FinancePaymentStatusBadge";
import { FinancePaymentModal } from "./components/FinancePaymentModal";
import { exportAccountPaymentsToExcel } from "./accounts-payment-export";
import { EXPENSE_BREADCRUMB, EXPENSE_LIST_PATH, formatINR } from "./expense-utils";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "all", label: "All" },
  { id: "payment_pending", label: "Payment Pending" },
  { id: "partially_paid", label: "Partially Paid" },
  { id: "payment_done", label: "Payment Done" },
  { id: "cancelled", label: "Cancelled" },
];

export default function ExpensesPageClient() {
  const [records, setRecords] = useState<AccountPaymentRecord[]>([]);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentTarget, setPaymentTarget] = useState<AccountPaymentRecord | null>(null);
  const [exporting, setExporting] = useState(false);

  const refresh = useCallback(() => setRecords(loadAccountPayments()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const listFilters = useMemo(
    () => ({ tab, search, source: sourceFilter, dateFrom, dateTo }),
    [tab, search, sourceFilter, dateFrom, dateTo],
  );
  const visible = useMemo(() => filterPayments(records, listFilters), [records, listFilters]);
  const counts = useMemo(() => computePaymentTabCounts(records), [records]);

  const persist = (updated: AccountPaymentRecord) => {
    saveAccountPayments(records.map((r) => (r.id === updated.id ? updated : r)));
    refresh();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAccountPaymentsToExcel(visible);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-[1600px] mx-auto space-y-3">
        <PageHeader
          title="Expenses"
          description="Finance payment tracking for HR-approved claims and expenses. Approvals are managed in HR → TA/DA Claims."
          icon={Wallet}
          breadcrumbs={EXPENSE_BREADCRUMB}
        />

        <SectionTabs tabs={TABS} active={tab} onChange={setTab} counts={counts} />

        <ModuleFiltersBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search claim no., employee…"
        >
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-8 w-[160px] text-xs bg-white">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Sources</SelectItem>
              <SelectItem value="hr_tada_claim" className="text-xs">HR TA/DA Claims</SelectItem>
            </SelectContent>
          </Select>
          <AccountsListingDateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
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
        </ModuleFiltersBar>

        <div className="page-shell overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-300px)]">
            <table className="accounts-table w-full text-table min-w-[1680px]">
              <thead className="border-b border-border">
                <tr>
                  {[
                    "Expense / Claim No.",
                    "Source",
                    "Employee",
                    "Code",
                    "Claim Date",
                    "Category",
                    "Claimed",
                    "Approved",
                    "Rejected",
                    "Paid",
                    "Pending Pay.",
                    "Payment Status",
                    "Pay Mode",
                    "Pay Date",
                    "Pay Ref",
                    "Approved By",
                    "Paid By",
                    "",
                  ].map((h) => (
                    <th key={h || "a"} className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="py-12 text-center text-xs text-muted-foreground">
                      No approved expenses pending payment. Final-approved claims from HR will appear here.
                    </td>
                  </tr>
                ) : (
                  visible.map((r) => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-brand-50/25">
                      <td className="px-2.5 py-2 text-xs font-mono font-medium">{r.referenceNo}</td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{r.sourceModuleLabel}</td>
                      <td className="px-2.5 py-2 text-xs">{r.employeeName}</td>
                      <td className="px-2.5 py-2 text-xs font-mono text-muted-foreground">{r.employeeCode}</td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{r.claimDate}</td>
                      <td className="px-2.5 py-2 text-xs">{r.categoryName}</td>
                      <td className="px-2.5 py-2 text-xs text-right font-medium tabular-nums">{formatINR(r.claimedAmount)}</td>
                      <td className="px-2.5 py-2 text-xs text-right font-medium tabular-nums">{formatINR(r.approvedAmount)}</td>
                      <td className="px-2.5 py-2 text-xs text-right font-medium tabular-nums">
                        {getRejectedAmount(r) > 0 ? formatINR(getRejectedAmount(r)) : "—"}
                      </td>
                      <td className="px-2.5 py-2 text-xs text-right font-medium tabular-nums">{formatINR(r.paidAmount)}</td>
                      <td className="px-2.5 py-2 text-xs text-right font-medium tabular-nums">
                        {formatINR(getPendingPaymentAmount(r))}
                      </td>
                      <td className="px-2.5 py-2">
                        <FinancePaymentStatusBadge status={r.paymentStatus} />
                      </td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{r.paymentMode ?? "—"}</td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{r.paymentDate ?? "—"}</td>
                      <td className="px-2.5 py-2 text-xs font-mono text-muted-foreground">{r.paymentReferenceNo ?? "—"}</td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{r.approvedBy ?? "—"}</td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{r.paidBy ?? "—"}</td>
                      <td className={cn("px-2.5 py-2 sticky right-0 bg-white", accountsActionColClass("multi"))}>
                        <AccountsTableActionCell>
                          {getPaymentActions(r).includes("view") && (
                            <AccountsViewAction href={`${EXPENSE_LIST_PATH}/${r.id}`} />
                          )}
                          {getPaymentActions(r).includes("mark_paid") && (
                            <AccountsMoreActions contentClassName="w-40">
                              <DropdownMenuItem
                                className="text-xs gap-2 text-brand-700"
                                onClick={() => setPaymentTarget(r)}
                              >
                                <Banknote className="w-3.5 h-3.5" /> Mark as Paid
                              </DropdownMenuItem>
                            </AccountsMoreActions>
                          )}
                        </AccountsTableActionCell>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <FinancePaymentModal
        open={!!paymentTarget}
        onClose={() => setPaymentTarget(null)}
        record={paymentTarget}
        onConfirm={(payload) => {
          if (!paymentTarget) return;
          persist(markPaymentPaid(paymentTarget, payload));
          setPaymentTarget(null);
        }}
      />
    </AppLayout>
  );
}
