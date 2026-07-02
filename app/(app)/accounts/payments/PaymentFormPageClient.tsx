"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { SearchableSelect } from "../credit-notes/components/SearchableSelect";
import {
  canEditPayment,
  createCompanyPayment,
  getCompanyPaymentById,
  getBalanceAmount,
  listPayableReferenceOptions,
  lookupPayableSource,
  PAYMENT_MODES,
  sourceTypeLabel,
  SOURCE_TYPE_OPTIONS,
  updateCompanyPaymentHeader,
  type PaidToType,
  type PaymentSourceType,
} from "./payments-data";
import type { PaymentMode } from "../expenses/expense-data";
import { formatINR, PAYMENTS_BREADCRUMB, PAYMENTS_LIST_PATH } from "./payment-utils";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-border/60 p-4 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

function CompactCard({ rows }: { rows: { label: string; value: string }[] }) {
  const visible = rows.filter((r) => r.value);
  if (!visible.length) return null;
  return (
    <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-[11px]">
      {visible.map((r) => (
        <div key={r.label}>
          <span className="text-muted-foreground">{r.label}: </span>
          <span className="font-medium">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function PaymentFormPageClient({ paymentId }: { paymentId?: number }) {
  const router = useRouter();
  const isEdit = paymentId != null;

  const [paymentNo, setPaymentNo] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [sourceType, setSourceType] = useState<PaymentSourceType>("tada_claim");
  const [sourceRef, setSourceRef] = useState("");
  const [paidToType, setPaidToType] = useState<PaidToType>("employee");
  const [paidTo, setPaidTo] = useState("");
  const [employeeOrVendor, setEmployeeOrVendor] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [alreadyPaid, setAlreadyPaid] = useState("0");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("Bank Transfer");
  const [paymentReferenceNo, setPaymentReferenceNo] = useState("");
  const [transactionNo, setTransactionNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refOptions = useMemo(
    () => listPayableReferenceOptions(sourceType),
    [sourceType],
  );

  const needsReference = sourceType !== "manual" && sourceType !== "vendor_adjustment";

  useEffect(() => {
    if (!isEdit || paymentId == null) return;
    const rec = getCompanyPaymentById(paymentId);
    if (!rec || !canEditPayment(rec)) {
      router.replace(PAYMENTS_LIST_PATH);
      return;
    }
    setPaymentNo(rec.paymentNo);
    setPaymentDate(rec.paymentDate);
    setSourceType(rec.sourceType);
    setSourceRef(rec.sourceReferenceNo);
    setPaidToType(rec.paidToType);
    setPaidTo(rec.paidTo);
    setEmployeeOrVendor(rec.employeeOrVendor);
    setTotalAmount(String(rec.approvedAmount));
    setAlreadyPaid(String(rec.paidAmount));
    setBalanceAmount(String(getBalanceAmount(rec)));
  }, [isEdit, paymentId, router]);

  const applySource = (ref: string) => {
    setSourceRef(ref);
    if (!ref || sourceType === "manual" || sourceType === "vendor_adjustment") return;
    const found = lookupPayableSource(sourceType, ref);
    if (!found) {
      setError("Reference not found or not approved for payment.");
      return;
    }
    setPaidTo(found.paidTo);
    setPaidToType(found.paidToType);
    setEmployeeOrVendor(found.employeeOrVendor);
    setTotalAmount(String(found.approvedAmount));
    setAlreadyPaid(String(found.approvedAmount - found.balanceAmount));
    setBalanceAmount(String(found.balanceAmount));
    setPayAmount(String(found.balanceAmount));
    setError(null);
  };

  const onSourceTypeChange = (type: PaymentSourceType) => {
    setSourceType(type);
    setSourceRef("");
    setTotalAmount("");
    setAlreadyPaid("0");
    setBalanceAmount("");
    setPayAmount("");
    if (type === "manual") {
      setPaidToType("vendor");
      setPaidTo("");
      setEmployeeOrVendor("");
    }
  };

  const submit = () => {
    setError(null);
    const approved = parseFloat(totalAmount) || parseFloat(payAmount) || 0;
    const installmentAmt = isEdit ? 0 : parseFloat(payAmount) || 0;

    if (needsReference && !sourceRef.trim()) {
      setError("Select a source reference.");
      return;
    }
    if (!paidTo.trim() && sourceType === "manual") {
      setError("Payee name is required.");
      return;
    }
    if (sourceType === "manual" && approved <= 0) {
      setError("Enter payment amount for manual payment.");
      return;
    }
    if (!isEdit && needsReference && installmentAmt <= 0) {
      setError("Enter payment amount greater than zero.");
      return;
    }

    try {
      if (isEdit && paymentId != null) {
        updateCompanyPaymentHeader(paymentId, {
          paymentDate,
          paidToType,
          paidTo: paidTo.trim() || employeeOrVendor,
          sourceType,
          sourceModuleLabel: sourceTypeLabel(sourceType),
          sourceReferenceNo: sourceRef.trim(),
          employeeOrVendor: employeeOrVendor.trim() || paidTo.trim(),
          claimedAmount: approved,
          approvedAmount: approved,
        });
        router.push(`${PAYMENTS_LIST_PATH}/${paymentId}`);
      } else {
        const rec = createCompanyPayment({
          paymentDate,
          paidToType,
          paidTo: paidTo.trim() || employeeOrVendor,
          sourceType,
          sourceModuleLabel: sourceTypeLabel(sourceType),
          sourceReferenceNo: sourceRef.trim(),
          employeeOrVendor: employeeOrVendor.trim() || paidTo.trim(),
          claimedAmount: approved,
          approvedAmount: sourceType === "manual" ? installmentAmt : approved,
          installment: {
            amount: installmentAmt,
            paymentMode,
            paymentReferenceNo: paymentReferenceNo.trim(),
            transactionNo: transactionNo.trim(),
            remarks: remarks.trim(),
          },
        });
        router.push(`${PAYMENTS_LIST_PATH}/${rec.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
  };

  return (
    <AccountsFormLayout
      title={isEdit ? "Edit Payment" : "Record Payment"}
      breadcrumb={[...PAYMENTS_BREADCRUMB]}
      code={paymentNo || undefined}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push(PAYMENTS_LIST_PATH)}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={submit}>
            {isEdit ? "Save" : "Record Payment"}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-8 items-start">
        <div className="lg:col-span-2 space-y-4">
          <Section title="Basic Details">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Payment No.</Label>
                <Input className="h-8 text-xs bg-muted/30" disabled value={isEdit ? paymentNo : "Auto-generated"} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Payment Date *</Label>
                <Input type="date" className="h-8 text-xs" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Source Type *</Label>
                <Select value={sourceType} onValueChange={(v) => onSourceTypeChange(v as PaymentSourceType)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {needsReference && (
              <SearchableSelect
                label={`Select ${sourceTypeLabel(sourceType)}`}
                value={sourceRef}
                onChange={applySource}
                options={refOptions}
                placeholder="Search reference…"
                required
              />
            )}

            {(sourceType === "manual" || sourceType === "vendor_adjustment") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Payee *</Label>
                  <Input className="h-8 text-xs" value={paidTo} onChange={(e) => { setPaidTo(e.target.value); setEmployeeOrVendor(e.target.value); }} />
                </div>
                {sourceType === "vendor_adjustment" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Reference No. (optional)</Label>
                    <Input className="h-8 text-xs" value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} />
                  </div>
                )}
              </div>
            )}

            <CompactCard
              rows={
                needsReference && sourceRef
                  ? [
                      { label: "Payee", value: employeeOrVendor || paidTo },
                      { label: "Reference", value: sourceRef },
                      { label: "Total Amount", value: totalAmount ? formatINR(parseFloat(totalAmount)) : "" },
                      { label: "Already Paid", value: formatINR(parseFloat(alreadyPaid) || 0) },
                      { label: "Balance", value: balanceAmount ? formatINR(parseFloat(balanceAmount)) : "" },
                    ]
                  : []
              }
            />
            {sourceType === "purchase" && (
              <p className="text-[10px] text-muted-foreground">
                Effective payable after debit notes will be applied in a future update. Currently using invoice total.
              </p>
            )}
          </Section>

          {!isEdit && (
            <Section title="Payment Details">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Payment Amount *</Label>
                  <AccountsMoneyInput className="h-8 text-xs" value={payAmount} onChange={(v) => setPayAmount(String(v))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Payment Mode *</Label>
                  <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODES.map((m) => (
                        <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Reference Number</Label>
                  <Input className="h-8 text-xs" value={paymentReferenceNo} onChange={(e) => setPaymentReferenceNo(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Transaction Number</Label>
                  <Input className="h-8 text-xs" value={transactionNo} onChange={(e) => setTransactionNo(e.target.value)} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Remarks</Label>
                  <Textarea className="min-h-[56px] text-xs resize-none" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </div>
              </div>
            </Section>
          )}

          {isEdit && (
            <p className="text-xs text-muted-foreground">Use Record Payment on the view screen to add installments.</p>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="lg:sticky lg:top-20">
          <div className="rounded-lg border bg-white p-4 space-y-2 text-xs">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground">Summary</h2>
            <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="tabular-nums">{formatINR(parseFloat(totalAmount) || 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="tabular-nums">{formatINR(parseFloat(alreadyPaid) || 0)}</span></div>
            <div className="flex justify-between font-semibold text-brand-700 pt-2 border-t"><span>Balance</span><span className="tabular-nums">{formatINR(parseFloat(balanceAmount) || parseFloat(totalAmount) || 0)}</span></div>
            {!isEdit && parseFloat(payAmount) > 0 && (
              <div className="flex justify-between text-emerald-700 pt-1"><span>This payment</span><span className="tabular-nums">{formatINR(parseFloat(payAmount))}</span></div>
            )}
          </div>
        </div>
      </div>
    </AccountsFormLayout>
  );
}
