"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, Save, X, XCircle } from "lucide-react";
import {
  CustomerForm,
  DEFAULT_CUSTOMER_FORM,
  customerToFormValues,
  formValuesToCustomer,
  validateCustomerForm,
  type CustomerFormValues,
} from "@/app/(app)/masters/customers/components/CustomerForm";
import {
  generateCustomerCodeForType,
  loadCustomers,
  nextCustomerId,
  saveCustomers,
  todayStr,
} from "@/app/(app)/masters/customers/customer-data";
import { buildCreditAuditEntriesOnSave } from "@/lib/masters/customer-credit";
import { syncCustomerLedger } from "@/lib/accounts/erp-accounting-mapping";
import { useCanCoa } from "@/lib/accounts/use-can-coa";
import { useClientMounted } from "@/lib/use-client-mounted";
import { useFY, fyOpeningDateIso } from "@/lib/fy-store";
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
  /** When set, edit existing Customer Master (same form / save path). */
  customerId?: number;
  onClose: () => void;
  onSaved?: (ledgerId: number, parentGroupId: number | null) => void;
}

/**
 * Same Customer Master form (incl. Accounting tab) embedded in Accounts COA.
 * Saves Customer Master once and syncs the linked Sundry Debtor ledger.
 */
export default function AccountsSundryDebtorCustomerFormClient({
  parentGroupId,
  customerId,
  onClose,
  onSaved,
}: AccountsSundryDebtorCustomerFormProps) {
  const mounted = useClientMounted();
  const canCreate = useCanCoa("create");
  const canEdit = useCanCoa("edit");
  const { selectedFY } = useFY();
  const isEdit = customerId != null;

  const [form, setForm] = useState<CustomerFormValues>(() => ({
    ...DEFAULT_CUSTOMER_FORM,
    openingBalanceDate: fyOpeningDateIso(selectedFY.id),
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customerCode, setCustomerCode] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(!isEdit);

  useEffect(() => {
    if (!isEdit || customerId == null) return;
    const found = loadCustomers().find((c) => c.id === customerId);
    if (!found) {
      setToast({ msg: "Customer not found.", type: "error" });
      setTimeout(() => onClose(), 1200);
      return;
    }
    setForm(customerToFormValues(found));
    setCustomerCode(found.customerCode);
    setReady(true);
  }, [isEdit, customerId, onClose]);

  useEffect(() => {
    if (isEdit) return;
    if (!form.customerType) {
      setCustomerCode("");
      return;
    }
    setCustomerCode(generateCustomerCodeForType(form.customerType, loadCustomers()));
  }, [form.customerType, isEdit]);

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
    if (isEdit ? !canEdit : !canCreate) {
      showToast("You do not have permission to save this customer.", "error");
      return;
    }

    const e = validateCustomerForm(form, !isEdit, {
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
      const list = loadCustomers();
      const today = todayStr();
      const status = form.status === "draft" ? "active" : form.status;

      let record;
      if (isEdit && customerId != null) {
        const existing = list.find((c) => c.id === customerId);
        if (!existing) throw new Error("Customer not found.");
        record = formValuesToCustomer(
          { ...form, status },
          {
            ...existing,
            creditAuditLog: buildCreditAuditEntriesOnSave({ form, existing }),
            lastStatusChange:
              existing.status !== status ? today : existing.lastStatusChange,
            statusHistory:
              existing.status !== status
                ? [
                    ...existing.statusHistory,
                    {
                      date: today,
                      from: existing.status,
                      to: status,
                      by: "Admin",
                      reason: "Updated from Chart of Accounts",
                    },
                  ]
                : existing.statusHistory,
          },
        );
        saveCustomers(list.map((c) => (c.id === record.id ? record : c)));
      } else {
        record = formValuesToCustomer(
          { ...form, status },
          {
            id: nextCustomerId(list),
            customerCode,
            createdBy: "Admin",
            createdDate: today,
            lastStatusChange: today,
            blockReason: "",
            statusHistory: [
              {
                date: today,
                from: "-",
                to: status,
                by: "Admin",
                reason: "Customer created from Chart of Accounts",
              },
            ],
            creditAuditLog: buildCreditAuditEntriesOnSave({ form, existing: null }),
          },
        );
        saveCustomers([...list, record]);
      }

      const ledger = syncCustomerLedger(record, { parentGroupId });
      if (!ledger) {
        throw new Error("Customer saved but linked ledger could not be created.");
      }

      showToast(
        isEdit ? "Customer and ledger updated." : "Customer created with linked ledger.",
        "success",
      );
      setTimeout(() => {
        onSaved?.(ledger.id, ledger.parentAccountId ?? parentGroupId);
        onClose();
      }, 500);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save customer.", "error");
      setSaving(false);
    }
  };

  if (!mounted || !ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (isEdit ? !canEdit : !canCreate) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm font-medium text-amber-800">Access restricted</p>
        <p className="text-xs text-muted-foreground">
          You do not have permission to {isEdit ? "edit" : "create"} customer ledgers.
        </p>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
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
            <h1 className={ACCOUNTS_PAGE_TITLE_CLASS}>
              {isEdit ? "Edit Customer" : "Add Customer"}
            </h1>
            <p className={ACCOUNTS_PAGE_SUBTITLE_CLASS}>
              Accounts → Chart of Accounts → Sundry Debtors → {isEdit ? "Edit" : "Add"}
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
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-brand-600 text-xs text-white hover:bg-brand-700"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-3.5 w-3.5" /> {isEdit ? "Update" : "Save"}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <div className="w-full rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <CustomerForm
            form={form}
            onChange={setForm}
            errors={errors}
            onSetErrors={setErrors}
            onClearError={clearErr}
            isAdd={!isEdit}
            customerCode={customerCode}
            showComplianceValidityDates
          />
        </div>
      </div>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
