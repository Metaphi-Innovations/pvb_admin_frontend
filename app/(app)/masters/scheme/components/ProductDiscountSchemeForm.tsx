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
import { SchemeMultiSelect } from "./SchemeMultiSelect";
import { SchemeProductMultiSelect } from "./SchemeProductMultiSelect";
import {
  SchemeNumberField,
  SchemeRupeeField,
  schemeCompactFieldClass as compactFieldClass,
} from "./scheme-form-inputs";
import {
  applyDiscountApplicationMode,
  buildProductDiscountUIPreviewRows,
  formatSchemeRupee,
  loadSchemeProductSelectOptions,
  loadSchemeStateOptions,
  syncProductDiscountsForProducts,
  type DiscountApplicationMode,
  type ProductDiscountDiscountType,
  type ProductDiscountForm,
  type ProductWiseDiscountEntry,
} from "../product-discount-scheme";

interface ProductDiscountSchemeFormProps {
  form: ProductDiscountForm;
  onChange: (form: ProductDiscountForm) => void;
  mode: "add" | "edit";
  schemeCode?: string;
  codePreview?: string;
  error?: string;
}

const CUSTOMER_TYPES = ["All", "Distributor", "Retailer", "Wholesaler", "Institutional"] as const;

export function ProductDiscountSchemeForm({
  form,
  onChange,
  mode,
  schemeCode,
  codePreview,
  error,
}: ProductDiscountSchemeFormProps) {
  const productOptions = useMemo(() => loadSchemeProductSelectOptions(), []);
  const stateOptions = useMemo(() => loadSchemeStateOptions(), []);
  const previewRows = useMemo(() => buildProductDiscountUIPreviewRows(form), [form]);

  const set = <K extends keyof ProductDiscountForm>(key: K, value: ProductDiscountForm[K]) => {
    onChange({ ...form, [key]: value });
  };

  const handleProductsChange = (ids: string[]) => {
    onChange(syncProductDiscountsForProducts({ ...form, productIds: ids }));
  };

  const handleDiscountApplicationChange = (next: DiscountApplicationMode) => {
    onChange(applyDiscountApplicationMode(form, next));
  };

  const updateProductDiscount = (
    productId: string,
    patch: Partial<ProductWiseDiscountEntry>,
  ) => {
    const current = form.productDiscounts[productId] ?? {
      discountType: "Percentage" as const,
      discountValue: "",
    };
    onChange({
      ...form,
      productDiscounts: {
        ...form.productDiscounts,
        [productId]: { ...current, ...patch },
      },
    });
  };

  const isCommon = form.discountApplication === "Common";
  const isProductWise = form.discountApplication === "Product-wise";
  const discountValueLabel = form.discountType === "Percentage" ? "Discount %" : "Discount ₹";
  const showPreview = previewRows.length > 0;
  const needsCommonDiscount = isCommon && !form.discountValue;
  const needsProductWiseDiscount =
    isProductWise &&
    form.productIds.some((id) => !form.productDiscounts[id]?.discountValue?.trim());

  return (
    <div className="w-full space-y-3">
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

      <div className="rounded-md border border-border bg-white px-3 py-2.5 space-y-2.5">
        <SchemeProductMultiSelect
          label="Products"
          required
          options={productOptions}
          value={form.productIds}
          onChange={handleProductsChange}
          disabled={false}
          placeholder="Search product name, SKU, code, or category..."
        />
        <SchemeMultiSelect
          label="States *"
          placeholder="Select one or more states"
          options={stateOptions}
          selectedIds={form.stateNames}
          onChange={(ids) => set("stateNames", ids)}
          className="w-full"
        />
      </div>

      <div className="rounded-md border border-border bg-white px-3 py-2.5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 min-w-0 space-y-1 sm:col-span-1 lg:col-span-1">
            <Label className="text-[11px] font-medium text-muted-foreground">
              Scheme Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.schemeName}
              onChange={(e) => set("schemeName", e.target.value)}
              placeholder="e.g. Kharif Product Discount"
              className={cn(compactFieldClass, "w-full")}
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
          <div className="col-span-1 min-w-0 space-y-1 lg:col-span-1">
            <Label className="text-[11px] font-medium text-muted-foreground">
              Customer Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.customerType}
              onValueChange={(v) => set("customerType", v as ProductDiscountForm["customerType"])}
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
        <Label className="text-[11px] font-semibold text-foreground">Discount Application</Label>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-foreground">
            <input
              type="radio"
              name="discountApplication"
              checked={isCommon}
              onChange={() => handleDiscountApplicationChange("Common")}
              className="accent-brand-600"
            />
            Common Discount
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-foreground">
            <input
              type="radio"
              name="discountApplication"
              checked={isProductWise}
              onChange={() => handleDiscountApplicationChange("Product-wise")}
              className="accent-brand-600"
            />
            Product-wise Discount
          </label>
        </div>

        {isCommon && (
          <div className="grid grid-cols-2 gap-2 sm:max-w-md">
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">Discount Type</Label>
              <Select
                value={form.discountType}
                onValueChange={(v) => set("discountType", v as ProductDiscountDiscountType)}
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
                {discountValueLabel} <span className="text-red-500">*</span>
              </Label>
              {form.discountType === "Rupees" ? (
                <SchemeRupeeField
                  value={form.discountValue}
                  onChange={(v) => set("discountValue", v)}
                  placeholder="₹ 150"
                />
              ) : (
                <SchemeNumberField
                  value={form.discountValue}
                  onChange={(v) => set("discountValue", v)}
                  placeholder="5"
                  max={100}
                  step="any"
                />
              )}
            </div>
          </div>
        )}

        {isProductWise && (
          <p className="text-[10px] text-muted-foreground">
            Set discount per product in the preview table below.
          </p>
        )}
      </div>

      {form.stateNames.length > 0 && (
        <div className="rounded-md border border-border bg-white px-3 py-2">
          <Label className="text-[11px] font-medium text-muted-foreground">Selected States</Label>
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
          {form.stateNames.length > 1 && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Dealer Price in preview uses the first selected state. Each state gets its own DP on
              save.
            </p>
          )}
        </div>
      )}

      {showPreview && (
        <div className="overflow-hidden rounded-md border border-border bg-white">
          <div className="border-b border-border bg-muted/30 px-3 py-1.5 text-[11px] font-semibold">
            Product Discount Preview
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-1.5 text-left font-semibold">Product Code</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Product Name</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Dealer Price</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Discount Type</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Discount Value</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Discount Amount</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Final Scheme Price</th>
                  <th className="px-2 py-1.5 text-right font-semibold">MRP</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => {
                  const entry = form.productDiscounts[row.productId];
                  const rowDiscountType = isProductWise
                    ? (entry?.discountType ?? "Percentage")
                    : row.discountType;
                  const rowDiscountValue = isProductWise
                    ? (entry?.discountValue ?? "")
                    : String(row.discountValue);

                  return (
                    <tr key={row.key} className="border-b border-border/70 hover:bg-muted/10">
                      <td className="px-2 py-1 font-mono text-[11px]">{row.productCode}</td>
                      <td className="px-2 py-1 font-medium">{row.productName}</td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {formatSchemeRupee(row.dealerPrice)}
                      </td>
                      <td className="px-2 py-1">
                        {isProductWise ? (
                          <Select
                            value={rowDiscountType}
                            onValueChange={(v) =>
                              updateProductDiscount(row.productId, {
                                discountType: v as ProductDiscountDiscountType,
                              })
                            }
                          >
                            <SelectTrigger className="h-7 w-[7.5rem] text-[11px]">
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
                        ) : (
                          row.discountType === "Percentage" ? "%" : "₹"
                        )}
                      </td>
                      <td className="px-2 py-1 text-right">
                        {isProductWise ? (
                          rowDiscountType === "Rupees" ? (
                            <SchemeRupeeField
                              value={rowDiscountValue}
                              onChange={(v) =>
                                updateProductDiscount(row.productId, { discountValue: v })
                              }
                              className="ml-auto h-7 w-24 text-right text-[11px]"
                              placeholder="₹ 40"
                            />
                          ) : (
                            <SchemeNumberField
                              value={rowDiscountValue}
                              onChange={(v) =>
                                updateProductDiscount(row.productId, { discountValue: v })
                              }
                              className="ml-auto h-7 w-20 text-right text-[11px]"
                              placeholder="5"
                              max={100}
                              step="any"
                            />
                          )
                        ) : (
                          <span className="tabular-nums">
                            {row.discountType === "Percentage"
                              ? `${row.discountValue}%`
                              : formatSchemeRupee(row.discountValue)}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-right font-medium tabular-nums">
                        {formatSchemeRupee(row.discountAmount)}
                      </td>
                      <td className="px-2 py-1 text-right font-semibold text-brand-700 tabular-nums">
                        {formatSchemeRupee(row.finalSchemePrice)}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {formatSchemeRupee(row.mrp)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {form.productIds.length > 0 && form.stateNames.length > 0 && (needsCommonDiscount || needsProductWiseDiscount) && (
        <p className="rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">
          {isCommon
            ? "Enter discount value to preview calculations. DP is fetched from Pricing Master."
            : "Enter discount value for each product to preview calculations."}
        </p>
      )}
    </div>
  );
}
