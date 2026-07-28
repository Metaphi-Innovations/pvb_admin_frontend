"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  XCircle,
  ShieldAlert,
} from "lucide-react";
import {
  todayStr,
} from "../customer-data";
import {
  CustomerForm,
  DEFAULT_CUSTOMER_FORM,
  validateCustomerForm,
  validateCustomerFormStep,
  CUSTOMER_FORM_STEPS,
  type CustomerFormValues,
  type CustomerFormStepId,
  formValuesToCreatePayload,
} from "../components/CustomerForm";
import { ensureCustomerLedgerFromMaster } from "@/lib/accounts/party-ledger-sync";
import { CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";
import { hasCustomerPermission } from "../customer-permissions";
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
  const [codeLoading, setCodeLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [sourceDistributorId, setSourceDistributorId] = useState<number | null>(null);
  const [distributorAssessmentLabel, setDistributorAssessmentLabel] = useState<string | null>(
    null,
  );
  const [stepIndex, setStepIndex] = useState(0);

  const createCustomer = useCreateCustomer();
  const {
    data: customerTypes = [],
    isLoading: customerTypesLoading,
  } = useCustomerTypeDropdown();

  const currentStep = CUSTOMER_FORM_STEPS[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === CUSTOMER_FORM_STEPS.length - 1;

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

  const showValidationToast = (stepErrors: Record<string, string>) => {
    const addressLine2Error = Object.values(stepErrors).find((msg) =>
      msg.includes("Address Line 2"),
    );
    const msg =
      addressLine2Error ||
      stepErrors.requiredDocuments ||
      Object.values(stepErrors)[0] ||
      "Please fix the errors before continuing.";
    setToast({ msg, type: "error" });
    setTimeout(() => setToast(null), 3200);
  };

  const handleNext = () => {
    const stepErrors = validateCustomerFormStep(
      form,
      currentStep.id as CustomerFormStepId,
      true,
    );
    if (!form.customerType && currentStep.id === "basic") {
      stepErrors.customerType = "Customer type is required";
    }
    if (!customerCode && currentStep.id === "basic") {
      setToast({ msg: "Select a customer type to generate customer code.", type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      showValidationToast(stepErrors);
      return;
    }
    setErrors({});
    setStepIndex((i) => Math.min(i + 1, CUSTOMER_FORM_STEPS.length - 1));
  };

  const handleBack = () => {
    setErrors({});
    setStepIndex((i) => Math.max(i - 1, 0));
  };

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
      const firstStepWithError = CUSTOMER_FORM_STEPS.findIndex((step) => {
        const stepErrors = validateCustomerFormStep(form, step.id, true);
        return Object.keys(stepErrors).length > 0;
      });
      if (firstStepWithError >= 0) setStepIndex(firstStepWithError);
      showValidationToast(e);
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
      const createdRecord = created as Record<string, unknown> | undefined;
      const parseCustomerId = (value: unknown): number | null => {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "string") {
          const parsed = Number.parseInt(value, 10);
          return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
      };
      const newId = parseCustomerId(createdRecord?.id) ?? parseCustomerId(createdRecord?.sr_no);
      const finalCode = String(createdRecord?.customer_code ?? createdRecord?.customerCode ?? customerCode);

      if (sourceDistributorId !== null && newId !== null) {
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

        if (newId === null) {
          throw new Error("Customer created, but no numeric id returned by API.");
        }

        ensureCustomerLedgerFromMaster({
          id: newId,
          customerUuid: String(createdRecord?.customer_id ?? ""),
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
          salesManName: "",
          mobile: form.mobile,
          countryCode: form.countryCode,
          email: form.email,
        });
        setToast({
        msg: "Customer created successfully.",
        type: "success",
      });
      setTimeout(() => router.push(leaveHref), 1000);
      return;
    }

      setToast({
        msg: asDraft ? "Draft saved successfully." : "Customer created successfully.",
        type: "success",
      });
      setTimeout(() => router.push(leaveHref), 1000);
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
      description={`Masters → Customer Master → Add · Step ${stepIndex + 1} of ${CUSTOMER_FORM_STEPS.length}: ${currentStep.label}`}
      onBack={() => router.push(leaveHref)}
      actions={
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold px-2 py-1.5 rounded bg-brand-50 text-brand-700">
            {codeLoading ? "Generating…" : customerCode || "—"}
          </span>
          <Button variant="ghost" size="sm" onClick={() => router.push(leaveHref)}>
            Discard
          </Button>
          {!isFirstStep && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={handleBack}
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          )}
          {!isLastStep ? (
            <Button
              variant="default"
              size="sm"
              className="gap-1.5"
              onClick={handleNext}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => persist(false)}
              disabled={createCustomer.isPending}
              className="gap-1.5"
            >
              <Save className="w-4 h-4" />
              {createCustomer.isPending ? "Saving…" : "Save"}
            </Button>
          )}
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        {CUSTOMER_FORM_STEPS.map((step, idx) => (
          <button
            key={step.id}
            type="button"
            onClick={() => {
              if (idx <= stepIndex) {
                setErrors({});
                setStepIndex(idx);
              }
            }}
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold border transition-colors",
              idx === stepIndex
                ? "bg-brand-600 text-white border-brand-600"
                : idx < stepIndex
                  ? "bg-brand-50 text-brand-700 border-brand-200 cursor-pointer"
                  : "bg-muted/40 text-muted-foreground border-border cursor-default",
            )}
          >
            {idx + 1}. {step.label}
          </button>
        ))}
      </div>

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
        activeStep={currentStep.id}
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </FormContainer>
  );
}
