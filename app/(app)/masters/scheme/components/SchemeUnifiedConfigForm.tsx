"use client";

import React, { useMemo, useState } from "react";
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SchemeMultiSelect } from "./SchemeMultiSelect";
import { SchemeProductMultiSelect } from "./SchemeProductMultiSelect";
import {
  SchemeNumberField,
  schemeCompactFieldClass as compactFieldClass,
} from "./scheme-form-inputs";
import {
  loadSchemeProductSelectOptions,
  loadSchemeStateOptions,
  formatSchemeProductOptionLabel,
  type SchemeProductSelectOption,
} from "../product-discount-scheme";
import {
  APPLY_DISCOUNT_ON_PRODUCT,
  CUSTOMER_TYPE_MULTI_OPTIONS,
  resolveCustomerTypeFromMulti,
  DISCOUNT_TYPE_OPTIONS,
  PAYMENT_CALCULATION_ON_OPTIONS,
  PAYMENT_CONDITION_OPTIONS,
  PRODUCT_SCOPE_OPTIONS,
  SPECIAL_DISCOUNT_BASED_ON_OPTIONS,
  SCHEME_TYPE_DISPLAY_LABELS,
  applyDiscountSetupMode,
  applyProductScopeForUnifiedForm,
  applySchemeTypeChange,
  applySelectedProductIds,
  applySpecialDiscountBasedOn,
  applySpecialDiscountProductIds,
  buildSchemeWorkingSummary,
  formatProductsApplicabilitySummary,
  categoryShowsImpactFlags,
  emptyPaymentDaySlab,
  emptySpecialDiscountAmountSlab,
  emptySpecialDiscountQuantitySlab,
  emptyTurnoverSlab,
  formShowsProductApplicability,
  getProductDiscountRowError,
  productIdsWithDiscountData,
  resolveAutomaticBenefit,
  resolveSpecialDiscountUom,
  schemeTypeDisplayLabel,
  syncProductDiscountRules,
  type ProductDiscountRuleForm,
  type ProductDiscountSetupMode,
  type ProductScopeUI,
  type SchemeUnifiedForm,
  type SpecialDiscountBasedOnUI,
} from "../scheme-unified-config";
import {
  SCHEME_CATEGORIES,
  type DiscountType,
  type SchemeApplyDiscountOn,
  type SchemeCategory,
  type SchemePaymentCalculationOn,
  type SchemePaymentCondition,
} from "../scheme-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import "../scheme-form-dense.css";

const labelClass = "scheme-field-label";
const ctrl = cn(compactFieldClass, "scheme-ctrl");

type WizardStepId =
  | "basic"
  | "applicable"
  | "condition"
  | "impact"
  | "remarks"
  | "review";

function Field({
  className,
  label,
  required,
  children,
}: {
  className?: string;
  label?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("scheme-field", className)}>
      {label ? (
        <Label className={labelClass}>
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </Label>
      ) : null}
      {children}
    </div>
  );
}

function ProductsApplicability({
  form,
  onChange,
  productOptions,
  showProductError = false,
}: {
  form: SchemeUnifiedForm;
  onChange: (form: SchemeUnifiedForm) => void;
  productOptions: SchemeProductSelectOption[];
  showProductError?: boolean;
}) {
  const isNearExpiry = form.schemeCategory === "Near Expiry Discount";

  const productFieldError =
    showProductError &&
    form.schemeCategory === "Special Discount" &&
    (form.specialDiscountBasedOn === "Sales Quantity" ||
      form.productScope === "Selected Products") &&
    form.productIds.length === 0
      ? "Select at least one product."
      : showProductError &&
          form.schemeCategory === "Product Discount" &&
          form.productScope === "Selected Products" &&
          form.productIds.length === 0
        ? "Select at least one product."
        : showProductError &&
            form.schemeCategory === "Product Discount" &&
            form.discountMode === "PRODUCT_WISE" &&
            form.productIds.length === 0
          ? "Select at least one product."
          : showProductError &&
              form.schemeCategory !== "Near Expiry Discount" &&
              form.schemeCategory !== "Product Discount" &&
              form.schemeCategory !== "Special Discount" &&
              form.productScope === "Selected Products" &&
              form.productIds.length === 0
            ? "Select at least one product."
            : undefined;

  const [pendingRemoveIds, setPendingRemoveIds] = React.useState<string[] | null>(
    null,
  );

  const commitProductIds = (ids: string[]) => {
    if (form.schemeCategory === "Product Discount") {
      onChange(applySelectedProductIds(form, ids));
      return;
    }
    if (form.schemeCategory === "Special Discount") {
      onChange(applySpecialDiscountProductIds(form, ids));
      return;
    }
    if (isNearExpiry) {
      onChange({
        ...form,
        productIds: ids,
        productScope: ids.length === 0 ? "All Products" : "Selected Products",
      });
      return;
    }
    onChange({ ...form, productIds: ids });
  };

  const handleProductsChange = (ids: string[]) => {
    if (form.schemeCategory !== "Product Discount") {
      commitProductIds(ids);
      return;
    }
    const removed = form.productIds.filter((id) => !ids.includes(id));
    const risky = productIdsWithDiscountData(form.productDiscountRules, removed);
    if (risky.length > 0) {
      setPendingRemoveIds(ids);
      return;
    }
    commitProductIds(ids);
  };

  /** Near Expiry: one searchable multi-select — blank = all active products. */
  if (isNearExpiry) {
    return (
      <Field className="scheme-w-products">
        <SchemeProductMultiSelect
          label="Products"
          value={form.productIds}
          onChange={handleProductsChange}
          options={productOptions}
          placeholder="All Products"
          searchPlaceholder="Leave blank to apply to all products, or search and select specific products."
          dense
          showClearAll
          preferIdentityLabel
          emptyAsSummary
        />
        <p className="text-[10px] text-muted-foreground leading-snug">
          Leave blank to apply to all products, or search and select specific products.
        </p>
      </Field>
    );
  }

  /** Product Discount: All / Selected dropdown + Select Products when Selected. */
  if (form.schemeCategory === "Product Discount") {
    return (
      <>
        <Field className="scheme-w-products-scope" label="Products" required>
          <Select
            value={form.productScope}
            onValueChange={(v) => {
              const next = v as ProductScopeUI;
              onChange(applyProductScopeForUnifiedForm(form, next));
            }}
          >
            <SelectTrigger className={ctrl}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_SCOPE_OPTIONS.map((m) => (
                <SelectItem key={m} value={m} className="text-xs">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {form.productScope === "Selected Products" ? (
          <Field className="scheme-w-products">
            <SchemeProductMultiSelect
              label="Select Products"
              value={form.productIds}
              onChange={handleProductsChange}
              options={productOptions}
              placeholder="Select products"
              searchPlaceholder="Search name, code, or SKU…"
              required
              dense
              showClearAll
              preferIdentityLabel
              error={Boolean(productFieldError)}
              errorMessage={productFieldError}
            />
          </Field>
        ) : null}

        <Dialog
          open={pendingRemoveIds !== null}
          onOpenChange={(open) => {
            if (!open) setPendingRemoveIds(null);
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">Remove product discount?</DialogTitle>
              <DialogDescription className="pt-1 text-xs">
                Removing this product will discard its entered discount values for the
                current unsaved session.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setPendingRemoveIds(null)}
              >
                Keep product
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                onClick={() => {
                  if (pendingRemoveIds) commitProductIds(pendingRemoveIds);
                  setPendingRemoveIds(null);
                }}
              >
                Remove
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  /** Special Discount: Sales Amount = All/Selected; Sales Quantity = Selected only. */
  if (form.schemeCategory === "Special Discount") {
    const isQty = form.specialDiscountBasedOn === "Sales Quantity";
    const showMultiSelect =
      isQty || form.productScope === "Selected Products";
    const { uom, incompatible } = resolveSpecialDiscountUom(form.productIds);
    const uomError =
      isQty && form.productIds.length > 0 && incompatible
        ? "Selected products must use the same unit of measurement for a quantity-based scheme."
        : undefined;

    return (
      <>
        {isQty ? (
          <Field className="scheme-w-products-scope" label="Products">
            <div
              className={cn(
                ctrl,
                "flex items-center bg-muted/30 text-foreground cursor-not-allowed",
              )}
            >
              Selected Products
            </div>
          </Field>
        ) : (
          <Field className="scheme-w-products-scope" label="Products" required>
            <Select
              value={form.productScope}
              onValueChange={(v) => {
                const next = v as ProductScopeUI;
                onChange(applyProductScopeForUnifiedForm(form, next));
              }}
            >
              <SelectTrigger className={ctrl}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_SCOPE_OPTIONS.map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {showMultiSelect ? (
          <Field className="scheme-w-products">
            <SchemeProductMultiSelect
              label="Select Products"
              value={form.productIds}
              onChange={handleProductsChange}
              options={productOptions}
              placeholder="Select products"
              searchPlaceholder="Search name, code, or SKU…"
              required
              dense
              showClearAll
              preferIdentityLabel
              error={Boolean(productFieldError || uomError)}
              errorMessage={productFieldError || uomError}
            />
            {isQty ? (
              form.productIds.length > 0 && !incompatible && uom ? (
                <p className="text-[10px] text-muted-foreground leading-snug">
                  UOM: {uom} (derived from selected products)
                </p>
              ) : !productFieldError && !uomError ? (
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Selected products only. Quantity cannot be combined across different
                  UOMs.
                </p>
              ) : null
            ) : null}
          </Field>
        ) : null}
      </>
    );
  }

  return (
    <>
      <Field className="scheme-w-products-scope" label="Products">
        <Select
          value={form.productScope}
          onValueChange={(v) => {
            const next = v as ProductScopeUI;
            onChange(applyProductScopeForUnifiedForm(form, next));
          }}
        >
          <SelectTrigger className={ctrl}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_SCOPE_OPTIONS.map((m) => (
              <SelectItem key={m} value={m} className="text-xs">
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {form.productScope === "Selected Products" ? (
        <Field className="scheme-w-products">
          <SchemeProductMultiSelect
            label="Select Products"
            value={form.productIds}
            onChange={handleProductsChange}
            options={productOptions}
            placeholder="Select products"
            searchPlaceholder="Search name, code, or SKU…"
            required
            dense
            showClearAll
            preferIdentityLabel
            error={Boolean(productFieldError)}
            errorMessage={productFieldError}
          />
        </Field>
      ) : null}
    </>
  );
}

function ProductDiscountConditionFields({
  form,
  onChange,
  productOptions,
  showRowErrors = false,
}: {
  form: SchemeUnifiedForm;
  onChange: (form: SchemeUnifiedForm) => void;
  productOptions: SchemeProductSelectOption[];
  showRowErrors?: boolean;
}) {
  const isAllProducts = form.productScope === "All Products";
  const isProductWise =
    !isAllProducts && form.discountMode === "PRODUCT_WISE";
  const rules = syncProductDiscountRules(
    form.productDiscountRules,
    form.productIds,
  );
  const optById = useMemo(
    () => new Map(productOptions.map((o) => [o.value, o])),
    [productOptions],
  );

  const updateRule = (
    productId: string,
    patch: Partial<ProductDiscountRuleForm>,
  ) => {
    const nextRules = syncProductDiscountRules(
      form.productDiscountRules,
      form.productIds,
    ).map((r) => (r.productId === productId ? { ...r, ...patch } : r));
    onChange({ ...form, productDiscountRules: nextRules });
  };

  return (
    <div className="space-y-2">
      <div className="scheme-row">
        <Field className="scheme-w-discount-setup" label="Discount Setup" required>
          {isAllProducts ? (
            <div
              className={cn(
                ctrl,
                "flex items-center truncate text-foreground bg-muted/30 cursor-not-allowed",
              )}
              title="Same Discount for All Products"
            >
              Same Discount for All Products
            </div>
          ) : (
            <Select
              value={form.discountMode}
              onValueChange={(v) =>
                onChange(
                  applyDiscountSetupMode(form, v as ProductDiscountSetupMode),
                )
              }
            >
              <SelectTrigger className={ctrl}>
                <SelectValue placeholder="Select discount setup" />
              </SelectTrigger>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                <SelectItem value="COMMON" className="text-xs">
                  Same Discount for All Selected Products
                </SelectItem>
                <SelectItem value="PRODUCT_WISE" className="text-xs">
                  Different Discount by Product
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </Field>

        {!isProductWise ? (
          <>
            <Field className="scheme-w-disc-type" label="Discount Type" required>
              <Select
                value={form.discountType}
                onValueChange={(v) =>
                  onChange({ ...form, discountType: v as DiscountType })
                }
              >
                <SelectTrigger className={ctrl}>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {DISCOUNT_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field className="scheme-w-disc-value" label="Discount Value" required>
              <SchemeNumberField
                value={form.discountValue}
                onChange={(v) => onChange({ ...form, discountValue: v })}
                placeholder={form.discountType === "Percentage" ? "%" : "₹"}
                min={0}
                max={form.discountType === "Percentage" ? 100 : undefined}
                className="scheme-ctrl"
              />
            </Field>
            <Field className="scheme-w-select-md" label="Apply Discount On" required>
              <Select
                value={form.applyDiscountOn}
                onValueChange={(v) =>
                  onChange({
                    ...form,
                    applyDiscountOn: v as SchemeApplyDiscountOn,
                  })
                }
              >
                <SelectTrigger className={ctrl}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPLY_DISCOUNT_ON_PRODUCT.map((o) => (
                    <SelectItem key={o} value={o} className="text-xs">
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </>
        ) : null}
      </div>

      {isAllProducts ? (
        <p className="text-[10px] text-muted-foreground leading-snug max-w-xl">
          Different Discount by Product is available only when specific products are
          selected.
        </p>
      ) : null}

      {isProductWise ? (
        <div className="scheme-slab-wrap scheme-pd-rules-wrap">
          {form.productIds.length === 0 ? (
            <p className="px-2 py-2 text-[11px] text-muted-foreground">
              Select at least one product to configure product-wise discounts.
            </p>
          ) : (
            <table className="scheme-slab-table scheme-pd-rules-table">
              <thead>
                <tr>
                  <th className="scheme-pd-col-product">Product</th>
                  <th className="scheme-pd-col-type">Discount Type</th>
                  <th className="scheme-pd-col-value">Discount Value</th>
                  <th className="scheme-pd-col-apply">Apply Discount On</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => {
                  const opt = optById.get(rule.productId);
                  const label = opt
                    ? formatSchemeProductOptionLabel({
                        productName: opt.productName || opt.label,
                        productCode: opt.productCode,
                        sku: opt.sku,
                        packSizeLabel: opt.packSizeLabel,
                      })
                    : rule.productId;
                  const rowErr = showRowErrors
                    ? getProductDiscountRowError(rule)
                    : null;
                  return (
                    <tr key={rule.productId}>
                      <td className="scheme-pd-col-product">
                        <span
                          className="block truncate text-[11px] font-medium text-foreground"
                          title={label}
                        >
                          {label}
                        </span>
                        {rowErr ? (
                          <span className="mt-0.5 block text-[10px] text-red-500">
                            {rowErr}
                          </span>
                        ) : null}
                      </td>
                      <td className="scheme-pd-col-type">
                        <Select
                          value={rule.discountType}
                          onValueChange={(v) =>
                            updateRule(rule.productId, {
                              discountType: v as DiscountType,
                            })
                          }
                        >
                          <SelectTrigger className={ctrl}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DISCOUNT_TYPE_OPTIONS.map((t) => (
                              <SelectItem key={t} value={t} className="text-xs">
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="scheme-pd-col-value">
                        <SchemeNumberField
                          value={rule.discountValue}
                          onChange={(v) =>
                            updateRule(rule.productId, { discountValue: v })
                          }
                          placeholder={
                            rule.discountType === "Percentage" ? "%" : "₹"
                          }
                          min={0}
                          max={
                            rule.discountType === "Percentage" ? 100 : undefined
                          }
                          className="scheme-ctrl"
                        />
                      </td>
                      <td className="scheme-pd-col-apply">
                        <Select
                          value={rule.applyDiscountOn}
                          onValueChange={(v) =>
                            updateRule(rule.productId, {
                              applyDiscountOn: v as SchemeApplyDiscountOn,
                            })
                          }
                        >
                          <SelectTrigger className={ctrl}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {APPLY_DISCOUNT_ON_PRODUCT.map((o) => (
                              <SelectItem key={o} value={o} className="text-xs">
                                {o}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </div>
  );
}

function DiscountTypeValueFields({
  form,
  onChange,
}: {
  form: SchemeUnifiedForm;
  onChange: (form: SchemeUnifiedForm) => void;
}) {
  return (
    <>
      <Field className="scheme-w-select-sm" label="Discount Type" required>
        <Select
          value={form.discountType}
          onValueChange={(v) =>
            onChange({ ...form, discountType: v as DiscountType })
          }
        >
          <SelectTrigger className={ctrl}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DISCOUNT_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t} value={t} className="text-xs">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field className="scheme-w-num" label="Discount Value" required>
        <SchemeNumberField
          value={form.discountValue}
          onChange={(v) => onChange({ ...form, discountValue: v })}
          placeholder={form.discountType === "Percentage" ? "%" : "₹"}
          min={0}
          max={form.discountType === "Percentage" ? 100 : undefined}
          className="scheme-ctrl"
        />
      </Field>
    </>
  );
}

function formatSlabDiscountLabel(type: DiscountType, value: string): string {
  if (!value.trim()) return "—";
  return type === "Fixed Amount" ? `₹${value}` : `${value}%`;
}

function SpecialDiscountConditionFields({
  form,
  onChange,
}: {
  form: SchemeUnifiedForm;
  onChange: (form: SchemeUnifiedForm) => void;
}) {
  const set = <K extends keyof SchemeUnifiedForm>(
    key: K,
    value: SchemeUnifiedForm[K],
  ) => onChange({ ...form, [key]: value });

  const isQty = form.specialDiscountBasedOn === "Sales Quantity";
  const uom = form.specialDiscountUom;

  return (
    <div className="space-y-2">
      <div className="scheme-row">
        <Field
          className="scheme-w-select-md"
          label="Special Discount Based On"
          required
        >
          <Select
            value={form.specialDiscountBasedOn}
            onValueChange={(v) =>
              onChange(
                applySpecialDiscountBasedOn(
                  form,
                  v as SpecialDiscountBasedOnUI,
                ),
              )
            }
          >
            <SelectTrigger className={ctrl}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPECIAL_DISCOUNT_BASED_ON_OPTIONS.map((o) => (
                <SelectItem key={o} value={o} className="text-xs">
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <p className="text-[10px] text-muted-foreground leading-snug max-w-xl">
        {isQty
          ? "Net sold quantity (invoice qty − returned qty) during Valid From–Valid To determines the achieved slab. Discount is entitlement only — settled later via Credit Note."
          : "Eligible Net Taxable Sales (Taxable Sales − Sales Returns, excluding GST) during Valid From–Valid To determines the achieved slab. Discount is entitlement only — settled later via Credit Note."}
      </p>

      <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">
        Achievement Slabs
      </p>

      {!isQty ? (
        <>
          <div className="scheme-slab-wrap">
            <table className="scheme-slab-table">
              <thead>
                <tr>
                  <th className="scheme-w-turnover-cell">Eligible Sales From</th>
                  <th className="scheme-w-turnover-cell">Eligible Sales To</th>
                  <th className="scheme-w-select-sm">Discount Type</th>
                  <th className="scheme-w-num-cell">Discount Value</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {form.specialDiscountAmountSlabs.map((slab, idx) => {
                  const isLast =
                    idx === form.specialDiscountAmountSlabs.length - 1;
                  return (
                    <tr key={slab.id}>
                      <td className="scheme-w-turnover-cell">
                        <SchemeNumberField
                          value={slab.eligibleSalesFrom}
                          onChange={(v) => {
                            const slabs = [...form.specialDiscountAmountSlabs];
                            slabs[idx] = { ...slab, eligibleSalesFrom: v };
                            set("specialDiscountAmountSlabs", slabs);
                          }}
                          placeholder="₹"
                          min={0}
                          className="scheme-ctrl"
                        />
                      </td>
                      <td className="scheme-w-turnover-cell">
                        <SchemeNumberField
                          value={slab.eligibleSalesTo}
                          onChange={(v) => {
                            const slabs = [...form.specialDiscountAmountSlabs];
                            slabs[idx] = { ...slab, eligibleSalesTo: v };
                            set("specialDiscountAmountSlabs", slabs);
                          }}
                          placeholder={isLast ? "Above" : "₹"}
                          min={0}
                          className="scheme-ctrl"
                        />
                      </td>
                      <td>
                        <Select
                          value={slab.discountType}
                          onValueChange={(v) => {
                            const slabs = [...form.specialDiscountAmountSlabs];
                            slabs[idx] = {
                              ...slab,
                              discountType: v as DiscountType,
                            };
                            set("specialDiscountAmountSlabs", slabs);
                          }}
                        >
                          <SelectTrigger className={ctrl}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DISCOUNT_TYPE_OPTIONS.map((t) => (
                              <SelectItem key={t} value={t} className="text-xs">
                                {t === "Percentage" ? "%" : "₹ Fixed"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="scheme-w-num-cell">
                        <SchemeNumberField
                          value={slab.discountValue}
                          onChange={(v) => {
                            const slabs = [...form.specialDiscountAmountSlabs];
                            slabs[idx] = { ...slab, discountValue: v };
                            set("specialDiscountAmountSlabs", slabs);
                          }}
                          placeholder={
                            slab.discountType === "Percentage" ? "%" : "₹"
                          }
                          min={0}
                          max={
                            slab.discountType === "Percentage" ? 100 : undefined
                          }
                          className="scheme-ctrl"
                        />
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          disabled={form.specialDiscountAmountSlabs.length <= 1}
                          onClick={() =>
                            set(
                              "specialDiscountAmountSlabs",
                              form.specialDiscountAmountSlabs.filter(
                                (s) => s.id !== slab.id,
                              ),
                            )
                          }
                          aria-label="Delete slab"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="scheme-slab-actions">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2.5 text-[11px]"
              onClick={() =>
                set("specialDiscountAmountSlabs", [
                  ...form.specialDiscountAmountSlabs,
                  emptySpecialDiscountAmountSlab(),
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add Slab
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="scheme-slab-wrap">
            <table className="scheme-slab-table">
              <thead>
                <tr>
                  <th className="scheme-w-num-cell">Quantity From</th>
                  <th className="scheme-w-num-cell">Quantity To</th>
                  <th className="scheme-w-num-cell">UOM</th>
                  <th className="scheme-w-select-sm">Discount Type</th>
                  <th className="scheme-w-num-cell">Discount Value</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {form.specialDiscountQuantitySlabs.map((slab, idx) => {
                  const isLast =
                    idx === form.specialDiscountQuantitySlabs.length - 1;
                  return (
                    <tr key={slab.id}>
                      <td className="scheme-w-num-cell">
                        <SchemeNumberField
                          value={slab.quantityFrom}
                          onChange={(v) => {
                            const slabs = [
                              ...form.specialDiscountQuantitySlabs,
                            ];
                            slabs[idx] = { ...slab, quantityFrom: v };
                            set("specialDiscountQuantitySlabs", slabs);
                          }}
                          placeholder="0"
                          min={0}
                          className="scheme-ctrl"
                        />
                      </td>
                      <td className="scheme-w-num-cell">
                        <SchemeNumberField
                          value={slab.quantityTo}
                          onChange={(v) => {
                            const slabs = [
                              ...form.specialDiscountQuantitySlabs,
                            ];
                            slabs[idx] = { ...slab, quantityTo: v };
                            set("specialDiscountQuantitySlabs", slabs);
                          }}
                          placeholder={isLast ? "Above" : ""}
                          min={0}
                          className="scheme-ctrl"
                        />
                      </td>
                      <td className="scheme-w-num-cell">
                        <Input
                          value={uom || slab.uom || ""}
                          readOnly
                          placeholder="—"
                          className={cn(ctrl, "bg-muted/30")}
                          tabIndex={-1}
                        />
                      </td>
                      <td>
                        <Select
                          value={slab.discountType}
                          onValueChange={(v) => {
                            const slabs = [
                              ...form.specialDiscountQuantitySlabs,
                            ];
                            slabs[idx] = {
                              ...slab,
                              discountType: v as DiscountType,
                            };
                            set("specialDiscountQuantitySlabs", slabs);
                          }}
                        >
                          <SelectTrigger className={ctrl}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DISCOUNT_TYPE_OPTIONS.map((t) => (
                              <SelectItem key={t} value={t} className="text-xs">
                                {t === "Percentage" ? "%" : "₹ Fixed"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="scheme-w-num-cell">
                        <SchemeNumberField
                          value={slab.discountValue}
                          onChange={(v) => {
                            const slabs = [
                              ...form.specialDiscountQuantitySlabs,
                            ];
                            slabs[idx] = { ...slab, discountValue: v };
                            set("specialDiscountQuantitySlabs", slabs);
                          }}
                          placeholder={
                            slab.discountType === "Percentage" ? "%" : "₹"
                          }
                          min={0}
                          max={
                            slab.discountType === "Percentage" ? 100 : undefined
                          }
                          className="scheme-ctrl"
                        />
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          disabled={
                            form.specialDiscountQuantitySlabs.length <= 1
                          }
                          onClick={() =>
                            set(
                              "specialDiscountQuantitySlabs",
                              form.specialDiscountQuantitySlabs.filter(
                                (s) => s.id !== slab.id,
                              ),
                            )
                          }
                          aria-label="Delete slab"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="scheme-slab-actions">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2.5 text-[11px]"
              onClick={() =>
                set("specialDiscountQuantitySlabs", [
                  ...form.specialDiscountQuantitySlabs,
                  emptySpecialDiscountQuantitySlab(uom),
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add Slab
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function WizardStep({
  id,
  title,
  open,
  completed,
  onToggle,
  children,
}: {
  id: WizardStepId;
  title: string;
  open: boolean;
  completed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("scheme-wizard-step", open && "is-open", completed && "is-done")}
      data-step={id}
    >
      <button
        type="button"
        className="scheme-wizard-trigger"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="scheme-wizard-step-mark" aria-hidden>
          {completed && !open ? (
            <Check className="h-3 w-3 text-brand-600" strokeWidth={2.5} />
          ) : (
            <span className="scheme-wizard-step-dot" />
          )}
        </span>
        <span className="scheme-wizard-step-title">{title}</span>
        <ChevronDown
          className={cn(
            "scheme-wizard-chevron h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      <div
        className={cn(
          "scheme-wizard-panel",
          open ? "scheme-wizard-panel-open" : "scheme-wizard-panel-closed",
        )}
      >
        <div className="scheme-wizard-panel-inner">{children}</div>
      </div>
    </div>
  );
}

interface SchemeUnifiedConfigFormProps {
  form: SchemeUnifiedForm;
  onChange: (form: SchemeUnifiedForm) => void;
  mode: "add" | "edit";
  schemeCode?: string;
  codePreview?: string;
  error?: string;
  /** When editing, scheme type is locked to avoid orphaning specialised line data. */
  lockCategory?: boolean;
}

export function SchemeUnifiedConfigForm({
  form,
  onChange,
  mode,
  schemeCode,
  codePreview,
  error,
  lockCategory = false,
}: SchemeUnifiedConfigFormProps) {
  const stateOptions = useMemo(() => loadSchemeStateOptions(), []);
  const productOptions = useMemo(() => loadSchemeProductSelectOptions(), []);
  const usesProducts = formShowsProductApplicability(form);
  const showImpact = categoryShowsImpactFlags(form.schemeCategory);
  const autoBenefit = resolveAutomaticBenefit(form.schemeCategory, {
    turnoverPeriod: form.turnoverPeriod,
    existingThrough: form.benefitThrough,
    existingWhen: form.benefitWhen,
    preserveNearExpiryInvoiceDiscount:
      form.schemeCategory === "Near Expiry Discount" &&
      form.benefitThrough === "Invoice Discount",
  });
  const summary = buildSchemeWorkingSummary({
    ...form,
    benefitThrough: autoBenefit.benefitThrough,
    benefitWhen: autoBenefit.benefitWhen,
  });
  const schemeTypeOptions = SCHEME_CATEGORIES.filter(
    (c) => c !== "Payment Discount" || form.schemeCategory === "Payment Discount",
  );

  const steps = useMemo(() => {
    const list: { id: WizardStepId; title: string }[] = [
      { id: "basic", title: "Basic Details" },
      { id: "applicable", title: "Applicable To" },
      { id: "condition", title: "Scheme Condition" },
    ];
    if (showImpact) {
      list.push({ id: "impact", title: "Other Scheme Impact" });
    }
    list.push(
      { id: "remarks", title: "Description / Remarks" },
      { id: "review", title: "Review — How This Scheme Will Work" },
    );
    return list;
  }, [showImpact]);

  /** Top progress — 4 ERP milestones only (accordion still has all sections). */
  const progressItems = useMemo(
    () =>
      [
        {
          key: "basic",
          label: "Basic Details",
          target: "basic" as WizardStepId,
          matches: ["basic"] as WizardStepId[],
        },
        {
          key: "applicable",
          label: "Applicable To",
          target: "applicable" as WizardStepId,
          matches: ["applicable"] as WizardStepId[],
        },
        {
          key: "conditions",
          label: "Conditions",
          target: "condition" as WizardStepId,
          matches: ["condition", "impact"] as WizardStepId[],
        },
        {
          key: "review",
          label: "Review",
          target: "review" as WizardStepId,
          matches: ["remarks", "review"] as WizardStepId[],
        },
      ] as const,
    [],
  );

  /** Multi-open accordion: any combination of sections may stay expanded. */
  const [openSteps, setOpenSteps] = useState<Set<WizardStepId>>(
    () => new Set(["basic"]),
  );
  /** Logical progress focus — does not force other sections closed. */
  const [focusStep, setFocusStep] = useState<WizardStepId>("basic");
  const [visited, setVisited] = useState<Set<WizardStepId>>(() => new Set(["basic"]));

  // Drop Impact from open/focus when that section is hidden for the selected type (UI only).
  React.useEffect(() => {
    const validIds = new Set(steps.map((s) => s.id));
    setOpenSteps((prev) => {
      let changed = false;
      const next = new Set<WizardStepId>();
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
    if (!validIds.has(focusStep)) {
      setFocusStep(showImpact ? "impact" : "remarks");
    }
  }, [steps, focusStep, showImpact]);

  const focusIndex = steps.findIndex((s) => s.id === focusStep);

  const markVisited = (id: WizardStepId) => {
    setVisited((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  /** Progress click / programmatic open — add section without closing others. */
  const ensureStepOpen = (id: WizardStepId) => {
    setOpenSteps((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setFocusStep(id);
    markVisited(id);
  };

  /** Accordion header — independently expand or collapse this section only. */
  const toggleStep = (id: WizardStepId) => {
    const willOpen = !openSteps.has(id);
    setOpenSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (willOpen) setFocusStep(id);
    markVisited(id);
  };

  const set = <K extends keyof SchemeUnifiedForm>(key: K, value: SchemeUnifiedForm[K]) => {
    onChange({ ...form, [key]: value });
  };

  const onTypeChange = (category: SchemeCategory) => {
    if (lockCategory) return;
    onChange(applySchemeTypeChange(form, category));
  };

  const isStepComplete = (id: WizardStepId) => {
    const idx = steps.findIndex((s) => s.id === id);
    if (idx < 0) return false;
    if (visited.has(id) && idx < focusIndex) return true;
    if (id === "review" && visited.has("review") && focusStep !== "review") return true;
    return visited.has(id) && idx < focusIndex;
  };

  const progressActiveKey = progressItems.find((p) =>
    p.matches.includes(focusStep),
  )?.key;

  const isProgressDone = (item: (typeof progressItems)[number]) => {
    const lastMatch = [...item.matches].reverse().find((id) =>
      steps.some((s) => s.id === id),
    );
    if (!lastMatch) return false;
    const lastIdx = steps.findIndex((s) => s.id === lastMatch);
    return lastIdx >= 0 && lastIdx < focusIndex;
  };

  const benefitLabel =
    form.schemeCategory === "Special Discount"
      ? "Achievement-based entitlement (Credit Note)"
      : form.discountType === "Percentage"
        ? form.discountValue
          ? `${form.discountValue}% ${schemeTypeDisplayLabel(form.schemeCategory)}`
          : schemeTypeDisplayLabel(form.schemeCategory)
        : form.discountValue
          ? `₹${form.discountValue} ${schemeTypeDisplayLabel(form.schemeCategory)}`
          : schemeTypeDisplayLabel(form.schemeCategory);

  return (
    <div className="scheme-master-form-dense scheme-form-shell scheme-wizard">
      {/* Progress: Basic Details → Applicable To → Conditions → Review */}
      <nav className="scheme-wizard-progress" aria-label="Scheme configuration progress">
        {progressItems.map((item, i) => {
          const active = item.key === progressActiveKey;
          const done = isProgressDone(item);
          return (
            <React.Fragment key={item.key}>
              {i > 0 ? <span className="scheme-wizard-progress-sep" aria-hidden /> : null}
              <button
                type="button"
                className={cn(
                  "scheme-wizard-progress-item",
                  active && "is-active",
                  done && !active && "is-done",
                )}
                onClick={() => ensureStepOpen(item.target)}
              >
                <span className="scheme-wizard-progress-label">
                  {item.label}
                  {done && !active ? (
                    <span className="scheme-wizard-progress-tick" aria-hidden>
                      {" "}
                      ✓
                    </span>
                  ) : null}
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {error ? (
        <div className="scheme-error-banner border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      ) : null}

      <div className="scheme-wizard-stack">
        {/* 1. Basic Details */}
        <WizardStep
          id="basic"
          title="Basic Details"
          open={openSteps.has("basic")}
          completed={isStepComplete("basic")}
          onToggle={() => toggleStep("basic")}
        >
          <div className="scheme-row">
            <Field className="scheme-w-code" label="Scheme Code">
              <Input
                value={mode === "edit" ? (schemeCode ?? "") : (codePreview ?? "Auto")}
                readOnly
                className={cn(ctrl, "cursor-not-allowed bg-muted/40 font-mono")}
              />
            </Field>
            <Field className="scheme-w-name" label="Scheme Name" required>
              <Input
                value={form.schemeName}
                onChange={(e) => set("schemeName", e.target.value)}
                placeholder="Enter scheme name"
                className={ctrl}
              />
            </Field>
            <Field className="scheme-w-category" label="Scheme Type" required>
              <Select
                value={form.schemeCategory}
                onValueChange={(v) => onTypeChange(v as SchemeCategory)}
                disabled={lockCategory}
              >
                <SelectTrigger className={ctrl}>
                  <SelectValue>
                    {schemeTypeDisplayLabel(form.schemeCategory)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {schemeTypeOptions.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {SCHEME_TYPE_DISPLAY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field className="scheme-w-date" label="Valid From" required>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                className={ctrl}
              />
            </Field>
            <Field className="scheme-w-date" label="Valid To" required>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                className={ctrl}
              />
            </Field>
          </div>
        </WizardStep>

        {/* 2. Applicable To */}
        <WizardStep
          id="applicable"
          title="Applicable To"
          open={openSteps.has("applicable")}
          completed={isStepComplete("applicable")}
          onToggle={() => toggleStep("applicable")}
        >
          <div className="scheme-row">
            <Field className="scheme-w-customer-type">
              <SchemeMultiSelect
                label="Customer Type *"
                placeholder="Select customer types"
                options={CUSTOMER_TYPE_MULTI_OPTIONS.map((t) => ({
                  id: t,
                  name: t,
                }))}
                selectedIds={form.customerTypes}
                onChange={(ids) =>
                  onChange({
                    ...form,
                    customerTypes: ids,
                    customerType: resolveCustomerTypeFromMulti(ids),
                    customerIds: [],
                  })
                }
                className="w-full"
                dense
              />
            </Field>
            <Field className="scheme-w-state">
              <SchemeMultiSelect
                label="State *"
                placeholder="Select states"
                options={stateOptions}
                selectedIds={form.stateNames}
                onChange={(ids) => set("stateNames", ids)}
                className="w-full"
                dense
              />
            </Field>
            {usesProducts ? (
              <ProductsApplicability
                form={form}
                onChange={onChange}
                productOptions={productOptions}
                showProductError={Boolean(
                  error &&
                    /select at least one product/i.test(error),
                )}
              />
            ) : null}
          </div>
        </WizardStep>

        {/* 3. Scheme Condition */}
        <WizardStep
          id="condition"
          title="Scheme Condition"
          open={openSteps.has("condition")}
          completed={isStepComplete("condition")}
          onToggle={() => toggleStep("condition")}
        >
          {form.schemeCategory === "Product Discount" ? (
            <ProductDiscountConditionFields
              form={form}
              onChange={onChange}
              productOptions={productOptions}
              showRowErrors={Boolean(
                error &&
                  (/discount|product|applied/i.test(error) ||
                    /select at least one product/i.test(error)),
              )}
            />
          ) : null}

          {form.schemeCategory === "Near Expiry Discount" ? (
            <div className="scheme-row">
              <Field className="scheme-w-num" label="Expiry Within Days" required>
                <SchemeNumberField
                  value={form.expiryWithinDays}
                  onChange={(v) => set("expiryWithinDays", v)}
                  placeholder="Days"
                  min={1}
                  step={1}
                  className="scheme-ctrl"
                />
              </Field>
              <DiscountTypeValueFields form={form} onChange={onChange} />
            </div>
          ) : null}

          {form.schemeCategory === "Cash Discount" ? (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">
                Payment Slabs
              </p>
              <div className="scheme-slab-wrap">
                <table className="scheme-slab-table">
                  <thead>
                    <tr>
                      <th className="scheme-w-num-cell">From Day</th>
                      <th className="scheme-w-num-cell">To Day</th>
                      <th className="scheme-w-num-cell">Discount %</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.paymentDaySlabs.map((slab, idx) => (
                      <tr key={slab.id}>
                        <td className="scheme-w-num-cell">
                          <SchemeNumberField
                            value={slab.fromDay}
                            onChange={(v) => {
                              const slabs = [...form.paymentDaySlabs];
                              slabs[idx] = { ...slab, fromDay: v };
                              set("paymentDaySlabs", slabs);
                            }}
                            placeholder="0"
                            min={0}
                            step={1}
                            className="scheme-ctrl"
                          />
                        </td>
                        <td className="scheme-w-num-cell">
                          <SchemeNumberField
                            value={slab.toDay}
                            onChange={(v) => {
                              const slabs = [...form.paymentDaySlabs];
                              slabs[idx] = { ...slab, toDay: v };
                              set("paymentDaySlabs", slabs);
                            }}
                            placeholder="15"
                            min={0}
                            step={1}
                            className="scheme-ctrl"
                          />
                        </td>
                        <td className="scheme-w-num-cell">
                          <SchemeNumberField
                            value={slab.discountPercentage}
                            onChange={(v) => {
                              const slabs = [...form.paymentDaySlabs];
                              slabs[idx] = { ...slab, discountPercentage: v };
                              set("paymentDaySlabs", slabs);
                            }}
                            placeholder="%"
                            min={0}
                            max={100}
                            className="scheme-ctrl"
                          />
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                            disabled={form.paymentDaySlabs.length <= 1}
                            onClick={() =>
                              set(
                                "paymentDaySlabs",
                                form.paymentDaySlabs.filter((s) => s.id !== slab.id),
                              )
                            }
                            aria-label="Delete slab"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="scheme-slab-actions">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2.5 text-[11px]"
                  onClick={() =>
                    set("paymentDaySlabs", [
                      ...form.paymentDaySlabs,
                      emptyPaymentDaySlab(),
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5" /> Add Slab
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug max-w-xl">
                Cash discount is calculated on the payment amount received against the
                invoice, based on the payment date and the configured slab.
              </p>
            </div>
          ) : null}

          {form.schemeCategory === "Turnover Discount" ? (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">
                Turnover Slabs
              </p>
              <div className="scheme-slab-wrap">
                <table className="scheme-slab-table">
                  <thead>
                    <tr>
                      <th className="scheme-w-turnover-cell">Net Taxable Sales From</th>
                      <th className="scheme-w-turnover-cell">Net Taxable Sales To</th>
                      <th className="scheme-w-num-cell">Discount %</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.turnoverSlabs.map((slab, idx) => {
                      const isLast = idx === form.turnoverSlabs.length - 1;
                      return (
                        <tr key={slab.id}>
                          <td className="scheme-w-turnover-cell">
                            <SchemeNumberField
                              value={slab.turnoverFrom}
                              onChange={(v) => {
                                const slabs = [...form.turnoverSlabs];
                                slabs[idx] = { ...slab, turnoverFrom: v };
                                set("turnoverSlabs", slabs);
                              }}
                              placeholder="0"
                              min={0}
                              className="scheme-ctrl"
                            />
                          </td>
                          <td className="scheme-w-turnover-cell">
                            <SchemeNumberField
                              value={slab.turnoverTo}
                              onChange={(v) => {
                                const slabs = [...form.turnoverSlabs];
                                slabs[idx] = { ...slab, turnoverTo: v };
                                set("turnoverSlabs", slabs);
                              }}
                              placeholder={isLast ? "Above" : "Amount"}
                              min={0}
                              className="scheme-ctrl"
                            />
                          </td>
                          <td className="scheme-w-num-cell">
                            <SchemeNumberField
                              value={slab.discountPercentage}
                              onChange={(v) => {
                                const slabs = [...form.turnoverSlabs];
                                slabs[idx] = { ...slab, discountPercentage: v };
                                set("turnoverSlabs", slabs);
                              }}
                              placeholder="%"
                              min={0}
                              max={100}
                              className="scheme-ctrl"
                            />
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                              disabled={form.turnoverSlabs.length <= 1}
                              onClick={() =>
                                set(
                                  "turnoverSlabs",
                                  form.turnoverSlabs.filter((s) => s.id !== slab.id),
                                )
                              }
                              aria-label="Delete slab"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="scheme-slab-actions">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2.5 text-[11px]"
                  onClick={() =>
                    set("turnoverSlabs", [...form.turnoverSlabs, emptyTurnoverSlab()])
                  }
                >
                  <Plus className="h-3.5 w-3.5" /> Add Slab
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug max-w-xl">
                Turnover is calculated automatically for the financial year using Net
                Taxable Sales (Taxable Sales − Sales Returns). GST is excluded from
                turnover calculation.
              </p>
            </div>
          ) : null}

          {form.schemeCategory === "Payment Discount" ? (
            <div className="scheme-row">
              <Field className="scheme-w-select-md" label="Payment Condition" required>
                <Select
                  value={form.paymentCondition}
                  onValueChange={(v) =>
                    set("paymentCondition", v as SchemePaymentCondition)
                  }
                >
                  <SelectTrigger className={ctrl}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_CONDITION_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o} className="text-xs">
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {form.paymentCondition === "Minimum Payment Percentage" ? (
                <Field className="scheme-w-num" label="Required Payment %" required>
                  <SchemeNumberField
                    value={form.requiredPaymentPercentage}
                    onChange={(v) => set("requiredPaymentPercentage", v)}
                    placeholder="%"
                    min={0}
                    max={100}
                    className="scheme-ctrl"
                  />
                </Field>
              ) : null}
              <DiscountTypeValueFields form={form} onChange={onChange} />
              <Field className="scheme-w-select-md" label="Calculation On" required>
                <Select
                  value={form.paymentCalculationOn}
                  onValueChange={(v) =>
                    set("paymentCalculationOn", v as SchemePaymentCalculationOn)
                  }
                >
                  <SelectTrigger className={ctrl}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_CALCULATION_ON_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o} className="text-xs">
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          ) : null}

          {form.schemeCategory === "Special Discount" ? (
            <SpecialDiscountConditionFields form={form} onChange={onChange} />
          ) : null}
        </WizardStep>

        {/* 4. Other Scheme Impact */}
        {showImpact ? (
          <WizardStep
            id="impact"
            title="Other Scheme Impact"
            open={openSteps.has("impact")}
            completed={isStepComplete("impact")}
            onToggle={() => toggleStep("impact")}
          >
            <div className="scheme-impact-list">
              <label className="scheme-impact-row">
                <span className="scheme-flag-title">
                  Exclude from Turnover Discount Calculation
                </span>
                <Switch
                  checked={form.excludeFromTurnoverDiscount}
                  onCheckedChange={(v) => set("excludeFromTurnoverDiscount", v)}
                />
              </label>
              <label className="scheme-impact-row">
                <span className="scheme-flag-title">
                  Exclude from Cash Discount Calculation
                </span>
                <Switch
                  checked={form.excludeFromCashDiscount}
                  onCheckedChange={(v) => set("excludeFromCashDiscount", v)}
                />
              </label>
            </div>
          </WizardStep>
        ) : null}

        {/* 5. Remarks */}
        <WizardStep
          id="remarks"
          title="Description / Remarks"
          open={openSteps.has("remarks")}
          completed={isStepComplete("remarks")}
          onToggle={() => toggleStep("remarks")}
        >
          <div className="scheme-row">
            <Field className="scheme-w-desc">
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="Enter optional remarks..."
                className="scheme-desc text-xs"
              />
            </Field>
          </div>
        </WizardStep>

        {/* 6. Review */}
        <WizardStep
          id="review"
          title="Review — How This Scheme Will Work"
          open={openSteps.has("review")}
          completed={isStepComplete("review")}
          onToggle={() => toggleStep("review")}
        >
          <div className="scheme-review-panel">
            <dl className="scheme-review-grid">
              <div className="scheme-review-item">
                <dt>Scheme Type</dt>
                <dd>{schemeTypeDisplayLabel(form.schemeCategory)}</dd>
              </div>
              <div className="scheme-review-item">
                <dt>Applicable To</dt>
                <dd>
                  {form.customerTypes.length === 0 ||
                  form.customerTypes.length === CUSTOMER_TYPE_MULTI_OPTIONS.length
                    ? "All customer types"
                    : form.customerTypes.join(", ")}
                </dd>
              </div>
              <div className="scheme-review-item">
                <dt>State</dt>
                <dd>{form.stateNames.length ? form.stateNames.join(", ") : "—"}</dd>
              </div>
              {usesProducts ? (
                <div className="scheme-review-item">
                  <dt>Products</dt>
                  <dd>
                    {form.productScope !== "Selected Products"
                      ? "All Products"
                      : (() => {
                          const names = form.productIds
                            .map(
                              (id) =>
                                productOptions.find((p) => p.value === id)
                                  ?.productName ||
                                productOptions.find((p) => p.value === id)
                                  ?.label,
                            )
                            .filter((n): n is string => Boolean(n));
                          if (names.length === 0) return "No products selected";
                          if (names.length === 1) return names[0];
                          if (names.length === 2)
                            return `${names[0]} and ${names[1]}`;
                          return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
                        })()}
                  </dd>
                </div>
              ) : null}
              <div className="scheme-review-item">
                <dt>Benefit</dt>
                <dd>{benefitLabel}</dd>
              </div>
              {form.startDate || form.endDate ? (
                <div className="scheme-review-item">
                  <dt>Validity</dt>
                  <dd>
                    {form.startDate || "—"} → {form.endDate || "—"}
                  </dd>
                </div>
              ) : null}
            </dl>
            {usesProducts ? (
              <p className="scheme-summary-text scheme-review-narrative">
                {formatProductsApplicabilitySummary(form)}
              </p>
            ) : null}
            {form.schemeCategory === "Cash Discount" ? (
              <div className="scheme-summary-text scheme-review-narrative space-y-1">
                <p>
                  Customers who make payments within the configured payment periods will
                  receive the corresponding cash discount on the amount received against
                  the invoice.
                </p>
                {form.paymentDaySlabs.some(
                  (s) =>
                    s.fromDay.trim() ||
                    s.toDay.trim() ||
                    s.discountPercentage.trim(),
                ) ? (
                  <div>
                    <p className="font-semibold text-foreground">Payment Slabs</p>
                    <ul className="mt-0.5 list-none space-y-0.5">
                      {form.paymentDaySlabs
                        .filter(
                          (s) =>
                            s.fromDay.trim() &&
                            s.toDay.trim() &&
                            s.discountPercentage.trim(),
                        )
                        .map((s) => (
                          <li key={s.id}>
                            {s.fromDay}–{s.toDay} Days → {s.discountPercentage}%
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : null}
                <p>
                  <span className="font-semibold text-foreground">Calculation: </span>
                  Calculated automatically on the payment amount received against the
                  invoice.
                </p>
              </div>
            ) : form.schemeCategory === "Turnover Discount" ? (
              <div className="scheme-summary-text scheme-review-narrative space-y-1">
                <p className="font-semibold text-foreground">Turnover Discount</p>
                <p>
                  <span className="font-semibold text-foreground">Financial Year: </span>
                  Current Financial Year
                </p>
                <p>
                  <span className="font-semibold text-foreground">Calculation: </span>
                  Net Taxable Sales (Taxable Sales − Sales Returns)
                </p>
                {form.turnoverSlabs.some(
                  (s) =>
                    s.turnoverFrom.trim() ||
                    s.turnoverTo.trim() ||
                    s.discountPercentage.trim(),
                ) ? (
                  <div>
                    <p className="font-semibold text-foreground">Turnover Slabs</p>
                    <ul className="mt-0.5 list-none space-y-0.5">
                      {form.turnoverSlabs
                        .filter(
                          (s) =>
                            s.turnoverFrom.trim() && s.discountPercentage.trim(),
                        )
                        .map((s) => {
                          const from = Number(s.turnoverFrom.replace(/[₹,\s]/g, ""));
                          const toRaw = s.turnoverTo.trim();
                          const fromLabel = Number.isFinite(from)
                            ? `₹${from.toLocaleString("en-IN")}`
                            : s.turnoverFrom;
                          if (!toRaw) {
                            return (
                              <li key={s.id}>
                                Above {fromLabel} → {s.discountPercentage}%
                              </li>
                            );
                          }
                          const to = Number(toRaw.replace(/[₹,\s]/g, ""));
                          const toLabel = Number.isFinite(to)
                            ? `₹${to.toLocaleString("en-IN")}`
                            : toRaw;
                          return (
                            <li key={s.id}>
                              {fromLabel} – {toLabel} → {s.discountPercentage}%
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : form.schemeCategory === "Special Discount" ? (
              <div className="scheme-summary-text scheme-review-narrative space-y-1">
                <p>
                  <span className="font-semibold text-foreground">Based On: </span>
                  {form.specialDiscountBasedOn}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Scheme Period: </span>
                  {form.startDate || "—"} to {form.endDate || "—"}
                </p>
                {form.specialDiscountBasedOn === "Sales Quantity" ? (
                  <p>
                    <span className="font-semibold text-foreground">Products: </span>
                    {form.productIds.length
                      ? `${form.productIds.length} Selected Product${form.productIds.length === 1 ? "" : "s"}`
                      : "No products selected"}
                    {form.specialDiscountUom
                      ? ` · UOM ${form.specialDiscountUom}`
                      : ""}
                  </p>
                ) : null}
                {form.specialDiscountBasedOn === "Sales Amount" ? (
                  form.specialDiscountAmountSlabs.some(
                    (s) =>
                      s.eligibleSalesFrom.trim() || s.discountValue.trim(),
                  ) ? (
                    <div>
                      <p className="font-semibold text-foreground">Achievement</p>
                      <ul className="mt-0.5 list-none space-y-0.5">
                        {form.specialDiscountAmountSlabs
                          .filter(
                            (s) =>
                              s.eligibleSalesFrom.trim() &&
                              s.discountValue.trim(),
                          )
                          .map((s) => {
                            const from = Number(
                              s.eligibleSalesFrom.replace(/[₹,\s]/g, ""),
                            );
                            const fromLabel = Number.isFinite(from)
                              ? `₹${from.toLocaleString("en-IN")}`
                              : s.eligibleSalesFrom;
                            const disc = formatSlabDiscountLabel(
                              s.discountType,
                              s.discountValue,
                            );
                            if (!s.eligibleSalesTo.trim()) {
                              return (
                                <li key={s.id}>
                                  {fromLabel}+ → {disc}
                                </li>
                              );
                            }
                            const to = Number(
                              s.eligibleSalesTo.replace(/[₹,\s]/g, ""),
                            );
                            const toLabel = Number.isFinite(to)
                              ? `₹${to.toLocaleString("en-IN")}`
                              : s.eligibleSalesTo;
                            return (
                              <li key={s.id}>
                                {fromLabel}–{toLabel} → {disc}
                              </li>
                            );
                          })}
                      </ul>
                    </div>
                  ) : null
                ) : form.specialDiscountQuantitySlabs.some(
                    (s) => s.quantityFrom.trim() || s.discountValue.trim(),
                  ) ? (
                  <div>
                    <p className="font-semibold text-foreground">Achievement</p>
                    <ul className="mt-0.5 list-none space-y-0.5">
                      {form.specialDiscountQuantitySlabs
                        .filter(
                          (s) => s.quantityFrom.trim() && s.discountValue.trim(),
                        )
                        .map((s) => {
                          const uom =
                            form.specialDiscountUom || s.uom || "UOM";
                          const disc = formatSlabDiscountLabel(
                            s.discountType,
                            s.discountValue,
                          );
                          if (!s.quantityTo.trim()) {
                            return (
                              <li key={s.id}>
                                {s.quantityFrom}+ {uom} → {disc}
                              </li>
                            );
                          }
                          return (
                            <li key={s.id}>
                              {s.quantityFrom}–{s.quantityTo} {uom} → {disc}
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                ) : null}
                <p>
                  {form.specialDiscountBasedOn === "Sales Quantity"
                    ? "Net sold quantity (after deducting sales returns) during the scheme period will determine the achieved slab."
                    : "Eligible taxable sales during the scheme period (after deducting sales returns) will determine the achieved slab."}
                </p>
              </div>
            ) : (
              <p className="scheme-summary-text scheme-review-narrative">{summary}</p>
            )}
          </div>
        </WizardStep>
      </div>
    </div>
  );
}
