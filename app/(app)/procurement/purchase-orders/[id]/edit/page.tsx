"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CURRENT_USER } from "@/lib/procurement/config";
import { PurchaseOrderForm, poToFormValues, type POFormValues } from "../../components/PurchaseOrderForm";
import { POFormLayout } from "../../components/POFormLayout";
import { POFormFooter } from "../../components/POFormFooter";
import { getPOById, loadPurchaseOrders, savePurchaseOrders, recalcPO, submitPO } from "../../po-data";
import { todayStr } from "@/lib/procurement/utils";

const EDITABLE_STATUSES = ["draft", "rejected"] as const;

export default function EditPOPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [form, setForm] = useState<POFormValues | null>(null);
  const [po, setPo] = useState(getPOById(id));
  const [poNumber, setPoNumber] = useState("");
  const [status, setStatus] = useState("draft");
  const [submittedDate, setSubmittedDate] = useState("");

  useEffect(() => {
    const record = getPOById(id);
    setPo(record);
    if (!record) return;
    if (!EDITABLE_STATUSES.includes(record.status as (typeof EDITABLE_STATUSES)[number])) {
      router.replace(`/procurement/purchase-orders/${id}`);
      return;
    }
    setForm(poToFormValues(record));
    setPoNumber(record.poNumber);
    setStatus(record.status);
    const submitted = record.activity.find((a) => a.action.toLowerCase().includes("submit"));
    setSubmittedDate(submitted?.date ?? record.updatedDate);
  }, [id, router]);

  const canEdit = useMemo(
    () => !!po && EDITABLE_STATUSES.includes(po.status as (typeof EDITABLE_STATUSES)[number]),
    [po],
  );

  if (!form || !po) {
    return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!canEdit) {
    return (
      <div className="p-8 text-sm text-muted-foreground">This purchase order cannot be edited.</div>
    );
  }

  const save = (submit = false) => {
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
          onCancel={() => router.push(`/procurement/purchase-orders/${id}`)}
          onSaveDraft={() => save(false)}
          onSubmit={() => save(true)}
          showSubmit={["draft", "rejected"].includes(status)}
          saveLabel="Update Purchase Order"
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
