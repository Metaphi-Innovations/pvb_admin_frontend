"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PReturnFormLayout } from "../../../purchase-returns/components/PReturnFormLayout";
import { PReturnFormFooter } from "../../../purchase-returns/components/PReturnFormFooter";
import { PurchaseReturnForm } from "../../../purchase-returns/components/PurchaseReturnForm";
import {
  type PurchaseReturn,
} from "@/app/(app)/procurement/purchase-returns/purchase-return-data";
import {
  parsePurchaseReturnNavSource,
  resolvePurchaseReturnBackHref,
  resolvePurchaseReturnRedirectWithToast,
  validateReturnItems,
} from "@/app/(app)/procurement/purchase-returns/purchase-return-utils";
import { usePurchaseOrder } from "@/hooks/procurement";
import {
  useCreatePurchaseReturn,
  useEligiblePurchaseReturnItems,
  usePurchaseReturnPreviewNumber,
} from "@/hooks/procurement";
import { PurchaseReturnService } from "@/services/purchase-return.service";
import { getErrorMessage } from "@/lib/masters/master-query-errors";

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
  const from = parsePurchaseReturnNavSource(searchParams.get("from"));
  const backHref = resolvePurchaseReturnBackHref(from);
  const [record, setRecord] = useState<PurchaseReturn | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const poQuery = usePurchaseOrder(poId || null);
  const previewQuery = usePurchaseReturnPreviewNumber(Boolean(poId));
  const eligibleItemsQuery = useEligiblePurchaseReturnItems(poId || null);
  const createMutation = useCreatePurchaseReturn();

  useEffect(() => {
    if (!poQuery.data || !previewQuery.data || !eligibleItemsQuery.data) return;
    if (!initializedRef.current) {
      setRecord(
        PurchaseReturnService.buildCreateFromPo(
          poQuery.data,
          previewQuery.data,
          eligibleItemsQuery.data,
        ),
      );
      initializedRef.current = true;
      return;
    }
    setRecord((prev) =>
      prev && prev.returnNumber !== previewQuery.data
        ? { ...prev, returnNumber: previewQuery.data }
        : prev,
    );
  }, [eligibleItemsQuery.data, poQuery.data, previewQuery.data]);

  if (!record) {
    return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;
  }

  const handleSubmit = () => {
    setFormError(null);
    const e = validateReturnItems(record.items);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setErrors({});
    createMutation.mutate(record, {
      onSuccess: () => {
        router.push(resolvePurchaseReturnRedirectWithToast(from, "pret-submitted"));
      },
      onError: async (err) => {
        const message = getErrorMessage(err, "Failed to create purchase return.");
        if (/purchase return number already exists/i.test(message)) {
          try {
            const { data: nextNumber } = await previewQuery.refetch();
            if (nextNumber) {
              setRecord((prev) => (prev ? { ...prev, returnNumber: nextNumber } : prev));
              setFormError(
                `${message} A new return number (${nextNumber}) has been loaded. Please submit again.`,
              );
              return;
            }
          } catch {
            // Fall through to the original error if preview refresh fails.
          }
        }
        setFormError(message);
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
      backHref={backHref}
      footer={
        <PReturnFormFooter
          onCancel={() => router.push(backHref)}
          onSaveDraft={handleSaveDraft}
          onSubmit={handleSubmit}
        />
      }
    >
      {formError ? <p className="mb-3 text-xs text-red-600">{formError}</p> : null}
      <PurchaseReturnForm record={record} onChange={setRecord} errors={errors} />
    </PReturnFormLayout>
  );
}
