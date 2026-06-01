"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Save, X, CheckCircle2, XCircle } from "lucide-react";
import { loadCustomers, saveCustomers, todayStr } from "../../customer-data";
import {
  CustomerForm,
  customerToFormValues,
  validateCustomerForm,
  formValuesToCustomer,
  type CustomerFormValues,
} from "../../components/CustomerForm";
import { hasCustomerPermission } from "../../customer-permissions";
import { ShieldAlert } from "lucide-react";

export default function EditCustomerPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [form, setForm] = useState<CustomerFormValues | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
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
      const n = { ...prev };
      delete n[key];
      return n;
    });

  const handleSave = () => {
    if (!form) return;
    const e = validateCustomerForm(form);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    const list = loadCustomers();
    const existing = list.find((c) => c.id === Number(id));
    if (!existing) return;

    const today = todayStr();
    const updated = formValuesToCustomer(form, {
      ...existing,
      lastStatusChange: existing.status !== form.status ? today : existing.lastStatusChange,
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
    setToast({ msg: "Customer updated successfully.", type: "success" });
    setTimeout(() => router.push(`/masters/customers/${id}`), 900);
  };

  if (allowed === false) {
    return (
      <AppLayout>
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Access restricted</h1>
          <p className="text-sm text-muted-foreground max-w-md">You do not have permission to update customers.</p>
          <Link href="/masters/customers" className="text-xs text-brand-600 hover:underline mt-2">
            Back to listing
          </Link>
        </div>
      </AppLayout>
    );
  }

  if (!form || allowed === null) {
    return (
      <AppLayout>
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {allowed === null ? "Loading…" : "Customer not found."}
          </p>
          {allowed !== null && (
            <Link href="/masters/customers" className="text-xs text-brand-600 hover:underline mt-2 inline-block">
              Back to listing
            </Link>
          )}
        </div>
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
            <h2 className="text-sm font-semibold text-foreground">Edit Customer</h2>
            <p className="text-[11px] text-muted-foreground">Masters → Customer Master → Edit</p>
          </div>
          <div className="flex items-center gap-1.5 bg-muted/50 border border-border rounded-lg px-3 py-1.5">
            <span className="font-mono text-xs font-bold text-brand-700">{customerCode}</span>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.back()}>
            <X className="w-3.5 h-3.5 mr-1" /> Discard
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={handleSave}
          >
            <Save className="w-3.5 h-3.5" /> Save Changes
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
