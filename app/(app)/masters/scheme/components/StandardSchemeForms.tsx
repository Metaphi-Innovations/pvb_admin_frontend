"use client";

import React, { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { SCHEME_CUSTOMER_OPTIONS, SCHEME_EFFECT_MAP } from "../scheme-data";
import {
  formatSchemeRupee,
  loadSchemeProductSelectOptions,
} from "../product-discount-scheme";
import {
  computePaymentSettlement,
  formatOutstandingAgeLabel,
  loadSchemeStateOptions,
  type CashSchemeForm,
  type FestiveSchemeForm,
  type PaymentSchemeForm,
  type TurnoverSchemeForm,
  type TurnoverSlabForm,
} from "../standard-schemes";

const CUSTOMER_TYPES = ["All", "Distributor", "Retailer", "Wholesaler", "Institutional"] as const;

interface BaseFormProps<T> {
  form: T;
  onChange: (form: T) => void;
  mode: "add" | "edit";
  schemeCode?: string;
  codePreview?: string;
  error?: string;
}

function PreviewPanel({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  if (!rows.length) return null;
  return (
    <div className="rounded-md border border-brand-200 bg-brand-50/40 px-3 py-2.5">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-brand-800">{title}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <p className="text-[10px] text-muted-foreground">{row.label}</p>
            <p className="truncate text-xs font-medium text-foreground">{row.value || "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const fieldCellClass = "min-w-0 space-y-1";

function CommonSchemeFields({
  schemeName,
  customerType,
  stateNames,
  startDate,
  endDate,
  schemeCode,
  codePreview,
  mode,
  onSchemeName,
  onCustomerType,
  onStateNames,
  onStartDate,
  onEndDate,
}: {
  schemeName: string;
  customerType: string;
  stateNames: string[];
  startDate: string;
  endDate: string;
  schemeCode?: string;
  codePreview?: string;
  mode: "add" | "edit";
  onSchemeName: (v: string) => void;
  onCustomerType: (v: string) => void;
  onStateNames: (ids: string[]) => void;
  onStartDate: (v: string) => void;
  onEndDate: (v: string) => void;
}) {
  const stateOptions = useMemo(() => loadSchemeStateOptions(), []);

  return (
    <div className="rounded-md border border-border bg-white px-3 py-2.5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <div className={cn(fieldCellClass, "col-span-2 sm:col-span-1 lg:col-span-1")}>
          <Label className="text-[11px] font-medium text-muted-foreground">
            Scheme Name <span className="text-red-500">*</span>
          </Label>
          <Input
            value={schemeName}
            onChange={(e) => onSchemeName(e.target.value)}
            placeholder="Enter scheme name"
            className={cn(compactFieldClass, "w-full")}
          />
        </div>
        <div className={cn(fieldCellClass, "col-span-1 lg:col-span-1")}>
          <Label className="text-[11px] font-medium text-muted-foreground">Scheme Code</Label>
          <Input
            value={mode === "edit" ? (schemeCode ?? "") : (codePreview ?? "Auto")}
            readOnly
            className={cn(compactFieldClass, "w-full bg-muted/40 cursor-not-allowed")}
          />
        </div>
        <div className={cn(fieldCellClass, "col-span-1 lg:col-span-1")}>
          <SchemeMultiSelect
            label="States *"
            placeholder="Select states"
            options={stateOptions}
            selectedIds={stateNames}
            onChange={onStateNames}
            className="w-full"
          />
        </div>
        <div className={cn(fieldCellClass, "col-span-1 lg:col-span-1")}>
          <Label className="text-[11px] font-medium text-muted-foreground">
            Customer Type <span className="text-red-500">*</span>
          </Label>
          <Select value={customerType} onValueChange={onCustomerType}>
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
        <div className={cn(fieldCellClass, "col-span-1 lg:col-span-1")}>
          <Label className="text-[11px] font-medium text-muted-foreground">
            Start Date <span className="text-red-500">*</span>
          </Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onStartDate(e.target.value)}
            className={cn(compactFieldClass, "w-full")}
          />
        </div>
        <div className={cn(fieldCellClass, "col-span-1 lg:col-span-1")}>
          <Label className="text-[11px] font-medium text-muted-foreground">
            End Date <span className="text-red-500">*</span>
          </Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndDate(e.target.value)}
            className={cn(compactFieldClass, "w-full")}
          />
        </div>
      </div>
    </div>
  );
}

function BenefitFields({
  benefitType,
  benefitValue,
  onType,
  onValue,
}: {
  benefitType: "Percentage" | "Rupees";
  benefitValue: string;
  onType: (v: "Percentage" | "Rupees") => void;
  onValue: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <Label className="text-[11px] font-medium text-muted-foreground">Benefit Type *</Label>
        <Select value={benefitType} onValueChange={(v) => onType(v as "Percentage" | "Rupees")}>
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
        <Label className="text-[11px] font-medium text-muted-foreground">Benefit Value *</Label>
        {benefitType === "Rupees" ? (
          <SchemeRupeeField value={benefitValue} onChange={onValue} placeholder="₹ 500" />
        ) : (
          <SchemeNumberField
            value={benefitValue}
            onChange={onValue}
            placeholder="e.g. 5"
            max={100}
            step="any"
          />
        )}
      </div>
    </div>
  );
}

export function FestiveDiscountSchemeForm({
  form,
  onChange,
  mode,
  schemeCode,
  codePreview,
  error,
}: BaseFormProps<FestiveSchemeForm>) {
  const productOptions = useMemo(() => loadSchemeProductSelectOptions(), []);
  const set = <K extends keyof FestiveSchemeForm>(key: K, value: FestiveSchemeForm[K]) =>
    onChange({ ...form, [key]: value });

  const previewRows = [
    { label: "Campaign", value: form.festivalName },
    {
      label: "Products",
      value:
        form.productScope === "All"
          ? "All products"
          : form.selectedProductIds.length
            ? `${form.selectedProductIds.length} selected`
            : "None",
    },
    { label: "States", value: form.stateNames.join(", ") },
    {
      label: "Min Order",
      value: form.minimumOrderValue ? formatSchemeRupee(Number(form.minimumOrderValue)) : "—",
    },
    {
      label: "Benefit",
      value: form.discountValue
        ? form.discountType === "Rupees"
          ? formatSchemeRupee(Number(form.discountValue))
          : `${form.discountValue}%`
        : "—",
    },
    { label: "Validity", value: form.startDate && form.endDate ? `${form.startDate} → ${form.endDate}` : "—" },
  ];

  return (
    <div className="space-y-3">
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      <CommonSchemeFields
        schemeName={form.schemeName}
        customerType={form.customerType}
        stateNames={form.stateNames}
        startDate={form.startDate}
        endDate={form.endDate}
        schemeCode={schemeCode}
        codePreview={codePreview}
        mode={mode}
        onSchemeName={(v) => set("schemeName", v)}
        onCustomerType={(v) => set("customerType", v as FestiveSchemeForm["customerType"])}
        onStateNames={(ids) => set("stateNames", ids)}
        onStartDate={(v) => set("startDate", v)}
        onEndDate={(v) => set("endDate", v)}
      />
      <div className="rounded-md border border-border bg-white px-3 py-2.5 space-y-2.5">
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">
            Campaign / Festival Name <span className="text-red-500">*</span>
          </Label>
          <Input
            value={form.festivalName}
            onChange={(e) => set("festivalName", e.target.value)}
            placeholder="e.g. Diwali, Kharif, Summer Offer"
            className={compactFieldClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground">Product Scope</Label>
            <Select
              value={form.productScope}
              onValueChange={(v) => set("productScope", v as FestiveSchemeForm["productScope"])}
            >
              <SelectTrigger className={compactFieldClass}>
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
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground">Min Order Value (optional)</Label>
            <SchemeRupeeField
              value={form.minimumOrderValue}
              onChange={(v) => set("minimumOrderValue", v)}
              placeholder="₹ 50,000"
            />
          </div>
        </div>
        {form.productScope === "Specific" && (
          <SchemeProductMultiSelect
            label="Products (optional)"
            options={productOptions}
            value={form.selectedProductIds}
            onChange={(ids) => set("selectedProductIds", ids)}
            placeholder="Search products..."
          />
        )}
        <BenefitFields
          benefitType={form.discountType}
          benefitValue={form.discountValue}
          onType={(v) => set("discountType", v)}
          onValue={(v) => set("discountValue", v)}
        />
      </div>
      <PreviewPanel title="Preview" rows={previewRows} />
    </div>
  );
}

export function CashDiscountSchemeForm({
  form,
  onChange,
  mode,
  schemeCode,
  codePreview,
  error,
}: BaseFormProps<CashSchemeForm>) {
  const set = <K extends keyof CashSchemeForm>(key: K, value: CashSchemeForm[K]) =>
    onChange({ ...form, [key]: value });

  const previewRows = [
    {
      label: "Min Order",
      value: form.minimumOrderValue ? formatSchemeRupee(Number(form.minimumOrderValue)) : "—",
    },
    {
      label: "Benefit",
      value: form.benefitValue
        ? form.benefitType === "Rupees"
          ? formatSchemeRupee(Number(form.benefitValue))
          : `${form.benefitValue}%`
        : "—",
    },
    { label: "Validity", value: form.startDate && form.endDate ? `${form.startDate} → ${form.endDate}` : "—" },
  ];

  return (
    <div className="space-y-3">
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      <CommonSchemeFields
        schemeName={form.schemeName}
        customerType={form.customerType}
        stateNames={form.stateNames}
        startDate={form.startDate}
        endDate={form.endDate}
        schemeCode={schemeCode}
        codePreview={codePreview}
        mode={mode}
        onSchemeName={(v) => set("schemeName", v)}
        onCustomerType={(v) => set("customerType", v as CashSchemeForm["customerType"])}
        onStateNames={(ids) => set("stateNames", ids)}
        onStartDate={(v) => set("startDate", v)}
        onEndDate={(v) => set("endDate", v)}
      />
      <div className="rounded-md border border-border bg-white px-3 py-2.5 space-y-2.5">
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">
            Minimum Order Value <span className="text-red-500">*</span>
          </Label>
          <SchemeRupeeField
            value={form.minimumOrderValue}
            onChange={(v) => set("minimumOrderValue", v)}
            placeholder="₹ 50,000"
          />
        </div>
        <BenefitFields
          benefitType={form.benefitType}
          benefitValue={form.benefitValue}
          onType={(v) => set("benefitType", v)}
          onValue={(v) => set("benefitValue", v)}
        />
      </div>
      <PreviewPanel title="Preview" rows={previewRows} />
    </div>
  );
}

function TurnoverSlabTable({
  slabs,
  onChange,
}: {
  slabs: TurnoverSlabForm[];
  onChange: (slabs: TurnoverSlabForm[]) => void;
}) {
  const updateSlab = (index: number, patch: Partial<TurnoverSlabForm>) => {
    onChange(slabs.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const addRow = () => {
    onChange([...slabs, { fromTurnover: "", toTurnover: "", benefitPercent: "" }]);
  };

  const removeRow = (index: number) => {
    if (slabs.length <= 1) return;
    onChange(slabs.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-medium text-muted-foreground">Turnover Slabs *</Label>
        <Button type="button" variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={addRow}>
          <Plus className="h-3 w-3" /> Add Row
        </Button>
      </div>
      <div className="rounded-md border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-1.5 text-left font-semibold">From Turnover (₹)</th>
              <th className="px-2 py-1.5 text-left font-semibold">To Turnover (₹)</th>
              <th className="px-2 py-1.5 text-left font-semibold">Benefit %</th>
              <th className="w-10 px-2 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {slabs.map((slab, index) => (
              <tr key={index} className="border-b border-border/60">
                <td className="px-2 py-1.5">
                  <SchemeRupeeField
                    value={slab.fromTurnover}
                    onChange={(v) => updateSlab(index, { fromTurnover: v })}
                    className="h-7 text-xs"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <SchemeRupeeField
                    value={slab.toTurnover}
                    onChange={(v) => updateSlab(index, { toTurnover: v })}
                    className="h-7 text-xs"
                    placeholder={index === slabs.length - 1 ? "Open-ended" : "₹ 0"}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <SchemeNumberField
                    value={slab.benefitPercent}
                    onChange={(v) => updateSlab(index, { benefitPercent: v })}
                    className="h-7 text-xs"
                    max={100}
                    step="any"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    disabled={slabs.length <= 1}
                    className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Last slab may leave To blank for &quot;above&quot; range. Slabs must not overlap.
      </p>
    </div>
  );
}

export function TurnoverDiscountSchemeForm({
  form,
  onChange,
  mode,
  schemeCode,
  codePreview,
  error,
}: BaseFormProps<TurnoverSchemeForm>) {
  const customerOptions = useMemo(
    () => SCHEME_CUSTOMER_OPTIONS.map((c) => ({ id: c.id, name: c.name })),
    [],
  );
  const set = <K extends keyof TurnoverSchemeForm>(key: K, value: TurnoverSchemeForm[K]) =>
    onChange({ ...form, [key]: value });

  const previewSlabs =
    form.turnoverSlabs
      .filter((s) => s.fromTurnover.trim())
      .map((s, i, arr) => {
        const to = s.toTurnover.trim() || (i === arr.length - 1 ? "Above" : "—");
        return `${formatSchemeRupee(Number(s.fromTurnover))} – ${typeof to === "string" && to === "Above" ? "Above" : formatSchemeRupee(Number(to))} = ${s.benefitPercent}%`;
      })
      .join(" · ") || "—";

  const previewRows = [
    { label: "Period", value: form.turnoverPeriod },
    { label: "Customer", value: form.customerIds.length ? `${form.customerIds.length} selected` : "All matching type" },
    { label: "States", value: form.stateNames.join(", ") },
    { label: "Slabs", value: previewSlabs },
    { label: "Validity", value: form.startDate && form.endDate ? `${form.startDate} → ${form.endDate}` : "—" },
  ];

  return (
    <div className="space-y-3">
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      <CommonSchemeFields
        schemeName={form.schemeName}
        customerType={form.customerType}
        stateNames={form.stateNames}
        startDate={form.startDate}
        endDate={form.endDate}
        schemeCode={schemeCode}
        codePreview={codePreview}
        mode={mode}
        onSchemeName={(v) => set("schemeName", v)}
        onCustomerType={(v) => set("customerType", v as TurnoverSchemeForm["customerType"])}
        onStateNames={(ids) => set("stateNames", ids)}
        onStartDate={(v) => set("startDate", v)}
        onEndDate={(v) => set("endDate", v)}
      />
      <div className="rounded-md border border-border bg-white px-3 py-2.5 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground">
              Turnover Period <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.turnoverPeriod}
              onValueChange={(v) => set("turnoverPeriod", v as TurnoverSchemeForm["turnoverPeriod"])}
            >
              <SelectTrigger className={compactFieldClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["Monthly", "Quarterly", "Half-Yearly", "Annual", "Custom"] as const).map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <SchemeMultiSelect
              label="Specific Customer (optional)"
              placeholder="All customers of selected type"
              options={customerOptions}
              selectedIds={form.customerIds}
              onChange={(ids) => set("customerIds", ids)}
            />
          </div>
        </div>
        {form.turnoverPeriod === "Custom" && (
          <p className="text-[10px] text-muted-foreground">
            Custom period uses Start Date and End Date above.
          </p>
        )}
        <TurnoverSlabTable
          slabs={form.turnoverSlabs}
          onChange={(turnoverSlabs) => set("turnoverSlabs", turnoverSlabs)}
        />
      </div>
      <PreviewPanel title="Preview" rows={previewRows} />
    </div>
  );
}

export function PaymentDiscountSchemeForm({
  form,
  onChange,
  mode,
  schemeCode,
  codePreview,
  error,
}: BaseFormProps<PaymentSchemeForm>) {
  const set = <K extends keyof PaymentSchemeForm>(key: K, value: PaymentSchemeForm[K]) =>
    onChange({ ...form, [key]: value });

  const customerOptions = useMemo(
    () => SCHEME_CUSTOMER_OPTIONS.map((c) => ({ id: c.id, name: c.name })),
    [],
  );

  const settlement = useMemo(() => computePaymentSettlement(form), [form]);

  const previewCustomer =
    form.customerIds.length > 0
      ? form.customerIds
          .map((id) => SCHEME_CUSTOMER_OPTIONS.find((c) => c.id === id)?.name ?? id)
          .join(", ")
      : `All ${form.customerType} customers`;

  const settlementMethod =
    SCHEME_EFFECT_MAP["Payment Discount Scheme"].settlementMethod;

  const waiverPercentDisplay =
    settlement.waiverPercent > 0 ? `${settlement.waiverPercent.toFixed(1)}%` : "—";

  return (
    <div className="space-y-3">
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      <CommonSchemeFields
        schemeName={form.schemeName}
        customerType={form.customerType}
        stateNames={form.stateNames}
        startDate={form.startDate}
        endDate={form.endDate}
        schemeCode={schemeCode}
        codePreview={codePreview}
        mode={mode}
        onSchemeName={(v) => set("schemeName", v)}
        onCustomerType={(v) => set("customerType", v as PaymentSchemeForm["customerType"])}
        onStateNames={(ids) => set("stateNames", ids)}
        onStartDate={(v) => set("startDate", v)}
        onEndDate={(v) => set("endDate", v)}
      />

      <div className="rounded-md border border-border bg-white px-3 py-2.5 space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Customer / Outstanding Applicability
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1 space-y-1">
            <SchemeMultiSelect
              label="Specific Customer (optional)"
              placeholder="All customers of selected type"
              options={customerOptions}
              selectedIds={form.customerIds}
              onChange={(ids) => set("customerIds", ids)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground">
              Minimum Outstanding Amount <span className="text-red-500">*</span>
            </Label>
            <SchemeRupeeField
              value={form.minimumOutstandingAmount}
              onChange={(v) => set("minimumOutstandingAmount", v)}
              placeholder="₹ 1,00,000"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground">
              Outstanding Age Condition <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.outstandingAgeCondition}
              onValueChange={(v) =>
                set("outstandingAgeCondition", v as PaymentSchemeForm["outstandingAgeCondition"])
              }
            >
              <SelectTrigger className={compactFieldClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  [
                    "Any",
                    "More than 30 Days",
                    "More than 60 Days",
                    "More than 90 Days",
                    "Custom Days",
                  ] as const
                ).map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.outstandingAgeCondition === "Custom Days" && (
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">
                Outstanding Days <span className="text-red-500">*</span>
              </Label>
              <SchemeNumberField
                value={form.outstandingDays}
                onChange={(v) => set("outstandingDays", v)}
                min={1}
              />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-md border border-border bg-white px-3 py-2.5 space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Settlement Offer Configuration
        </p>
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">
            Offer Basis <span className="text-red-500">*</span>
          </Label>
          <Select
            value={form.offerBasis}
            onValueChange={(v) => set("offerBasis", v as PaymentSchemeForm["offerBasis"])}
          >
            <SelectTrigger className={compactFieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(
                [
                  "Fixed Settlement Amount",
                  "Discount / Waiver Amount",
                  "Discount / Waiver %",
                ] as const
              ).map((b) => (
                <SelectItem key={b} value={b} className="text-xs">
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground">
              Original Outstanding Amount <span className="text-red-500">*</span>
            </Label>
            <SchemeRupeeField
              value={form.originalOutstandingAmount}
              onChange={(v) => set("originalOutstandingAmount", v)}
              placeholder="₹ 5,00,000"
            />
          </div>

          {form.offerBasis === "Fixed Settlement Amount" && (
            <>
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  Customer Payable Amount <span className="text-red-500">*</span>
                </Label>
                <SchemeRupeeField
                  value={form.customerPayableAmount}
                  onChange={(v) => set("customerPayableAmount", v)}
                  placeholder="₹ 3,50,000"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  Discount / Waiver Amount
                </Label>
                <Input
                  readOnly
                  value={
                    settlement.waiverAmount > 0
                      ? formatSchemeRupee(settlement.waiverAmount)
                      : "—"
                  }
                  className={cn(compactFieldClass, "bg-muted/40 cursor-not-allowed")}
                />
              </div>
            </>
          )}

          {form.offerBasis === "Discount / Waiver Amount" && (
            <>
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  Waiver Amount <span className="text-red-500">*</span>
                </Label>
                <SchemeRupeeField
                  value={form.waiverAmount}
                  onChange={(v) => set("waiverAmount", v)}
                  placeholder="₹ 1,50,000"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  Customer Payable Amount
                </Label>
                <Input
                  readOnly
                  value={
                    settlement.customerPayableAmount > 0
                      ? formatSchemeRupee(settlement.customerPayableAmount)
                      : "—"
                  }
                  className={cn(compactFieldClass, "bg-muted/40 cursor-not-allowed")}
                />
              </div>
            </>
          )}

          {form.offerBasis === "Discount / Waiver %" && (
            <>
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  Waiver % <span className="text-red-500">*</span>
                </Label>
                <SchemeNumberField
                  value={form.waiverPercent}
                  onChange={(v) => set("waiverPercent", v)}
                  min={0}
                  max={100}
                  step={0.1}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  Waiver Amount
                </Label>
                <Input
                  readOnly
                  value={
                    settlement.waiverAmount > 0
                      ? formatSchemeRupee(settlement.waiverAmount)
                      : "—"
                  }
                  className={cn(compactFieldClass, "bg-muted/40 cursor-not-allowed")}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  Customer Payable Amount
                </Label>
                <Input
                  readOnly
                  value={
                    settlement.customerPayableAmount > 0
                      ? formatSchemeRupee(settlement.customerPayableAmount)
                      : "—"
                  }
                  className={cn(compactFieldClass, "bg-muted/40 cursor-not-allowed")}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-md border border-navy-200 bg-navy-50/40 px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-navy-700">
          Settlement Method
        </p>
        <p className="mt-1 text-xs font-medium text-foreground">{settlementMethod}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Settlement will be posted via Credit Note or Journal Voucher at payment collection.
        </p>
      </div>

      <div className="overflow-hidden rounded-md border border-brand-200 bg-brand-50/40">
        <div className="border-b border-brand-200 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-800">Preview</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-brand-200/60 bg-brand-50/60 text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-left font-semibold">Customer</th>
                <th className="px-3 py-2 text-right font-semibold">Original Outstanding</th>
                <th className="px-3 py-2 text-right font-semibold">Customer Payable</th>
                <th className="px-3 py-2 text-right font-semibold">Waiver Amount</th>
                <th className="px-3 py-2 text-right font-semibold">Waiver %</th>
                <th className="px-3 py-2 text-left font-semibold">Settlement Method</th>
                <th className="px-3 py-2 text-left font-semibold">Validity</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-brand-200/40">
                <td className="px-3 py-2 font-medium">{previewCustomer}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {form.originalOutstandingAmount
                    ? formatSchemeRupee(parseFloat(form.originalOutstandingAmount.replace(/[₹,\s]/g, "")) || 0)
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {settlement.customerPayableAmount > 0
                    ? formatSchemeRupee(settlement.customerPayableAmount)
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {settlement.waiverAmount > 0
                    ? formatSchemeRupee(settlement.waiverAmount)
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{waiverPercentDisplay}</td>
                <td className="px-3 py-2">{settlementMethod}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {form.startDate && form.endDate
                    ? `${form.startDate} → ${form.endDate}`
                    : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="border-t border-brand-200/60 px-3 py-1.5">
          <p className="text-[10px] text-muted-foreground">
            Outstanding age:{" "}
            {formatOutstandingAgeLabel(form.outstandingAgeCondition, parseInt(form.outstandingDays, 10) || undefined)}
            {form.minimumOutstandingAmount
              ? ` · Min outstanding ${formatSchemeRupee(parseFloat(form.minimumOutstandingAmount.replace(/[₹,\s]/g, "")) || 0)}`
              : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
