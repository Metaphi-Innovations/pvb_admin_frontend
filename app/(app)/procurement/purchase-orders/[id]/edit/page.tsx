"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CURRENT_USER } from "@/lib/procurement/config";
import { PurchaseOrderForm, poToFormValues, type POFormValues } from "../../components/PurchaseOrderForm";
import { POFormLayout } from "../../components/POFormLayout";
import { POFormFooter } from "../../components/POFormFooter";
import { getPOById, loadPurchaseOrders, savePurchaseOrders, recalcPO, submitPO } from "../../po-data";
import { todayStr } from "@/lib/procurement/utils";

export default function EditPOPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [form, setForm] = useState<POFormValues | null>(null);
  const [poNumber, setPoNumber] = useState("");
  const [status, setStatus] = useState("draft");
  const [submittedDate, setSubmittedDate] = useState("");

  useEffect(() => {
    const po = getPOById(id);
    if (po) {
      setForm(poToFormValues(po));
      setPoNumber(po.poNumber);
      setStatus(po.status);
      const submitted = po.activity.find((a) => a.action.toLowerCase().includes("submit"));
      setSubmittedDate(submitted?.date ?? po.updatedDate);
    }
  }, [id]);

  if (!form) return <div className="p-4 text-sm text-[#6B80A0]">Loading…</div>;

  const save = (submit = false) => {
    const po = getPOById(id);
    if (!po) return;
    let updated = recalcPO({
      ...po,
      ...form,
      updatedBy: CURRENT_USER,
      updatedDate: todayStr(),
      activity: [...po.activity, { date: todayStr(), action: "Updated", by: CURRENT_USER }],
    });
    if (submit) updated = submitPO(updated);
    savePurchaseOrders(loadPurchaseOrders().map((p) => (p.id === id ? updated : p)));
    router.push(`/procurement/purchase-orders?toast=${submit ? "po-submitted" : "po-saved"}`);
  };

  return (
    <POFormLayout
      mode="edit"
      poNumber={poNumber}
      status={status}
      backHref={`/procurement/purchase-orders/${id}`}
      onSave={() => save(false)}
      footer={
        <POFormFooter
          onCancel={() => router.push("/procurement/purchase-orders")}
          onSaveDraft={() => save(false)}
          onSubmit={() => save(true)}
          showSubmit={["draft", "rejected"].includes(status)}
        />
      }
    >
      <PurchaseOrderForm
        form={form}
        onChange={setForm}
        poNumber={poNumber}
        status={status}
        submittedDate={submittedDate}
      />
    </POFormLayout>
  );
}
