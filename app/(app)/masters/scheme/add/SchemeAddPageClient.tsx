"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SchemeUnifiedConfigForm } from "../components/SchemeUnifiedConfigForm";
import {
  createDefaultUnifiedForm,
  validateUnifiedSchemeForm,
  type SchemeUnifiedForm,
} from "../scheme-unified-config";
import {
  API_SCHEME_CATEGORIES,
  unifiedFormToCreatePayload,
} from "../scheme-api-mapper";
import {
  useCreateScheme,
  useSchemePreviewNumber,
  useCustomerTypeDropdown,
  useCustomerDropdown,
  useProductDropdown,
} from "@/hooks/masters";
import { getErrorMessage } from "@/lib/masters/master-query-errors";
import { loadSchemeStateOptions } from "../product-discount-scheme";
import type { SchemeProductSelectOption } from "../product-discount-scheme";

type ToastState = { msg: string; type: "success" | "error" };

function Toast({ toast }: { toast: ToastState }) {
  return (
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
  );
}

export default function SchemeAddPageClient() {
  const router = useRouter();
  const [form, setForm] = useState<SchemeUnifiedForm>(() => createDefaultUnifiedForm());
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);

  const createMutation = useCreateScheme();
  const previewQuery = useSchemePreviewNumber();
  const customerTypeQuery = useCustomerTypeDropdown();
  const customerQuery = useCustomerDropdown();
  const productQuery = useProductDropdown();

  const codePreview = previewQuery.data || "SCH-____";

  const customerTypeSelectOptions = useMemo(
    () =>
      (customerTypeQuery.data ?? []).map((item) => ({
        id: item.id,
        name: item.customerType,
      })),
    [customerTypeQuery.data],
  );

  const customerSelectOptions = useMemo(
    () =>
      (customerQuery.data ?? []).map((item) => ({
        id: item.customer_id,
        name: `${item.customer_code} — ${item.customer_name}`,
      })),
    [customerQuery.data],
  );

  const productSelectOptions = useMemo<SchemeProductSelectOption[]>(
    () =>
      (productQuery.data ?? []).map((p) => {
        const productName = p.product_name;
        const productCode = p.product_code || "";
        const sku = p.sku || "";
        return {
          value: p.product_id,
          label: productName,
          productName,
          productCode: productCode || undefined,
          sku: sku || undefined,
          category: p.category?.categoryName,
          segment: p.segment?.segment_name,
          hsnCode: p.hsn?.hsnCode || p.hsn?.hsn_code || undefined,
          sublabel: [productCode && `Code: ${productCode}`, sku && `SKU: ${sku}`]
            .filter(Boolean)
            .join(" · "),
          searchText: [productCode, productName, sku].filter(Boolean).join(" ").toLowerCase(),
        };
      }),
    [productQuery.data],
  );

  const stateSelectOptions = useMemo(() => loadSchemeStateOptions(), []);

  const scopeOptionLists = useMemo(
    () => ({
      customerTypeIds: customerTypeSelectOptions.map((o) => o.id),
      customerIds: customerSelectOptions.map((o) => o.id),
      stateNames: stateSelectOptions.map((o) => o.id),
      productIds: productSelectOptions.map((o) => o.value),
    }),
    [
      customerTypeSelectOptions,
      customerSelectOptions,
      stateSelectOptions,
      productSelectOptions,
    ],
  );

  const showToast = (next: ToastState) => {
    setToast(next);
    setTimeout(() => setToast(null), 3200);
  };

  const handleSave = () => {
    const err = validateUnifiedSchemeForm(form);
    if (err) {
      setFormError(err);
      showToast({ msg: err, type: "error" });
      return;
    }

    const payload = unifiedFormToCreatePayload(form, scopeOptionLists);
    createMutation.mutate(payload, {
      onSuccess: () => {
        showToast({ msg: "Scheme created successfully", type: "success" });
        setTimeout(() => router.push("/masters/scheme"), 900);
      },
      onError: (error) => {
        const msg = getErrorMessage(error, "Failed to create scheme");
        setFormError(msg);
        showToast({ msg, type: "error" });
      },
    });
  };

  return (
    <>
      <FormContainer
        title="Add Scheme"
        description="Masters → Scheme Master"
        onBack={() => router.push("/masters/scheme")}
        onCancel={() => router.push("/masters/scheme")}
        compact
        noCard
        actions={
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={createMutation.isPending}
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {createMutation.isPending ? "Saving..." : "Save Scheme"}
          </Button>
        }
      >
        <SchemeUnifiedConfigForm
          form={form}
          onChange={setForm}
          mode="add"
          codePreview={codePreview}
          error={formError}
          schemeCategoryOptions={API_SCHEME_CATEGORIES}
          productSelectOptions={productSelectOptions}
          stateSelectOptions={stateSelectOptions}
          customerSelectOptions={customerSelectOptions}
          customerTypeSelectOptions={customerTypeSelectOptions}
        />
      </FormContainer>
      {toast && <Toast toast={toast} />}
    </>
  );
}
