"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveMasterRecords } from "@/lib/masters/common";
import { ProductDiscountSchemeForm } from "../../components/ProductDiscountSchemeForm";
import { SchemeFormSheet, countBulkPreview } from "../../components/SchemeFormSheet";
import {
  productDiscountFormToRecord,
  productDiscountRecordToForm,
  validateProductDiscountForm,
  loadConsolidatedSchemeRecords,
  canEditProductDiscountScheme,
  type ProductDiscountForm,
} from "../../product-discount-scheme";
import {
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

  const [record, setRecord] = useState<SchemeRecord | null>(null);
  const [productDiscountForm, setProductDiscountForm] = useState<ProductDiscountForm | null>(null);
  const [bulkForm, setBulkForm] = useState<SchemeBulkForm | null>(null);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const isProductDiscount = record?.schemeType === "Product Discount Scheme";

  useEffect(() => {
    const list = loadConsolidatedSchemeRecords();
    const found = list.find((r) => r.id === schemeId);
    if (!found) {
      router.replace("/masters/scheme");
      return;
    }
    if (
      isProductDiscount
        ? !canEditProductDiscountScheme(found)
        : !canEditRecord(found)
    ) {
      setToast({ msg: "This scheme cannot be edited after approval", type: "error" });
      setTimeout(() => router.replace("/masters/scheme"), 1200);
      return;
    }
    setRecord(found);
    if (found.schemeType === "Product Discount Scheme") {
      setProductDiscountForm(productDiscountRecordToForm(found));
    } else {
      setBulkForm(recordToBulkForm(found));
    }
  }, [schemeId, router]);

  const bulkPreviewCount = useMemo(() => (bulkForm ? countBulkPreview(bulkForm) : 0), [bulkForm]);

  const handleSave = () => {
    if (!record) return;

    if (isProductDiscount && productDiscountForm) {
      const list = loadConsolidatedSchemeRecords();
      const err = validateProductDiscountForm(productDiscountForm, "edit", list, record.id);
      if (err) {
        setFormError(err);
        setToast({ msg: err, type: "error" });
        setTimeout(() => setToast(null), 3200);
        return;
      }

      const updated = list.map((r) =>
        r.id === record.id ? productDiscountFormToRecord(productDiscountForm, list, record.id, record) : r,
      );
      saveMasterRecords(SCHEME_STORAGE_KEY, updated);
      setToast({ msg: "Product discount scheme updated", type: "success" });
      setTimeout(() => router.push("/masters/scheme"), 900);
      return;
    }

    if (!bulkForm) return;
    const err = validateSchemeBulkForm(bulkForm, "edit");
    if (err) {
      setFormError(err);
      setToast({ msg: err, type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    const list = loadConsolidatedSchemeRecords();
    const wasApproved =
      record.approvalStatus === "approved" ||
      record.approvalStatus === "active" ||
      PENDING_APPROVAL_STATUSES.includes(record.approvalStatus);

    let updated = list.map((r) =>
      r.id === record.id ? bulkFormToSingleRecord(bulkForm, record.id, record) : r,
    );
    if (wasApproved) {
      updated = updated.map((r) => (r.id === record.id ? schemeNeedsReapproval(r) : r));
    }

    saveMasterRecords(SCHEME_STORAGE_KEY, updated);
    setToast({ msg: "Scheme updated successfully", type: "success" });
    setTimeout(() => router.push("/masters/scheme"), 900);
  };

  if (!record || (isProductDiscount ? !productDiscountForm : !bulkForm)) {
    return (
      <FormContainer title="Edit Scheme" description="Loading...">
        <p className="text-xs text-muted-foreground">Loading scheme...</p>
      </FormContainer>
    );
  }

  return (
    <FormContainer
      title={isProductDiscount ? "Edit Product Discount Scheme" : "Edit Scheme"}
      description={`Masters → Scheme → ${record.schemeName}`}
      onBack={() => router.push("/masters/scheme")}
      noCard={isProductDiscount}
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
      {isProductDiscount && productDiscountForm ? (
        <ProductDiscountSchemeForm
          form={productDiscountForm}
          onChange={(next) => {
            setProductDiscountForm(next);
            setFormError("");
          }}
          mode="edit"
          schemeCode={record.schemeCode}
          error={formError}
        />
      ) : (
        bulkForm && (
          <SchemeFormSheet
            form={bulkForm}
            onChange={(next) => {
              setBulkForm(next);
              setFormError("");
            }}
            mode="edit"
            bulkPreviewCount={bulkPreviewCount}
            schemeCode={record.schemeCode}
            error={formError}
          />
        )
      )}

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
