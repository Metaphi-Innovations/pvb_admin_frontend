"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, Save, X, XCircle } from "lucide-react";
import {
  CustomerForm,
  DEFAULT_CUSTOMER_FORM,
  formValuesToCustomer,
  validateCustomerForm,
  type CustomerFormValues,
} from "@/app/(app)/masters/customers/components/CustomerForm";
import { buildCreditAuditEntriesOnSave } from "@/lib/masters/customer-credit";
import {
  createAccountsCustomerLedger,
  generateAccountsCustomerCode,
  nextAccountsCustomerId,
  loadAccountsCustomerLedgers,
  todayStr,
} from "@/lib/accounts/accounts-customer-ledger";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { useCanCoa } from "@/lib/accounts/use-can-coa";
import { useClientMounted } from "@/lib/use-client-mounted";
import {
  ACCOUNTS_PAGE_SUBTITLE_CLASS,
  ACCOUNTS_PAGE_TITLE_CLASS,
} from "@/lib/accounts/accounts-typography";

interface ToastState {
  msg: string;
  type: "success" | "error";
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        "animate-in slide-in-from-top-2 fade-in-0 duration-300",
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
    >
      {toast.type === "success" ? (
        <CheckCircle2 className="flex-shrink-0 w-4 h-4" />
      ) : (
        <XCircle className="flex-shrink-0 w-4 h-4" />
      )}
      {toast.msg}
      <button type="button" onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export interface AccountsSundryDebtorCustomerFormProps {
  parentGroupId: number;
  onClose: () => void;
  onSaved?: (ledgerId: number, parentGroupId: number | null) => void;
}

/**
 * Exact Customer Master form (Basic Details / Branch / Bank & Commercial tabs).
 * Rendered inside Accounts Chart of Accounts main panel — sidebar stays visible.
 * Saves only to Accounts storage (never ERP Customer Master).
 */
export default function AccountsSundryDebtorCustomerFormClient({
  parentGroupId,
  onClose,
  onSaved,
}: AccountsSundryDebtorCustomerFormProps) {
  const mounted = useClientMounted();
  const canCreate = useCanCoa("create");

  const [form, setForm] = useState<CustomerFormValues>(DEFAULT_CUSTOMER_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customerCode, setCustomerCode] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!form.customerType) {
      setCustomerCode("");
      return;
    }
    setCustomerCode(generateAccountsCustomerCode(form.customerType));
  }, [form.customerType]);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const showToast = (msg: string, type: ToastState["type"]) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const handleSave = () => {
    if (!canCreate) {
      showToast("You do not have permission to create ledgers.", "error");
      return;
    }

    const e = validateCustomerForm(form, true, {
      requireComplianceValidityDates: true,
    });
    if (!form.customerType) {
      e.customerType = "Customer type is required";
    }
    if (!customerCode) {
      showToast("Select a customer type to generate customer code.", "error");
      return;
    }
    setErrors(e);
    if (Object.keys(e).length > 0) {
      showToast(e.requiredDocuments || "Please fix the errors before saving.", "error");
      return;
    }

    setSaving(true);
    try {
      const today = todayStr();
      const status = form.status === "draft" ? "active" : form.status;
      const customer = formValuesToCustomer(
        { ...form, status },
        {
          id: nextAccountsCustomerId(loadAccountsCustomerLedgers()),
          customerCode,
          createdBy: ACCOUNTS_CURRENT_USER,
          createdDate: today,
          lastStatusChange: today,
          blockReason: "",
          statusHistory: [
            {
              date: today,
              from: "-",
              to: status,
              by: ACCOUNTS_CURRENT_USER,
              reason: "Customer ledger created from Accounts",
            },
          ],
          creditAuditLog: buildCreditAuditEntriesOnSave({ form, existing: null }),
        },
      );

      const { ledger } = createAccountsCustomerLedger(customer, parentGroupId);
      showToast("Customer ledger created in Accounts.", "success");
      setTimeout(() => {
        onSaved?.(ledger.id, ledger.parentAccountId);
        onClose();
      }, 500);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save customer ledger.", "error");
      setSaving(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm font-medium text-amber-800">Access restricted</p>
        <p className="text-xs text-muted-foreground">
          You do not have permission to create ledgers under Chart of Accounts.
        </p>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      {/* Masters-style header — sidebar remains from Accounts shell */}
      <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0 rounded-lg"
            onClick={onClose}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className={ACCOUNTS_PAGE_TITLE_CLASS}>Add Customer</h1>
            <p className={ACCOUNTS_PAGE_SUBTITLE_CLASS}>
              Accounts → Chart of Accounts → Sundry Debtors → Add
              {customerCode ? (
                <>
                  {" · "}
                  <span className="font-mono font-semibold text-brand-700">{customerCode}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={onClose}
            disabled={saving}
          >
            Discard
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-brand-600 text-xs text-white hover:bg-brand-700"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
        </div>
      </div>

      {/* CustomerForm includes Basic Details / Branch / Bank & Commercial tabs */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <div className="w-full rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <CustomerForm
            form={form}
            onChange={setForm}
            errors={errors}
            onSetErrors={setErrors}
            onClearError={clearErr}
            isAdd={true}
            customerCode={customerCode}
            showComplianceValidityDates
          />
        </div>
      </div>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
