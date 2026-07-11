"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import type { BankReconTransactionRecord } from "@/lib/accounts/bank-recon-register";
import {
  categorizeBankTransaction,
  canCategorizeTransaction,
} from "@/lib/accounts/bank-recon-categorize-service";
import { buildCategorizeAccountingPreview } from "@/lib/accounts/bank-recon-categorize-preview";
import type {
  AdvanceHandling,
  BankReconCategorizeCategory,
  BankReconDepositCategory,
  BankReconWithdrawalCategory,
  GstTaxComponent,
} from "@/lib/accounts/bank-recon-categorize-types";
import {
  DEPOSIT_CATEGORIZE_OPTIONS,
  WITHDRAWAL_CATEGORIZE_OPTIONS,
} from "@/lib/accounts/bank-recon-categorize-types";
import {
  customerSearchOptions,
  listUnpaidPurchaseInvoicesForVendor,
  listUnpaidSalesInvoicesForCustomer,
  vendorSearchOptions,
} from "../bank-reconciliation-data";
import { InvoiceAllocationPanel } from "./InvoiceAllocationPanel";
import { BankReconAccountingPreview } from "./BankReconAccountingPreview";
import {
  BankReconMatchStatusBadge,
  BankReconVerificationStatusBadge,
} from "./BankReconBadges";
import { bankReconLedgerFilterForCategory } from "@/lib/accounts/bank-recon-coa-filters";
import { resolveCoaLedgerForV2BankAccount } from "@/lib/accounts/bank-recon-account-bridge";
import { getDemoBankLedgers } from "@/lib/accounts/bank-ledger-resolver";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";

interface BankReconCategorizeSheetProps {
  transaction: BankReconTransactionRecord | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1 border-b border-border/40 text-[11px] last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

export function BankReconCategorizeSheet({
  transaction,
  open,
  onClose,
  onSaved,
}: BankReconCategorizeSheetProps) {
  const isDeposit = (transaction?.deposit ?? 0) > 0;
  const stmtAmount = transaction ? transaction.deposit || transaction.withdrawal : 0;

  const [category, setCategory] = useState<BankReconCategorizeCategory | "">("");
  const [customerId, setCustomerId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [ledgerId, setLedgerId] = useState<number | null>(null);
  const [toBankLedgerId, setToBankLedgerId] = useState<number | null>(null);
  const [transactionDate, setTransactionDate] = useState("");
  const [accountAmount, setAccountAmount] = useState("");
  const [bankAmount, setBankAmount] = useState("");
  const [bankChargesAmount, setBankChargesAmount] = useState("");
  const [bankChargesLedgerId, setBankChargesLedgerId] = useState<number | null>(null);
  const [referenceNo, setReferenceNo] = useState("");
  const [narration, setNarration] = useState("");
  const [remarks, setRemarks] = useState("");
  const [tdsAmount, setTdsAmount] = useState("");
  const [gstComponent, setGstComponent] = useState<GstTaxComponent>("CGST");
  const [challanNo, setChallanNo] = useState("");
  const [gstPeriod, setGstPeriod] = useState("");
  const [tdsFinancialYear, setTdsFinancialYear] = useState("2025-26");
  const [tdsQuarter, setTdsQuarter] = useState("Q1");
  const [tdsNature, setTdsNature] = useState("");
  const [costCentre, setCostCentre] = useState("");
  const [advanceHandling, setAdvanceHandling] = useState<AdvanceHandling>("keep_advance");
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!transaction || !open) return;
    setCategory("");
    setCustomerId("");
    setVendorId("");
    setLedgerId(null);
    setToBankLedgerId(null);
    setTransactionDate(transaction.statementDate || transaction.bookDate || "");
    const amt = String(transaction.deposit || transaction.withdrawal || "");
    setAccountAmount(amt);
    setBankAmount(amt);
    setBankChargesAmount("");
    setBankChargesLedgerId(null);
    setReferenceNo(transaction.reference || transaction.utrNumber || "");
    setNarration(transaction.narration || "");
    setRemarks("");
    setTdsAmount("");
    setAllocations({});
    setError(null);
    setToast(null);
  }, [transaction?.id, open]);

  const categoryOptions = isDeposit ? DEPOSIT_CATEGORIZE_OPTIONS : WITHDRAWAL_CATEGORIZE_OPTIONS;

  const customers = useMemo(() => customerSearchOptions("").map((c) => ({ value: String(c.id), label: c.label })), []);
  const vendors = useMemo(() => vendorSearchOptions("").map((v) => ({ value: String(v.id), label: v.label })), []);

  const selectedCustomerName = customers.find((c) => c.value === customerId)?.label;
  const selectedVendorName = vendors.find((v) => v.value === vendorId)?.label;

  const customerInvoices = useMemo(() => {
    if (category !== "customer_receipt" && category !== "customer_advance" && category !== "customer_refund") return [];
    if (!customerId) return [];
    return listUnpaidSalesInvoicesForCustomer(Number(customerId), selectedCustomerName);
  }, [category, customerId, selectedCustomerName]);

  const vendorBills = useMemo(() => {
    if (category !== "vendor_payment") return [];
    if (!vendorId) return [];
    return listUnpaidPurchaseInvoicesForVendor(Number(vendorId), selectedVendorName);
  }, [category, vendorId, selectedVendorName]);

  const activeInvoices = category === "vendor_payment" ? vendorBills : customerInvoices;

  const numericAccountAmount = Number(accountAmount) || stmtAmount;
  const numericBankAmount = Number(bankAmount) || stmtAmount;
  const numericCharges = Number(bankChargesAmount) || 0;

  const totalApplied = useMemo(
    () =>
      Object.values(allocations).reduce((s, v) => {
        const n = Number(v);
        return s + (Number.isFinite(n) ? n : 0);
      }, 0),
    [allocations],
  );

  const remainingAmount = Math.max(0, numericAccountAmount - totalApplied);

  const coaFilter = useMemo(() => {
    if (category === "expense" || category === "bank_charges" || category === "interest_expense") {
      return bankReconLedgerFilterForCategory("expense");
    }
    if (category === "interest_income" || category === "other_income") {
      return bankReconLedgerFilterForCategory("interest_income");
    }
    if (category === "bank_transfer") {
      return bankReconLedgerFilterForCategory("transfer");
    }
    return undefined;
  }, [category]);

  const transferBankOptions = useMemo(() => {
    const ledgers = getDemoBankLedgers();
    const current = resolveCoaLedgerForV2BankAccount(transaction?.bankAccountId ?? "");
    return Object.values(ledgers).filter((l) => l && l.id !== current?.id);
  }, [transaction?.bankAccountId]);

  const partyLedgerName = useMemo(() => {
    if (selectedCustomerName) return selectedCustomerName;
    if (selectedVendorName) return selectedVendorName;
    if (ledgerId) return loadChartOfAccounts().find((l) => l.id === ledgerId)?.accountName ?? "Ledger";
    if (toBankLedgerId) return loadChartOfAccounts().find((l) => l.id === toBankLedgerId)?.accountName ?? "Bank";
    return "Party / Ledger";
  }, [selectedCustomerName, selectedVendorName, ledgerId, toBankLedgerId]);

  const previewLines = useMemo(() => {
    if (!transaction || !category) return [];
    return buildCategorizeAccountingPreview(
      {
        statementTransactionId: transaction.id,
        bankAccountId: transaction.bankAccountId,
        category: category as BankReconCategorizeCategory,
        transactionDate,
        referenceNo,
        narration,
        customerId: customerId ? Number(customerId) : null,
        vendorId: vendorId ? Number(vendorId) : null,
        ledgerId,
        toBankLedgerId,
        accountAmount: numericAccountAmount,
        bankAmount: numericBankAmount,
        bankChargesAmount: numericCharges,
        bankChargesLedgerId,
        tdsAmount: Number(tdsAmount) || 0,
        gstComponent,
        advanceHandling,
      },
      partyLedgerName,
    );
  }, [
    transaction,
    category,
    transactionDate,
    referenceNo,
    narration,
    customerId,
    vendorId,
    ledgerId,
    toBankLedgerId,
    numericAccountAmount,
    numericBankAmount,
    numericCharges,
    bankChargesLedgerId,
    tdsAmount,
    gstComponent,
    advanceHandling,
    partyLedgerName,
  ]);

  const handlePayInFull = (invoiceId: string, cap: number) => {
    setAllocations((prev) => ({ ...prev, [invoiceId]: String(cap) }));
  };

  const handleSave = async () => {
    if (!transaction || !category) {
      setError("Select a category.");
      return;
    }
    if (!canCategorizeTransaction(transaction)) {
      setError("This transaction cannot be categorized.");
      return;
    }

    setSaving(true);
    setError(null);

    const allocationLines = Object.entries(allocations)
      .map(([id, val]) => {
        const amount = Number(val) || 0;
        if (amount <= 0) return null;
        const inv = activeInvoices.find((i) => String(i.id) === id);
        if (category === "vendor_payment") {
          return { billId: Number(id), amount, documentNo: inv?.label };
        }
        return { invoiceId: Number(id), amount, documentNo: inv?.label };
      })
      .filter(Boolean) as { invoiceId?: number; billId?: number; amount: number; documentNo?: string }[];

    const result = categorizeBankTransaction({
      statementTransactionId: transaction.id,
      bankAccountId: transaction.bankAccountId,
      category: category as BankReconCategorizeCategory,
      transactionDate,
      referenceNo,
      narration,
      remarks,
      customerId: customerId ? Number(customerId) : null,
      vendorId: vendorId ? Number(vendorId) : null,
      ledgerId,
      toBankLedgerId,
      accountAmount: numericAccountAmount,
      bankAmount: numericBankAmount,
      bankChargesAmount: numericCharges,
      bankChargesLedgerId,
      tdsAmount: Number(tdsAmount) || 0,
      gstComponent,
      challanNo,
      gstPeriod,
      tdsFinancialYear,
      tdsQuarter,
      tdsNature,
      costCentre,
      advanceHandling: remainingAmount > 0.009 ? advanceHandling : undefined,
      allocations: allocationLines,
    });

    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "Failed to save.");
      return;
    }
    setToast(`Voucher ${result.voucherNumber} created and posted.`);
    onSaved();
    setTimeout(() => {
      onClose();
    }, 800);
  };

  if (!transaction) return null;

  const showCustomer =
    category === "customer_receipt" ||
    category === "customer_advance" ||
    category === "customer_refund";
  const showVendor = category === "vendor_payment" || category === "vendor_refund";
  const showInvoiceAlloc = category === "customer_receipt" || category === "vendor_payment";
  const showAdvanceSummary = category === "customer_receipt" || category === "customer_advance";
  const showLedger =
    category === "expense" ||
    category === "bank_charges" ||
    category === "interest_income" ||
    category === "interest_expense" ||
    category === "other_income" ||
    category === "other_payment" ||
    category === "employee_payment" ||
    category === "loan_received" ||
    category === "loan_repayment" ||
    category === "capital_introduced" ||
    category === "gst_refund" ||
    category === "tds_refund";
  const showBankCharges = category === "customer_receipt";
  const showGst = category === "gst_payment";
  const showTds = category === "tds_payment";
  const showTransfer = category === "bank_transfer";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="max-w-[520px] w-full">
        <SheetHeader>
          <SheetTitle>Categorize Transaction</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Bank Transaction</p>
            <DetailRow label="Statement Date" value={transaction.statementDate} />
            <DetailRow label="Value Date" value={transaction.valueDate || "—"} />
            <DetailRow
              label="Amount"
              value={
                <span className={isDeposit ? "text-emerald-700" : "text-red-700"}>
                  {isDeposit ? "Deposit" : "Withdrawal"} {formatMoney(stmtAmount)}
                </span>
              }
            />
            <DetailRow label="Reference" value={transaction.reference || transaction.chequeNo || "—"} />
            <DetailRow label="Narration" value={<span className="line-clamp-2 font-normal">{transaction.narration}</span>} />
            <DetailRow label="Match Status" value={<BankReconMatchStatusBadge status={transaction.matchStatus} />} />
            <DetailRow
              label="Verification"
              value={<BankReconVerificationStatusBadge status={transaction.verificationStatus} />}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Category <span className="text-red-500">*</span>
            </Label>
            <Select value={category} onValueChange={(v) => setCategory(v as BankReconCategorizeCategory)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select category…" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-sm">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {category ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{isDeposit ? "Receipt Date" : "Payment Date"}</Label>
                  <Input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Reference</Label>
                  <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>

              {showCustomer ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Customer <span className="text-red-500">*</span></Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select customer…" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.value} value={c.value} className="text-sm">{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {showVendor ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Vendor <span className="text-red-500">*</span></Label>
                  <Select value={vendorId} onValueChange={setVendorId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select vendor…" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.value} value={v.value} className="text-sm">{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {showLedger ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Ledger <span className="text-red-500">*</span></Label>
                  <GroupedLedgerSelect
                    value={ledgerId}
                    onChange={(l) => setLedgerId(l?.id ?? null)}
                    placeholder="Select ledger…"
                    ledgerFilter={coaFilter}
                  />
                </div>
              ) : null}

              {showTransfer ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">To Bank <span className="text-red-500">*</span></Label>
                  <Select
                    value={toBankLedgerId ? String(toBankLedgerId) : ""}
                    onValueChange={(v) => setToBankLedgerId(Number(v))}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select destination bank…" />
                    </SelectTrigger>
                    <SelectContent>
                      {transferBankOptions.map((l) => (
                        <SelectItem key={l!.id} value={String(l!.id)} className="text-sm">{l!.accountName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{isDeposit ? "Received Amount" : "Payment Amount"}</Label>
                  <AccountsMoneyInput value={accountAmount} onChange={(v) => setAccountAmount(String(v))} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Bank Amount</Label>
                  <AccountsMoneyInput value={bankAmount} onChange={(v) => setBankAmount(String(v))} className="h-9 text-sm" />
                </div>
              </div>

              {showBankCharges ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Bank Charges</Label>
                    <AccountsMoneyInput value={bankChargesAmount} onChange={(v) => setBankChargesAmount(String(v))} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Charges Ledger</Label>
                    <GroupedLedgerSelect
                      value={bankChargesLedgerId}
                      onChange={(l) => setBankChargesLedgerId(l?.id ?? null)}
                      placeholder="Bank charges ledger…"
                      ledgerFilter={bankReconLedgerFilterForCategory("bank_charges")}
                    />
                  </div>
                </div>
              ) : null}

              {showGst ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">GST Type</Label>
                    <Select value={gstComponent} onValueChange={(v) => setGstComponent(v as GstTaxComponent)}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["CGST", "SGST", "IGST", "CESS"] as const).map((g) => (
                          <SelectItem key={g} value={g} className="text-sm">{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Challan No.</Label>
                    <Input value={challanNo} onChange={(e) => setChallanNo(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs font-medium">Period</Label>
                    <Input value={gstPeriod} onChange={(e) => setGstPeriod(e.target.value)} placeholder="Apr 2026" className="h-9 text-sm" />
                  </div>
                </div>
              ) : null}

              {showTds ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Financial Year</Label>
                    <Input value={tdsFinancialYear} onChange={(e) => setTdsFinancialYear(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Quarter</Label>
                    <Select value={tdsQuarter} onValueChange={setTdsQuarter}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                          <SelectItem key={q} value={q} className="text-sm">{q}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs font-medium">Nature</Label>
                    <Input value={tdsNature} onChange={(e) => setTdsNature(e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>
              ) : null}

              {(category === "vendor_payment" || category === "expense") && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">TDS Amount</Label>
                  <AccountsMoneyInput value={tdsAmount} onChange={(v) => setTdsAmount(String(v))} className="h-9 text-sm" />
                </div>
              )}

              {category === "expense" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Cost Centre</Label>
                  <Input value={costCentre} onChange={(e) => setCostCentre(e.target.value)} className="h-9 text-sm" />
                </div>
              ) : null}

              {showInvoiceAlloc && activeInvoices.length > 0 ? (
                <InvoiceAllocationPanel
                  title={category === "vendor_payment" ? "Purchase Bills" : "Outstanding Invoices"}
                  invoices={activeInvoices}
                  allocations={allocations}
                  transactionAmount={numericAccountAmount}
                  amountLabel={isDeposit ? "Received Amount" : "Payment Amount"}
                  onAllocationChange={(id, val) => setAllocations((prev) => ({ ...prev, [id]: val }))}
                  onPayInFull={handlePayInFull}
                  onClearAll={() => setAllocations({})}
                  onSelectInvoice={(id) => handlePayInFull(id, Math.min(activeInvoices.find((i) => String(i.id) === id)?.balance ?? 0, numericAccountAmount))}
                />
              ) : null}

              {showAdvanceSummary ? (
                <div className="rounded-lg border border-border px-3 py-2 space-y-1 text-[11px] bg-muted/20">
                  <div className="flex justify-between"><span className="text-muted-foreground">Received Amount</span><span className="font-semibold">{formatMoney(numericAccountAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Applied Amount</span><span className="font-semibold">{formatMoney(totalApplied)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Remaining</span><span className={cn("font-semibold", remainingAmount > 0 && "text-brand-700")}>{formatMoney(remainingAmount)}</span></div>
                  {remainingAmount > 0.009 ? (
                    <div className="pt-1 space-y-1">
                      <Label className="text-xs">Advance Handling</Label>
                      <Select value={advanceHandling} onValueChange={(v) => setAdvanceHandling(v as AdvanceHandling)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="keep_advance" className="text-xs">Keep as Customer Advance</SelectItem>
                          <SelectItem value="apply_later" className="text-xs">Apply Later</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Narration</Label>
                <Textarea rows={2} value={narration} onChange={(e) => setNarration(e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Remarks</Label>
                <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} className="text-sm" />
              </div>

              <BankReconAccountingPreview lines={previewLines} />

              {error ? (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {error}
                </p>
              ) : null}
              {toast ? (
                <p className="text-xs text-emerald-700 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {toast}
                </p>
              ) : null}
            </>
          ) : null}
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={handleSave}
            disabled={saving || !category}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save & Post
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
