"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveMasterRecords, loadMasterRecords } from "@/lib/masters/common";
import { SchemeFormSheet, countBulkPreview } from "../components/SchemeFormSheet";
import {
  DEFAULT_SCHEME_BULK_FORM,
  SCHEME_SEED,
  SCHEME_STORAGE_KEY,
  bulkFormToRecords,
  validateSchemeBulkForm,
  type SchemeBulkForm,
  type SchemeRecord,
} from "../scheme-data";

export default function SchemeAddPageClient() {
  const router = useRouter();
  const [form, setForm] = useState<SchemeBulkForm>({ ...DEFAULT_SCHEME_BULK_FORM });
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const bulkPreviewCount = useMemo(() => countBulkPreview(form), [form]);

  const handleSave = () => {
    const err = validateSchemeBulkForm(form, "add");
    if (err) {
      setFormError(err);
      setToast({ msg: err, type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    const list = loadMasterRecords<SchemeRecord>(SCHEME_STORAGE_KEY, SCHEME_SEED);
    const startId = list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
    const newRecords = bulkFormToRecords(form, list, startId);
    saveMasterRecords(SCHEME_STORAGE_KEY, [...list, ...newRecords]);

    setToast({
      msg: `${newRecords.length} scheme${newRecords.length > 1 ? "s" : ""} created as draft`,
      type: "success",
    });
    setTimeout(() => router.push("/masters/scheme"), 900);
  };

  return (
    <FormContainer
      title="Create Scheme"
      description="Masters → Scheme Management → Create"
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
        mode="add"
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
