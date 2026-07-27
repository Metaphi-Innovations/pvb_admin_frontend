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
import {
  detailToFormValues,
  usePurchaseRequest,
  usePurchaseRequestPreviewNumber,
  useUpdatePurchaseRequest,
} from "@/hooks/procurement";

const EDITABLE_STATUSES = ["draft", "rejected"] as const;

export default function EditPRPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id ?? "");
  const detailQuery = usePurchaseRequest(id);
  const updateMutation = useUpdatePurchaseRequest();
  const [form, setForm] = useState<PRFormValues | null>(null);
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
    setError(null);
    if (asSubmit) {
      if (!form.requiredByDate) {
        setError("Required By Date is required to submit.");
        return;
      }
      if (!form.lines.some((l) => l.productId && String(l.productId) !== "0")) {
        setError("Add at least one product before submitting.");
        return;
      }
    }
    updateMutation.mutate(
      {
        id,
        form,
        status: asSubmit ? "pending_approval" : "draft",
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
      <PurchaseRequestForm form={form} onChange={setForm} prNumber={prNumber} />
    </PRFormLayout>
  );
}
