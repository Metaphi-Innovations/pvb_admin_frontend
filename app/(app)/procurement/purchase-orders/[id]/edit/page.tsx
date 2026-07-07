"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PurchaseOrderForm, poToFormValues, type POFormValues } from "../../components/PurchaseOrderForm";
import { POFormLayout } from "../../components/POFormLayout";
import { POFormFooter } from "../../components/POFormFooter";
import { usePurchaseOrder, useUpdatePurchaseOrder } from "@/hooks/procurement";
import { getErrorMessage } from "@/lib/masters/master-query-errors";

const EDITABLE_STATUSES = ["draft", "rejected"] as const;

export default function EditPOPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id ?? "");
  const detailQuery = usePurchaseOrder(id);
  const updateMutation = useUpdatePurchaseOrder();
  const [form, setForm] = useState<POFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);

  const po = detailQuery.data;

  useEffect(() => {
    if (!po) return;
    if (!EDITABLE_STATUSES.includes(po.status as (typeof EDITABLE_STATUSES)[number])) {
      router.replace(`/procurement/purchase-orders/${id}`);
      return;
    }
    setForm(poToFormValues(po));
  }, [po, id, router]);

  const canEdit = useMemo(
    () => !!po && EDITABLE_STATUSES.includes(po.status as (typeof EDITABLE_STATUSES)[number]),
    [po],
  );

  if (detailQuery.isLoading || !form || !po) {
    return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;
  }

  if (detailQuery.isError) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        {getErrorMessage(detailQuery.error, "Purchase order not found.")}
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="p-8 text-sm text-muted-foreground">This purchase order cannot be edited.</div>
    );
  }

  const save = (submit = false) => {
    setError(null);
    updateMutation.mutate(
      {
        id: po.id,
        form,
        poNumber: po.poNumber,
        status: submit ? "pending_approval" : po.status === "rejected" ? "draft" : po.status,
      },
      {
        onSuccess: () => {
          router.push(
            `/procurement/purchase-orders/${po.id}?toast=${submit ? "po-submitted" : "po-saved"}`,
          );
        },
        onError: (err) => {
          setError(getErrorMessage(err, "Failed to update purchase order."));
        },
      },
    );
  };

  return (
    <POFormLayout
      mode="edit"
      poNumber={po.poNumber}
      status={po.status}
      backHref={`/procurement/purchase-orders/${id}`}
      onSave={() => save(false)}
      footer={
        <POFormFooter
          onCancel={() => router.push(`/procurement/purchase-orders/${id}`)}
          onSaveDraft={() => save(false)}
          onSubmit={() => save(true)}
          showSubmit={["draft", "rejected"].includes(po.status)}
          saveLabel="Update Purchase Order"
          saving={updateMutation.isPending}
        />
      }
    >
      {error ? <p className="mb-3 text-xs text-red-600">{error}</p> : null}
      <PurchaseOrderForm
        form={form}
        onChange={setForm}
        poNumber={po.poNumber}
        status={po.status}
        submittedDate={po.updatedDate}
      />
    </POFormLayout>
  );
}
