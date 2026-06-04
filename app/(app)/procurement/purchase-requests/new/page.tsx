"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PRFormLayout } from "../components/PRFormLayout";
import {
  PurchaseRequestForm,
  DEFAULT_PR_FORM,
  type PRFormValues,
} from "../components/PurchaseRequestForm";
import { PRFormFooter } from "../components/PRFormFooter";
import { formToPR, submitPR, nextId, todayStr } from "../components/pr-form-utils";
import { loadPurchaseRequests, savePurchaseRequests, generatePRNumber } from "../pr-data";
import { CURRENT_USER } from "@/lib/procurement/config";
import { Toast } from "../../components/ProcurementUI";

export default function NewPRPage() {
  const router = useRouter();
  const [form, setForm] = useState<PRFormValues>(DEFAULT_PR_FORM);
  const [prNumber, setPrNumber] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setPrNumber(generatePRNumber(loadPurchaseRequests()));
  }, []);

  const persist = (asSubmit: boolean) => {
    const list = loadPurchaseRequests();
    const today = todayStr();
    let record = formToPR(form, {
      id: nextId(list),
      prNumber,
      status: "draft",
      createdBy: CURRENT_USER,
      createdDate: today,
      activity: [{ date: today, action: "Created", by: CURRENT_USER }],
    });
    if (asSubmit) record = submitPR(record);
    savePurchaseRequests([...list, record]);
    setToast({ msg: asSubmit ? "PR submitted." : "Draft saved.", type: "success" });
    setTimeout(() => router.push("/procurement/purchase-requests"), 800);
  };

  return (
    <>
      <PRFormLayout
        mode="create"
        prNumber={prNumber}
        saveLabel="Save"
        onSave={() => persist(false)}
        footer={
          <PRFormFooter
            onCancel={() => router.push("/procurement/purchase-requests")}
            onSaveDraft={() => persist(false)}
            onSubmit={() => persist(true)}
          />
        }
      >
        <PurchaseRequestForm form={form} onChange={setForm} />
      </PRFormLayout>
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
