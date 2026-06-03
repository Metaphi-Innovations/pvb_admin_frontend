"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Save, X, CheckCircle2, XCircle } from "lucide-react";
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
import { ShieldAlert } from "lucide-react";

export default function NewCustomerPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [form, setForm] = useState<CustomerFormValues>(DEFAULT_CUSTOMER_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customerCode, setCustomerCode] = useState("CUST-0001");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setAllowed(hasCustomerPermission("create"));
    const list = loadCustomers();
    setCustomerCode(generateCustomerCode(list));
  }, []);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });

  const persist = (asDraft: boolean) => {
    const e = validateCustomerForm(form);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }
    const list = loadCustomers();
    const today = todayStr();
    const status = asDraft ? "draft" : form.status === "draft" ? "active" : form.status;

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
          { date: today, from: "-", to: status, by: "Admin", reason: asDraft ? "Saved as draft" : "Customer created" },
        ],
      },
    );

    saveCustomers([...list, record]);
    setToast({ msg: asDraft ? "Draft saved successfully." : "Customer created successfully.", type: "success" });
    setTimeout(() => router.push("/masters/customers"), 1000);
  };

  if (allowed === false) {
    return (
      <AppLayout>
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Access restricted</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            You do not have permission to create customers.
          </p>
          <Button variant="outline" size="sm" className="h-8 text-xs mt-2" onClick={() => router.push("/masters/customers")}>
            Back to listing
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (allowed === null) {
    return (
      <AppLayout>
        <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout noPadding>
      <div className="flex flex-col" style={{ minHeight: "calc(100vh - 104px)" }}>
        <div className="flex-shrink-0 bg-white border-b border-border px-6 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-10">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Add Customer</h2>
            <p className="text-[11px] text-muted-foreground">Masters → Customer Master → Add</p>
          </div>
          <div className="flex items-center gap-1.5 bg-muted/50 border border-border rounded-lg px-3 py-1.5">
            <span className="text-[11px] text-muted-foreground">Code:</span>
            <span className="font-mono text-xs font-bold text-brand-700">{customerCode}</span>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.back()}>
            <X className="w-3.5 h-3.5 mr-1" /> Discard
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => persist(true)}>
            Save Draft
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => persist(false)}
          >
            <Save className="w-3.5 h-3.5" /> Save Customer
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 bg-muted/20">
          <CustomerForm form={form} onChange={setForm} errors={errors} onClearError={clearErr} />
        </div>
      </div>

      {toast && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
          )}
        >
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </AppLayout>
  );
}
