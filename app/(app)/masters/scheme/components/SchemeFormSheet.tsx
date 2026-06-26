"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { SchemeMultiSelect } from "./SchemeMultiSelect";
import {
  SCHEME_TYPES,
  SCHEME_PRODUCT_OPTIONS,
  SCHEME_STATE_OPTIONS,
  SCHEME_CUSTOMER_OPTIONS,
  SCHEME_TYPE_PRIORITY,
  schemeTypeRequiresProducts,
  schemeTypeUsesProducts,
  type SchemeBulkForm,
  type SchemeType,
} from "../scheme-data";

interface SchemeFormSheetProps {
  form: SchemeBulkForm;
  onChange: (form: SchemeBulkForm) => void;
  mode: "add" | "edit";
  bulkPreviewCount: number;
  error?: string;
}

const CUSTOMER_TYPES = ["All", "Distributor", "Retailer", "Wholesaler", "Institutional"] as const;

export function SchemeFormSheet({ form, onChange, mode, bulkPreviewCount, error }: SchemeFormSheetProps) {
  const set = <K extends keyof SchemeBulkForm>(key: K, value: SchemeBulkForm[K]) => {
    onChange({ ...form, [key]: value });
  };

  const showProducts = schemeTypeUsesProducts(form.schemeType);
  const requireProducts = schemeTypeRequiresProducts(form.schemeType, form.productScope);
  const isFestive = form.schemeType === "Festive Discount Scheme";
  const isNearExpiry = form.schemeType === "Product Near Expiry Scheme";
  const isCash = form.schemeType === "Cash Discount Scheme";
  const isTurnover = form.schemeType === "Turnover Discount Scheme";
  const isPayment = form.schemeType === "Payment Discount Scheme";
  const isFreeQty = form.discountType === "Free Quantity";

  const handleTypeChange = (type: SchemeType) => {
    onChange({
      ...form,
      schemeType: type,
      priority: String(SCHEME_TYPE_PRIORITY[type]),
      productIds: schemeTypeUsesProducts(type) ? form.productIds : [],
      productScope: type === "Festive Discount Scheme" ? form.productScope : "Specific",
    });
  };

  return (
    <div className="space-y-3">
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

      {mode === "add" && bulkPreviewCount > 1 && (
        <div className="rounded-md border border-brand-200 bg-brand-50/50 px-2.5 py-1.5 text-[11px] text-brand-800">
          Will create <strong>{bulkPreviewCount}</strong> scheme records (products × states).
        </div>
      )}

      <Accordion type="multiple" defaultValue={["basic", "scope", "benefit", "validity"]} className="space-y-2">
        <AccordionItem value="basic" className="rounded-md overflow-hidden">
          <AccordionTrigger data-value="basic" className="py-2 px-3 text-xs font-semibold bg-muted/30">
            Scheme Type &amp; Name
          </AccordionTrigger>
          <AccordionContent data-value="basic" className="px-3 pb-3 pt-1">
            <MasterFormGrid>
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

        <AccordionItem value="scope" className="rounded-md overflow-hidden">
          <AccordionTrigger data-value="scope" className="py-2 px-3 text-xs font-semibold bg-muted/30">
            Product &amp; State Selection
          </AccordionTrigger>
          <AccordionContent data-value="scope" className="px-3 pb-3 pt-1">
            <MasterFormGrid>
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
                    placeholder="Select one or more products"
                    options={SCHEME_PRODUCT_OPTIONS}
                    selectedIds={form.productIds}
                    onChange={(ids) => mode === "add" && set("productIds", ids)}
                  />
                  {mode === "edit" && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Product locked for this draft record.
                    </p>
                  )}
                </div>
              )}
              <div className="col-span-2">
                <SchemeMultiSelect
                  label="States *"
                  placeholder="Select one or more states"
                  options={SCHEME_STATE_OPTIONS}
                  selectedIds={form.stateIds}
                  onChange={(ids) => mode === "add" && set("stateIds", ids)}
                />
                {mode === "edit" && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    State locked for this draft record.
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
                    <Input
                      type="number"
                      value={form.expiryWithinDays}
                      onChange={(e) => set("expiryWithinDays", e.target.value)}
                      placeholder="e.g., 60"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="col-span-2 space-y-1 sm:col-span-1">
                    <Label className="text-xs font-medium">
                      Discount % <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={form.discountValue}
                      onChange={(e) => set("discountValue", e.target.value)}
                      placeholder="e.g., 10"
                      className="h-8 text-xs"
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
                          <Input
                            type="number"
                            value={slab.fromTurnover}
                            onChange={(e) => {
                              const slabs = [...form.turnoverSlabs];
                              slabs[i] = { ...slabs[i], fromTurnover: e.target.value };
                              set("turnoverSlabs", slabs);
                            }}
                            placeholder="From ₹"
                            className="h-8 text-xs"
                          />
                          <Input
                            type="number"
                            value={slab.toTurnover}
                            onChange={(e) => {
                              const slabs = [...form.turnoverSlabs];
                              slabs[i] = { ...slabs[i], toTurnover: e.target.value };
                              set("turnoverSlabs", slabs);
                            }}
                            placeholder="To ₹ (blank=above)"
                            className="h-8 text-xs"
                          />
                          <Input
                            type="number"
                            value={slab.benefitPercent}
                            onChange={(e) => {
                              const slabs = [...form.turnoverSlabs];
                              slabs[i] = { ...slabs[i], benefitPercent: e.target.value };
                              set("turnoverSlabs", slabs);
                            }}
                            placeholder="Benefit %"
                            className="h-8 text-xs"
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
                      <Input
                        type="number"
                        value={form.paymentWithinDays}
                        onChange={(e) => set("paymentWithinDays", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                  <div className="col-span-2 space-y-1 sm:col-span-1">
                    <Label className="text-xs font-medium">
                      Min Payment Amount <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={form.minimumPaymentAmount}
                      onChange={(e) => set("minimumPaymentAmount", e.target.value)}
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
                      <Input
                        type="number"
                        value={form.discountValue}
                        onChange={(e) => set("discountValue", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  ) : (
                    <div className="col-span-2 space-y-1 sm:col-span-1">
                      <Label className="text-xs font-medium">
                        Free Quantity <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        value={form.freeQuantity}
                        onChange={(e) => set("freeQuantity", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                </>
              )}

              {(isCash || isFestive) && (
                <div className="col-span-2 space-y-1 sm:col-span-1">
                  <Label className="text-xs font-medium">Min Order Value (optional)</Label>
                  <Input
                    type="number"
                    value={form.minimumOrderValue}
                    onChange={(e) => set("minimumOrderValue", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              )}

              {isPayment && (
                <p className="col-span-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  Payment-level benefit only — not applied as direct product/order discount.
                </p>
              )}

              <div className="col-span-2 space-y-1 sm:col-span-1">
                <Label className="text-xs font-medium">Priority</Label>
                <Input
                  type="number"
                  value={form.priority || String(SCHEME_TYPE_PRIORITY[form.schemeType])}
                  onChange={(e) => set("priority", e.target.value)}
                  placeholder={String(SCHEME_TYPE_PRIORITY[form.schemeType])}
                  className="h-8 text-xs"
                />
              </div>
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
  const states = form.stateIds.length;
  if (!states) return 0;
  if (form.schemeType === "Festive Discount Scheme" && form.productScope === "All") return states;
  if (
    form.schemeType === "Cash Discount Scheme" ||
    form.schemeType === "Turnover Discount Scheme" ||
    form.schemeType === "Payment Discount Scheme"
  ) {
    return states;
  }
  const products = form.productIds.length;
  if (!products) return 0;
  return products * states;
}

export { countBulkPreview };
