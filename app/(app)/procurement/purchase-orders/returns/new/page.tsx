"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPOById } from "../../po-data";
import { PReturnFormLayout } from "../../../purchase-returns/components/PReturnFormLayout";
import { PReturnFormFooter } from "../../../purchase-returns/components/PReturnFormFooter";
import { PurchaseReturnForm } from "../../../purchase-returns/components/PurchaseReturnForm";
import {
  defaultPurchaseReturnFromPO,
  savePurchaseReturnDraft,
  submitPurchaseReturn,
  type PurchaseReturn,
} from "../../../purchase-returns/purchase-return-data";
import {
  getPurchaseReturnEligibility,
  purchaseReturnListHref,
  validateReturnBalance,
  validateReturnItems,
} from "../../../purchase-returns/purchase-return-utils";

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
  const poId = Number(searchParams.get("poId"));
  const [record, setRecord] = useState<PurchaseReturn | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const po = getPOById(poId);
    if (!po) return;
    const { eligible } = getPurchaseReturnEligibility(po);
    if (!eligible) {
      router.replace(`/procurement/purchase-orders/${poId}`);
      return;
    }
    setRecord(defaultPurchaseReturnFromPO(po));
  }, [poId, router]);

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
