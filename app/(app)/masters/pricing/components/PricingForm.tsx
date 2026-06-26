"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MasterFormGrid, MasterField, compactInput } from "@/components/masters/MasterModule";
import { PricingFormSection } from "./PricingFormSection";
import { ProductMetaPanel } from "./ProductMetaPanel";
import {
  pricingFormShellClass,
  pricingInput,
  pricingReadonly,
} from "./pricing-form-styles";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { IndianRupeeInput } from "@/components/ui/IndianRupeeInput";
import { BulkPricingGrid } from "./BulkPricingGrid";
import { PricingScopeMultiSelect } from "./PricingScopeMultiSelect";
import {
  PRICING_CUSTOMER_TYPES,
  PRICING_STATES,
  buildBulkPricingLine,
  countPricingCombinations,
  formatIndianRupeeDisplay,
  loadActiveCategoryFilterOptions,
  loadActiveProducts,
  loadActiveSegmentFilterOptions,
  resolveFormCustomerTypes,
  resolveFormStates,
  resolveProductForPricing,
  type PricingCustomerType,
  type PricingForm,
  type PricingMode,
} from "../pricing-data";

/** Denser grid for pricing forms — avoids overly wide inputs. */
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
  mode?: "add" | "edit";
  onClearError?: (key: string) => void;
}

export function PricingForm({
  form,
  onChange,
  errors,
  productOptions,
  mode = "add",
  onClearError,
}: PricingFormProps) {
  const combinationCount = countPricingCombinations(form);
  const categoryOptions = loadActiveCategoryFilterOptions();
  const segmentOptions = loadActiveSegmentFilterOptions();
  const activeProducts = loadActiveProducts();

  const setMode = (pricingMode: PricingMode) => {
    onChange({
      ...form,
      pricingMode,
      bulkLines: pricingMode === "bulk" ? form.bulkLines : [],
      bulkProductIds: pricingMode === "bulk" ? form.bulkProductIds : [],
    });
  };

  const handleProductChange = (productId: string) => {
    const product = resolveProductForPricing(productId);
    if (!product) {
      onChange({
        ...form,
        productId: "",
        productCode: "",
        productName: "",
        sku: "",
        segment: "",
        category: "",
        baseUnit: "",
        mou: "",
        uom: "",
        packSize: "",
        unitsPerCase: 1,
        hsnCode: "",
        gstPct: "",
        costPrice: 0,
        productDealerPrice: 0,
        mrp: 0,
        dealerPrice: 0,
      });
      return;
    }

    onChange({
      ...form,
      productId,
      productCode: product.productCode,
      productName: product.productName,
      sku: product.sku,
      segment: product.segment,
      category: product.category,
      baseUnit: product.baseUnit,
      mou: product.mou,
      uom: product.packagingUnit,
      packSize: product.packSize,
      unitsPerCase: product.unitsPerCase,
      hsnCode: product.hsnCode,
      gstPct: product.gstPct,
      costPrice: 0,
      productDealerPrice: product.productDealerPrice,
      mrp: product.mrp,
      dealerPrice: 0,
    });
    onClearError?.("productId");
  };

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
        | "effectiveFrom"
        | "effectiveTo"
        | "priceListName"
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

  const appendBulkLines = (candidates: ReturnType<typeof buildBulkPricingLine>[]) => {
    const existingIds = new Set(form.bulkLines.map((l) => l.id));
    const lines = candidates.filter((l) => !existingIds.has(l.id));
    if (lines.length === 0) return;
    onChange({ ...form, bulkLines: [...form.bulkLines, ...lines] });
    onClearError?.("bulkLines");
  };

  const addSelectedProducts = () => {
    if (form.bulkProductIds.length === 0) return;
    const existingIds = new Set(form.bulkLines.map((l) => l.id));
    const lines = form.bulkProductIds
      .map((id) => activeProducts.find((p) => String(p.id) === id))
      .filter(Boolean)
      .map((p) => buildBulkPricingLine(p!))
      .filter((l) => !existingIds.has(l.id));
    onChange({ ...form, bulkLines: [...form.bulkLines, ...lines], bulkProductIds: [] });
    onClearError?.("bulkLines");
  };

  const addByCategory = () => {
    if (!form.bulkCategory) return;
    appendBulkLines(
      activeProducts.filter((p) => p.category === form.bulkCategory).map(buildBulkPricingLine),
    );
  };

  const addBySegment = () => {
    if (!form.bulkSegment) return;
    appendBulkLines(
      activeProducts.filter((p) => p.segment === form.bulkSegment).map(buildBulkPricingLine),
    );
  };

  const addAllActive = () => {
    appendBulkLines(activeProducts.map(buildBulkPricingLine));
  };

  const showSingleProduct = form.pricingMode === "single" || mode === "edit";
  const showBulkProduct = form.pricingMode === "bulk" && mode === "add";
  const hasProductsSelected =
    form.pricingMode === "bulk"
      ? form.bulkLines.length > 0
      : Boolean(form.productId);

  const applicabilitySection = hasProductsSelected ? (
    <PricingFormSection title="Pricing Applicability">
      <p className="mb-2.5 text-[11px] leading-relaxed text-muted-foreground">
        Choose where this pricing applies. You can select{" "}
        <span className="font-medium text-foreground">state only</span>,{" "}
        <span className="font-medium text-foreground">customer type only</span>, or{" "}
        <span className="font-medium text-foreground">both</span>. Leave one
        dimension empty to apply across all values for that dimension.
      </p>
      <PricingFormGrid>
        <div className="col-span-2 md:col-span-1">
          <PricingScopeMultiSelect
            label="State"
            options={PRICING_STATES}
            selected={form.states}
            onChange={(states) => updateScope({ states })}
            applyToAll={form.applyToAllStates}
            onApplyToAllChange={(applyToAllStates) =>
              updateScope({ applyToAllStates, states: [] })
            }
            applyToAllLabel="Apply to All States"
            selectAllLabel="Select All States"
            placeholder="Select state (optional)"
            disabled={mode === "edit"}
            error={errors.state || errors.scope}
          />
        </div>

        <div className="col-span-2 md:col-span-1">
          <PricingScopeMultiSelect
            label="Customer Type"
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
            placeholder="Select customer type (optional)"
            disabled={mode === "edit"}
            error={errors.customerType}
          />
        </div>

        <div className="col-span-2 w-fit md:col-span-1">
          <div className="grid grid-cols-2 gap-2">
            <MasterField label="Effective From" required error={errors.effectiveFrom}>
              <Input
                type="date"
                className={pricingInput("w-[9.5rem]")}
                value={form.effectiveFrom}
                onChange={(e) => updateScope({ effectiveFrom: e.target.value })}
              />
            </MasterField>

            <MasterField label="Effective To" error={errors.effectiveTo}>
              <Input
                type="date"
                className={pricingInput("w-[9.5rem]")}
                value={form.effectiveTo}
                onChange={(e) => updateScope({ effectiveTo: e.target.value })}
              />
            </MasterField>
          </div>
        </div>

        <MasterField
          label="Price List Name"
          required
          error={errors.priceListName}
          className="col-span-2 lg:col-span-3"
        >
          <FieldWidth size="wide">
            <Input
              className={pricingInput()}
              value={form.priceListName}
              onChange={(e) => {
                onChange({ ...form, priceListName: e.target.value });
                onClearError?.("priceListName");
              }}
              placeholder="e.g., Maharashtra Dealer Q2 2026"
            />
          </FieldWidth>
        </MasterField>

        {mode === "add" && combinationCount > 1 && (
          <div className="col-span-2 rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2 md:col-span-3 lg:col-span-4">
            <p className="text-xs text-brand-800">
              Saving will create{" "}
              <span className="font-semibold">{combinationCount}</span> pricing
              records for the selected product(s) and scope combinations.
            </p>
          </div>
        )}
      </PricingFormGrid>
    </PricingFormSection>
  ) : null;

  return (
    <div className={pricingFormShellClass}>
      {mode === "add" && (
        <PricingFormSection title="Pricing Mode">
          <div className="flex flex-wrap gap-2">
            {(["single", "bulk"] as PricingMode[]).map((m) => (
              <Button
                key={m}
                type="button"
                variant={form.pricingMode === m ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 text-xs font-semibold",
                  form.pricingMode === m && "bg-brand-600 text-white hover:bg-brand-700",
                )}
                onClick={() => setMode(m)}
              >
                {m === "single" ? "Single Product" : "Bulk Product"}
              </Button>
            ))}
          </div>
        </PricingFormSection>
      )}

      {showSingleProduct && (
        <PricingFormSection title="Single Product Selection">
          <PricingFormGrid>
            <MasterField
              label="Product / Product Code"
              required
              error={errors.productId}
              className="col-span-2 md:col-span-3 lg:col-span-4"
            >
              <FieldWidth size="full">
                <AutocompleteSelect
                  disabled={mode === "edit"}
                  value={form.productId}
                  onChange={(value) => handleProductChange(String(value))}
                  options={productOptions}
                  placeholder="Search product code, SKU, or name..."
                />
              </FieldWidth>
            </MasterField>

            {form.productId && (
              <div className="col-span-2 md:col-span-3 lg:col-span-4">
                <ProductMetaPanel
                  items={[
                    { label: "Product Code", value: form.productCode },
                    { label: "Product Name", value: form.productName },
                    { label: "SKU", value: form.sku },
                    { label: "Category", value: form.category },
                    { label: "Segment", value: form.segment },
                    { label: "Pack Size", value: form.packSize },
                    { label: "HSN Code", value: form.hsnCode },
                    { label: "GST %", value: form.gstPct },
                    { label: "Base Unit", value: form.baseUnit },
                    { label: "MoU", value: form.mou },
                    { label: "Unit Per Case", value: form.unitsPerCase },
                    { label: "Packaging Unit", value: form.uom },
                  ]}
                />
              </div>
            )}
          </PricingFormGrid>
        </PricingFormSection>
      )}

      {showBulkProduct && (
        <PricingFormSection title="Bulk Product Selection">
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200/90 bg-white p-3 shadow-sm">
              <MasterFormGrid>
                <MasterField label="Select Products" className="sm:col-span-2">
                  <AutocompleteSelect
                    options={productOptions}
                    value={form.bulkProductIds}
                    onChange={(val) =>
                      onChange({
                        ...form,
                        bulkProductIds: Array.isArray(val) ? val.map(String) : [],
                      })
                    }
                    multiple
                    placeholder="Search or select by SKU..."
                    searchPlaceholder="Search SKU, code, or product name..."
                    renderTriggerLabel={(selected) => {
                      if (!Array.isArray(selected) || selected.length === 0) {
                        return "Search or select by SKU...";
                      }
                      if (selected.length === 1) return selected[0].label;
                      return `${selected.length} products selected`;
                    }}
                  />
                </MasterField>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={form.bulkProductIds.length === 0}
                    onClick={addSelectedProducts}
                  >
                    Add Selected
                  </Button>
                </div>
              </MasterFormGrid>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Select by Category</label>
                <div className="flex gap-2">
                  <Select
                    value={form.bulkCategory || "none"}
                    onValueChange={(v) =>
                      onChange({ ...form, bulkCategory: v === "none" ? "" : v })
                    }
                  >
                    <SelectTrigger className={cn(compactInput(), "flex-1")}>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select category</SelectItem>
                      {categoryOptions.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 text-xs"
                    disabled={!form.bulkCategory}
                    onClick={addByCategory}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Select by Segment</label>
                <div className="flex gap-2">
                  <Select
                    value={form.bulkSegment || "none"}
                    onValueChange={(v) =>
                      onChange({ ...form, bulkSegment: v === "none" ? "" : v })
                    }
                  >
                    <SelectTrigger className={cn(compactInput(), "flex-1")}>
                      <SelectValue placeholder="Segment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select segment</SelectItem>
                      {segmentOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 text-xs"
                    disabled={!form.bulkSegment}
                    onClick={addBySegment}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="flex items-end sm:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={addAllActive}
                >
                  Select All Active Products
                </Button>
              </div>
            </div>

            <BulkPricingGrid
              lines={form.bulkLines}
              onChange={(bulkLines) => onChange({ ...form, bulkLines })}
              errors={errors}
            />
          </div>
        </PricingFormSection>
      )}

      {applicabilitySection}

      {showSingleProduct && form.productId && (
        <PricingFormSection title="Price Details">
          <PricingFormGrid className="md:grid-cols-2 lg:grid-cols-3">
            <MasterField label="Cost Price" required error={errors.costPrice}>
              <FieldWidth size="narrow">
                <IndianRupeeInput
                  value={form.costPrice}
                  onChange={(v) =>
                    onChange({ ...form, costPrice: v, netSellingPrice: form.dealerPrice })
                  }
                  className={pricingInput()}
                />
              </FieldWidth>
            </MasterField>

            <MasterField label="Dealer Price" required error={errors.dealerPrice}>
              <FieldWidth size="narrow">
                <IndianRupeeInput
                  value={form.dealerPrice}
                  onChange={(v) =>
                    onChange({ ...form, dealerPrice: v, netSellingPrice: v })
                  }
                  className={pricingInput("ring-1 ring-brand-200/80")}
                />
              </FieldWidth>
            </MasterField>

            <MasterField label="MRP" required error={errors.mrp}>
              <FieldWidth size="narrow">
                <Input
                  readOnly
                  className={pricingReadonly("text-right font-medium")}
                  value={formatIndianRupeeDisplay(form.mrp)}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  From Product Master
                </p>
              </FieldWidth>
            </MasterField>
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
