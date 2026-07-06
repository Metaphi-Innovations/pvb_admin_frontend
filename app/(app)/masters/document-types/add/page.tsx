"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCreateDocumentType } from "@/hooks/masters";
import { getErrorMessage } from "@/lib/masters/master-query-errors";
import {
  DocumentTypeForm,
  DEFAULT_DOCUMENT_TYPE_FORM,
  type DocumentTypeFormValues,
  validateDocumentTypeForm,
} from "../components/DocumentTypeForm";

export default function AddDocumentTypePage() {
  const router = useRouter();
  const [form, setForm] = useState<DocumentTypeFormValues>(DEFAULT_DOCUMENT_TYPE_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const createMutation = useCreateDocumentType();
  const saving = createMutation.isPending;

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = () => {
    const validation = validateDocumentTypeForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    createMutation.mutate(
      {
        title: form.title,
        description: form.description,
      },
      {
        onSuccess: () => {
          setToast({ msg: "Document Type added successfully", type: "success" });
          setTimeout(() => router.push("/masters/document-types"), 900);
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to create document type."),
            type: "error",
          });
          setTimeout(() => setToast(null), 3200);
        },
      },
    );
  };

  return (
    <FormContainer
      title="Add Document Type"
      description="Masters → Document Type Master → Add"
      onBack={() => router.back()}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-9 text-xs font-semibold rounded-lg"
            onClick={() => router.back()}
            disabled={saving}
          >
            Discard
          </Button>
          <Button
            className="h-9 text-xs font-semibold rounded-lg gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Document Type"}
          </Button>
        </div>
      }
    >
      <DocumentTypeForm
        form={form}
        onChange={setForm}
        errors={errors}
        onClearError={clearErr}
      />

      {toast && (
        <div
          className={cn(
            "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
          )}
        >
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </FormContainer>
  );
}
