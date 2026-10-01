"use client";

import React, { useEffect, useMemo, useState } from "react";
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

const EDITABLE_STATUSES = ["draft", "rejected"] as const;

export default function EditPRPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [form, setForm] = useState<PRFormValues | null>(null);
  const [pr, setPr] = useState(getPRById(id));

  useEffect(() => {
    const p = getPRById(id);
    setPr(p);
    if (!p) return;
    if (!EDITABLE_STATUSES.includes(p.status as (typeof EDITABLE_STATUSES)[number])) {
      router.replace(`/procurement/purchase-requests/${id}`);
      return;
    }
    setForm(prToFormValues(p));
  }, [id, router]);

  const canEdit = useMemo(
    () => !!pr && EDITABLE_STATUSES.includes(pr.status as (typeof EDITABLE_STATUSES)[number]),
    [pr],
  );

  if (!form || !pr) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Purchase request not found.</div>
    );
  }

  if (!canEdit) {
    return (
      <div className="p-8 text-sm text-muted-foreground">This purchase request cannot be edited.</div>
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
    if (asSubmit) record = submitPR(record);
    savePurchaseRequests(loadPurchaseRequests().map((p) => (p.id === id ? record : p)));
    router.push(
      `/procurement/purchase-requests?toast=${asSubmit ? "pr-submitted" : "pr-saved"}`,
    );
  };

  return (
    <PRFormLayout
      mode="edit"
      prNumber={pr.prNumber}
      status={pr.status}
      footer={
        <PRFormFooter
          onCancel={() => router.push(`/procurement/purchase-requests/${id}`)}
          onSaveDraft={() => persist(false)}
          onSubmit={() => persist(true)}
          showSubmit
          saveLabel="Update Purchase Request"
        />
      }
    >
      <PurchaseRequestForm form={form} onChange={setForm} prNumber={pr.prNumber} />
    </PRFormLayout>
  );
}
