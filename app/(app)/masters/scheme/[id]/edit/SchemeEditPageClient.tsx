"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveMasterRecords } from "@/lib/masters/common";
import { SchemeUnifiedConfigForm } from "../../components/SchemeUnifiedConfigForm";
import { loadConsolidatedSchemeRecords } from "../../product-near-expiry-scheme";
import {
  canEditUnifiedScheme,
  schemeRecordToUnifiedForm,
  unifiedFormToRecord,
  validateUnifiedSchemeForm,
  type SchemeUnifiedForm,
} from "../../scheme-unified-config";
import { SCHEME_STORAGE_KEY, type SchemeRecord } from "../../scheme-data";

export default function SchemeEditPageClient() {
  const router = useRouter();
  const params = useParams();
  const schemeId = Number(params.id);

  const [record, setRecord] = useState<SchemeRecord | null>(null);
  const [form, setForm] = useState<SchemeUnifiedForm | null>(null);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const list = loadConsolidatedSchemeRecords();
    const found = list.find((r) => r.id === schemeId);
    if (!found) {
      router.replace("/masters/scheme");
      return;
    }
    if (!canEditUnifiedScheme(found)) {
      setToast({ msg: "This scheme cannot be edited after approval", type: "error" });
      setTimeout(() => router.replace("/masters/scheme"), 1200);
      return;
    }
    setRecord(found);
    setForm(schemeRecordToUnifiedForm(found));
  }, [schemeId, router]);

  const handleSave = () => {
    if (!record || !form) return;
    const err = validateUnifiedSchemeForm(form);
    if (err) {
      setFormError(err);
      setToast({ msg: err, type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }
    const list = loadConsolidatedSchemeRecords();
    const updated = unifiedFormToRecord(form, list, record.id, record);
    saveMasterRecords(
      SCHEME_STORAGE_KEY,
      list.map((r) => (r.id === record.id ? updated : r)),
    );
    setToast({ msg: "Scheme updated", type: "success" });
    setTimeout(() => router.push("/masters/scheme"), 900);
  };

  if (!record || !form) {
    return (
      <FormContainer title="Edit Scheme" description="Loading…" compact>
        <p className="text-xs text-muted-foreground">Loading scheme…</p>
      </FormContainer>
    );
  }

  return (
    <>
      <FormContainer
        title="Edit Scheme"
        description={`Masters → Scheme Master → ${record.schemeCode}`}
        onBack={() => router.push("/masters/scheme")}
        onCancel={() => router.push("/masters/scheme")}
        compact
        noCard
        actions={
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1 bg-brand-600 text-[11px] text-white hover:bg-brand-700"
            onClick={handleSave}
          >
            <Save className="h-3.5 w-3.5" /> Save Draft
          </Button>
        }
      >
        <SchemeUnifiedConfigForm
          form={form}
          onChange={(next) => {
            setForm(next);
            setFormError("");
          }}
          mode="edit"
          schemeCode={record.schemeCode}
          error={formError}
          lockCategory
        />
      </FormContainer>
      {toast ? (
        <div
          className={cn(
            "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {toast.msg}
        </div>
      ) : null}
    </>
  );
}
