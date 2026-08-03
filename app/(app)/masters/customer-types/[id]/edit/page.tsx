"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCustomerType, useUpdateCustomerType } from "@/hooks/masters";
import {
  getErrorMessage,
  getMasterDetailErrorMessage,
} from "@/lib/masters/master-query-errors";
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
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const detailQuery = useCustomerType(id);
  const updateMutation = useUpdateCustomerType();
  const loading = detailQuery.isFetching && !detailQuery.data;
  const loadError = detailQuery.isError
    ? getMasterDetailErrorMessage(
        detailQuery.error,
        "Customer type not found.",
        "Failed to load customer type.",
      )
    : null;
  const saving = updateMutation.isPending;

  useEffect(() => {
    if (!detailQuery.data) return;
    const detail = detailQuery.data;
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
  }, [detailQuery.data]);

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

    updateMutation.mutate(
      {
        id,
        payload: {
          customerTypeName: form.customerType,
          description: form.description,
          documentTypeIds,
        },
      },
      {
        onSuccess: () => {
          setToast({ msg: "Customer Type updated successfully.", type: "success" });
          setTimeout(() => router.push(`/masters/customer-types/${id}`), 900);
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to update customer type."),
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
