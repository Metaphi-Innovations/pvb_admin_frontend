"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { SectionTabs, StatusBadge } from "../../components/AccountsUI";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import {
  claimApprovedImpactResolved,
  claimPaidImpactResolved,
} from "@/lib/accounts/resolved-impact-previews";
import { payClaimFromAccounts } from "@/lib/accounts/claims-payment-flow";
import { getActivePostingLedgers } from "@/lib/accounts/coa-hierarchy";
import {
  loadExpenses,
  getApprovedAmount,
  getPaidAmount,
  type PaymentMode,
} from "@/app/(app)/accounts/expenses/expense-data";
import { formatMoney } from "@/lib/accounts/money-format";

const TABS = [
  { id: "pending", label: "Pending Claims" },
  { id: "approved", label: "Approved Claims" },
  { id: "payable", label: "Claims Payable" },
  { id: "paid", label: "Paid Claims" },
];

const PAYMENT_MODES: PaymentMode[] = [
  "Bank Transfer",
  "NEFT",
  "RTGS",
  "UPI",
  "Cheque",
  "Cash",
];

export default function HrClaimsAccountsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "pending";
  const [tab, setTab] = useState(initialTab);
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expenses, setExpenses] = useState(() => loadExpenses());
  const [payOpen, setPayOpen] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("Bank Transfer");
  const [paymentRef, setPaymentRef] = useState("");
  const [bankLedgerId, setBankLedgerId] = useState("");

  const bankLedgers = useMemo(
    () =>
      getActivePostingLedgers().filter(
        (l) =>
          l.bankAccountFlag ||
          l.accountName.toLowerCase().includes("bank") ||
          l.accountName.toLowerCase().includes("hdfc") ||
          l.accountName.toLowerCase().includes("icici"),
      ),
    [],
  );

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && TABS.some((x) => x.id === t)) setTab(t);
  }, [searchParams]);

  const rows = useMemo(() => {
    return expenses.filter((ex) => {
      if (dateFrom && ex.expenseDate < dateFrom) return false;
      if (dateTo && ex.expenseDate > dateTo) return false;
      if (tab === "pending") {
        return ["submitted", "pending_approval"].includes(ex.status);
      }
      if (tab === "approved") return ex.status === "approved";
      if (tab === "payable") return ex.status === "approved" && ex.paidStatus !== "paid";
      if (tab === "paid") return ex.paidStatus === "paid" || ex.status === "paid";
      return true;
    });
  }, [expenses, tab, dateFrom, dateTo]);

  const selected = rows.find((r) => r.id === selectedId) ?? rows[0] ?? null;
  const approvedAmt = selected ? getApprovedAmount(selected) : 0;

  const handlePay = () => {
    if (!selected) return;
    setPayError(null);
    const result = payClaimFromAccounts({
      claimId: selected.id,
      paymentDate,
      paymentMode,
      paymentReferenceNo: paymentRef,
      bankLedgerId: Number(bankLedgerId),
    });
    if (!result.ok) {
      setPayError(result.error);
      return;
    }
    setExpenses(loadExpenses());
    setPayOpen(false);
    setTab("paid");
    router.push("/accounts/purchases/hr-claims?tab=paid");
  };

  const tabCounts = useMemo(
    () => ({
      pending: expenses.filter((e) => ["submitted", "pending_approval"].includes(e.status)).length,
      payable: expenses.filter((e) => e.status === "approved" && e.paidStatus !== "paid").length,
    }),
    [expenses],
  );

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Claims", "Employee Claims")}
      title="Expense / Claims from HR"
      description="Pending â†’ Claims Payable â†’ Payment Voucher â†’ Paid Claims."
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
        </ReportFilterRow>
      }
      layout="split"
    >
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        <div className="flex-1 min-w-0 flex flex-col border-r border-border/60">
          <div className="px-4 pt-3 border-b border-border/60">
            <SectionTabs tabs={TABS} active={tab} onChange={setTab} counts={tabCounts} />
          </div>
          <div className="overflow-auto flex-1">
            <table className="accounts-table w-full min-w-[640px]">
              <thead className="border-b">
                <tr>
                  {["Claim No", "Employee", "Department", "Type", "Approved", "Status"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="accounts-table-empty">
                      No claims in this stage.
                    </td>
                  </tr>
                ) : (
                  rows.map((ex) => (
                    <tr
                      key={ex.id}
                      className={cn(
                        "accounts-table-row group cursor-pointer",
                        selected?.id === ex.id && "is-selected",
                      )}
                      onClick={() => setSelectedId(ex.id)}
                    >
                      <td className="px-3 py-2 font-mono">{ex.expenseNumber}</td>
                      <td className="px-3 py-2">{ex.employeeName}</td>
                      <td className="px-3 py-2">{ex.department}</td>
                      <td className="px-3 py-2">{ex.categoryName}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(getApprovedAmount(ex))}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={ex.paidStatus === "paid" ? "paid" : ex.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {selected && (
          <div className="w-full lg:w-[340px] flex-shrink-0 p-4 space-y-4 overflow-auto bg-muted/5">
            <div className="rounded-lg border border-border/60 bg-white p-3 space-y-2 text-xs">
              <p className="font-semibold text-foreground">{selected.expenseNumber}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="text-muted-foreground">Employee</span><span>{selected.employeeName}</span>
                <span className="text-muted-foreground">Department</span><span>{selected.department}</span>
                <span className="text-muted-foreground">Claim Type</span><span>{selected.categoryName}</span>
                <span className="text-muted-foreground">Expense Ledger</span><span>{selected.categoryName}</span>
                <span className="text-muted-foreground">Claim Date</span><span>{selected.expenseDate}</span>
                <span className="text-muted-foreground">Approved Amount</span><span className="font-semibold">{formatMoney(approvedAmt)}</span>
                <span className="text-muted-foreground">Paid Amount</span><span>{formatMoney(getPaidAmount(selected))}</span>
                <span className="text-muted-foreground">Payment Mode</span><span>{selected.payment?.paymentMode ?? selected.paymentMode ?? "—"}</span>
              </div>
              <Link href={`/accounts/transactions/expenses/${selected.id}`} className="text-brand-600 hover:underline text-xs">
                Open claim â†’
              </Link>
              {tab === "payable" && selected.paidStatus !== "paid" && (
                <Button
                  size="sm"
                  className="w-full h-9 text-sm font-medium mt-2 bg-brand-600 hover:bg-brand-700 text-white"
                  onClick={() => {
                    setPayError(null);
                    setPaymentRef("");
                    setPayOpen(true);
                  }}
                >
                  Create Payment Voucher
                </Button>
              )}
            </div>
            {selected.status === "approved" && (
              <LedgerImpactPreview
                title="When Approved"
                lines={claimApprovedImpactResolved(approvedAmt, selected.categoryName)}
              />
            )}
            {(tab === "payable" || selected.paidStatus !== "paid") && selected.status === "approved" && (
              <LedgerImpactPreview
                title="When Paid (Preview)"
                lines={claimPaidImpactResolved(
                  approvedAmt,
                  bankLedgers.find((l) => String(l.id) === bankLedgerId)?.accountName ?? "Bank",
                )}
              />
            )}
            {selected.paidStatus === "paid" && (
              <LedgerImpactPreview
                title="When Paid"
                lines={claimPaidImpactResolved(
                  getPaidAmount(selected) || approvedAmt,
                  selected.payment?.paymentMode ? "Bank" : "Bank",
                )}
              />
            )}
          </div>
        )}
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Pay Claim — Payment Voucher</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            {payError && (
              <p className="text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1.5">{payError}</p>
            )}
            <p className="text-muted-foreground">
              Posts payment voucher: Dr Employee Payable · Cr Bank for {formatMoney(approvedAmt)}.
            </p>
            <div className="space-y-1">
              <Label className="text-xs">Payment Date</Label>
              <Input className="h-9 text-sm font-medium" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment Mode</Label>
              <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)}>
                <SelectTrigger className="h-9 text-sm font-medium"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bank Ledger (Paid From)</Label>
              <Select value={bankLedgerId} onValueChange={setBankLedgerId}>
                <SelectTrigger className="h-9 text-sm font-medium"><SelectValue placeholder="Select bank ledger" /></SelectTrigger>
                <SelectContent>
                  {bankLedgers.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)} className="text-xs">{l.accountName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reference No.</Label>
              <Input className="h-9 text-sm font-medium" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="UTR / Cheque no." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-9 text-sm font-medium" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              className="h-9 text-sm font-medium bg-brand-600 text-white"
              disabled={!bankLedgerId}
              onClick={handlePay}
            >
              Post Payment Voucher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AccountsPageShell>
  );
}
