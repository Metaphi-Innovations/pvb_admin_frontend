"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PReturnFormLayout } from "../../../purchase-returns/components/PReturnFormLayout";
import { PReturnFormFooter } from "../../../purchase-returns/components/PReturnFormFooter";
import { PurchaseReturnForm } from "../../../purchase-returns/components/PurchaseReturnForm";
import {
  type PurchaseReturn,
} from "@/app/(app)/procurement/purchase-returns/purchase-return-data";
import {
  purchaseReturnListHref,
  validateReturnItems,
} from "@/app/(app)/procurement/purchase-returns/purchase-return-utils";
import { usePurchaseOrder } from "@/hooks/procurement";
import {
  useCreatePurchaseReturn,
  useEligiblePurchaseReturnItems,
  usePurchaseReturnPreviewNumber,
} from "@/hooks/procurement";
import { PurchaseReturnService } from "@/services/purchase-return.service";

export default function NewPurchaseReturnPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
      <NewPurchaseReturnContent />
    </Suspense>
  );
}

function NewPurchaseReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const poId = searchParams.get("poId") ?? "";
  const [record, setRecord] = useState<PurchaseReturn | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const poQuery = usePurchaseOrder(poId || null);
  const previewQuery = usePurchaseReturnPreviewNumber(Boolean(poId));
  const eligibleItemsQuery = useEligiblePurchaseReturnItems(
    poId || null,
    poQuery.data?.warehouseId ? String(poQuery.data.warehouseId) : undefined,
  );
  const createMutation = useCreatePurchaseReturn();

  useEffect(() => {
    if (!poQuery.data || !previewQuery.data || !eligibleItemsQuery.data) return;
    setRecord(PurchaseReturnService.buildCreateFromPo(poQuery.data, previewQuery.data, eligibleItemsQuery.data));
  }, [eligibleItemsQuery.data, poQuery.data, previewQuery.data]);

  if (!record) {
    return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;
  }

  const handleSubmit = () => {
    const e = validateReturnItems(record.items);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setErrors({});
    createMutation.mutate(record, {
      onSuccess: () => {
        router.push(`${purchaseReturnListHref()}&toast=pret-submitted`);
      },
    });
  };

  const handleSaveDraft = () => {
    handleSubmit();
  };

  return (
    <PReturnFormLayout
      mode="create"
      returnNumber={record.returnNumber}
      footer={
        <PReturnFormFooter
          onCancel={() => router.push(`/procurement/purchase-orders/${poId}`)}
          onSaveDraft={handleSaveDraft}
          onSubmit={handleSubmit}
        />
      }
    >
      <PurchaseReturnForm record={record} onChange={setRecord} errors={errors} />
    </PReturnFormLayout>
  );
}
