"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PRFormLayout } from "../../components/PRFormLayout";
import {
  PurchaseRequestForm,
  type PRFormValues,
} from "../../components/PurchaseRequestForm";
import { PRFormFooter } from "../../components/PRFormFooter";
import { getErrorMessage } from "@/lib/masters/master-query-errors";
import { useFY, getStoredFYId } from "@/lib/fy-store";
import {
  detailToFormValues,
  usePurchaseRequest,
  usePurchaseRequestPreviewNumber,
  useUpdatePurchaseRequest,
} from "@/hooks/procurement";
import {
  focusPRField,
  getFirstPRErrorField,
  validatePRField,
  validatePRForm,
  type PRFormErrors,
  type PRFormFieldKey,
} from "../../components/pr-form-validation";

const EDITABLE_STATUSES = ["draft", "rejected"] as const;

export default function EditPRPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id ?? "");
  const { selectedFY, isLoading: fyLoading } = useFY();
  const detailQuery = usePurchaseRequest(id);
  const updateMutation = useUpdatePurchaseRequest();
  const [form, setForm] = useState<PRFormValues | null>(null);
  const [errors, setErrors] = useState<PRFormErrors>({});
  const [error, setError] = useState<string | null>(null);

  const detail = detailQuery.data;
  const canEdit = useMemo(
    () =>
      !!detail &&
      EDITABLE_STATUSES.includes(
        detail.status as (typeof EDITABLE_STATUSES)[number],
      ),
    [detail],
  );

  useEffect(() => {
    if (!detail) return;
    if (
      !EDITABLE_STATUSES.includes(
        detail.status as (typeof EDITABLE_STATUSES)[number],
      )
    ) {
      router.replace(`/procurement/purchase-requests/${id}`);
      return;
    }
    setForm(detailToFormValues(detail));
  }, [detail, id, router]);

  const previewQuery = usePurchaseRequestPreviewNumber(
    form?.state || "Maharashtra",
    Boolean(form) && !detail?.prNumber,
  );
  const prNumber = detail?.prNumber || previewQuery.data || "";

  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleFieldBlur = (field: PRFormFieldKey) => {
    if (!form) return;
    const msg = validatePRField(form, field, "submit");
    setErrors((prev) => {
      const next = { ...prev };
      if (msg) next[field] = msg;
      else delete next[field];
      return next;
    });
  };

  if (detailQuery.isLoading || !form) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        {detailQuery.isError
          ? "Purchase request not found."
          : "Loading purchase request…"}
      </div>
    );
  }

  if (!canEdit || !detail) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        This purchase request cannot be edited.
      </div>
    );
  }

  const persist = (asSubmit: boolean) => {
    if (updateMutation.isPending) return;
    setError(null);

    if (!selectedFY.id && !getStoredFYId()) {
      setError(
        fyLoading
          ? "Financial year is still loading. Please wait a moment and try again."
          : "Select a financial year from the header before saving.",
      );
      return;
    }

    const mode = asSubmit ? "submit" : "draft";
    const nextErrors = validatePRForm(form, mode);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const first = getFirstPRErrorField(nextErrors);
      if (first) requestAnimationFrame(() => focusPRField(first));
      return;
    }

    updateMutation.mutate(
      {
        id,
        form,
        status: asSubmit ? "approved" : "draft",
      },
      {
        onSuccess: () => {
          router.push(
            `/procurement/purchase-requests?toast=${asSubmit ? "pr-submitted" : "pr-saved"}`,
          );
        },
        onError: (err) => {
          setError(getErrorMessage(err, "Failed to update purchase request."));
        },
      },
    );
  };

  return (
    <PRFormLayout
      mode="edit"
      prNumber={prNumber}
      status={detail.status}
      footer={
        <PRFormFooter
          onCancel={() => router.push(`/procurement/purchase-requests/${id}`)}
          onSaveDraft={() => persist(false)}
          onSubmit={() => persist(true)}
          showSubmit
          saveLabel={
            updateMutation.isPending ? "Saving…" : "Update Purchase Request"
          }
        />
      }
    >
      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
      <PurchaseRequestForm
        form={form}
        onChange={setForm}
        prNumber={prNumber}
        errors={errors}
        onClearError={clearError}
        onFieldBlur={handleFieldBlur}
      />
    </PRFormLayout>
  );
}
