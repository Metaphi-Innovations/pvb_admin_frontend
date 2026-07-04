"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CustomerTypeListService } from "@/services/customer-type-list.service";
import {
  CustomerTypeForm,
  type CustomerTypeFormValues,
  validateCustomerTypeForm,
} from "../../components/CustomerTypeForm";
import type { CustomerTypeDocument } from "../../customer-type-data";

function extractDocumentTypeIds(documents: CustomerTypeDocument[]): string[] {
  return documents
    .map((doc) => doc.documentTypeId)
    .filter((id): id is string => Boolean(id));
}

export default function EditCustomerTypePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<CustomerTypeFormValues | null>(null);
  const [originalInitialCode, setOriginalInitialCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setLoadError(null);

    CustomerTypeListService.view(id)
      .then((detail) => {
        setOriginalInitialCode(detail.initialCode);
        setForm({
          customerTypeCode: detail.initialCode,
          initialCode: detail.initialCode,
          customerType: detail.customerType,
          description: detail.description || "",
          documentTypes: detail.documents.map((doc, idx) => ({
            id: `DOC-${idx + 1}`,
            documentTypeId: doc.id,
            documentName: doc.title,
          })),
        });
      })
      .catch((error: unknown) => {
        const err = error as { status?: number; message?: string } | undefined;
        const message =
          err?.status === 404
            ? "Customer type not found."
            : err?.message || "Failed to load customer type.";
        setLoadError(message);
        setForm(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = async () => {
    if (!form || !id) return;
    const validation = validateCustomerTypeForm(form);
    const documentTypeIds = extractDocumentTypeIds(form.documentTypes || []);
    if ((form.documentTypes || []).length > 0 && documentTypeIds.length === 0) {
      validation.documentTypes = "Select document types from the list";
    }
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    try {
      setSaving(true);
      await CustomerTypeListService.update(id, {
        customerTypeName: form.customerType,
        description: form.description,
        documentTypeIds,
      });
      setToast({ msg: "Customer Type updated successfully.", type: "success" });
      setTimeout(() => router.push(`/masters/customer-types/${id}`), 900);
    } catch (error: unknown) {
      const err = error as { message?: string } | undefined;
      setToast({ msg: err?.message || "Failed to update customer type.", type: "error" });
      setTimeout(() => setToast(null), 3200);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Loading customer type...</p>
      </div>
    );
  }

  if (!form || loadError) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">{loadError || "Customer Type not found."}</p>
        <Link href="/masters/customer-types" className="text-xs text-brand-600 hover:underline mt-2 inline-block">
          Back to listing
        </Link>
      </div>
    );
  }

  return (
    <FormContainer
      title="Edit Customer Type"
      description="Masters → Customer Type Master → Edit"
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
            <Save className="w-4 h-4" /> {saving ? "Updating..." : "Update Customer Type"}
          </Button>
        </div>
      }
    >
      <CustomerTypeForm
        form={form}
        onChange={(next) =>
          setForm((prev) => {
            if (!prev) return prev;
            return typeof next === "function" ? next(prev) : next;
          })
        }
        errors={errors}
        onClearError={clearErr}
        originalInitialCode={originalInitialCode}
        readOnlyInitialCode
        triggerToast={(msg, type) => {
          setToast({ msg, type });
          setTimeout(() => setToast(null), 3200);
        }}
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
