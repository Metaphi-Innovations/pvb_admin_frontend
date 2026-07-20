"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { MasterField } from "@/components/masters/MasterModule";
import { PricingFormSection } from "./PricingFormSection";
import { ProductMetaPanel } from "./ProductMetaPanel";
import {
  pricingFormShellClass,
  pricingInput,
  pricingReadonly,
} from "./pricing-form-styles";
import { IndianRupeeInput } from "@/components/ui/IndianRupeeInput";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { BulkPricingGrid } from "./BulkPricingGrid";
import { PricingProductMultiSelect } from "./PricingProductMultiSelect";
import { PricingScopeMultiSelect } from "./PricingScopeMultiSelect";
import {
  PRICING_CUSTOMER_TYPES,
  PRICING_STATES,
  countPricingCombinations,
  formatIndianRupeeDisplay,
  getDealerPriceInlineError,
  getMrpInlineError,
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
  mode?: "add" | "edit";
  onClearError?: (key: string) => void;
}

export function PricingForm({
  form,
  onChange,
  errors,
  productOptions,
  productCatalog = [],
  customerTypeOptions,
  mode = "add",
  onClearError,
}: PricingFormProps) {
  const combinationCount = countPricingCombinations(form);
  const selectedProductIds = form.productLines.map((line) => String(line.id));
  const hasProductsSelected = mode === "edit" ? Boolean(form.productId) : form.productLines.length > 0;
  const editDealerPriceError =
    errors.dealerPrice || getDealerPriceInlineError(form.dealerPrice, form.mrp);
  const editMrpError = errors.mrp || getMrpInlineError(form.mrp);
  const hasSyncedProductMrp = useRef(false);
  const resolvedCustomerTypeOptions =
    customerTypeOptions ??
    PRICING_CUSTOMER_TYPES.map((type) => ({ value: type, label: type }));
  const stateOptions = PRICING_STATES.map((state) => ({ value: state, label: state }));

  useEffect(() => {
    if (mode !== "add" || hasSyncedProductMrp.current || form.productLines.length === 0) {
      return;
    }

    const selectedIds = form.productLines.map((line) => String(line.id));
    const synced = syncPricingProductLines(form, selectedIds, productCatalog);
    const mrpChanged = synced.productLines.some(
      (line, index) => line.mrp !== form.productLines[index]?.mrp,
    );

    hasSyncedProductMrp.current = true;
    if (mrpChanged) {
      onChange(synced);
    }
  }, [form, mode, onChange]);

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
  };

  const handleProductSelectionChange = (selectedIds: string[]) => {
    const next = syncPricingProductLines(form, selectedIds, productCatalog);
    onChange(next);
    onClearError?.("productLines");
  };

  const handleRemoveProductLine = (productId: number) => {
    const nextIds = form.productLines
      .map((line) => String(line.id))
      .filter((id) => id !== String(productId));
    handleProductSelectionChange(nextIds);
  };

  if (mode === "edit") {
    return (
      <div className={pricingFormShellClass}>
        <PricingFormSection title="Product Information">
          <ProductMetaPanel
            items={[
              { label: "Product Code", value: form.productCode },
              { label: "Product Name", value: form.productName },
              { label: "Supplier Name", value: form.supplierName || "—" },
              { label: "Supplier Code", value: form.supplierCode || "—" },
              { label: "SKU", value: form.sku },
              { label: "Category", value: form.category || "—" },
              { label: "Segment", value: form.segment || "—" },
              { label: "Pack Size", value: form.packSize || "—" },
              { label: "Unit", value: form.unit || form.mou || form.baseUnit || "—" },
              { label: "HSN Code", value: form.hsnCode || "—" },
              { label: "GST %", value: form.gstPct || "—" },
            ]}
          />
        </PricingFormSection>

        <PricingFormSection title="Pricing Scope">
          <PricingFormGrid>
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
          </PricingFormGrid>
        </PricingFormSection>

        <PricingFormSection title="Price Details">
          <PricingFormGrid className="md:grid-cols-2 lg:grid-cols-3">
            <MasterField label="Cost Price">
              <FieldWidth size="narrow">
                <IndianRupeeInput
                  value={form.costPrice}
                  onChange={(v) => onChange({ ...form, costPrice: v })}
                  className={pricingInput()}
                />
              </FieldWidth>
            </MasterField>

            <MasterField label="Dealer Price" required error={editDealerPriceError}>
              <FieldWidth size="narrow">
                <IndianRupeeInput
                  value={form.dealerPrice}
                  onChange={(v) =>
                    onChange({ ...form, dealerPrice: v, netSellingPrice: v })
                  }
                  className={cn(
                    pricingInput("ring-1 ring-brand-200/80"),
                    editDealerPriceError && "border-red-400 ring-1 ring-red-300",
                  )}
                />
              </FieldWidth>
            </MasterField>

            <MasterField label="MRP" error={editMrpError}>
              <FieldWidth size="narrow">
                <Input
                  readOnly
                  className={cn(
                    pricingReadonly("text-right font-medium tabular-nums"),
                    editMrpError && "border-red-400 text-red-600",
                  )}
                  value={formatIndianRupeeDisplay(form.mrp)}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">From Product Master</p>
              </FieldWidth>
            </MasterField>
          </PricingFormGrid>
        </PricingFormSection>

        {errors.duplicate && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {errors.duplicate}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={pricingFormShellClass}>
      <PricingFormSection title="Product Selection">
        <div className="space-y-3">
          <MasterField label="Products" required error={errors.productLines}>
            <PricingProductMultiSelect
              options={productOptions}
              value={selectedProductIds}
              onChange={handleProductSelectionChange}
              placeholder="Search product code, name, or SKU..."
              searchPlaceholder="Search product code, name, SKU, supplier, or HSN..."
              error={Boolean(errors.productLines)}
            />
          </MasterField>

          <BulkPricingGrid
            lines={form.productLines}
            onChange={(productLines) => {
              onChange({ ...form, productLines });
              onClearError?.("productLines");
            }}
            onRemoveLine={handleRemoveProductLine}
            errors={errors}
          />
        </div>
      </PricingFormSection>

      {hasProductsSelected && (
        <PricingFormSection title="State and Customer Type">
          <p className="mb-2.5 text-[11px] leading-relaxed text-muted-foreground">
            Select one or more states and customer types. Pricing records will be created for
            every combination of selected products, states, and customer types.
          </p>
          <PricingFormGrid>
            <div className="col-span-2 md:col-span-1">
              <PricingScopeMultiSelect
                label="State"
                required
                options={PRICING_STATES}
                selected={form.states}
                onChange={(states) => updateScope({ states })}
                applyToAll={form.applyToAllStates}
                onApplyToAllChange={(applyToAllStates) =>
                  updateScope({ applyToAllStates, states: [] })
                }
                applyToAllLabel="Apply to All States"
                selectAllLabel="Select All States"
                placeholder="Select state(s)"
                error={errors.state}
              />
            </div>

            <div className="col-span-2 md:col-span-1">
              <PricingScopeMultiSelect
                label="Customer Type"
                required
                options={PRICING_CUSTOMER_TYPES}
                selected={form.customerTypes}
                onChange={(customerTypes) =>
                  updateScope({
                    customerTypes: customerTypes as PricingCustomerType[],
                  })
                }
                applyToAll={form.applyToAllCustomerTypes}
                onApplyToAllChange={(applyToAllCustomerTypes) =>
                  updateScope({ applyToAllCustomerTypes, customerTypes: [] })
                }
                applyToAllLabel="Apply to All Customer Types"
                selectAllLabel="Select All Customer Types"
                placeholder="Select customer type(s)"
                error={errors.customerType}
              />
            </div>

            {combinationCount > 1 && (
              <div className="col-span-2 rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2 md:col-span-3 lg:col-span-4">
                <p className="text-xs text-brand-800">
                  Saving will create{" "}
                  <span className="font-semibold">{combinationCount}</span> pricing records for
                  the selected product, state, and customer type combinations.
                </p>
              </div>
            )}
          </PricingFormGrid>
        </PricingFormSection>
      )}

      {errors.duplicate && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {errors.duplicate}
        </p>
      )}
    </div>
  );
}
