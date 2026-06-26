"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Save, X, CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import { loadCustomers, saveCustomers, todayStr } from "../../customer-data";
import {
  CustomerForm,
  customerToFormValues,
  validateCustomerForm,
  formValuesToCustomer,
  type CustomerFormValues,
} from "../../components/CustomerForm";
import { ensureCustomerLedgerFromMaster } from "@/lib/accounts/party-ledger-sync";
import { hasCustomerPermission } from "../../customer-permissions";

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
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 flex-shrink-0" />
      )}
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function EditCustomerPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [form, setForm] = useState<CustomerFormValues | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastState | null>(null);
  const [customerCode, setCustomerCode] = useState("");

  useEffect(() => {
    setAllowed(hasCustomerPermission("edit"));
    const list = loadCustomers();
    const found = list.find((c) => c.id === Number(id));
    if (!found) return;
    setForm(customerToFormValues(found));
    setCustomerCode(found.customerCode);
  }, [id]);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = () => {
    if (!form) return;
    const e = validateCustomerForm(form);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      const msg = e.requiredDocuments || "Please fix the errors before saving.";
      setToast({ msg, type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    const list = loadCustomers();
    const existing = list.find((c) => c.id === Number(id));
    if (!existing) return;

    const today = todayStr();
    const updated = formValuesToCustomer(form, {
      ...existing,
      lastStatusChange:
        existing.status !== form.status ? today : existing.lastStatusChange,
      statusHistory:
        existing.status !== form.status
          ? [
              ...existing.statusHistory,
              {
                date: today,
                from: existing.status,
                to: form.status,
                by: "Admin",
                reason:
                  form.status === "blocked"
                    ? form.blockReason.trim()
                    : "Status updated",
              },
            ]
          : existing.statusHistory,
    });

    saveCustomers(list.map((c) => (c.id === updated.id ? updated : c)));
    if (updated.status === "active") {
      ensureCustomerLedgerFromMaster(updated);
    }
    setToast({ msg: "Customer updated successfully.", type: "success" });
    setTimeout(() => router.push(`/masters/customers/${id}`), 900);
  };

  if (allowed === false) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-200 bg-amber-50">
          <ShieldAlert className="h-6 w-6 text-amber-600" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Access restricted</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          You do not have permission to update customers.
        </p>
        <Link
          href="/masters/customers"
          className="mt-2 text-xs text-brand-600 hover:underline"
        >
          Back to listing
        </Link>
      </div>
    );
  }

  if (!form || allowed === null) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">
          {allowed === null ? "Loading..." : "Customer not found."}
        </p>
        {allowed !== null && (
          <Link
            href="/masters/customers"
            className="mt-2 inline-block text-xs text-brand-600 hover:underline"
          >
            Back to listing
          </Link>
        )}
      </div>
    );
  }

  return (
    <FormContainer
      title="Edit Customer"
      description="Masters → Customer Master → Edit"
      onBack={() => router.back()}
      actions={
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold px-2 py-1.5 rounded bg-brand-50 text-brand-700">
            {customerCode}
          </span>
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            Discard
          </Button>
          <Button variant="default" size="sm" onClick={handleSave}>
            <Save className="w-4 h-4" /> Update Customer
          </Button>
        </div>
      }
    >
      <CustomerForm
        form={form}
        onChange={setForm}
        errors={errors}
        onSetErrors={setErrors}
        onClearError={clearErr}
        customerCode={customerCode}
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </FormContainer>
  );
}
