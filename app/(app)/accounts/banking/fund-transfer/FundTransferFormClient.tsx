"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { AccountsFormLayout } from "@/app/(app)/accounts/expenses/components/AccountsFormLayout";
import {
  createFundTransfer,
  FUND_TRANSFER_TYPE_LABELS,
  listTransferAccountOptions,
  type FundTransferType,
} from "@/lib/accounts/fund-transfer-data";
import { loadBankAccounts } from "@/lib/accounts/bank-accounts-data";

export default function FundTransferFormClient() {
  const router = useRouter();
  const [form, setForm] = useState({
    transferDate: new Date().toISOString().slice(0, 10),
    transferType: "bank_to_bank" as FundTransferType,
    fromAccountId: "",
    toAccountId: "",
    amount: "",
    referenceNumber: "",
    remarks: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBankAccounts();
  }, []);

  const accountOptions = useMemo(
    () => listTransferAccountOptions(form.transferType),
    [form.transferType],
  );

  const save = (post: boolean) => {
    setError(null);
    if (!form.fromAccountId || !form.toAccountId) {
      setError("Select both From and To accounts.");
      return;
    }
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setError("Enter a valid transfer amount.");
      return;
    }
    try {
      createFundTransfer({
        transferDate: form.transferDate,
        transferType: form.transferType,
        fromAccountId: Number(form.fromAccountId),
        toAccountId: Number(form.toAccountId),
        amount,
        referenceNumber: form.referenceNumber,
        remarks: form.remarks,
        post,
      });
      router.push("/accounts/banking/fund-transfer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save transfer.");
    }
  };

  return (
    <AccountsFormLayout
      title="New Fund Transfer"
      breadcrumb={[
        { label: "Accounts", href: "/accounts/masters/chart-of-accounts" },
        { label: "Banking", href: "/accounts/banking/bank-accounts" },
        { label: "Fund Transfer", href: "/accounts/banking/fund-transfer" },
        { label: "New", href: "/accounts/banking/fund-transfer/new" },
      ]}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 text-white" onClick={() => save(true)}>
            Post Transfer
          </Button>
        </div>
      }
    >
      <div className="max-w-2xl space-y-4 p-4">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px]">Transfer Date</Label>
            <Input
              type="date"
              className="h-8 text-xs"
              value={form.transferDate}
              onChange={(e) => setForm({ ...form, transferDate: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Transfer Type</Label>
            <Select
              value={form.transferType}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  transferType: v as FundTransferType,
                  fromAccountId: "",
                  toAccountId: "",
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FUND_TRANSFER_TYPE_LABELS) as FundTransferType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {FUND_TRANSFER_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">From Account</Label>
            <Select
              value={form.fromAccountId || "none"}
              onValueChange={(v) => setForm({ ...form, fromAccountId: v === "none" ? "" : v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select source account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select…</SelectItem>
                {accountOptions.from.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">To Account</Label>
            <Select
              value={form.toAccountId || "none"}
              onValueChange={(v) => setForm({ ...form, toAccountId: v === "none" ? "" : v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select destination account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select…</SelectItem>
                {accountOptions.to.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Amount</Label>
            <Input
              type="number"
              className="h-8 text-xs"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Reference Number</Label>
            <Input
              className="h-8 text-xs font-mono"
              value={form.referenceNumber}
              onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
              placeholder="Auto-generated if blank (FT-0001)"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-[11px]">Remarks</Label>
            <Textarea
              className="text-xs min-h-[72px]"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Transfer purpose or notes"
            />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Posting credits the source account and debits the destination account via a contra voucher.
        </p>
      </div>
    </AccountsFormLayout>
  );
}
