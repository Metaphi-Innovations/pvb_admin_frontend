"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  loadDocumentTypes,
  saveDocumentTypes,
  generateNextDocumentTypeCode,
  todayStr,
  type DocumentTypeMaster,
} from "../../document-type-data";
import {
  DocumentTypeForm,
  type DocumentTypeFormValues,
  validateDocumentTypeForm,
} from "../../components/DocumentTypeForm";

export default function EditDocumentTypePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<DocumentTypeFormValues | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const list = loadDocumentTypes();
    const found = list.find((d) => d.id === id);
    if (!found) return;
    setForm({
      documentTypeCode: found.documentTypeCode || generateNextDocumentTypeCode(list),
      title: found.title,
      description: found.description || "",
    });
  }, [id]);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = () => {
    if (!form) return;
    const validation = validateDocumentTypeForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    const list = loadDocumentTypes();
    const updated = list.map((d) =>
      d.id === id
        ? {
            ...d,
            documentTypeCode: form.documentTypeCode,
            title: form.title.trim(),
            description: form.description.trim(),
            updatedBy: "Admin",
            updatedDate: todayStr(),
          }
        : d
    );

    saveDocumentTypes(updated);
    setToast({ msg: "Document Type updated successfully", type: "success" });
    setTimeout(() => router.push("/masters/document-types"), 900);
  };

  if (!form) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Document Type not found.</p>
        <Link href="/masters/document-types" className="text-xs text-brand-600 hover:underline mt-2 inline-block">
          Back to listing
        </Link>
      </div>
    );
  }

  return (
    <FormContainer
      title="Edit Document Type"
      description="Masters → Document Type Master → Edit"
      onBack={() => router.back()}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 text-xs font-semibold rounded-lg" onClick={() => router.back()}>
            Discard
          </Button>
          <Button
            className="h-9 text-xs font-semibold rounded-lg gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
          >
            <Save className="w-4 h-4" /> Update Document Type
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
