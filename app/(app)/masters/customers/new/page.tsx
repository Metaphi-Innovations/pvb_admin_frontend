"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, Save, X, XCircle, ShieldAlert } from "lucide-react";
import {
  todayStr,
} from "../customer-data";
import {
  CustomerForm,
  DEFAULT_CUSTOMER_FORM,
  validateCustomerForm,
  formValuesToCustomer,
  type CustomerFormValues,
  formValuesToCreatePayload,
} from "../components/CustomerForm";
import { ensureCustomerLedgerFromMaster } from "@/lib/accounts/party-ledger-sync";
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
import { useCreateCustomer } from "@/hooks/masters";
import { formValuesToStructured, paymentTermsToLegacy } from "@/lib/masters/payment-terms";
import { useCustomerTypeDropdown } from "@/hooks/masters/use-customer-types";
import { CustomerListService } from "@/services/customer-list.service";

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
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [form, setForm] = useState<CustomerFormValues>(DEFAULT_CUSTOMER_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customerCode, setCustomerCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [sourceDistributorId, setSourceDistributorId] = useState<number | null>(null);
  const [distributorAssessmentLabel, setDistributorAssessmentLabel] = useState<string | null>(
    null,
  );

  const createCustomer = useCreateCustomer();
  const {
    data: customerTypes = [],
    isLoading: customerTypesLoading,
  } = useCustomerTypeDropdown();

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

    function extractPreviewSequence(previewNumber: string): string {
      const parts = previewNumber.split("-");
      const sequencePart = parts.length > 1 ? parts[parts.length - 1] : previewNumber;

      const parsedNumber = parseInt(sequencePart, 10);

      if (isNaN(parsedNumber)) {
        return sequencePart;
      }

      return (parsedNumber + 1).toString().padStart(sequencePart.length, "0");
    }

    const selectedType = customerTypes.find((ct) => ct.id === form.customerType);


    let cancelled = false;
    setCodeLoading(true);
    setCustomerCode("");

    CustomerListService.previewNumber()
      .then((code) => {
        if (!cancelled) {
          const sequence = extractPreviewSequence(code);
          setCustomerCode(`${selectedType?.customerInitialCode}-${sequence}`);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch customer code preview", err);
        if (!cancelled) {
          setCustomerCode("");
          setToast({ msg: "Could not generate customer code. Try again.", type: "error" });
          setTimeout(() => setToast(null), 3200);
        }
      })
      .finally(() => {
        if (!cancelled) setCodeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.customerType, customerTypes]);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const persist = async (asDraft: boolean) => {
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

    const today = todayStr();
    const status = asDraft
      ? "draft"
      : form.status === "draft"
        ? "active"
        : form.status;

    const payload = formValuesToCreatePayload({ ...form, status });


    try {
      const created = await createCustomer.mutateAsync({ payload, branches: form.branches });
      const newId = (created as any)?.id;
      const finalCode = (created as any)?.customerCode ?? customerCode;

      if (sourceDistributorId !== null) {
        updateDistributorConversion(
          sourceDistributorId,
          newId,
          asDraft || status === "draft" ? "draft_customer" : "customer_completed",
        );
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(CONVERT_DISTRIBUTOR_STORAGE_KEY);
        }
      }

      if (!asDraft && status !== "draft") {
        const mainBranch =
          form.branches.find((b) => b.isMain) ??
          form.branches.find((b) => b.branchName === "Main Branch") ??
          form.branches[0];

        ensureCustomerLedgerFromMaster({
          id: newId,
          customerUuid: (created as any)?.customerUuid,
          customerName: form.customerName,
          customerCode: finalCode,
          status,
          gstApplicable: form.gstRegistered,
          gstin: form.gstRegistered ? form.gstin : "",
          pan: form.pan,
          tdsApplicable: form.tdsApplicable,
          creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : 0,
          paymentTerms: paymentTermsToLegacy(
            formValuesToStructured({
              paymentType: form.paymentType,
              creditDays: form.creditDays,
              advancePercentage: form.advancePercentage,
            })!,
          ),
          address: mainBranch?.billingAddress?.address ?? "",
          districtName: mainBranch?.billingAddress?.district ?? mainBranch?.billingAddress?.city ?? "",
          stateName: mainBranch?.billingAddress?.state ?? "",
          pincode: mainBranch?.billingAddress?.pincode ?? "",
          branches: form.branches,
          salesManName: "", // resolve from getActiveSalesEmployees() if needed, see below
          mobile: form.mobile,
          countryCode: form.countryCode,
          email: form.email,
        });
      }

      setToast({
        msg: asDraft ? "Draft saved successfully." : "Customer created successfully.",
        type: "success",
      });
      setTimeout(() => router.push("/masters/customers"), 1000);
    } catch (err) {
      console.error(err);
      setToast({
        msg: err instanceof Error ? err.message : "Failed to save customer.",
        type: "error",
      });
      setTimeout(() => setToast(null), 3200);
    }

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
            {codeLoading ? "Generating…" : customerCode || "—"}
          </span>
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            Discard
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => persist(false)}
            disabled={createCustomer.isPending}
          >
            <Save className="w-4 h-4" />
            {createCustomer.isPending ? "Saving…" : "Save"}
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
        customerTypes={customerTypes}
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </FormContainer>
  );
}