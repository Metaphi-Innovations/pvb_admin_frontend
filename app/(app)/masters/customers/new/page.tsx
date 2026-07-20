"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, Save, X, XCircle, ShieldAlert } from "lucide-react";
import {
  loadCustomers,
  saveCustomers,
  nextCustomerId,
  generateCustomerCodeForType,
  todayStr,
} from "../customer-data";
import {
  CustomerForm,
  DEFAULT_CUSTOMER_FORM,
  validateCustomerForm,
  formValuesToCustomer,
  type CustomerFormValues,
} from "../components/CustomerForm";
import { ensureCustomerLedgerFromMaster } from "@/lib/accounts/party-ledger-sync";
import { CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";
import { hasCustomerPermission } from "../customer-permissions";
import { buildCreditAuditEntriesOnSave } from "@/lib/masters/customer-credit";
import {
  buildCustomerPrefillFromDistributor,
  CONVERT_DISTRIBUTOR_STORAGE_KEY,
} from "@/lib/distributor/distributor-conversion";
import {
  getDistributorById,
  updateDistributorConversion,
} from "@/app/(app)/database/distributor/distributor-data";
import {
  computeDistributorAssessment,
  formatCategoryLabel,
} from "@/lib/distributor/distributor-scoring";

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
  const searchParams = useSearchParams();
  const returnToParam = searchParams.get("returnTo");
  const fromCoa =
    searchParams.get("source") === "chart-of-accounts" ||
    searchParams.get("from") === "coa";
  const parentNodeId =
    searchParams.get("parentNodeId") || searchParams.get("coaParent");
  const leaveHref =
    returnToParam ||
    (fromCoa
      ? parentNodeId
        ? `${CHART_OF_ACCOUNTS_HREF}?node=${parentNodeId}`
        : CHART_OF_ACCOUNTS_HREF
      : "/masters/customers");

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [form, setForm] = useState<CustomerFormValues>(DEFAULT_CUSTOMER_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customerCode, setCustomerCode] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [sourceDistributorId, setSourceDistributorId] = useState<number | null>(null);
  const [distributorAssessmentLabel, setDistributorAssessmentLabel] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setAllowed(hasCustomerPermission("create"));
  }, []);

  useEffect(() => {
    const fromQuery = Number.parseInt(searchParams.get("fromDistributor") ?? "", 10);
    const fromSession =
      typeof window !== "undefined"
        ? Number.parseInt(
            window.sessionStorage.getItem(CONVERT_DISTRIBUTOR_STORAGE_KEY) ?? "",
            10,
          )
        : Number.NaN;

    const distributorId = Number.isNaN(fromQuery) ? fromSession : fromQuery;
    if (Number.isNaN(distributorId)) return;

    const distributor = getDistributorById(distributorId);
    if (!distributor) return;

    setSourceDistributorId(distributorId);
    setForm(buildCustomerPrefillFromDistributor(distributor));

    const assessment = computeDistributorAssessment(distributor);
    setDistributorAssessmentLabel(
      `${formatCategoryLabel(assessment.category)} · Score ${assessment.weightedScore} · Credit auto-filled`,
    );
  }, [searchParams]);

  useEffect(() => {
    if (!form.customerType) {
      setCustomerCode("");
      return;
    }
    setCustomerCode(
      generateCustomerCodeForType(form.customerType, loadCustomers()),
    );
  }, [form.customerType]);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const persist = (asDraft: boolean) => {
    const e = validateCustomerForm(form, true);
    if (!form.customerType) {
      e.customerType = "Customer type is required";
    }
    if (!customerCode) {
      setToast({ msg: "Select a customer type to generate customer code.", type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }
    setErrors(e);
    if (Object.keys(e).length > 0) {
      const msg = e.requiredDocuments || "Please fix the errors before saving.";
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
        creditAuditLog: buildCreditAuditEntriesOnSave({ form, existing: null }),
      },
    );

    saveCustomers([...list, record]);
    if (sourceDistributorId !== null) {
      updateDistributorConversion(
        sourceDistributorId,
        record.id,
        asDraft || status === "draft" ? "draft_customer" : "customer_completed",
      );
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(CONVERT_DISTRIBUTOR_STORAGE_KEY);
      }
    }
    if (!asDraft && status !== "draft") {
      const ledger = ensureCustomerLedgerFromMaster(record);
      setToast({
        msg: "Customer created successfully.",
        type: "success",
      });
      // #region agent log
      fetch('http://127.0.0.1:7502/ingest/b60215f3-a2ea-4dec-b0ac-4488ce88b732',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9961b5'},body:JSON.stringify({sessionId:'9961b5',runId:'post-fix',hypothesisId:'RET',location:'customers/new/page.tsx:persist',message:'Customer save leave target',data:{fromCoa,leaveHref,ledgerId:ledger?.id??null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      const dest =
        fromCoa && ledger?.id != null
          ? `${CHART_OF_ACCOUNTS_HREF}?node=${ledger.id}`
          : leaveHref;
      setTimeout(() => router.push(dest), 1000);
      return;
    }
    setToast({
      msg: asDraft ? "Draft saved successfully." : "Customer created successfully.",
      type: "success",
    });
    setTimeout(() => router.push(leaveHref), 1000);
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
          onClick={() => router.push(leaveHref)}
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
      onBack={() => router.push(leaveHref)}
      actions={
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold px-2 py-1.5 rounded bg-brand-50 text-brand-700">
            {customerCode}
          </span>
          <Button variant="ghost" size="sm" onClick={() => router.push(leaveHref)}>
            Discard
          </Button>
          <Button variant="default" size="sm" onClick={() => persist(false)}>
            <Save className="w-4 h-4" /> Save
          </Button>
        </div>
      }
    >
      {distributorAssessmentLabel && (
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5">
          <p className="text-xs font-semibold text-brand-800">
            Converting from Distributor Database
          </p>
          <p className="text-[11px] text-brand-700">{distributorAssessmentLabel}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Category, credit limit, and credit period are carried forward from ERP scoring.
          </p>
        </div>
      )}

      <CustomerForm
        form={form}
        onChange={setForm}
        errors={errors}
        onSetErrors={setErrors}
        onClearError={clearErr}
        isAdd={true}
        customerCode={customerCode}
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </FormContainer>
  );
}
