"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, Save, X, XCircle, ShieldAlert } from "lucide-react";
import {
  loadCustomers,
  saveCustomers,
  nextCustomerId,
  generateCustomerCode,
  todayStr,
} from "../customer-data";
import {
  CustomerForm,
  DEFAULT_CUSTOMER_FORM,
  validateCustomerForm,
  formValuesToCustomer,
  type CustomerFormValues,
} from "../components/CustomerForm";
import { hasCustomerPermission } from "../customer-permissions";

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
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function NewCustomerPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [form, setForm] = useState<CustomerFormValues>(DEFAULT_CUSTOMER_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customerCode, setCustomerCode] = useState("CUST-0001");
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    setAllowed(hasCustomerPermission("create"));
    setCustomerCode(generateCustomerCode(loadCustomers()));
  }, []);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const persist = (asDraft: boolean) => {
    const e = validateCustomerForm(form, true);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      const hasProductErrors = Object.keys(e).some((key) => key.startsWith("product_"));
      const msg = hasProductErrors
        ? "Please complete product details before saving."
        : e.requiredDocuments || "Please fix the errors before saving.";
      setToast({ msg, type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    const list = loadCustomers();
    const today = todayStr();
    const status = asDraft
      ? "draft"
      : form.status === "draft"
        ? "active"
        : form.status;

    const record = formValuesToCustomer(
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
            reason: asDraft ? "Saved as draft" : "Customer created",
          },
        ],
      },
    );

    saveCustomers([...list, record]);
    setToast({
      msg: asDraft ? "Draft saved successfully." : "Customer created successfully.",
      type: "success",
    });
    setTimeout(() => router.push("/masters/customers"), 1000);
  };

  if (allowed === false) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex items-center justify-center w-12 h-12 border rounded-xl border-amber-200 bg-amber-50">
          <ShieldAlert className="w-6 h-6 text-amber-600" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Access restricted</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          You do not have permission to create customers.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-7 mt-2 text-[11px] px-3"
          onClick={() => router.push("/masters/customers")}
        >
          Back to listing
        </Button>
      </div>
    );
  }

  if (allowed === null) {
    return null;
  }

  return (
    <FormContainer
      title="Add Customer"
      description="Masters → Customer Master → Add"
      onBack={() => router.back()}
      actions={
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold px-2 py-1.5 rounded bg-brand-50 text-brand-700">
            {customerCode}
          </span>
          <Button variant="outline" className="h-9 text-xs font-semibold rounded-lg" onClick={() => router.back()}>
            Discard
          </Button>
          <Button variant="outline" className="h-9 text-xs font-semibold rounded-lg" onClick={() => persist(true)}>
            Save Draft
          </Button>
          <Button
            className="h-9 text-xs font-semibold rounded-lg gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
            onClick={() => persist(false)}
          >
            <Save className="w-4 h-4" /> Save
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
        isAdd={true}
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </FormContainer>
  );
}
