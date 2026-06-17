"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CURRENT_USER } from "@/lib/procurement/config";
import { PurchaseOrderForm, defaultPOForm, type POFormValues } from "../components/PurchaseOrderForm";
import { POFormLayout } from "../components/POFormLayout";
import { POFormFooter } from "../components/POFormFooter";
import {
  loadPurchaseOrders,
  savePurchaseOrders,
  generatePONumber,
  recalcPO,
  submitPO,
} from "../po-data";
import { nextId, todayStr } from "@/lib/procurement/utils";
import type { PurchaseOrder } from "../po-data";
import { loadPurchaseRequests, savePurchaseRequests } from "../../purchase-requests/pr-data";

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
  const prId = searchParams.get("prId") ? Number(searchParams.get("prId")) : null;
  const [form, setForm] = useState<POFormValues | null>(null);
  const [poNumber, setPoNumber] = useState("");

  useEffect(() => {
    const list = loadPurchaseOrders();
    setPoNumber(generatePONumber(list));
    setForm(defaultPOForm(prId));
  }, [prId]);

  if (!form) return <div className="p-4 text-sm text-[#6B80A0]">Loading…</div>;

  const persist = (submit: boolean) => {
    const list = loadPurchaseOrders();
    const today = todayStr();
    const draft: PurchaseOrder = recalcPO({
      id: nextId(list),
      poNumber,
      ...form,
      summary: {
        grossAmount: 0,
        totalDiscount: 0,
        productTotal: 0,
        additionalChargesTotal: 0,
        taxableValue: 0,
        totalCgst: 0,
        totalSgst: 0,
        totalIgst: 0,
        otherCharges: 0,
        grandTotal: 0,
        amountInWords: "",
      },
      status: "draft",
      createdBy: CURRENT_USER,
      createdDate: today,
      updatedBy: CURRENT_USER,
      updatedDate: today,
      approvedBy: "",
      approvedDate: "",
      activity: [{ date: today, action: "Created", by: CURRENT_USER }],
    });
    let record = draft;
    if (submit) record = submitPO(record);
    savePurchaseOrders([...list, record]);

    if (form.sourcePrId) {
      const prs = loadPurchaseRequests().map((p) => {
        if (p.id !== form.sourcePrId) return p;
        return {
          ...p,
          convertedPoIds: [...p.convertedPoIds, record.id],
          status: "partially_converted" as const,
        };
      });
      savePurchaseRequests(prs);
    }

    router.push(`/procurement/purchase-orders?toast=${submit ? "po-submitted" : "po-draft"}`);
  };

  return (
    <POFormLayout
      mode="create"
      poNumber={poNumber}
      status="draft"
      onSave={() => persist(false)}
      footer={
        <POFormFooter
          onCancel={() => router.push("/procurement/purchase-orders")}
          onSaveDraft={() => persist(false)}
          onSubmit={() => persist(true)}
        />
      }
    >
      <PurchaseOrderForm form={form} onChange={setForm} poNumber={poNumber} status="draft" />
    </POFormLayout>
  );
}
