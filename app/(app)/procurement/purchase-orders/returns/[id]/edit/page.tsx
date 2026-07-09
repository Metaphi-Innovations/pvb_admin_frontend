"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PReturnFormLayout } from "@/app/(app)/procurement/purchase-returns/components/PReturnFormLayout";
import { PReturnFormFooter } from "@/app/(app)/procurement/purchase-returns/components/PReturnFormFooter";
import { PurchaseReturnForm } from "@/app/(app)/procurement/purchase-returns/components/PurchaseReturnForm";
import type { PurchaseReturn } from "@/app/(app)/procurement/purchase-returns/purchase-return-data";
import {
  isPurchaseReturnLocked,
  mergeReturnItemsForEdit,
  purchaseReturnListHref,
  validateReturnItems,
} from "@/app/(app)/procurement/purchase-returns/purchase-return-utils";
import { recalcPurchaseReturn } from "@/app/(app)/procurement/purchase-returns/purchase-return-calc";
import {
  useEligiblePurchaseReturnItems,
  usePurchaseReturn,
  useUpdatePurchaseReturn,
} from "@/hooks/procurement";

export default function EditPurchaseReturnPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const [record, setRecord] = useState<PurchaseReturn | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mergedOnce, setMergedOnce] = useState(false);

  const detailQuery = usePurchaseReturn(id);
  const detail = detailQuery.data;

  const eligibleItemsQuery = useEligiblePurchaseReturnItems(
    detail?.poId ? String(detail.poId) : null,
    detail?.warehouseId || undefined,
    id,
  );
  const updateMutation = useUpdatePurchaseReturn();

  const locked = useMemo(
    () => (detail ? isPurchaseReturnLocked(detail) : true),
    [detail],
  );

  useEffect(() => {
    if (!detail) return;

    // Locked / packed: keep dedicated Edit page in read-only mode (do not redirect to View).
    if (locked) {
      setRecord(detail);
      setMergedOnce(true);
      return;
    }

    if (!eligibleItemsQuery.data || mergedOnce) return;

    const mergedItems = mergeReturnItemsForEdit(detail.items, eligibleItemsQuery.data);
    setRecord(recalcPurchaseReturn({ ...detail, items: mergedItems }));
    setMergedOnce(true);
  }, [detail, eligibleItemsQuery.data, locked, mergedOnce]);

  useEffect(() => {
    setMergedOnce(false);
    setRecord(null);
  }, [id]);

  if (detailQuery.isLoading || (!record && eligibleItemsQuery.isFetching)) {
    return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!record) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Purchase return not found.{" "}
        <Link href={purchaseReturnListHref()} className="text-brand-600 hover:underline">
          Back
        </Link>
      </div>
    );
  }

  const readOnly = locked;

  const handleSubmit = () => {
    if (readOnly) return;
    const e = validateReturnItems(record.items);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setErrors({});
    updateMutation.mutate(
      { id: String(record.id), record },
      { onSuccess: () => router.push(`${purchaseReturnListHref()}&toast=pret-submitted`) },
    );
  };

  return (
    <PReturnFormLayout
      mode="edit"
      returnNumber={record.returnNumber}
      footer={
        <PReturnFormFooter
          readOnly={readOnly}
          onCancel={() => router.push(purchaseReturnListHref())}
          onSaveDraft={readOnly ? undefined : handleSubmit}
          onSubmit={readOnly ? undefined : handleSubmit}
          showSubmit={!readOnly}
        />
      }
    >
      {readOnly && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-xs font-semibold text-amber-800">
            This purchase return is already packed or completed and cannot be modified.
          </p>
          <p className="mt-0.5 text-[11px] text-amber-700">
            Quantities, products, and GRN lines are read-only. Use View for full details.
          </p>
        </div>
      )}
      <PurchaseReturnForm
        record={record}
        onChange={setRecord}
        readOnly={readOnly}
        errors={errors}
        editMode={!readOnly}
      />
    </PReturnFormLayout>
  );
}
