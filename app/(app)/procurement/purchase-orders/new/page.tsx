"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PurchaseOrderForm, defaultPOForm, type POFormValues } from "../components/PurchaseOrderForm";
import { POFormLayout } from "../components/POFormLayout";
import { POFormFooter } from "../components/POFormFooter";
import {
  useCreatePurchaseOrder,
  usePurchaseOrderPreviewNumber,
} from "@/hooks/procurement";
import { getErrorMessage } from "@/lib/masters/master-query-errors";

export default function NewPOPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[#6B80A0]">Loading…</div>}>
      <NewPOContent />
    </Suspense>
  );
}

function NewPOContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prIdParam = searchParams.get("prId");
  const prId = prIdParam && /^\d+$/.test(prIdParam) ? Number(prIdParam) : null;
  const [form, setForm] = useState<POFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewQuery = usePurchaseOrderPreviewNumber(true);
  const createMutation = useCreatePurchaseOrder();

  const poNumber = previewQuery.data ?? "";

  useEffect(() => {
    setForm(defaultPOForm(prId));
  }, [prId]);

  if (!form) return <div className="p-4 text-sm text-[#6B80A0]">Loading…</div>;

  const persist = (submit: boolean) => {
    setError(null);
    createMutation.mutate(
      {
        form,
        poNumber: submit ? poNumber : poNumber || undefined,
        status: submit ? "approved" : "draft",
      },
      {
        onSuccess: (created) => {
          router.push(
            `/procurement/purchase-orders/${created.id}?toast=${submit ? "po-submitted" : "po-draft"}`,
          );
        },
        onError: (err) => {
          setError(getErrorMessage(err, "Failed to save purchase order."));
        },
      },
    );
  };

  return (
    <POFormLayout
      mode="create"
      poNumber={poNumber || "Auto on submit"}
      status="draft"
      onSave={() => persist(false)}
      footer={
        <POFormFooter
          onCancel={() => router.push("/procurement/purchase-orders")}
          onSaveDraft={() => persist(false)}
          onSubmit={() => persist(true)}
          saving={createMutation.isPending}
        />
      }
    >
      {error ? <p className="mb-3 text-xs text-red-600">{error}</p> : null}
      <PurchaseOrderForm form={form} onChange={setForm} poNumber={poNumber} status="draft" />
    </POFormLayout>
  );
}
