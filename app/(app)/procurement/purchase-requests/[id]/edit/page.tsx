"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PRFormLayout } from "../../components/PRFormLayout";
import {
  PurchaseRequestForm,
  prToFormValues,
  type PRFormValues,
} from "../../components/PurchaseRequestForm";
import { PRFormFooter } from "../../components/PRFormFooter";
import { formToPR, submitPR, todayStr } from "../../components/pr-form-utils";
import { getPRById, loadPurchaseRequests, savePurchaseRequests } from "../../pr-data";
import { CURRENT_USER } from "@/lib/procurement/config";
import { Toast } from "../../../components/ProcurementUI";

export default function EditPRPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [form, setForm] = useState<PRFormValues | null>(null);
  const [pr, setPr] = useState(getPRById(id));
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const p = getPRById(id);
    setPr(p);
    if (p) setForm(prToFormValues(p));
  }, [id]);

  if (!form || !pr) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Purchase request not found.</div>
    );
  }

  const persist = (asSubmit: boolean) => {
    const today = todayStr();
    let record = formToPR(form, {
      id: pr.id,
      prNumber: pr.prNumber,
      status: pr.status,
      createdBy: pr.createdBy,
      createdDate: pr.createdDate,
      activity: [...pr.activity, { date: today, action: "Updated", by: CURRENT_USER }],
      convertedPoIds: pr.convertedPoIds,
      approvedBy: pr.approvedBy,
      approvedDate: pr.approvedDate,
    });
    if (asSubmit && ["draft", "rejected"].includes(pr.status)) record = submitPR(record);
    savePurchaseRequests(loadPurchaseRequests().map((p) => (p.id === id ? record : p)));
    setToast({ msg: asSubmit ? "PR submitted." : "Saved.", type: "success" });
    setTimeout(() => router.push(`/procurement/purchase-requests/${id}`), 800);
  };

  return (
    <>
      <PRFormLayout
        mode="edit"
        prNumber={pr.prNumber}
        pr={pr}
        onSave={() => persist(false)}
        footer={
          <PRFormFooter
            onCancel={() => router.push(`/procurement/purchase-requests/${id}`)}
            onSaveDraft={() => persist(false)}
            onSubmit={() => persist(true)}
            showSubmit={["draft", "rejected"].includes(pr.status)}
          />
        }
      >
        <PurchaseRequestForm form={form} onChange={setForm} />
      </PRFormLayout>
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
