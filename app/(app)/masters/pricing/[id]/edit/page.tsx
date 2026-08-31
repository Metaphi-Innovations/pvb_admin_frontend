"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PricingForm } from "../../components/PricingForm";
import {
  DEFAULT_PRICING_FORM,
  apiPricingToForm,
  buildPricingUpdatePayload,
  mapProductCatalogToOptions,
  validatePricingForm,
  type PricingForm as PricingFormValues,
} from "../../pricing-data";
import {
  useCustomerTypeDropdown,
  usePricing,
  useProducts,
  useUpdatePricing,
  PricingListService,
} from "@/hooks/masters";
import type { ProductListRecord } from "@/services/product-list.service";

const EMPTY_PRODUCT_CATALOG: ProductListRecord[] = [];

export default function EditPricingPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [form, setForm] = useState<PricingFormValues>(DEFAULT_PRICING_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [saveSucceeded, setSaveSucceeded] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const {
    data: apiPricing,
    isLoading: pricingLoading,
    isError: pricingError,
    error: pricingFetchError,
  } = usePricing(id);

  const { data: productsResult, isLoading: productsLoading } = useProducts({
    page: 1,
    pageSize: 500,
    search: "",
    status: "active",
    apiFilters: { status: "Active" },
  });

  const { data: customerTypes = [] } = useCustomerTypeDropdown();
  const updateMutation = useUpdatePricing();

  const productCatalog = productsResult?.items ?? EMPTY_PRODUCT_CATALOG;

  useEffect(() => {
    if (apiPricing && !initialized) {
      setForm(apiPricingToForm(apiPricing));
      setInitialized(true);
    }
  }, [apiPricing, initialized]);

  const productOptions = useMemo(() => {
    const options = mapProductCatalogToOptions(productCatalog);
    if (
      form.productId &&
      !options.some((o) => o.value === form.productId) &&
      form.productName
    ) {
      options.unshift({
        value: form.productId,
        label: form.productName,
        sublabel: form.sku ? `SKU: ${form.sku}` : undefined,
        searchText: [
          form.productCode,
          form.productName,
          form.sku,
          form.supplierName,
          form.supplierCode,
          form.hsnCode,
          form.category,
          form.segment,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      });
    }
    return options;
  }, [
    productCatalog,
    form.productId,
    form.productName,
    form.sku,
    form.productCode,
    form.supplierName,
    form.supplierCode,
    form.hsnCode,
    form.category,
    form.segment,
  ]);

  const customerTypeIdByName = useMemo(
    () =>
      Object.fromEntries(
        customerTypes.map((item) => [item.customerType, item.id]),
      ),
    [customerTypes],
  );

  const customerTypeOptions = useMemo(
    () =>
      customerTypes.map((item) => ({
        value: item.customerType,
        label: item.customerType,
      })),
    [customerTypes],
  );

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = async () => {
    if (saveSucceeded || !apiPricing) return;

    const fieldErrors = validatePricingForm(form, [], apiPricing.id);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      return;
    }

    const payload = buildPricingUpdatePayload(
      form,
      apiPricing,
      customerTypeIdByName,
    );

    try {
      await updateMutation.mutateAsync({
        id: apiPricing.pricingUuid || id,
        payload,
      });
      setSaveSucceeded(true);
      setErrors({});
      setToast({
        msg: "Pricing rule updated successfully.",
        type: "success",
      });
      setTimeout(() => router.push("/masters/pricing"), 900);
    } catch (error) {
      setToast({
        msg: PricingListService.extractErrorMessage(
          error,
          "Failed to update pricing rule.",
        ),
        type: "error",
      });
      setTimeout(() => setToast(null), 3200);
    }
  };

  const isSaving = updateMutation.isPending;

  return (
    <FormContainer
      title="Edit Pricing"
      description="Masters → Pricing Master → Edit"
      noCard
      onBack={() => router.back()}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-9 text-xs font-semibold rounded-lg"
            onClick={() => router.back()}
            disabled={isSaving || saveSucceeded}
          >
            Discard
          </Button>
          <Button
            type="button"
            className="h-9 text-xs font-semibold rounded-lg gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
            disabled={
              isSaving ||
              saveSucceeded ||
              pricingLoading ||
              Boolean(errors.duplicate)
            }
          >
            <Save className="w-4 h-4" /> Save
          </Button>
        </div>
      }
    >
      {pricingLoading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
            <p className="text-xs text-muted-foreground">Loading pricing details…</p>
          </div>
        </div>
      ) : pricingError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-semibold text-red-700">
            Failed to load pricing record
          </p>
          <p className="mt-1 text-xs text-red-600/80">
            {PricingListService.extractErrorMessage(
              pricingFetchError,
              "The requested pricing rule could not be found.",
            )}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 text-xs"
            onClick={() => router.push("/masters/pricing")}
          >
            Back to Pricing Master
          </Button>
        </div>
      ) : (
        <PricingForm
          form={form}
          onChange={setForm}
          errors={errors}
          productOptions={productOptions}
          productCatalog={productCatalog}
          customerTypeOptions={customerTypeOptions}
          mode="edit"
          onClearError={clearErr}
        />
      )}

      {isSaving && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
          <div className="flex min-w-[18rem] flex-col items-center gap-3 rounded-xl border border-border bg-white px-6 py-5 shadow-xl">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                Saving pricing rule…
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Please wait.
              </p>
            </div>
          </div>
        </div>
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
