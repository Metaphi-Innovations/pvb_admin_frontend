"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
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
  getBankAccountById,
  isDuplicateAccountNumber,
  loadBankAccounts,
  updateBankAccount,
  type BankAccountType,
} from "@/lib/accounts/bank-accounts-data";

const ACCOUNT_TYPES: BankAccountType[] = ["Current", "Savings", "OD", "CC"];

interface FormState {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifsc: string;
  branchName: string;
  accountType: BankAccountType;
  openingBalance: string;
  openingBalanceType: "Debit" | "Credit";
  reconciliationEnabled: boolean;
  defaultForReceipts: boolean;
  defaultForPayments: boolean;
  status: "active" | "inactive";
}

const EMPTY_FORM: FormState = {
  bankName: "",
  accountHolderName: "",
  accountNumber: "",
  ifsc: "",
  branchName: "",
  accountType: "Current",
  openingBalance: "0",
  openingBalanceType: "Debit",
  reconciliationEnabled: true,
  defaultForReceipts: false,
  defaultForPayments: false,
  status: "active",
};

export default function BankAccountFormClient({ accountId }: { accountId?: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetGroupId = searchParams.get("bankGroupId");
  const isEdit = accountId != null;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBankAccounts();
    if (!isEdit || accountId == null) return;
    const account = getBankAccountById(accountId);
    if (!account) {
      router.replace("/accounts/banking/bank-accounts");
      return;
    }
    setForm({
      bankName: account.bankName,
      accountHolderName: account.accountNickname,
      accountNumber: account.accountNumber,
      ifsc: account.ifsc,
      branchName: account.branchName,
      accountType: account.accountType,
      openingBalance: String(account.openingBalance),
      openingBalanceType: account.balanceType,
      reconciliationEnabled: account.reconciliationEnabled,
      defaultForReceipts: account.defaultForReceipts,
      defaultForPayments: account.defaultForPayments,
      status: account.status,
    });
  }, [isEdit, accountId, router]);

  const pageTitle = isEdit ? "Edit Bank Account" : "Add Bank Account";

  const savePayload = useMemo(
    () => ({
      bankName: form.bankName.trim(),
      accountNickname: form.accountHolderName.trim(),
      accountNumber: form.accountNumber.trim(),
      ifsc: form.ifsc.trim(),
      branchName: form.branchName.trim(),
      accountType: form.accountType,
      openingBalance: Number(form.openingBalance) || 0,
      balanceType: form.openingBalanceType,
      reconciliationEnabled: form.reconciliationEnabled,
      defaultForReceipts: form.defaultForReceipts,
      defaultForPayments: form.defaultForPayments,
      status: form.status,
    }),
    [form],
  );

  const save = () => {
    setError(null);
    if (!form.bankName.trim()) {
      setError("Bank name is required.");
      return;
    }
    if (!form.accountHolderName.trim()) {
      setError("Account holder name is required.");
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
    if (isDuplicateAccountNumber(form.accountNumber.trim(), isEdit ? accountId : undefined)) {
      setError("An account with this account number already exists.");
      return;
    }
    try {
      loadBankAccounts();
      if (isEdit && accountId != null) {
        updateBankAccount(accountId, savePayload);
      } else {
        createBankAccountWithLedger({
          ...savePayload,
          bankGroupCoaId: presetGroupId ? Number(presetGroupId) : null,
          openingBalanceDate: new Date().toISOString().slice(0, 10),
        });
      }
      router.push("/accounts/banking/bank-accounts");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save bank account.");
    }
  };

  return (
    <AccountsFormLayout
      title={pageTitle}
      breadcrumb={[
        { label: "Accounts", href: "/accounts/masters/chart-of-accounts" },
        { label: "Banking", href: "/accounts/banking/bank-accounts" },
        { label: "Bank Accounts", href: "/accounts/banking/bank-accounts" },
        { label: isEdit ? "Edit" : "Add", href: isEdit ? `/accounts/banking/bank-accounts/${accountId}/edit` : "/accounts/banking/bank-accounts/new" },
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
            <Label className="text-xs font-medium">Bank Name *</Label>
            <Input
              className="h-9 text-sm rounded-lg"
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              placeholder="e.g. HDFC Bank"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs font-medium">Account Holder Name *</Label>
            <Input
              className="h-9 text-sm rounded-lg"
              value={form.accountHolderName}
              onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
              placeholder="e.g. Dharitri Sutra Agri Pvt Ltd"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Account Number *</Label>
            <Input
              className="h-9 text-sm rounded-lg font-mono"
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              placeholder="e.g. 50100123456789"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">IFSC Code *</Label>
            <Input
              className="h-9 text-sm rounded-lg font-mono"
              value={form.ifsc}
              onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })}
              placeholder="e.g. HDFC0001234"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Branch</Label>
            <Input
              className="h-9 text-sm rounded-lg"
              value={form.branchName}
              onChange={(e) => setForm({ ...form, branchName: e.target.value })}
              placeholder="e.g. FC Road, Pune"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Account Type</Label>
            <Select
              value={form.accountType}
              onValueChange={(v) => setForm({ ...form, accountType: v as BankAccountType })}
            >
              <SelectTrigger className="h-9 text-sm rounded-lg">
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
            <Label className="text-xs font-medium">Opening Balance</Label>
            <AccountsMoneyInput
              className="h-9 text-sm rounded-lg"
              value={form.openingBalance}
              onChange={(v) => setForm({ ...form, openingBalance: String(v) })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Opening Balance Type</Label>
            <Select
              value={form.openingBalanceType}
              onValueChange={(v) => setForm({ ...form, openingBalanceType: v as "Debit" | "Credit" })}
            >
              <SelectTrigger className="h-9 text-sm rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Debit">Dr</SelectItem>
                <SelectItem value="Credit">Cr</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as "active" | "inactive" })}
            >
              <SelectTrigger className="h-9 text-sm rounded-lg">
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
