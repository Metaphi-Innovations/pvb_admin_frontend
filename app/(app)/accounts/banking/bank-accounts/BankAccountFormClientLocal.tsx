"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Label } from "@/components/ui/label";
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
import { BankWarehouseMappingSelect } from "@/components/accounts/BankWarehouseMappingSelect";
import { CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";

const ACCOUNT_TYPES: BankAccountType[] = ["Current", "Savings", "OD", "CC"];

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="pb-2 border-b border-border mb-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

interface FormState {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifsc: string;
  branchName: string;
  accountType: BankAccountType;
  openingBalance: string;
  openingBalanceType: "Debit" | "Credit";
  status: "active" | "inactive";
  mappedWarehouseIds: number[];
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
  status: "active",
  mappedWarehouseIds: [],
};

export default function BankAccountFormClient({
  accountId,
  presetGroupId: presetGroupIdProp,
  onClose,
  onSaved,
}: {
  accountId?: number;
  presetGroupId?: number;
  onClose?: () => void;
  onSaved?: (ledgerId: number, parentGroupId: number) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetGroupIdParam = searchParams.get("bankGroupId");
  const returnToParam = searchParams.get("returnTo");
  const fromCoa =
    searchParams.get("source") === "chart-of-accounts" ||
    searchParams.get("from") === "coa" ||
    onClose != null ||
    onSaved != null;
  const presetGroupId =
    presetGroupIdProp ??
    (presetGroupIdParam && Number.isFinite(Number(presetGroupIdParam))
      ? Number(presetGroupIdParam)
      : null);
  const isEdit = accountId != null;
  const bankingListHref = "/accounts/banking/bank-accounts";
  const leaveHref =
    returnToParam ||
    (fromCoa && presetGroupId != null
      ? `${CHART_OF_ACCOUNTS_HREF}?node=${presetGroupId}`
      : fromCoa
        ? CHART_OF_ACCOUNTS_HREF
        : bankingListHref);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [warehouseError, setWarehouseError] = useState<string | null>(null);

  useEffect(() => {
    loadBankAccounts();
    if (!isEdit || accountId == null) {
      // New account: keep EMPTY_FORM defaults ΓÇö warehouses stay unselected.
      return;
    }
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
      status: account.status,
      mappedWarehouseIds: account.mappedWarehouseIds ?? [],
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
      // Always eligible for book / vouchers / manual recon ΓÇö no per-account toggles.
      reconciliationEnabled: true,
      defaultForReceipts: false,
      defaultForPayments: false,
      status: form.status,
      mappedWarehouseIds: form.mappedWarehouseIds,
    }),
    [form],
  );

  const save = () => {
    setError(null);
    setWarehouseError(null);
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
    if (form.mappedWarehouseIds.length === 0) {
      setWarehouseError("Select at least one mapped warehouse.");
      return;
    }
    try {
      loadBankAccounts();
      if (isEdit && accountId != null) {
        const updated = updateBankAccount(accountId, savePayload);
        if (onSaved) {
          onSaved(
            updated.coaLedgerId,
            presetGroupId ?? updated.bankGroupCoaId,
          );
          return;
        }
      } else {
        const created = createBankAccountWithLedger({
          ...savePayload,
          bankGroupCoaId: presetGroupId,
          openingBalanceDate: new Date().toISOString().slice(0, 10),
        });
        if (onSaved) {
          // Prefer the COA node the user clicked (Bank Accounts) for return navigation.
          onSaved(created.coaLedgerId, presetGroupId ?? created.bankGroupCoaId);
          return;
        }
      }
      router.push(leaveHref);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save bank account.");
    }
  };

  const handleCancel = () => {
    if (onClose) {
      onClose();
      return;
    }
    router.push(leaveHref);
  };

  return (
    <AccountsFormLayout
      title={pageTitle}
      fullWidth
      breadcrumb={
        fromCoa
          ? [
              { label: "Accounts", href: CHART_OF_ACCOUNTS_HREF },
              { label: "Chart of Accounts", href: leaveHref },
              { label: "Bank Accounts", href: leaveHref },
              {
                label: isEdit ? "Edit" : "Add",
                href: isEdit
                  ? `/accounts/banking/bank-accounts/${accountId}/edit`
                  : "/accounts/banking/bank-accounts/new",
              },
            ]
          : [
              { label: "Accounts", href: CHART_OF_ACCOUNTS_HREF },
              { label: "Banking", href: bankingListHref },
              { label: "Bank Accounts", href: bankingListHref },
              {
                label: isEdit ? "Edit" : "Add",
                href: isEdit
                  ? `/accounts/banking/bank-accounts/${accountId}/edit`
                  : "/accounts/banking/bank-accounts/new",
              },
            ]
      }
      footer={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-9 text-xs font-semibold rounded-lg"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            className="h-9 text-xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700"
            onClick={save}
          >
            Save
          </Button>
        </div>
      }
    >
      {/* mt-3 matches Generic Ledger space-y-3 between header and card */}
      <div className="mt-3 w-full rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="space-y-4">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <section>
            <SectionHeading label="Bank Information" />
            <div className="grid max-w-[800px] grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Bank Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  className="h-9 text-sm rounded-lg"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  placeholder="e.g. HDFC Bank"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Account Holder Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  className="h-9 text-sm rounded-lg"
                  value={form.accountHolderName}
                  onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
                  placeholder="e.g. Dharitri Sutra Agri Pvt Ltd"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Account Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  className="h-9 text-sm rounded-lg font-mono"
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                  placeholder="e.g. 50100123456789"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  IFSC Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  className="h-9 text-sm rounded-lg font-mono"
                  value={form.ifsc}
                  onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })}
                  placeholder="e.g. HDFC0001234"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Branch</Label>
                <Input
                  className="h-9 text-sm rounded-lg"
                  value={form.branchName}
                  onChange={(e) => setForm({ ...form, branchName: e.target.value })}
                  placeholder="e.g. FC Road, Pune"
                />
              </div>
              <div className="space-y-1.5">
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
                      <SelectItem key={t} value={t} className="text-xs">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section>
            <SectionHeading label="Accounting Details" />
            <div className="grid max-w-[560px] grid-cols-1 gap-3 md:grid-cols-[minmax(280px,320px)_minmax(220px,260px)]">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Opening Balance</Label>
                <AccountsMoneyInput
                  className="h-9 text-sm rounded-lg"
                  value={form.openingBalance}
                  onChange={(v) => setForm({ ...form, openingBalance: String(v) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Opening Balance Type</Label>
                <Select
                  value={form.openingBalanceType}
                  onValueChange={(v) =>
                    setForm({ ...form, openingBalanceType: v as "Debit" | "Credit" })
                  }
                >
                  <SelectTrigger className="h-9 text-sm rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Debit" className="text-xs">
                      Dr
                    </SelectItem>
                    <SelectItem value="Credit" className="text-xs">
                      Cr
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section>
            <SectionHeading label="Warehouse Mapping" />
            <div className="w-full max-w-[640px]">
              <BankWarehouseMappingSelect
                value={form.mappedWarehouseIds}
                onChange={(mappedWarehouseIds) => {
                  setForm({ ...form, mappedWarehouseIds });
                  setWarehouseError(null);
                }}
                error={warehouseError}
              />
            </div>
          </section>
        </div>
      </div>
    </AccountsFormLayout>
  );
}
