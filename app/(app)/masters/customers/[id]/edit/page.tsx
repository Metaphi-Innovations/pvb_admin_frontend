"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Save, X, CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import {
  CustomerForm,
  validateCustomerForm,
  validateCustomerFormStep,
  CUSTOMER_FORM_STEPS,
  formValuesToUpdatePayload,
  type CustomerFormValues,
  type CustomerFormStepId,
  customerRecordToFormValues,
} from "../../components/CustomerForm";
import { ensureCustomerLedgerFromMaster } from "@/lib/accounts/party-ledger-sync";
import { hasCustomerPermission } from "../../customer-permissions";
import { useUpdateCustomer, useCustomer } from "@/hooks/masters";
import { useCustomerTypeDropdown } from "@/hooks/masters/use-customer-types";

interface ToastState {
  msg: string;
  type: "success" | "error";
}

type ApiValidationError = { path?: string; message?: string };

function mapApiPathToFieldKey(path: string): string {
  const normalized = path.trim();
  if (!normalized) return "";

  const directMap: Record<string, string> = {
    email: "email",
    mobile_no: "mobile",
    customer_name: "customerName",
    customer_type_id: "customerType",
    gstin_no: "gstin",
    pan_no: "pan",
    tds_section_id: "tdsMasterId",
    account_number: "accountNumber",
    ifsc_code: "ifscCode",
    branch_name: "branch",
    payment_type: "paymentType",
    credit_days: "creditDays",
    advance: "advancePercentage",
    credit_limit: "creditLimit",
    branches: "branches",
  };

  if (directMap[normalized]) return directMap[normalized];

  const branchMatch =
    normalized.match(/^branches\[(\d+)\]\.(.+)$/) ??
    normalized.match(/^branches\.(\d+)\.(.+)$/);
  if (!branchMatch) return normalized;

  const branchIdx = Number.parseInt(branchMatch[1], 10);
  const field = branchMatch[2];

  if (field === "billing_address_line_1") return `branch_${branchIdx}_billingAddressLine1`;
  if (field === "billing_address_line_2") return `branch_${branchIdx}_billingAddressLine2`;
  if (field === "billing_city") return `branch_${branchIdx}_billingCity`;
  if (field === "billing_state") return `branch_${branchIdx}_billingState`;
  if (field === "billing_town") return `branch_${branchIdx}_billingTown`;
  if (field === "billing_pincode") return `branch_${branchIdx}_billingPincode`;
  if (field === "shipping_address_line_1") return `branch_${branchIdx}_shippingAddressLine1`;
  if (field === "shipping_address_line_2") return `branch_${branchIdx}_shippingAddressLine2`;
  if (field === "shipping_city") return `branch_${branchIdx}_shippingCity`;
  if (field === "shipping_state") return `branch_${branchIdx}_shippingState`;
  if (field === "shipping_town") return `branch_${branchIdx}_shippingTown`;
  if (field === "shipping_pincode") return `branch_${branchIdx}_shippingPincode`;
  if (field === "sales_man_id") return `branch_${branchIdx}_salesManId`;
  return `branch_${branchIdx}_${field}`;
}

function extractApiValidation(err: unknown): {
  toastMessage: string;
  fieldErrors: Record<string, string>;
} {
  const fallback = "Failed to update customer.";
  const e = err as {
    message?: string;
    response?: {
      data?: {
        message?: string;
        error?: string;
        validation_errors?: ApiValidationError[];
      };
    };
  };

  const payload = e.response?.data;
  const validationErrors = Array.isArray(payload?.validation_errors)
    ? payload.validation_errors
    : [];

  const fieldErrors: Record<string, string> = {};
  validationErrors.forEach((item) => {
    const key = mapApiPathToFieldKey(String(item.path ?? ""));
    const msg = String(item.message ?? "").trim();
    if (key && msg) fieldErrors[key] = msg;
  });

  const toastMessage =
    validationErrors[0]?.message?.trim() ||
    payload?.message ||
    payload?.error ||
    e.message ||
    fallback;

  return { toastMessage, fieldErrors };
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
  const [stepIndex, setStepIndex] = useState(0);

  const { data: customer, isLoading, isError } = useCustomer(id);
  const updateCustomer = useUpdateCustomer();
  const {
    data: customerTypes = [],
    isLoading: customerTypesLoading,
  } = useCustomerTypeDropdown();
  const currentStep = CUSTOMER_FORM_STEPS[stepIndex];

  const focusFirstInvalidField = () => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(
        "input.border-red-400, textarea.border-red-400, button.border-red-400, [role='combobox'].border-red-400",
      );
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      if ("focus" in target) target.focus({ preventScroll: true });
    });
  };

  const findStepIndexForErrors = (fieldErrors: Record<string, string>): number => {
    const hasBranchError = Object.keys(fieldErrors).some(
      (key) => key === "branches" || key.startsWith("branch_") || key.startsWith("mainBranch"),
    );
    const hasCommercialError = Object.keys(fieldErrors).some((key) =>
      ["creditLimit", "paymentType", "creditDays", "advancePercentage", "ifscCode", "accountNumber", "branch"].includes(key),
    );
    if (hasBranchError) return 1;
    if (hasCommercialError) return 2;
    return 0;
  };

  useEffect(() => {
    setAllowed(hasCustomerPermission("edit"));
  }, []);

  useEffect(() => {
    if (customer) {
      setForm(customerRecordToFormValues(customer));
    }
  }, [customer]);


  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = () => {
    if (!form || !customer) return;
    const e = validateCustomerForm(form);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      const firstStepWithError = CUSTOMER_FORM_STEPS.findIndex((step) => {
        const stepErrors = validateCustomerFormStep(form, step.id);
        return Object.keys(stepErrors).length > 0;
      });
      if (firstStepWithError >= 0) setStepIndex(firstStepWithError);
      const msg = e.requiredDocuments || "Please fix the errors before saving.";
      setToast({ msg, type: "error" });
      setTimeout(() => setToast(null), 3200);
      focusFirstInvalidField();
      return;
    }

    const payload = formValuesToUpdatePayload(form);

    updateCustomer.mutate(
      { id: customer.customerUuid, payload, branches: form.branches },
      {
        onSuccess: () => {
          if (form.status === "active") {
            const mainBranch =
              form.branches.find((b) => b.isMain) ??
              form.branches.find((b) => b.branchName === "Main Branch") ??
              form.branches[0];

            ensureCustomerLedgerFromMaster({
              id: customer.id,
              customerUuid: customer.customerUuid,
              customerName: form.customerName,
              customerCode: customer.customerCode,
              status: form.status,
              gstApplicable: form.gstRegistered,
              gstin: form.gstRegistered ? form.gstin : "",
              pan: form.pan,
              tdsApplicable: form.tdsApplicable,
              creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : 0,
              paymentTerms: "",
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
          }
          setToast({ msg: "Customer updated successfully.", type: "success" });
          setTimeout(() => router.push(`/masters/customers/${id}`), 900);
        },
        onError: (err) => {
          const { toastMessage, fieldErrors } = extractApiValidation(err);
          if (Object.keys(fieldErrors).length > 0) {
            setErrors((prev) => ({ ...prev, ...fieldErrors }));
            setStepIndex(findStepIndexForErrors(fieldErrors));
            focusFirstInvalidField();
          }
          setToast({
            msg: toastMessage,
            type: "error",
          });
          setTimeout(() => setToast(null), 3200);
        },
      },
    );
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

  if (allowed === null || isLoading || customerTypesLoading) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (isError || !customer || !form) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Customer not found.</p>
        <Link
          href="/masters/customers"
          className="mt-2 inline-block text-xs text-brand-600 hover:underline"
        >
          Back to listing
        </Link>
      </div>
    );
  }

  return (
    <FormContainer
      title="Edit Customer"
      description={`Masters → Customer Master → Edit · ${currentStep.label}`}
      onBack={() => router.back()}
      actions={
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold px-2 py-1.5 rounded bg-brand-50 text-brand-700">
            {customer.customerCode}
          </span>
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            Discard
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={updateCustomer.isPending}
          >
            <Save className="w-4 h-4" />
            {updateCustomer.isPending ? "Saving..." : "Update Customer"}
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
        customerCode={customer.customerCode}
        customerTypes={customerTypes}
        activeStep={currentStep.id}
        onStepChange={(step: CustomerFormStepId) => {
          const targetIdx = CUSTOMER_FORM_STEPS.findIndex((s) => s.id === step);
          if (targetIdx >= 0) setStepIndex(targetIdx);
        }}
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </FormContainer>
  );
}