"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { MasterField } from "@/components/masters/MasterModule";
import { PricingFormSection } from "./PricingFormSection";
import {
  pricingFormShellClass,
  pricingInput,
} from "./pricing-form-styles";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { BulkPricingGrid } from "./BulkPricingGrid";
import { PricingScopeMultiSelect } from "./PricingScopeMultiSelect";
import {
  PRICING_CUSTOMER_TYPES,
  PRICING_STATES,
  countPricingCombinations,
  resolveFormCustomerTypes,
  resolveFormStates,
  syncPricingProductLines,
  type PricingCustomerType,
  type PricingForm,
} from "../pricing-data";
import type { ProductListRecord } from "@/services/product-list.service";

function PricingFormGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-3 gap-y-2.5 md:grid-cols-3 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

function FieldWidth({
  children,
  size = "narrow",
  className,
}: {
  children: React.ReactNode;
  size?: "narrow" | "medium" | "wide" | "full";
  className?: string;
}) {
  return (
    <div
      className={cn(
        size === "narrow" && "max-w-[9.5rem]",
        size === "medium" && "max-w-[13rem]",
        size === "wide" && "max-w-xl",
        size === "full" && "max-w-3xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface PricingFormProps {
  form: PricingForm;
  onChange: (form: PricingForm) => void;
  errors: Record<string, string>;
  productOptions: { value: string; label: string; sublabel?: string; searchText?: string }[];
  productCatalog?: ProductListRecord[];
  customerTypeOptions?: { value: string; label: string }[];
  existingConflictCount?: number;
  scopeConflictMessage?: string;
  mode?: "add" | "edit";
  onClearError?: (key: string) => void;
}

const EMPTY_CATALOG: ProductListRecord[] = [];

export function PricingForm({
  form,
  onChange,
  errors,
  productOptions,
  productCatalog = EMPTY_CATALOG,
  customerTypeOptions,
  existingConflictCount = 0,
  scopeConflictMessage,
  mode = "add",
  onClearError,
}: PricingFormProps) {
  const combinationCount = countPricingCombinations(form);
  const conflictMessage =
    scopeConflictMessage ||
    (existingConflictCount > 0
      ? `${existingConflictCount} selected combination${existingConflictCount > 1 ? "s" : ""} already exist for this product. Change state or customer type before saving.`
      : errors.duplicate);
  const hasScopeConflict = Boolean(conflictMessage);
  const selectedProductId =
    form.productLines[0]?.productUuid ||
    form.productId ||
    (form.productLines[0] ? String(form.productLines[0].id) : "");
  const hasProductsSelected = form.productLines.length > 0 || Boolean(form.productId);
  const hasSyncedProductMrp = useRef(false);
  const lastSyncedProductId = useRef("");
  const resolvedCustomerTypeOptions =
    customerTypeOptions ??
    PRICING_CUSTOMER_TYPES.map((type) => ({ value: type, label: type }));
  const customerTypeValues = resolvedCustomerTypeOptions.map((option) => option.value);
  const stateOptions = PRICING_STATES.map((state) => ({ value: state, label: state }));

  useEffect(() => {
    if (mode !== "add") return;

    if (!selectedProductId) {
      hasSyncedProductMrp.current = false;
      lastSyncedProductId.current = "";
      return;
    }

    if (
      hasSyncedProductMrp.current &&
      lastSyncedProductId.current === selectedProductId
    ) {
      return;
    }

    const selectedIds = form.productLines.map(
      (line) => line.productUuid || String(line.id),
    );
    const synced = syncPricingProductLines(form, selectedIds, productCatalog);
    const mrpChanged = synced.productLines.some(
      (line, index) => line.mrp !== form.productLines[index]?.mrp,
    );

    hasSyncedProductMrp.current = true;
    lastSyncedProductId.current = selectedProductId;
    if (mrpChanged) {
      onChange(synced);
    }
  }, [form, mode, onChange, productCatalog, selectedProductId]);

  const updateScope = (
    patch: Partial<
      Pick<
        PricingForm,
        | "states"
        | "customerTypes"
        | "applyToAllStates"
        | "applyToAllCustomerTypes"
        | "state"
        | "customerType"
      >
    >,
  ) => {
    const next = { ...form, ...patch };
    const resolvedStates = resolveFormStates(next);
    const resolvedTypes = resolveFormCustomerTypes(next);

    next.customerType =
      resolvedTypes.length === 1
        ? (resolvedTypes[0] as PricingForm["customerType"])
        : "";
    next.state = resolvedStates.length === 1 ? resolvedStates[0] : "";

    onChange(next);
    onClearError?.("state");
    onClearError?.("customerType");
    onClearError?.("duplicate");
  };

  const handleProductSelectionChange = (selectedId: string) => {
    const selectedIds = selectedId ? [selectedId] : [];
    const next = syncPricingProductLines(form, selectedIds, productCatalog);
    if (mode === "edit") {
      const line = next.productLines[0];
      onChange({
        ...next,
        productId: selectedId,
        productCode: line?.productCode || form.productCode,
        productName: line?.productName || form.productName,
        sku: line?.sku || form.sku,
        costPrice: line?.costPrice || form.costPrice,
        mrp: line?.mrp || form.mrp,
        dealerPrice: line?.dealerPrice || form.dealerPrice,
      });
    } else {
      onChange({
        ...next,
        states: [],
        customerTypes: [],
        state: "",
        customerType: "",
        applyToAllStates: false,
        applyToAllCustomerTypes: false,
      });
    }
    onClearError?.("productLines");
    onClearError?.("productId");
    onClearError?.("states");
    onClearError?.("customerTypes");
    onClearError?.("state");
    onClearError?.("customerType");
    onClearError?.("duplicate");
  };

  const handleRemoveProductLine = (_productId?: number) => {
    handleProductSelectionChange("");
  };

  return (
    <div className={pricingFormShellClass}>
      <PricingFormSection title="Product Selection">
        <div className="space-y-3">
          <MasterField label="Product" required error={errors.productLines || errors.productId}>
            <AutocompleteSelect
              options={productOptions}
              value={selectedProductId}
              onChange={handleProductSelectionChange}
              placeholder="Search product code, name, or SKU..."
              searchPlaceholder="Search product code, name, SKU, supplier, or HSN..."
              error={Boolean(errors.productLines || errors.productId)}
              className={cn(pricingInput(), (errors.productLines || errors.productId) && "border-red-400")}
            />
          </MasterField>

          <BulkPricingGrid
            lines={form.productLines}
            onChange={(productLines) => {
              onChange({
                ...form,
                productLines,
                dealerPrice: productLines[0]?.dealerPrice ?? form.dealerPrice,
              });
              onClearError?.("productLines");
              onClearError?.("dealerPrice");
            }}
            onRemoveLine={mode === "edit" ? undefined : handleRemoveProductLine}
            errors={errors}
          />
        </div>
      </PricingFormSection>

      {hasProductsSelected && (
        <PricingFormSection title="State and Customer Type">
          {mode === "add" && (
            <p className="mb-2.5 text-[11px] leading-relaxed text-muted-foreground">
              Select one or more states and customer types. Pricing records will be created for
              every combination of the selected product, states, and customer types.
            </p>
          )}
          <PricingFormGrid>
            {mode === "edit" ? (
              <>
                <MasterField label="State" required error={errors.state}>
                  <FieldWidth size="medium">
                    <AutocompleteSelect
                      options={stateOptions}
                      value={form.state}
                      onChange={(value) => {
                        onChange({
                          ...form,
                          state: value,
                          states: value ? [value] : [],
                        });
                        onClearError?.("state");
                      }}
                      placeholder="Select state..."
                      searchPlaceholder="Search state..."
                      className={cn(pricingInput(), errors.state && "border-red-400")}
                      error={Boolean(errors.state)}
                    />
                  </FieldWidth>
                </MasterField>
                <MasterField label="Customer Type" required error={errors.customerType}>
                  <FieldWidth size="medium">
                    <AutocompleteSelect
                      options={resolvedCustomerTypeOptions}
                      value={form.customerType}
                      onChange={(value) => {
                        onChange({
                          ...form,
                          customerType: value as PricingForm["customerType"],
                          customerTypes: value ? [value as PricingCustomerType] : [],
                        });
                        onClearError?.("customerType");
                      }}
                      placeholder="Select customer type..."
                      searchPlaceholder="Search customer type..."
                      className={cn(pricingInput(), errors.customerType && "border-red-400")}
                      error={Boolean(errors.customerType)}
                    />
                  </FieldWidth>
                </MasterField>
              </>
            ) : (
              <>
                <div className="col-span-2 md:col-span-1">
                  <PricingScopeMultiSelect
                    label="State"
                    required
                    options={PRICING_STATES}
                    selected={form.states}
                    onChange={(states) => updateScope({ states })}
                    selectAllLabel="Select All States"
                    placeholder="Select state(s)"
                    invalid={hasScopeConflict}
                    error={hasScopeConflict ? undefined : errors.state}
                  />
                </div>

                <div className="col-span-2 md:col-span-1">
                  <PricingScopeMultiSelect
                    label="Customer Type"
                    required
                    options={customerTypeValues}
                    optionLabels={Object.fromEntries(
                      resolvedCustomerTypeOptions.map((option) => [option.value, option.label]),
                    )}
                    selected={form.customerTypes}
                    onChange={(customerTypes) =>
                      updateScope({
                        customerTypes: customerTypes as PricingCustomerType[],
                      })
                    }
                    selectAllLabel="Select All Customer Types"
                    placeholder="Select customer type(s)"
                    invalid={hasScopeConflict}
                    error={hasScopeConflict ? undefined : errors.customerType}
                  />
                </div>
              </>
            )}

            {combinationCount > 1 && !hasScopeConflict && mode === "add" && (
              <div className="col-span-2 rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2 md:col-span-3 lg:col-span-4">
                <p className="text-xs text-brand-800">
                  Saving will create{" "}
                  <span className="font-semibold">{combinationCount}</span> pricing records for
                  the selected product, state, and customer type combinations.
                </p>
              </div>
            )}

            {hasScopeConflict && (
              <div
                role="alert"
                className="col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 md:col-span-3 lg:col-span-4"
              >
                <p className="text-xs font-medium text-red-700">{conflictMessage}</p>
                <p className="mt-0.5 text-[11px] text-red-600/80">
                  Adjust the selection above to continue.
                </p>
              </div>
            )}
          </PricingFormGrid>
        </PricingFormSection>
      )}
    </div>
  );
}
