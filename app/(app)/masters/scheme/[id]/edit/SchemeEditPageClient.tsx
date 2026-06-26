"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveMasterRecords, loadMasterRecords } from "@/lib/masters/common";
import { SchemeFormSheet, countBulkPreview } from "../../components/SchemeFormSheet";
import {
  SCHEME_SEED,
  SCHEME_STORAGE_KEY,
  bulkFormToSingleRecord,
  canEditRecord,
  recordToBulkForm,
  schemeNeedsReapproval,
  validateSchemeBulkForm,
  PENDING_APPROVAL_STATUSES,
  type SchemeBulkForm,
  type SchemeRecord,
} from "../../scheme-data";

export default function SchemeEditPageClient() {
  const router = useRouter();
  const params = useParams();
  const schemeId = Number(params.id);

  const [form, setForm] = useState<SchemeBulkForm | null>(null);
  const [record, setRecord] = useState<SchemeRecord | null>(null);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const list = loadMasterRecords<SchemeRecord>(SCHEME_STORAGE_KEY, SCHEME_SEED);
    const found = list.find((r) => r.id === schemeId);
    if (!found) {
      router.replace("/masters/scheme");
      return;
    }
    if (!canEditRecord(found)) {
      setToast({ msg: "Only draft schemes can be edited", type: "error" });
      setTimeout(() => router.replace("/masters/scheme"), 1200);
      return;
    }
    setRecord(found);
    setForm(recordToBulkForm(found));
  }, [schemeId, router]);

  const bulkPreviewCount = useMemo(() => (form ? countBulkPreview(form) : 0), [form]);

  const handleSave = () => {
    if (!form || !record) return;
    const err = validateSchemeBulkForm(form, "edit");
    if (err) {
      setFormError(err);
      setToast({ msg: err, type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    const list = loadMasterRecords<SchemeRecord>(SCHEME_STORAGE_KEY, SCHEME_SEED);
    const wasApproved =
      record.approvalStatus === "approved" ||
      record.approvalStatus === "active" ||
      PENDING_APPROVAL_STATUSES.includes(record.approvalStatus);

    let updated = list.map((r) =>
      r.id === record.id ? bulkFormToSingleRecord(form, record.id, record) : r,
    );
    if (wasApproved) {
      updated = updated.map((r) => (r.id === record.id ? schemeNeedsReapproval(r) : r));
    }

    saveMasterRecords(SCHEME_STORAGE_KEY, updated);
    setToast({ msg: "Scheme updated successfully", type: "success" });
    setTimeout(() => router.push("/masters/scheme"), 900);
  };

  if (!form || !record) {
    return (
      <FormContainer title="Edit Scheme" description="Loading...">
        <p className="text-xs text-muted-foreground">Loading scheme...</p>
      </FormContainer>
    );
  }

  return (
    <FormContainer
      title="Edit Draft Scheme"
      description={`Masters → Scheme → ${record.schemeName}`}
      onBack={() => router.push("/masters/scheme")}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-9 text-xs font-semibold rounded-lg"
            onClick={() => router.push("/masters/scheme")}
          >
            Discard
          </Button>
          <Button
            type="button"
            className="h-9 text-xs font-semibold rounded-lg gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
          >
            <Save className="w-4 h-4" /> Save
          </Button>
        </div>
      }
    >
      <SchemeFormSheet
        form={form}
        onChange={(next) => {
          setForm(next);
          setFormError("");
        }}
        mode="edit"
        bulkPreviewCount={bulkPreviewCount}
        error={formError}
      />

      {toast && (
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
      )}
    </FormContainer>
  );
}
