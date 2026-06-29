"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MasterFormGrid } from "@/components/masters/MasterModule";
import { cn } from "@/lib/utils";
import { SchemeMultiSelect } from "./SchemeMultiSelect";
import {
  SchemeNumberField,
  SchemeRupeeField,
} from "./scheme-form-inputs";
import {
  SCHEME_TYPES,
  SCHEME_PRODUCT_OPTIONS,
  SCHEME_STATE_OPTIONS,
  SCHEME_CUSTOMER_OPTIONS,
  SCHEME_TYPE_PRIORITY,
  SCHEME_EFFECT_TYPE_LABELS,
  getSchemeEffectConfig,
  schemeTypeRequiresProducts,
  schemeTypeUsesProducts,
  type SchemeBulkForm,
  type SchemeType,
  type SelectionMode,
} from "../scheme-data";

interface SchemeFormSheetProps {
  form: SchemeBulkForm;
  onChange: (form: SchemeBulkForm) => void;
  mode: "add" | "edit";
  bulkPreviewCount: number;
  schemeCode?: string;
  codePreview?: string;
  error?: string;
  /** Hide scheme type field when type is selected in parent (Create Scheme page). */
  hideSchemeTypeField?: boolean;
}

const CUSTOMER_TYPES = ["All", "Distributor", "Retailer", "Wholesaler", "Institutional"] as const;
const SELECTION_MODES: SelectionMode[] = ["Single", "Multiple"];

export function SchemeFormSheet({
  form,
  onChange,
  mode,
  bulkPreviewCount,
  schemeCode,
  codePreview,
  error,
  hideSchemeTypeField = false,
}: SchemeFormSheetProps) {
  const set = <K extends keyof SchemeBulkForm>(key: K, value: SchemeBulkForm[K]) => {
    onChange({ ...form, [key]: value });
  };

  const effectConfig = getSchemeEffectConfig(form.schemeType);
  const showProducts = schemeTypeUsesProducts(form.schemeType);
  const requireProducts = schemeTypeRequiresProducts(form.schemeType, form.productScope);
  const isProductDiscount = form.schemeType === "Product Discount Scheme";
  const isFestive = form.schemeType === "Festive Discount Scheme";
  const isNearExpiry = form.schemeType === "Product Near Expiry Scheme";
  const isCash = form.schemeType === "Cash Discount Scheme";
  const isTurnover = form.schemeType === "Turnover Discount Scheme";
  const isPayment = form.schemeType === "Payment Discount Scheme";
  const isFreeQty = form.discountType === "Free Quantity";

  const productMax = form.productSelectionMode === "Single" ? 1 : undefined;
  const stateMax = form.stateSelectionMode === "Single" ? 1 : undefined;

  const handleTypeChange = (type: SchemeType) => {
    onChange({
      ...form,
      schemeType: type,
      priority: String(SCHEME_TYPE_PRIORITY[type]),
      productIds: schemeTypeUsesProducts(type) ? form.productIds : [],
      productScope: type === "Festive Discount Scheme" ? form.productScope : "Specific",
      productSelectionMode: type === "Product Discount Scheme" ? form.productSelectionMode : "Multiple",
    });
  };

  const handleProductSelectionModeChange = (mode: SelectionMode) => {
    const productIds =
      mode === "Single" && form.productIds.length > 1
        ? [form.productIds[0]]
        : form.productIds;
    onChange({ ...form, productSelectionMode: mode, productIds });
  };

  const handleStateSelectionModeChange = (mode: SelectionMode) => {
    const stateIds =
      mode === "Single" && form.stateIds.length > 1 ? [form.stateIds[0]] : form.stateIds;
    onChange({ ...form, stateSelectionMode: mode, stateIds });
  };

  return (
    <div className="space-y-3">
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

      {mode === "add" && bulkPreviewCount > 1 && (
        <div className="rounded-md border border-brand-200 bg-brand-50/50 px-2.5 py-1.5 text-[11px] text-brand-800">
          Will create <strong>{bulkPreviewCount}</strong> scheme records (products × states) with a
          shared batch reference.
        </div>
      )}

      <Accordion
        type="multiple"
        defaultValue={["basic", "effect", "scope", "benefit", "validity"]}
        className="space-y-2"
      >
        <AccordionItem value="basic" className="rounded-md overflow-hidden">
          <AccordionTrigger data-value="basic" className="py-2 px-3 text-xs font-semibold bg-muted/30">
            Scheme Details
          </AccordionTrigger>
          <AccordionContent data-value="basic" className="px-3 pb-3 pt-1">
            <MasterFormGrid>
              {!hideSchemeTypeField && (
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium">
                  Scheme Type <span className="text-red-500">*</span>
                </Label>
                <Select value={form.schemeType} onValueChange={(v) => handleTypeChange(v as SchemeType)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEME_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              )}

              <div className="col-span-2 space-y-1 sm:col-span-1">
                <Label className="text-xs font-medium">Scheme Code</Label>
                <Input
                  value={mode === "edit" ? (schemeCode ?? "") : (codePreview ?? "Auto-generated on save")}
                  readOnly
                  className="h-8 text-xs bg-muted/40 cursor-not-allowed"
                />
              </div>

              <div className="col-span-2 space-y-1 sm:col-span-1">
                <Label className="text-xs font-medium">Priority</Label>
                <SchemeNumberField
                  value={form.priority || String(SCHEME_TYPE_PRIORITY[form.schemeType])}
                  onChange={(v) => set("priority", v)}
                  placeholder={String(SCHEME_TYPE_PRIORITY[form.schemeType])}
                  className="h-8 text-xs"
                />
              </div>

              {!isFestive && (
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs font-medium">Scheme Name (prefix)</Label>
                  <Input
                    value={form.schemeName}
                    onChange={(e) => set("schemeName", e.target.value)}
                    placeholder="Optional — auto-generated from product & state"
                    className="h-8 text-xs"
                  />
                </div>
              )}

              {isFestive && (
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs font-medium">
                    Festival / Campaign Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={form.festivalName}
                    onChange={(e) => set("festivalName", e.target.value)}
                    placeholder="e.g., Diwali Offer 2025"
                    className="h-8 text-xs"
                  />
                </div>
              )}

              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Optional scheme description"
                  className="min-h-[56px] text-xs resize-none"
                />
              </div>

              <div className="col-span-2 space-y-1 sm:col-span-1">
                <Label className="text-xs font-medium">Customer Type</Label>
                <Select
                  value={form.customerType}
                  onValueChange={(v) => set("customerType", v as SchemeBulkForm["customerType"])}
                >
                  <SelectTrigger className="h-8 text-xs">
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

              <div className="col-span-2 space-y-1 sm:col-span-1">
                <Label className="text-xs font-medium">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => set("status", v as SchemeBulkForm["status"])}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inactive" className="text-xs">
                      Inactive
                    </SelectItem>
                    <SelectItem value="active" className="text-xs">
                      Active
                    </SelectItem>
                  </SelectContent>
                </Select>
                {mode === "add" && (
                  <p className="text-[10px] text-muted-foreground">
                    New schemes are submitted for approval immediately.
                  </p>
                )}
              </div>

              {isTurnover && (
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs font-medium">Customers (optional)</Label>
                  <SchemeMultiSelect
                    label=""
                    placeholder="All customers"
                    options={SCHEME_CUSTOMER_OPTIONS}
                    selectedIds={form.customerIds}
                    onChange={(ids) => set("customerIds", ids)}
                  />
                </div>
              )}
            </MasterFormGrid>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="effect" className="rounded-md overflow-hidden">
          <AccordionTrigger data-value="effect" className="py-2 px-3 text-xs font-semibold bg-muted/30">
            Effect Mapping
          </AccordionTrigger>
          <AccordionContent data-value="effect" className="px-3 pb-3 pt-1">
            <MasterFormGrid>
              <div className="col-span-2 space-y-1 sm:col-span-1">
                <Label className="text-xs font-medium">Effect Type</Label>
                <Input
                  value={SCHEME_EFFECT_TYPE_LABELS[effectConfig.effectType]}
                  readOnly
                  className="h-8 text-xs bg-muted/40 cursor-not-allowed"
                />
              </div>
              <div className="col-span-2 space-y-1 sm:col-span-1">
                <Label className="text-xs font-medium">Settlement Method</Label>
                <Input
                  value={effectConfig.settlementMethod}
                  readOnly
                  className="h-8 text-xs bg-muted/40 cursor-not-allowed"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium">Applied In</Label>
                <Input
                  value={effectConfig.appliedIn}
                  readOnly
                  className="h-8 text-xs bg-muted/40 cursor-not-allowed"
                />
              </div>
            </MasterFormGrid>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="scope" className="rounded-md overflow-hidden">
          <AccordionTrigger data-value="scope" className="py-2 px-3 text-xs font-semibold bg-muted/30">
            Product &amp; State Selection
          </AccordionTrigger>
          <AccordionContent data-value="scope" className="px-3 pb-3 pt-1">
            <MasterFormGrid>
              {isProductDiscount && (
                <div className="col-span-2 space-y-1 sm:col-span-1">
                  <Label className="text-xs font-medium">Product Selection Mode</Label>
                  <Select
                    value={form.productSelectionMode}
                    onValueChange={(v) => handleProductSelectionModeChange(v as SelectionMode)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SELECTION_MODES.map((m) => (
                        <SelectItem key={m} value={m} className="text-xs">
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div
                className={cn(
                  "col-span-2 space-y-1",
                  isProductDiscount ? "sm:col-span-1" : "sm:col-span-2",
                )}
              >
                <Label className="text-xs font-medium">State Selection Mode</Label>
                <Select
                  value={form.stateSelectionMode}
                  onValueChange={(v) => handleStateSelectionModeChange(v as SelectionMode)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SELECTION_MODES.map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isFestive && (
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs font-medium">Product Scope</Label>
                  <Select
                    value={form.productScope}
                    onValueChange={(v) =>
                      set("productScope", v as SchemeBulkForm["productScope"])
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All" className="text-xs">
                        All Products
                      </SelectItem>
                      <SelectItem value="Specific" className="text-xs">
                        Specific Products
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showProducts && requireProducts && (
                <div className="col-span-2">
                  <SchemeMultiSelect
                    label={`Products${requireProducts ? " *" : ""}`}
                    placeholder={
                      form.productSelectionMode === "Single"
                        ? "Select one product"
                        : "Select one or more products"
                    }
                    options={SCHEME_PRODUCT_OPTIONS}
                    selectedIds={form.productIds}
                    maxSelection={productMax}
                    onChange={(ids) => mode === "add" && set("productIds", ids)}
                  />
                  {mode === "edit" && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Product locked for this record.
                    </p>
                  )}
                </div>
              )}

              <div className="col-span-2">
                <SchemeMultiSelect
                  label="States *"
                  placeholder={
                    form.stateSelectionMode === "Single"
                      ? "Select one state"
                      : "Select one or more states"
                  }
                  options={SCHEME_STATE_OPTIONS}
                  selectedIds={form.stateIds}
                  maxSelection={stateMax}
                  onChange={(ids) => mode === "add" && set("stateIds", ids)}
                />
                {mode === "edit" && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    State locked for this record.
                  </p>
                )}
              </div>
            </MasterFormGrid>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="benefit" className="rounded-md overflow-hidden">
          <AccordionTrigger data-value="benefit" className="py-2 px-3 text-xs font-semibold bg-muted/30">
            Discount / Benefit
          </AccordionTrigger>
          <AccordionContent data-value="benefit" className="px-3 pb-3 pt-1">
            <MasterFormGrid>
              {isNearExpiry && (
                <>
                  <div className="col-span-2 space-y-1 sm:col-span-1">
                    <Label className="text-xs font-medium">
                      Expiry Within Days <span className="text-red-500">*</span>
                    </Label>
                    <SchemeNumberField
                      value={form.expiryWithinDays}
                      onChange={(v) => set("expiryWithinDays", v)}
                      placeholder="e.g., 60"
                      className="h-8 text-xs"
                      min={1}
                    />
                  </div>
                  <div className="col-span-2 space-y-1 sm:col-span-1">
                    <Label className="text-xs font-medium">
                      Discount % <span className="text-red-500">*</span>
                    </Label>
                    <SchemeNumberField
                      value={form.discountValue}
                      onChange={(v) => set("discountValue", v)}
                      placeholder="e.g., 10"
                      className="h-8 text-xs"
                      max={100}
                      step="any"
                    />
                  </div>
                </>
              )}

              {isTurnover && (
                <>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs font-medium">Turnover Period</Label>
                    <Select
                      value={form.turnoverPeriod}
                      onValueChange={(v) =>
                        set("turnoverPeriod", v as SchemeBulkForm["turnoverPeriod"])
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["Monthly", "Quarterly", "Half-Yearly", "Annual", "Custom"] as const).map(
                          (p) => (
                            <SelectItem key={p} value={p} className="text-xs">
                              {p}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs font-medium">Turnover Slabs</Label>
                    <div className="space-y-1.5">
                      {form.turnoverSlabs.map((slab, i) => (
                        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5 items-end">
                          <SchemeRupeeField
                            value={slab.fromTurnover}
                            onChange={(v) => {
                              const slabs = [...form.turnoverSlabs];
                              slabs[i] = { ...slabs[i], fromTurnover: v };
                              set("turnoverSlabs", slabs);
                            }}
                            placeholder="From ₹"
                            className="h-8 text-xs"
                          />
                          <SchemeRupeeField
                            value={slab.toTurnover}
                            onChange={(v) => {
                              const slabs = [...form.turnoverSlabs];
                              slabs[i] = { ...slabs[i], toTurnover: v };
                              set("turnoverSlabs", slabs);
                            }}
                            placeholder="To ₹ (blank=above)"
                            className="h-8 text-xs"
                          />
                          <SchemeNumberField
                            value={slab.benefitPercent}
                            onChange={(v) => {
                              const slabs = [...form.turnoverSlabs];
                              slabs[i] = { ...slabs[i], benefitPercent: v };
                              set("turnoverSlabs", slabs);
                            }}
                            placeholder="Benefit %"
                            className="h-8 text-xs"
                            max={100}
                            step="any"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500"
                            disabled={form.turnoverSlabs.length <= 1}
                            onClick={() =>
                              set(
                                "turnoverSlabs",
                                form.turnoverSlabs.filter((_, j) => j !== i),
                              )
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px]"
                        onClick={() =>
                          set("turnoverSlabs", [
                            ...form.turnoverSlabs,
                            { fromTurnover: "", toTurnover: "", benefitPercent: "" },
                          ])
                        }
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Slab
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {isPayment && (
                <>
                  <div className="col-span-2 space-y-1 sm:col-span-1">
                    <Label className="text-xs font-medium">Payment Mode</Label>
                    <Select
                      value={form.paymentMode}
                      onValueChange={(v) => set("paymentMode", v as SchemeBulkForm["paymentMode"])}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          ["Cash", "Bank Transfer", "UPI", "Cheque", "Advance", "Early Payment"] as const
                        ).map((m) => (
                          <SelectItem key={m} value={m} className="text-xs">
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1 sm:col-span-1">
                    <Label className="text-xs font-medium">Payment Timing</Label>
                    <Select
                      value={form.paymentTiming}
                      onValueChange={(v) =>
                        set("paymentTiming", v as SchemeBulkForm["paymentTiming"])
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["Immediate", "Within X Days", "Advance Payment"] as const).map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {form.paymentTiming === "Within X Days" && (
                    <div className="col-span-2 space-y-1 sm:col-span-1">
                      <Label className="text-xs font-medium">Within Days</Label>
                      <SchemeNumberField
                        value={form.paymentWithinDays}
                        onChange={(v) => set("paymentWithinDays", v)}
                        className="h-8 text-xs"
                        min={1}
                      />
                    </div>
                  )}
                  <div className="col-span-2 space-y-1 sm:col-span-1">
                    <Label className="text-xs font-medium">
                      Min Payment Amount <span className="text-red-500">*</span>
                    </Label>
                    <SchemeRupeeField
                      value={form.minimumPaymentAmount}
                      onChange={(v) => set("minimumPaymentAmount", v)}
                      className="h-8 text-xs"
                    />
                  </div>
                </>
              )}

              {!isNearExpiry && !isTurnover && (
                <>
                  <div className="col-span-2 space-y-1 sm:col-span-1">
                    <Label className="text-xs font-medium">Discount Type</Label>
                    <Select
                      value={form.discountType}
                      onValueChange={(v) =>
                        set("discountType", v as SchemeBulkForm["discountType"])
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {isFestive ? (
                          <>
                            <SelectItem value="Percentage" className="text-xs">
                              Percentage
                            </SelectItem>
                            <SelectItem value="Fixed Amount" className="text-xs">
                              Fixed Amount
                            </SelectItem>
                            <SelectItem value="Free Quantity" className="text-xs">
                              Free Quantity
                            </SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="Percentage" className="text-xs">
                              Percentage
                            </SelectItem>
                            <SelectItem value="Fixed Amount" className="text-xs">
                              Fixed Amount
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {!isFreeQty ? (
                    <div className="col-span-2 space-y-1 sm:col-span-1">
                      <Label className="text-xs font-medium">
                        Discount Value <span className="text-red-500">*</span>
                      </Label>
                      {form.discountType === "Fixed Amount" ? (
                        <SchemeRupeeField
                          value={form.discountValue}
                          onChange={(v) => set("discountValue", v)}
                          className="h-8 text-xs"
                        />
                      ) : (
                        <SchemeNumberField
                          value={form.discountValue}
                          onChange={(v) => set("discountValue", v)}
                          className="h-8 text-xs"
                          max={form.discountType === "Percentage" ? 100 : undefined}
                          step="any"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="col-span-2 space-y-1 sm:col-span-1">
                      <Label className="text-xs font-medium">
                        Free Quantity <span className="text-red-500">*</span>
                      </Label>
                      <SchemeNumberField
                        value={form.freeQuantity}
                        onChange={(v) => set("freeQuantity", v)}
                        className="h-8 text-xs"
                        min={1}
                      />
                    </div>
                  )}
                </>
              )}

              {(isCash || isFestive) && (
                <div className="col-span-2 space-y-1 sm:col-span-1">
                  <Label className="text-xs font-medium">Min Order Value (optional)</Label>
                  <SchemeRupeeField
                    value={form.minimumOrderValue}
                    onChange={(v) => set("minimumOrderValue", v)}
                    className="h-8 text-xs"
                  />
                </div>
              )}

              {isPayment && (
                <p className="col-span-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  Payment-level benefit only — not applied as direct product/order discount.
                </p>
              )}
            </MasterFormGrid>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="validity" className="rounded-md overflow-hidden">
          <AccordionTrigger data-value="validity" className="py-2 px-3 text-xs font-semibold bg-muted/30">
            Validity
          </AccordionTrigger>
          <AccordionContent data-value="validity" className="px-3 pb-3 pt-1">
            <MasterFormGrid>
              <div className="col-span-2 space-y-1 sm:col-span-1">
                <Label className="text-xs font-medium">Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="col-span-2 space-y-1 sm:col-span-1">
                <Label className="text-xs font-medium">End Date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => set("endDate", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </MasterFormGrid>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function countBulkPreview(form: SchemeBulkForm): number {
  const stateCount =
    form.stateSelectionMode === "Single"
      ? Math.min(form.stateIds.length, 1)
      : form.stateIds.length;
  if (!stateCount) return 0;

  if (form.schemeType === "Festive Discount Scheme" && form.productScope === "All") {
    return stateCount;
  }
  if (
    form.schemeType === "Cash Discount Scheme" ||
    form.schemeType === "Turnover Discount Scheme" ||
    form.schemeType === "Payment Discount Scheme"
  ) {
    return stateCount;
  }

  const productCount =
    form.productSelectionMode === "Single"
      ? Math.min(form.productIds.length, 1)
      : form.productIds.length;
  if (!productCount) return 0;
  return productCount * stateCount;
}

export { countBulkPreview };
