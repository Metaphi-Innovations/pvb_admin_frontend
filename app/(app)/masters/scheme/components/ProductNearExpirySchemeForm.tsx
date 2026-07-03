"use client";

import React, { useMemo } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NearExpiryProductMultiSelect } from "./NearExpiryProductMultiSelect";
import { NearExpiryStockBatchTable } from "./NearExpiryStockBatchTable";
import {
  SchemeNumberField,
  SchemeRupeeField,
  parseSchemeMoneyString,
  schemeCompactFieldClass as compactFieldClass,
} from "./scheme-form-inputs";
import {
  applyNearExpiryBenefitApplicationMode,
  buildNearExpiryUIPreviewRows,
  computePotentialBenefit,
  filterNearExpiryStockBatches,
  formatBatchExpiryDate,
  formatSchemeRupee,
  loadNearExpiryProductSelectOptions,
  syncNearExpiryFormFromProducts,
  syncNearExpiryProductSelection,
  type NearExpiryBenefitApplication,
  type NearExpiryBenefitTypeUI,
  type ProductNearExpiryForm,
  type ProductWiseNearExpiryBenefit,
} from "../product-near-expiry-scheme";

interface ProductNearExpirySchemeFormProps {
  form: ProductNearExpiryForm;
  onChange: (form: ProductNearExpiryForm) => void;
  mode: "add" | "edit";
  schemeCode?: string;
  codePreview?: string;
  error?: string;
}

const CUSTOMER_TYPES = ["All", "Distributor", "Retailer", "Wholesaler", "Institutional"] as const;

export function ProductNearExpirySchemeForm({
  form,
  onChange,
  mode,
  schemeCode,
  codePreview,
  error,
}: ProductNearExpirySchemeFormProps) {
  const withinDays = useMemo(() => {
    const value = parseInt(form.expiryWithinDays, 10);
    return Number.isNaN(value) ? 0 : value;
  }, [form.expiryWithinDays]);

  const nearExpiryBatches = useMemo(
    () => filterNearExpiryStockBatches(withinDays),
    [withinDays],
  );

  const nearExpiryProductOptions = useMemo(
    () => loadNearExpiryProductSelectOptions(withinDays),
    [withinDays],
  );

  const previewRows = useMemo(() => buildNearExpiryUIPreviewRows(form), [form]);

  const set = <K extends keyof ProductNearExpiryForm>(
    key: K,
    value: ProductNearExpiryForm[K],
  ) => {
    onChange({ ...form, [key]: value });
  };

  const handleExpiryWithinChange = (value: string) => {
    onChange(syncNearExpiryProductSelection({ ...form, expiryWithinDays: value }));
  };

  const handleProductsChange = (productIds: string[]) => {
    onChange(syncNearExpiryFormFromProducts({ ...form, productIds }));
  };

  const handleBenefitApplicationChange = (next: NearExpiryBenefitApplication) => {
    onChange(applyNearExpiryBenefitApplicationMode(form, next));
  };

  const updateProductBenefit = (
    productId: string,
    patch: Partial<ProductWiseNearExpiryBenefit>,
  ) => {
    const current = form.productBenefits[productId] ?? {
      benefitType: "Percentage" as const,
      benefitValue: "",
    };
    onChange({
      ...form,
      productBenefits: {
        ...form.productBenefits,
        [productId]: { ...current, ...patch },
      },
    });
  };

  const isCommon = form.benefitApplication === "Common";
  const isProductWise = form.benefitApplication === "Product-wise";
  const benefitValueLabel = form.benefitType === "Percentage" ? "Benefit %" : "Benefit ₹";
  const showPreview = previewRows.length > 0;

  const examplePreview = useMemo(() => {
    const dp = 1000;
    const benefitValue =
      form.benefitType === "Rupees"
        ? parseSchemeMoneyString(form.benefitValue) || 10
        : parseFloat(form.benefitValue) || 10;
    const potential = computePotentialBenefit(dp, form.benefitType, benefitValue);
    const benefitLabel =
      form.benefitType === "Percentage" ? `${benefitValue}%` : formatSchemeRupee(benefitValue);
    return { dp, benefitLabel, potential };
  }, [form.benefitType, form.benefitValue]);

  return (
    <div className="w-full space-y-3">
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

      <div className="rounded-md border border-border bg-white px-3 py-2.5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 min-w-0 space-y-1 sm:col-span-1 lg:col-span-1">
            <Label className="text-[11px] font-medium text-muted-foreground">Scheme Type</Label>
            <Input
              value="Product Near Expiry Scheme"
              readOnly
              className={cn(compactFieldClass, "w-full bg-muted/40 cursor-not-allowed")}
            />
          </div>
          <div className="col-span-1 min-w-0 space-y-1 lg:col-span-1">
            <Label className="text-[11px] font-medium text-muted-foreground">Scheme Code</Label>
            <Input
              value={mode === "edit" ? (schemeCode ?? "") : (codePreview ?? "Auto")}
              readOnly
              className={cn(compactFieldClass, "w-full bg-muted/40 cursor-not-allowed")}
            />
          </div>
          <div className="col-span-2 min-w-0 space-y-1 sm:col-span-1 lg:col-span-1">
            <Label className="text-[11px] font-medium text-muted-foreground">
              Scheme Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.schemeName}
              onChange={(e) => set("schemeName", e.target.value)}
              placeholder="e.g. Q4 Near Expiry Incentive"
              className={cn(compactFieldClass, "w-full")}
            />
          </div>
          <div className="col-span-1 min-w-0 space-y-1 lg:col-span-1">
            <Label className="text-[11px] font-medium text-muted-foreground">
              Customer Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.customerType}
              onValueChange={(v) => set("customerType", v as ProductNearExpiryForm["customerType"])}
            >
              <SelectTrigger className={cn(compactFieldClass, "w-full")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMER_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-1 min-w-0 space-y-1 lg:col-span-1">
            <Label className="text-[11px] font-medium text-muted-foreground">
              Start Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              className={cn(compactFieldClass, "w-full")}
            />
          </div>
          <div className="col-span-1 min-w-0 space-y-1 lg:col-span-1">
            <Label className="text-[11px] font-medium text-muted-foreground">
              End Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => set("endDate", e.target.value)}
              className={cn(compactFieldClass, "w-full")}
            />
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border bg-white px-3 py-2.5 space-y-2">
        <Label className="text-[11px] font-semibold text-foreground">Near Expiry Criteria</Label>
        <div className="grid grid-cols-2 gap-2 sm:max-w-md">
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground">
              Expiry Within <span className="text-red-500">*</span>
            </Label>
            <SchemeNumberField
              value={form.expiryWithinDays}
              onChange={handleExpiryWithinChange}
              placeholder="30"
              min={1}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground">Unit</Label>
            <Select value="Days" disabled>
              <SelectTrigger className={cn(compactFieldClass, "bg-muted/40")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Days" className="text-xs">
                  Days
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Products and states are driven by QC-passed warehouse stock expiring within this window.
        </p>
      </div>

      <NearExpiryStockBatchTable
        batches={nearExpiryBatches}
        withinDays={withinDays}
        selectedProductIds={form.productIds}
      />

      <div className="rounded-md border border-border bg-white px-3 py-2.5">
        <NearExpiryProductMultiSelect
          withinDays={withinDays}
          options={nearExpiryProductOptions}
          value={form.productIds}
          onChange={handleProductsChange}
        />
      </div>

      {form.stateNames.length > 0 && (
        <div className="rounded-md border border-border bg-white px-3 py-2">
          <Label className="text-[11px] font-medium text-muted-foreground">
            Applicable States (from warehouse stock)
          </Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {form.stateNames.map((state) => (
              <span
                key={state}
                className="inline-flex items-center gap-1 rounded bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-800"
              >
                <Check className="h-3 w-3" />
                {state}
              </span>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            States are auto-selected from warehouse location of selected near-expiry batches. Manual
            state selection is not allowed.
          </p>
        </div>
      )}

      <div className="rounded-md border border-border bg-white px-3 py-2.5 space-y-2">
        <Label className="text-[11px] font-semibold text-foreground">Benefit Configuration</Label>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-foreground">
            <input
              type="radio"
              name="benefitApplication"
              checked={isCommon}
              onChange={() => handleBenefitApplicationChange("Common")}
              className="accent-brand-600"
            />
            Bulk Discount (all products)
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-foreground">
            <input
              type="radio"
              name="benefitApplication"
              checked={isProductWise}
              onChange={() => handleBenefitApplicationChange("Product-wise")}
              className="accent-brand-600"
            />
            Individual Product-wise
          </label>
        </div>

        {isCommon && (
          <div className="grid grid-cols-2 gap-2 sm:max-w-md">
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">Benefit Type</Label>
              <Select
                value={form.benefitType}
                onValueChange={(v) => set("benefitType", v as NearExpiryBenefitTypeUI)}
              >
                <SelectTrigger className={compactFieldClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Percentage" className="text-xs">
                    Percentage
                  </SelectItem>
                  <SelectItem value="Rupees" className="text-xs">
                    Rupees
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">
                {benefitValueLabel} <span className="text-red-500">*</span>
              </Label>
              {form.benefitType === "Rupees" ? (
                <SchemeRupeeField
                  value={form.benefitValue}
                  onChange={(v) => set("benefitValue", v)}
                  placeholder="₹ 150"
                />
              ) : (
                <SchemeNumberField
                  value={form.benefitValue}
                  onChange={(v) => set("benefitValue", v)}
                  placeholder="10"
                  max={100}
                  step="any"
                />
              )}
            </div>
          </div>
        )}

        {isProductWise && (
          <p className="text-[10px] text-muted-foreground">
            Set benefit per product in the preview table below.
          </p>
        )}

        <div className="rounded border border-dashed border-border bg-muted/20 px-2.5 py-2 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">Example: </span>
          DP = {formatSchemeRupee(examplePreview.dp)} · Benefit = {examplePreview.benefitLabel} ·
          Amount = {formatSchemeRupee(examplePreview.potential)} · Final Price ={" "}
          {formatSchemeRupee(examplePreview.dp - examplePreview.potential)} (preview only)
        </div>
      </div>

      {showPreview && (
        <div className="overflow-hidden rounded-md border border-border bg-white">
          <div className="border-b border-border bg-muted/30 px-3 py-1.5 text-[11px] font-semibold">
            Near Expiry Benefit Preview
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-1.5 text-left font-semibold">Product Name</th>
                  <th className="px-2 py-1.5 text-left font-semibold">SKU</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Batch No.</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Expiry Date</th>
                  <th className="px-2 py-1.5 text-right font-semibold">MRP</th>
                  <th className="px-2 py-1.5 text-right font-semibold">DP</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Discount</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Amount</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Final Price</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => {
                  const entry = form.productBenefits[row.productId];
                  const rowBenefitType = isProductWise
                    ? (entry?.benefitType ?? "Percentage")
                    : row.benefitType;
                  const rowBenefitValue = isProductWise
                    ? (entry?.benefitValue ?? "")
                    : String(row.benefitValue);

                  return (
                    <tr key={row.key} className="border-b border-border/70 hover:bg-muted/10">
                      <td className="px-2 py-1 font-medium">{row.productName}</td>
                      <td className="px-2 py-1 font-mono text-[11px]">{row.sku}</td>
                      <td className="px-2 py-1 font-mono text-[11px]">{row.batchNumber}</td>
                      <td className="px-2 py-1">{formatBatchExpiryDate(row.expiryDate)}</td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {formatSchemeRupee(row.mrp)}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {formatSchemeRupee(row.dealerPrice)}
                      </td>
                      <td className="px-2 py-1">
                        {isProductWise ? (
                          <div className="flex items-center gap-1">
                            <Select
                              value={rowBenefitType}
                              onValueChange={(v) =>
                                updateProductBenefit(row.productId, {
                                  benefitType: v as NearExpiryBenefitTypeUI,
                                })
                              }
                            >
                              <SelectTrigger className="h-7 w-[4.5rem] text-[11px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Percentage" className="text-xs">
                                  %
                                </SelectItem>
                                <SelectItem value="Rupees" className="text-xs">
                                  ₹
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {rowBenefitType === "Rupees" ? (
                              <SchemeRupeeField
                                value={rowBenefitValue}
                                onChange={(v) =>
                                  updateProductBenefit(row.productId, { benefitValue: v })
                                }
                                className="h-7 w-24 text-right text-[11px]"
                                placeholder="₹ 40"
                              />
                            ) : (
                              <SchemeNumberField
                                value={rowBenefitValue}
                                onChange={(v) =>
                                  updateProductBenefit(row.productId, { benefitValue: v })
                                }
                                className="h-7 w-16 text-right text-[11px]"
                                placeholder="5"
                                max={100}
                                step="any"
                              />
                            )}
                          </div>
                        ) : (
                          <span className="tabular-nums">
                            {row.benefitType === "Percentage"
                              ? `${row.benefitValue}%`
                              : formatSchemeRupee(row.benefitValue)}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-right font-medium tabular-nums text-brand-700">
                        {formatSchemeRupee(row.benefitAmount)}
                      </td>
                      <td className="px-2 py-1 text-right font-semibold tabular-nums">
                        {formatSchemeRupee(row.finalPrice)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
