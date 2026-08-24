"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  PurchaseOrderForm,
  poToFormValues,
  validatePOForm,
  focusFirstPOError,
  type POFormValues,
  type POFormErrors,
} from "../../components/PurchaseOrderForm";
import { POFormLayout } from "../../components/POFormLayout";
import { POFormFooter } from "../../components/POFormFooter";
import { POFormPageSkeleton } from "../../components/POSkeletons";
import { usePurchaseOrder, useUpdatePurchaseOrder } from "@/hooks/procurement";
import { getErrorMessage } from "@/lib/masters/master-query-errors";
import type { POListStatus } from "@/lib/procurement/po-status";

const EDITABLE_STATUSES = [
  "draft",
  "rejected",
  "approved",
  "invoice_uploaded",
  "partially_received",
  "received",
] as const;

export default function EditPOPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id ?? "");
  const detailQuery = usePurchaseOrder(id);
  const updateMutation = useUpdatePurchaseOrder();
  const [form, setForm] = useState<POFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<POFormErrors>({});

  const po = detailQuery.data;

  const isMatchAdjustmentEdit = useMemo(
    () =>
      !!po &&
      (["approved", "invoice_uploaded", "partially_received", "received"] as const).includes(
        po.status as "approved" | "invoice_uploaded" | "partially_received" | "received",
      ),
    [po],
  );

  useEffect(() => {
    if (!po) return;
    if (
      !EDITABLE_STATUSES.includes(
        po.status as (typeof EDITABLE_STATUSES)[number],
      )
    ) {
      router.replace(`/procurement/purchase-orders/${id}`);
      return;
    }
    setForm(poToFormValues(po));
  }, [po, id, router]);

  const canEdit = useMemo(
    () =>
      !!po &&
      EDITABLE_STATUSES.includes(
        po.status as (typeof EDITABLE_STATUSES)[number],
      ),
    [po],
  );

  if (detailQuery.isLoading || !form || !po) {
    return <POFormPageSkeleton />;
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
      <div className="p-8 text-sm text-muted-foreground">
        This purchase order cannot be edited.
      </div>
    );
  }

  const handleFormChange = (next: POFormValues) => {
    setForm(next);
    if (Object.keys(errors).length > 0) setErrors({});
  };

  const resolveSaveStatus = (submit: boolean): POListStatus => {
    if (submit) return "approved";
    if (po.status === "rejected") return "draft";
    // Frontend-only display status — backend still stores Approved / Received / etc.
    if (po.status === "invoice_uploaded") return "approved";
    return po.status;
  };

  const save = (submit = false) => {
    setError(null);
    if (submit) {
      const validationErrors = validatePOForm(form);
      setErrors(validationErrors);
      if (Object.keys(validationErrors).length > 0) {
        setError("Please fix the required fields before submitting.");
        requestAnimationFrame(() => focusFirstPOError(validationErrors));
        return;
      }
    } else {
      setErrors({});
    }
    updateMutation.mutate(
      {
        id: po.id,
        form,
        poNumber: po.poNumber,
        status: resolveSaveStatus(submit),
      },
      {
        onSuccess: () => {
          router.push(
            `/procurement/purchase-orders?toast=${submit ? "po-submitted" : "po-saved"}`,
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
      backHref="/procurement/purchase-orders"
      onSave={() => save(false)}
      footer={
        <POFormFooter
          onCancel={() => router.push("/procurement/purchase-orders")}
          onSaveDraft={() => save(false)}
          onSubmit={() => save(true)}
          showSubmit={["draft", "rejected"].includes(po.status)}
          saveLabel={
            isMatchAdjustmentEdit
              ? "Update Quantities"
              : ["draft", "rejected"].includes(po.status)
                ? "Draft"
                : "Update Purchase Order"
          }
          saving={updateMutation.isPending}
        />
      }
    >
      {error ? <p className="mb-3 text-xs text-red-600">{error}</p> : null}
      {isMatchAdjustmentEdit ? (
        <p className="mb-3 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Edit <span className="font-semibold">Qty</span> for each product to align with
          Received / Invoiced (SKU). Rate is fixed. Line totals update as you change Qty.
        </p>
      ) : null}
      <PurchaseOrderForm
        form={form}
        onChange={handleFormChange}
        poNumber={po.poNumber}
        status={po.status}
        submittedDate={po.updatedDate}
        errors={errors}
        showReceiptContext={isMatchAdjustmentEdit}
      />
    </POFormLayout>
  );
}
