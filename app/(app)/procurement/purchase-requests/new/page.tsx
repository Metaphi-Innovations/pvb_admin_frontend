"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PRFormLayout } from "../components/PRFormLayout";
import {
  PurchaseRequestForm,
  defaultPRForm,
  type PRFormValues,
} from "../components/PurchaseRequestForm";
import { PRFormFooter } from "../components/PRFormFooter";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/masters/master-query-errors";
import {
  useCreatePurchaseRequest,
  usePurchaseRequestPreviewNumber,
} from "@/hooks/procurement";

export default function NewPRPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState<PRFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const createMutation = useCreatePurchaseRequest();

  useEffect(() => {
    const displayName =
      user?.username || user?.email || "User";
    setForm(
      defaultPRForm({
        requestedById: user?.user_id ?? "",
        requestedBy: displayName,
      }),
    );
  }, [user?.user_id, user?.username, user?.email]);

  const previewQuery = usePurchaseRequestPreviewNumber(
    form?.state || "Maharashtra",
    Boolean(form),
  );
  const prNumber = previewQuery.data ?? "";

  const persist = (asSubmit: boolean) => {
    if (!form) return;
    setError(null);
    if (!form.requestedById) {
      setError("Please sign in again — requester could not be resolved.");
      return;
    }
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
    createMutation.mutate(
      {
        form,
        status: asSubmit ? "pending_approval" : "draft",
      },
      {
        onSuccess: () => {
          router.push(
            `/procurement/purchase-requests?toast=${asSubmit ? "pr-submitted" : "pr-draft"}`,
          );
        },
        onError: (err) => {
          setError(getErrorMessage(err, "Failed to save purchase request."));
        },
      },
    );
  };

  if (!form) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Loading form…</div>
    );
  }

  return (
    <PRFormLayout
      mode="create"
      prNumber={prNumber}
      status="draft"
      footer={
        <PRFormFooter
          onCancel={() => router.push("/procurement/purchase-requests")}
          onSaveDraft={() => persist(false)}
          onSubmit={() => persist(true)}
          saveLabel={
            createMutation.isPending ? "Saving…" : "Save Purchase Request"
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
