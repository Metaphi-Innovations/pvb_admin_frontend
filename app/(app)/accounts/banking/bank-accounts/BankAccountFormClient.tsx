"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccountsFormLayout } from "@/app/(app)/accounts/expenses/components/AccountsFormLayout";
import { ReportMultiSelect } from "@/components/accounts/ReportMultiSelect";
import { CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";
import { useFY } from "@/lib/fy-store";
import { usePermissionsOptional } from "@/lib/auth";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useWarehousesDropdown } from "@/hooks/masters";
import {
  useBankAccountByLedgerId,
  useCompleteBankAccountDetails,
  useCreateBankAccount,
} from "@/hooks/accounts/use-bank-accounts";
import {
  ACCOUNT_TYPE_OPTIONS,
  extractBankAccountErrorMessage,
  type BankAccountApiAccountType,
  type BankAccountApiStatus,
  type BankAccountOpeningBalanceType,
} from "@/services/bank-accounts-list.service";
import {
  buildCompleteBankAccountDetailsPayload,
  buildCreateBankAccountPayload,
  EMPTY_BANK_ACCOUNT_FORM,
  normalizeIfsc,
  type BankAccountFormValues,
  validateBankAccountForm,
} from "@/lib/accounts/bank-account-form";
import type { ReportMultiSelectOption } from "@/lib/accounts/report-multi-filter-utils";

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="pb-2 border-b border-border mb-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-red-500 flex items-center gap-1">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      {message}
    </p>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-muted/20">
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

type FormMode = "create" | "complete";

export default function BankAccountFormClient({
  mode: modeProp,
  ledgerId: ledgerIdProp,
  onClose,
  onSaved,
}: {
  mode?: FormMode;
  ledgerId?: string;
  onClose?: () => void;
  onSaved?: (ledgerId: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedFY } = useFY();
  const permissions = usePermissionsOptional();

  const returnToParam = searchParams.get("returnTo");
  const fromCoa =
    searchParams.get("source") === "chart-of-accounts" ||
    searchParams.get("from") === "coa" ||
    onClose != null ||
    onSaved != null;

  const ledgerId =
    ledgerIdProp ??
    searchParams.get("ledgerId") ??
    undefined;
  const mode: FormMode =
    modeProp ?? (ledgerId ? "complete" : "create");

  const bankingListHref = "/accounts/banking/bank-accounts";
  const leaveHref =
    returnToParam ||
    (fromCoa ? CHART_OF_ACCOUNTS_HREF : bankingListHref);

  const financialYearId = selectedFY?.id ?? null;

  const canCreate =
    !permissions || permissions.isLoading
      ? true
      : permissions.canCreate("accounts", "bank_account");
  const canUpdate =
    !permissions || permissions.isLoading
      ? true
      : permissions.canEdit("accounts", "bank_account");
  const canSubmit = mode === "create" ? canCreate : canUpdate;

  const detailQuery = useBankAccountByLedgerId(
    mode === "complete" ? ledgerId : null,
    { financialYearId },
  );
  const createMutation = useCreateBankAccount();
  const completeMutation = useCompleteBankAccountDetails();
  const warehousesQuery = useWarehousesDropdown();

  const [form, setForm] = useState<BankAccountFormValues>(EMPTY_BANK_ACCOUNT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [defaultConfirm, setDefaultConfirm] = useState<
    null | "defaultForReceipts" | "defaultForPayments"
  >(null);
  const [hydrated, setHydrated] = useState(mode === "create");

  const saving = createMutation.isPending || completeMutation.isPending;

  const warehouseOptions: ReportMultiSelectOption[] = useMemo(() => {
    const rows = warehousesQuery.data ?? [];
    return rows.map((w) => ({
      value: w.warehouse_id,
      label: w.warehouseName,
      searchText: w.warehouseName,
    }));
  }, [warehousesQuery.data]);

  const labelByWarehouseId = useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of warehouseOptions) map.set(opt.value, opt.label);
    return map;
  }, [warehouseOptions]);

  useEffect(() => {
    if (mode !== "complete" || !detailQuery.data || hydrated) return;
    const d = detailQuery.data;
    setForm({
      ...EMPTY_BANK_ACCOUNT_FORM,
      ledgerName: d.ledgerName,
      alias: d.alias,
      description: d.description,
      status: d.status,
      openingBalance: d.openingBalance || "0",
      openingBalanceType: d.openingBalanceType,
      bankName: d.bankName,
      accountHolderName: d.accountHolderName,
      accountNumber: "",
      confirmAccountNumber: "",
      ifscCode: d.ifscCode,
      branchName: d.branchName,
      accountType: (d.accountType || "CURRENT") as BankAccountApiAccountType,
      currencyCode: d.currencyCode || "INR",
      reconciliationEnabled: d.reconciliationEnabled,
      defaultForReceipts: d.defaultForReceipts,
      defaultForPayments: d.defaultForPayments,
      warehouseIds: d.warehouses.map((w) => w.id).filter(Boolean),
    });
    setHydrated(true);
  }, [mode, detailQuery.data, hydrated]);

  const setField = <K extends keyof BankAccountFormValues>(
    key: K,
    value: BankAccountFormValues[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setFormError(null);
  };

  const handleDefaultToggle = (
    key: "defaultForReceipts" | "defaultForPayments",
    next: boolean,
  ) => {
    if (next && !form[key]) {
      setDefaultConfirm(key);
      return;
    }
    setField(key, next);
  };

  const pageTitle =
    mode === "complete" ? "Complete Bank Details" : "Add Bank Account";

  const handleCancel = () => {
    if (onClose) {
      onClose();
      return;
    }
    router.push(leaveHref);
  };

  const handleSave = () => {
    setFormError(null);
    if (!canSubmit) {
      const msg =
        mode === "create"
          ? "You do not have permission to create bank accounts."
          : "You do not have permission to update bank accounts.";
      setFormError(msg);
      showToast(msg, "error");
      return;
    }

    if (mode === "complete" && !ledgerId) {
      setFormError("Ledger id is required to complete bank details.");
      return;
    }

    const validation = validateBankAccountForm(form, mode);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setFormError("Please fix the errors before saving.");
      return;
    }

    if (mode === "create") {
      createMutation.mutate(
        {
          payload: buildCreateBankAccountPayload(form),
          financialYearId,
        },
        {
          onSuccess: (result) => {
            showToast(result.message || "Bank account created successfully", "success");
            if (onSaved) {
              onSaved(result.data.ledgerId);
              return;
            }
            router.push(
              result.data.ledgerId
                ? `/accounts/banking/bank-accounts/${result.data.ledgerId}`
                : bankingListHref,
            );
          },
          onError: (error) => {
            const msg = extractBankAccountErrorMessage(
              error,
              "Failed to create bank account.",
            );
            setFormError(msg);
            showToast(msg, "error");
          },
        },
      );
      return;
    }

    completeMutation.mutate(
      {
        ledgerId: ledgerId!,
        payload: buildCompleteBankAccountDetailsPayload(form),
        financialYearId,
      },
      {
        onSuccess: (result) => {
          showToast(
            result.message || "Bank account details saved successfully",
            "success",
          );
          if (onSaved) {
            onSaved(result.data.ledgerId);
            return;
          }
          router.push(
            result.data.ledgerId
              ? `/accounts/banking/bank-accounts/${result.data.ledgerId}`
              : bankingListHref,
          );
        },
        onError: (error) => {
          const msg = extractBankAccountErrorMessage(
            error,
            "Failed to save bank account details.",
          );
          setFormError(msg);
          showToast(msg, "error");
        },
      },
    );
  };

  const loadingDetail = mode === "complete" && (detailQuery.isLoading || !hydrated);
  const detailError =
    mode === "complete" && detailQuery.isError
      ? extractBankAccountErrorMessage(
          detailQuery.error,
          "Unable to load bank ledger details.",
        )
      : null;

  return (
    <>
      <AccountsFormLayout
        title={pageTitle}
        fullWidth
        breadcrumb={
          fromCoa
            ? [
                { label: "Accounts", href: CHART_OF_ACCOUNTS_HREF },
                { label: "Chart of Accounts", href: leaveHref },
                { label: "Bank Accounts", href: bankingListHref },
                {
                  label: mode === "complete" ? "Complete details" : "Add",
                  href:
                    mode === "complete" && ledgerId
                      ? `/accounts/banking/bank-accounts/${ledgerId}/complete`
                      : "/accounts/banking/bank-accounts/new",
                },
              ]
            : [
                { label: "Accounts", href: CHART_OF_ACCOUNTS_HREF },
                { label: "Banking", href: bankingListHref },
                { label: "Bank Accounts", href: bankingListHref },
                {
                  label: mode === "complete" ? "Complete details" : "Add",
                  href:
                    mode === "complete" && ledgerId
                      ? `/accounts/banking/bank-accounts/${ledgerId}/complete`
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
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              className="h-9 text-xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700"
              onClick={handleSave}
              disabled={saving || loadingDetail || !canSubmit || Boolean(detailError)}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      >
        <div className="mt-3 w-full rounded-xl border border-border bg-white p-4 shadow-sm">
          <div className="space-y-4">
            {(formError || detailError) && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {formError || detailError}
              </p>
            )}

            {!canSubmit && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                You do not have permission to {mode === "create" ? "create" : "update"} bank
                accounts.
              </p>
            )}

            {loadingDetail ? (
              <p className="text-xs text-muted-foreground py-6">Loading ledger details…</p>
            ) : (
              <>
                {mode === "create" ? (
                  <section>
                    <SectionHeading label="Ledger (COA)" />
                    <div className="grid max-w-[800px] grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs font-medium">
                          Ledger Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          className={cn(
                            "h-9 text-sm rounded-lg",
                            errors.ledgerName && "border-red-400",
                          )}
                          value={form.ledgerName}
                          onChange={(e) => setField("ledgerName", e.target.value)}
                          placeholder="e.g. HDFC Current - Ops"
                          disabled={saving}
                        />
                        <FieldError message={errors.ledgerName} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Alias</Label>
                        <Input
                          className={cn(
                            "h-9 text-sm rounded-lg",
                            errors.alias && "border-red-400",
                          )}
                          value={form.alias}
                          onChange={(e) => setField("alias", e.target.value)}
                          placeholder="Optional short name"
                          disabled={saving}
                        />
                        <FieldError message={errors.alias} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Status</Label>
                        <Select
                          value={form.status}
                          onValueChange={(v) =>
                            setField("status", v as BankAccountApiStatus)
                          }
                          disabled={saving}
                        >
                          <SelectTrigger className="h-9 text-sm rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACTIVE" className="text-xs">
                              Active
                            </SelectItem>
                            <SelectItem value="INACTIVE" className="text-xs">
                              Inactive
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs font-medium">Description</Label>
                        <Textarea
                          className={cn(
                            "min-h-[72px] text-sm rounded-lg resize-none",
                            errors.description && "border-red-400",
                          )}
                          value={form.description}
                          onChange={(e) => setField("description", e.target.value)}
                          placeholder="Optional notes"
                          disabled={saving}
                          rows={3}
                        />
                        <FieldError message={errors.description} />
                      </div>
                    </div>
                  </section>
                ) : (
                  <section>
                    <SectionHeading label="Ledger" />
                    <div className="grid max-w-[800px] grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs font-medium">Ledger Name</Label>
                        <Input
                          className="h-9 text-sm rounded-lg bg-muted/30"
                          value={form.ledgerName}
                          readOnly
                          disabled
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Completing bank details for an existing COA bank ledger.
                          {detailQuery.data?.ledgerCode
                            ? ` Code: ${detailQuery.data.ledgerCode}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </section>
                )}

                <section>
                  <SectionHeading label="Bank Information" />
                  <div className="grid max-w-[800px] grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Bank Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        className={cn(
                          "h-9 text-sm rounded-lg",
                          errors.bankName && "border-red-400",
                        )}
                        value={form.bankName}
                        onChange={(e) => setField("bankName", e.target.value)}
                        placeholder="e.g. HDFC Bank"
                        disabled={saving}
                      />
                      <FieldError message={errors.bankName} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Account Holder Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        className={cn(
                          "h-9 text-sm rounded-lg",
                          errors.accountHolderName && "border-red-400",
                        )}
                        value={form.accountHolderName}
                        onChange={(e) => setField("accountHolderName", e.target.value)}
                        placeholder="e.g. PVB Pvt Ltd"
                        disabled={saving}
                      />
                      <FieldError message={errors.accountHolderName} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Account Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        className={cn(
                          "h-9 text-sm rounded-lg font-mono",
                          errors.accountNumber && "border-red-400",
                        )}
                        value={form.accountNumber}
                        onChange={(e) => setField("accountNumber", e.target.value)}
                        placeholder="e.g. 123456789012"
                        disabled={saving}
                        autoComplete="off"
                      />
                      <FieldError message={errors.accountNumber} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Confirm Account Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        className={cn(
                          "h-9 text-sm rounded-lg font-mono",
                          errors.confirmAccountNumber && "border-red-400",
                        )}
                        value={form.confirmAccountNumber}
                        onChange={(e) => setField("confirmAccountNumber", e.target.value)}
                        placeholder="Re-enter account number"
                        disabled={saving}
                        autoComplete="off"
                      />
                      <FieldError message={errors.confirmAccountNumber} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        IFSC Code <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        className={cn(
                          "h-9 text-sm rounded-lg font-mono",
                          errors.ifscCode && "border-red-400",
                        )}
                        value={form.ifscCode}
                        onChange={(e) =>
                          setField("ifscCode", normalizeIfsc(e.target.value))
                        }
                        placeholder="e.g. HDFC0001234"
                        disabled={saving}
                        maxLength={11}
                      />
                      <FieldError message={errors.ifscCode} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Branch Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        className={cn(
                          "h-9 text-sm rounded-lg",
                          errors.branchName && "border-red-400",
                        )}
                        value={form.branchName}
                        onChange={(e) => setField("branchName", e.target.value)}
                        placeholder="e.g. Andheri West"
                        disabled={saving}
                      />
                      <FieldError message={errors.branchName} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Account Type <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={form.accountType}
                        onValueChange={(v) =>
                          setField("accountType", v as BankAccountApiAccountType)
                        }
                        disabled={saving}
                      >
                        <SelectTrigger
                          className={cn(
                            "h-9 text-sm rounded-lg",
                            errors.accountType && "border-red-400",
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACCOUNT_TYPE_OPTIONS.map((t) => (
                            <SelectItem key={t.value} value={t.value} className="text-xs">
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError message={errors.accountType} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Currency</Label>
                      <Input
                        className="h-9 text-sm rounded-lg font-mono uppercase"
                        value={form.currencyCode}
                        onChange={(e) =>
                          setField("currencyCode", e.target.value.toUpperCase())
                        }
                        placeholder="INR"
                        disabled={saving}
                        maxLength={3}
                      />
                    </div>
                  </div>
                </section>

                {mode === "create" && (
                  <section>
                    <SectionHeading label="Accounting Details" />
                    <div className="grid max-w-[560px] grid-cols-1 gap-3 md:grid-cols-[minmax(280px,320px)_minmax(220px,260px)]">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Opening Balance</Label>
                        <AccountsMoneyInput
                          className={cn(
                            "h-9 text-sm rounded-lg",
                            errors.openingBalance && "border-red-400",
                          )}
                          value={form.openingBalance}
                          onChange={(v) => setField("openingBalance", String(v))}
                          disabled={saving}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Saved only when a financial year is selected and amount is greater
                          than zero.
                        </p>
                        <FieldError message={errors.openingBalance} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Opening Balance Type</Label>
                        <Select
                          value={form.openingBalanceType}
                          onValueChange={(v) =>
                            setField(
                              "openingBalanceType",
                              v as BankAccountOpeningBalanceType,
                            )
                          }
                          disabled={saving}
                        >
                          <SelectTrigger className="h-9 text-sm rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DEBIT" className="text-xs">
                              Debit
                            </SelectItem>
                            <SelectItem value="CREDIT" className="text-xs">
                              Credit
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </section>
                )}

                <section>
                  <SectionHeading label="Defaults & Reconciliation" />
                  <div className="grid max-w-[800px] grid-cols-1 gap-3 md:grid-cols-2">
                    <ToggleRow
                      label="Reconciliation enabled"
                      description="Allow statement import and bank reconciliation for this account."
                      checked={form.reconciliationEnabled}
                      onCheckedChange={(v) => setField("reconciliationEnabled", v)}
                      disabled={saving}
                    />
                    <ToggleRow
                      label="Default for receipts"
                      description="Replaces any existing global default receipt bank."
                      checked={form.defaultForReceipts}
                      onCheckedChange={(v) => handleDefaultToggle("defaultForReceipts", v)}
                      disabled={saving}
                    />
                    <ToggleRow
                      label="Default for payments"
                      description="Replaces any existing global default payment bank."
                      checked={form.defaultForPayments}
                      onCheckedChange={(v) => handleDefaultToggle("defaultForPayments", v)}
                      disabled={saving}
                    />
                  </div>
                </section>

                <section>
                  <SectionHeading label="Warehouse Mapping" />
                  <div className="w-full max-w-[640px] space-y-1.5">
                    <ReportMultiSelect
                      label="Mapped Warehouses"
                      values={form.warehouseIds}
                      onChange={(ids) => setField("warehouseIds", ids)}
                      options={warehouseOptions}
                      entityName="warehouse"
                      placeholder={
                        warehousesQuery.isLoading
                          ? "Loading warehouses…"
                          : "Select warehouses…"
                      }
                      disabled={saving || warehousesQuery.isLoading}
                      loading={warehousesQuery.isLoading}
                      minWidthClass="min-w-0 w-full"
                    />
                    {form.warehouseIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {form.warehouseIds.map((id) => (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-muted/40 border border-border rounded-md text-foreground font-medium"
                          >
                            {labelByWarehouseId.get(id) ?? id}
                            {!saving && (
                              <button
                                type="button"
                                onClick={() =>
                                  setField(
                                    "warehouseIds",
                                    form.warehouseIds.filter((w) => w !== id),
                                  )
                                }
                                className="p-0.5 rounded hover:bg-muted"
                                aria-label={`Remove ${labelByWarehouseId.get(id) ?? id}`}
                              >
                                <X className="w-3 h-3 text-muted-foreground" />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Optional. Select warehouses that may use this bank account on invoices
                      and vouchers.
                    </p>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </AccountsFormLayout>

      <Dialog
        open={defaultConfirm != null}
        onOpenChange={(open) => {
          if (!open) setDefaultConfirm(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              Replace global default?
            </DialogTitle>
            <DialogDescription className="pt-1">
              {defaultConfirm === "defaultForReceipts"
                ? "Setting this as the default for receipts will replace any previous global default receipt bank."
                : "Setting this as the default for payments will replace any previous global default payment bank."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setDefaultConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              onClick={() => {
                if (defaultConfirm) setField(defaultConfirm, true);
                setDefaultConfirm(null);
              }}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
