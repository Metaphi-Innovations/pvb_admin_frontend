"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PReturnFormLayout } from "../../../../purchase-returns/components/PReturnFormLayout";
import { PReturnFormFooter } from "../../../../purchase-returns/components/PReturnFormFooter";
import { PurchaseReturnForm } from "../../../../purchase-returns/components/PurchaseReturnForm";
import {
  getPurchaseReturnById,
  savePurchaseReturnDraft,
  submitPurchaseReturn,
  type PurchaseReturn,
} from "../../../../purchase-returns/purchase-return-data";
import { getPOById } from "../../../po-data";
import { recalcPurchaseReturn } from "../../../../purchase-returns/purchase-return-calc";
import {
  buildReturnableLinesForPO,
  canEditPurchaseReturn,
  purchaseReturnListHref,
  purchaseReturnRoutes,
  validateReturnBalance,
  validateReturnItems,
} from "../../../../purchase-returns/purchase-return-utils";

export default function EditPurchaseReturnPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [record, setRecord] = useState<PurchaseReturn | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const existing = getPurchaseReturnById(id);
    if (!existing || !canEditPurchaseReturn(existing)) return;
    const po = getPOById(existing.poId);
    if (!po) {
      setRecord(existing);
      return;
    }
    const freshLines = buildReturnableLinesForPO(po, existing.id, existing.items);
    setRecord(recalcPurchaseReturn({ ...existing, items: freshLines }, po));
  }, [id]);

  if (!record) {
    const existing = getPurchaseReturnById(id);
    if (existing && !canEditPurchaseReturn(existing)) {
      router.replace(purchaseReturnRoutes.detail(id));
      return null;
    }
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Purchase return not found.{" "}
        <Link href={purchaseReturnListHref()} className="text-brand-600 hover:underline">
          Back
        </Link>
      </div>
    );
  }

  const handleSubmit = () => {
    const e = validateReturnItems(record.items);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setErrors({});
    submitPurchaseReturn(record);
    router.push(`${purchaseReturnListHref()}&toast=pret-submitted`);
  };

  const handleSaveDraft = () => {
    const balanceErrors = validateReturnBalance(record.items);
    if (Object.keys(balanceErrors).length > 0) {
      setErrors(balanceErrors);
      return;
    }
    setErrors({});
    savePurchaseReturnDraft(record);
    router.push(`${purchaseReturnListHref()}&toast=pret-draft`);
  };

  return (
    <PReturnFormLayout
      mode="edit"
      returnNumber={record.returnNumber}
      footer={
        <PReturnFormFooter
          onCancel={() => router.push(purchaseReturnListHref())}
          onSaveDraft={handleSaveDraft}
          onSubmit={handleSubmit}
        />
      }
    >
      <PurchaseReturnForm record={record} onChange={setRecord} errors={errors} />
    </PReturnFormLayout>
  );
}
