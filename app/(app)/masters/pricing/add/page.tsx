"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PricingForm } from "../components/PricingForm";
import {
  DEFAULT_PRICING_FORM,
  buildPricingCreatePayloads,
  countPricingCombinations,
  findExistingScopeConflicts,
  mapProductCatalogToOptions,
  validatePricingForm,
  type PricingForm as PricingFormValues,
} from "../pricing-data";
import {
  useBulkCreatePricing,
  useCustomerTypeDropdown,
  useProducts,
  PricingListService,
} from "@/hooks/masters";
import { masterKeys } from "@/lib/masters/master-query-keys";
import type { PricingExistingCombination } from "@/services/pricing-list.service";
import type { ProductListRecord } from "@/services/product-list.service";

const EMPTY_EXISTING_COMBINATIONS: PricingExistingCombination[] = [];
const EMPTY_PRODUCT_CATALOG: ProductListRecord[] = [];

export default function AddPricingPage() {
  const router = useRouter();
  const [form, setForm] = useState<PricingFormValues>(DEFAULT_PRICING_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [saveSucceeded, setSaveSucceeded] = useState(false);

  const { data: productsResult, isLoading: productsLoading } = useProducts({
    page: 1,
    pageSize: 500,
    search: "",
    status: "active",
    apiFilters: { status: "Active" },
  });
  const { data: customerTypes = [] } = useCustomerTypeDropdown();
  const bulkCreateMutation = useBulkCreatePricing();

  const productCatalog = productsResult?.items ?? EMPTY_PRODUCT_CATALOG;
  const productOptions = useMemo(
    () => mapProductCatalogToOptions(productCatalog),
    [productCatalog],
  );

  const selectedProductUuid =
    form.productLines[0]?.productUuid ||
    (form.productLines[0] ? String(form.productLines[0].id) : "");

  const existingCombinationsQuery = useQuery({
    queryKey: [
      ...masterKeys.pricing.lists(),
      "existing-combinations",
      selectedProductUuid,
    ] as const,
    queryFn: ({ signal }) =>
      PricingListService.getExistingCombinations(selectedProductUuid, signal),
    enabled: Boolean(selectedProductUuid) && !saveSucceeded,
    staleTime: 15_000,
  });

  const existingCombinations =
    existingCombinationsQuery.data ?? EMPTY_EXISTING_COMBINATIONS;

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

  const scopeConflict = useMemo(() => {
    if (saveSucceeded || !selectedProductUuid) {
      return { count: 0, message: undefined as string | undefined, conflicts: [] as string[] };
    }
    return findExistingScopeConflicts(
      form,
      existingCombinations,
      customerTypeIdByName,
    );
  }, [
    form,
    existingCombinations,
    selectedProductUuid,
    saveSucceeded,
    customerTypeIdByName,
  ]);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = async () => {
    if (saveSucceeded) return;

    const fieldErrors = validatePricingForm(form, []);
    const liveConflict = findExistingScopeConflicts(
      form,
      existingCombinations,
      customerTypeIdByName,
    );
    if (liveConflict.message) {
      fieldErrors.duplicate = liveConflict.message;
    }

    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      return;
    }

    const payloads = buildPricingCreatePayloads(form, customerTypeIdByName);
    if (payloads.length === 0) {
      setToast({ msg: "No pricing records to create.", type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    setPendingCount(payloads.length);
    try {
      const result = await bulkCreateMutation.mutateAsync(payloads);
      setSaveSucceeded(true);
      setErrors({});
      setToast({
        msg:
          result.createdCount > 1
            ? `${result.createdCount} pricing rules added successfully.`
            : "Pricing rule added successfully.",
        type: "success",
      });
      setTimeout(() => router.push("/masters/pricing"), 900);
    } catch (error) {
      setToast({
        msg: PricingListService.extractErrorMessage(
          error,
          "Failed to create pricing rules.",
        ),
        type: "error",
      });
      setTimeout(() => setToast(null), 3200);
    } finally {
      setPendingCount(0);
    }
  };

  const isSaving = bulkCreateMutation.isPending;
  const combinationCount = countPricingCombinations(form);

  return (
    <FormContainer
      title="Add Pricing"
      description="Masters → Pricing Master → Add"
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
              productsLoading ||
              Boolean(scopeConflict.message)
            }
          >
            <Save className="w-4 h-4" /> Save
          </Button>
        </div>
      }
    >
      <PricingForm
        form={form}
        onChange={setForm}
        errors={errors}
        productOptions={productOptions}
        productCatalog={productCatalog}
        customerTypeOptions={customerTypeOptions}
        existingConflictCount={scopeConflict.count}
        scopeConflictMessage={scopeConflict.message}
        mode="add"
        onClearError={clearErr}
      />

      {isSaving && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
          <div className="flex min-w-[18rem] flex-col items-center gap-3 rounded-xl border border-border bg-white px-6 py-5 shadow-xl">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                Creating {pendingCount || combinationCount} pricing rules…
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Please wait. This runs as a single request.
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
