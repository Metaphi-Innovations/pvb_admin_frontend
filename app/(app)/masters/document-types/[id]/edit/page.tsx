"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDocumentType, useUpdateDocumentType } from "@/hooks/masters";
import {
  getErrorMessage,
  getMasterDetailErrorMessage,
} from "@/lib/masters/master-query-errors";
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

  const detailQuery = useDocumentType(id);
  const updateMutation = useUpdateDocumentType();
  const loading = detailQuery.isFetching && !detailQuery.data;
  const loadError = detailQuery.isError
    ? getMasterDetailErrorMessage(
        detailQuery.error,
        "Document type not found.",
        "Failed to load document type.",
      )
    : null;
  const saving = updateMutation.isPending;

  useEffect(() => {
    if (!detailQuery.data) return;
    setForm({
      documentTypeCode: "",
      title: detailQuery.data.title,
      description: detailQuery.data.description || "",
    });
  }, [detailQuery.data]);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = () => {
    if (!form || !id) return;
    const validation = validateDocumentTypeForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    updateMutation.mutate(
      {
        id,
        payload: {
          title: form.title,
          description: form.description,
        },
      },
      {
        onSuccess: () => {
          setToast({ msg: "Document Type updated successfully", type: "success" });
          setTimeout(() => router.push("/masters/document-types"), 900);
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to update document type."),
            type: "error",
          });
          setTimeout(() => setToast(null), 3200);
        },
      },
    );
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Loading document type...</p>
      </div>
    );
  }

  if (!form || loadError) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">{loadError || "Document Type not found."}</p>
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
            <Save className="w-4 h-4" /> {saving ? "Updating..." : "Update Document Type"}
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
