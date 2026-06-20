"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountsFormLayout } from "@/app/(app)/accounts/expenses/components/AccountsFormLayout";
import {
  createBankAccountWithLedger,
  isDuplicateAccountNumber,
  loadBankAccounts,
  type BankAccountType,
} from "@/lib/accounts/bank-accounts-data";
import { formatBankAccountLabel } from "@/lib/accounts/bank-account-display";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { getBankGroups } from "@/lib/accounts/bank-coa-utils";

const ACCOUNT_TYPES: BankAccountType[] = ["Current", "Savings", "OD", "CC"];

export default function BankAccountFormClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetGroupId = searchParams.get("bankGroupId");

  const [form, setForm] = useState({
    bankName: "",
    bankGroupCoaId: presetGroupId ?? "",
    accountNickname: "",
    accountNumber: "",
    ifsc: "",
    branchName: "",
    accountType: "Current" as BankAccountType,
    openingBalance: "0",
    openingBalanceDate: new Date().toISOString().slice(0, 10),
    reconciliationEnabled: true,
    defaultForReceipts: false,
    defaultForPayments: false,
    status: "active" as "active" | "inactive",
  });
  const [error, setError] = useState<string | null>(null);

  const bankGroups = useMemo(() => getBankGroups(loadChartOfAccounts()), []);

  useEffect(() => {
    if (presetGroupId) {
      const g = bankGroups.find((b) => String(b.id) === presetGroupId);
      if (g) setForm((f) => ({ ...f, bankName: g.accountName, bankGroupCoaId: presetGroupId }));
    }
  }, [presetGroupId, bankGroups]);

  const coaLedgerPreview = useMemo(() => {
    if (!form.accountNickname.trim()) return "—";
    return formatBankAccountLabel(form.accountNickname.trim(), form.accountNumber.trim());
  }, [form.accountNickname, form.accountNumber]);

  const save = () => {
    setError(null);
    if (!form.accountNickname.trim()) {
      setError("Account name is required.");
      return;
    }
    if (!form.accountNumber.trim()) {
      setError("Account number is required.");
      return;
    }
    if (!form.ifsc.trim()) {
      setError("IFSC code is required.");
      return;
    }
    if (isDuplicateAccountNumber(form.accountNumber.trim())) {
      setError("An account with this account number already exists.");
      return;
    }
    if (!form.bankName.trim() && !form.bankGroupCoaId) {
      setError("Bank name or linked COA group is required.");
      return;
    }
    try {
      loadBankAccounts();
      createBankAccountWithLedger({
        bankName: form.bankName.trim(),
        bankGroupCoaId: form.bankGroupCoaId ? Number(form.bankGroupCoaId) : null,
        accountNickname: form.accountNickname.trim(),
        accountNumber: form.accountNumber.trim(),
        ifsc: form.ifsc.trim(),
        branchName: form.branchName.trim(),
        accountType: form.accountType,
        openingBalance: Number(form.openingBalance) || 0,
        openingBalanceDate: form.openingBalanceDate,
        reconciliationEnabled: form.reconciliationEnabled,
        defaultForReceipts: form.defaultForReceipts,
        defaultForPayments: form.defaultForPayments,
        status: form.status,
      });
      router.push("/accounts/banking/bank-accounts");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save bank account.");
    }
  };

  return (
    <AccountsFormLayout
      title="Add Bank Account"
      breadcrumb={[
        { label: "Accounts", href: "/accounts/masters/chart-of-accounts" },
        { label: "Banking", href: "/accounts/banking/bank-accounts" },
        { label: "Bank Accounts", href: "/accounts/banking/bank-accounts" },
        { label: "Add", href: "/accounts/banking/bank-accounts/new" },
      ]}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 text-white" onClick={save}>
            Save Bank Account
          </Button>
        </div>
      }
    >
      <div className="max-w-2xl space-y-4 p-4">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-[11px]">Linked COA Bank Group</Label>
            <Select
              value={form.bankGroupCoaId || "new"}
              onValueChange={(v) => {
                if (v === "new") {
                  setForm((f) => ({ ...f, bankGroupCoaId: "", bankName: f.bankName }));
                } else {
                  const g = bankGroups.find((b) => String(b.id) === v);
                  setForm((f) => ({
                    ...f,
                    bankGroupCoaId: v,
                    bankName: g?.accountName ?? f.bankName,
                  }));
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select bank group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">+ New bank group (enter name below)</SelectItem>
                {bankGroups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.accountName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Bank Name</Label>
            <Input
              className="h-8 text-xs"
              value={form.bankName}
              disabled={!!form.bankGroupCoaId}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              placeholder="e.g. HDFC Bank"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Account Name</Label>
            <Input
              className="h-8 text-xs"
              value={form.accountNickname}
              onChange={(e) => setForm({ ...form, accountNickname: e.target.value })}
              placeholder="e.g. HDFC Current Account"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Account Number *</Label>
            <Input
              className="h-8 text-xs font-mono"
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              placeholder="e.g. XXXX7890"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">IFSC Code *</Label>
            <Input
              className="h-8 text-xs font-mono"
              value={form.ifsc}
              onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })}
              placeholder="e.g. HDFC0001234"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Branch Name</Label>
            <Input
              className="h-8 text-xs"
              value={form.branchName}
              onChange={(e) => setForm({ ...form, branchName: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Account Type</Label>
            <Select
              value={form.accountType}
              onValueChange={(v) => setForm({ ...form, accountType: v as BankAccountType })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Opening Balance</Label>
            <Input
              className="h-8 text-xs"
              type="number"
              value={form.openingBalance}
              onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Opening Balance Date</Label>
            <Input
              className="h-8 text-xs"
              type="date"
              value={form.openingBalanceDate}
              onChange={(e) => setForm({ ...form, openingBalanceDate: e.target.value })}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-[11px]">COA Ledger Mapping (Bank Account Ledger)</Label>
            <Input className="h-8 text-xs bg-muted/30" readOnly value={coaLedgerPreview} />
            <p className="text-[10px] text-muted-foreground">
              A ledger will be auto-created under the selected bank group on save.
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as "active" | "inactive" })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 pt-2">
          <label className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={form.reconciliationEnabled}
              onCheckedChange={(c) => setForm({ ...form, reconciliationEnabled: !!c })}
            />
            Reconciliation Enabled
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={form.defaultForReceipts}
              onCheckedChange={(c) => setForm({ ...form, defaultForReceipts: !!c })}
            />
            Default for Receipts
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={form.defaultForPayments}
              onCheckedChange={(c) => setForm({ ...form, defaultForPayments: !!c })}
            />
            Default for Payments
          </label>
        </div>
      </div>
    </AccountsFormLayout>
  );
}
