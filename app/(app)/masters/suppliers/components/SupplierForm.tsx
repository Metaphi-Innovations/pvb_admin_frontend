"use client";

import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { AlertCircle, ChevronsUpDown, Check } from "lucide-react";
import {
  type Supplier,
  type SupplierStatus,
  SUPPLIER_PAYMENT_TERMS_OPTIONS,
  SUPPLIER_STATUS_OPTIONS,
  todayStr,
  validateSupplierEmail,
  validateSupplierGSTIN,
  validateSupplierMobile,
} from "../supplier-data";

export interface SupplierFormValues {
  supplierName: string;
  mobile: string;
  email: string;
  gstin: string;
  address: string;
  paymentTerms: string;
  status: SupplierStatus;
  cibRegn: string;
  cibRegnExpiry: string;
  fcoRegn: string;
  fcoRegnExpiry: string;
}

export const DEFAULT_SUPPLIER_FORM: SupplierFormValues = {
  supplierName: "",
  mobile: "",
  email: "",
  gstin: "",
  address: "",
  paymentTerms: "30-days",
  status: "active",
  cibRegn: "",
  cibRegnExpiry: "",
  fcoRegn: "",
  fcoRegnExpiry: "",
};

export function supplierToFormValues(supplier: Supplier): SupplierFormValues {
  return {
    supplierName: supplier.supplierName,
    mobile: supplier.mobile,
    email: supplier.email,
    gstin: supplier.gstin,
    address: supplier.address,
    paymentTerms: supplier.paymentTerms,
    status: supplier.status,
    cibRegn: supplier.cibRegn,
    cibRegnExpiry: supplier.cibRegnExpiry,
    fcoRegn: supplier.fcoRegn,
    fcoRegnExpiry: supplier.fcoRegnExpiry,
  };
}

// ── Autocomplete (matches EmployeeForm AC) ────────────────────────────────────
interface ACOption { label: string; value: string }
function AC({ label, value, onChange, options, placeholder, required, error, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  options: ACOption[]; placeholder?: string; required?: boolean; error?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = q ? options.filter(o => o.label.toLowerCase().includes(q.toLowerCase())) : options;
  const selected = options.find(o => o.value === value);
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <Popover open={open && !disabled} onOpenChange={v => { if (!disabled) { setOpen(v); if (!v) setQ(""); } }}>
        <PopoverTrigger asChild>
          <button type="button" disabled={disabled} className={cn(
            "w-full h-8 px-2.5 text-xs text-left border border-border rounded-lg bg-background flex items-center justify-between transition-colors",
            disabled ? "opacity-50 cursor-not-allowed bg-muted/30" : "hover:bg-muted/30",
            error && "border-red-400",
          )}>
            <span className={selected ? "text-foreground" : "text-muted-foreground"}>
              {selected?.label || placeholder || "Select…"}
            </span>
            <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="p-1.5 border-b border-border">
            <Input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)}
              className="text-xs h-7 focus-visible:ring-0" autoFocus />
          </div>
          <div className="py-1 overflow-y-auto max-h-48">
            {filtered.length === 0
              ? <p className="px-3 py-4 text-xs text-center text-muted-foreground">No options</p>
              : filtered.map(opt => (
                <button type="button" key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); setQ(""); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left hover:bg-muted/60 transition-colors",
                    selected?.value === opt.value && "bg-brand-50"
                  )}>
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">{opt.label}</span>
                  </div>
                  {selected?.value === opt.value && <Check className="flex-shrink-0 w-3 h-3 text-brand-600" />}
                </button>
              ))}
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="flex items-center gap-1 text-[11px] text-red-500"><AlertCircle className="flex-shrink-0 w-3 h-3" />{error}</p>}
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 mt-1 text-[11px] text-red-500">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      {msg}
    </p>
  );
}

function SectionHead({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="mb-2.5 mt-0.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export function SupplierForm({
  form,
  onChange,
  errors,
  onClearError,
  readOnly,
}: {
  form: SupplierFormValues;
  onChange: (form: SupplierFormValues) => void;
  errors: Record<string, string>;
  onClearError: (key: string) => void;
  readOnly?: boolean;
}) {
  const set = <K extends keyof SupplierFormValues>(key: K, value: SupplierFormValues[K]) => {
    onChange({ ...form, [key]: value });
    onClearError(key);
  };

  const inputCls = (key: string) =>
    cn("h-8 text-xs", errors[key] && "border-red-400 focus-visible:ring-red-300");

  return (
    <div className="w-full space-y-4">
      <SectionHead label="Supplier Details" />

      <div className="grid grid-cols-4 gap-3">
        {/* Supplier Name */}
        <div className="col-span-2 space-y-1">
          <Label className="text-xs font-medium">
            Supplier Name <span className="text-red-500">*</span>
          </Label>
          <Input
            value={form.supplierName}
            onChange={(e) => set("supplierName", e.target.value)}
            placeholder="e.g. Green Crop Inputs Pvt Ltd"
            className={inputCls("supplierName")}
            disabled={readOnly}
          />
          <FieldError msg={errors.supplierName} />
        </div>

        {/* Mobile Number */}
        <div className="col-span-1 space-y-1">
          <Label className="text-xs font-medium">
            Mobile Number <span className="text-red-500">*</span>
          </Label>
          <Input
            value={form.mobile}
            onChange={(e) => set("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit mobile"
            className={inputCls("mobile")}
            inputMode="numeric"
            disabled={readOnly}
          />
          <FieldError msg={errors.mobile} />
        </div>

        {/* Status */}
        {/* <div className="col-span-1">
          <AC
            label="Status"
            value={form.status}
            onChange={(value) => set("status", value as SupplierStatus)}
            options={SUPPLIER_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            placeholder="Select status..."
            disabled={readOnly}
          />
        </div> */}

        {/* Email Address */}
        <div className="col-span-1 space-y-1">
          <Label className="text-xs font-medium">Email Address</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="supplier@company.com"
            className={inputCls("email")}
            disabled={readOnly}
          />
          <FieldError msg={errors.email} />
        </div>

        {/* GSTIN */}
        <div className="col-span-2 space-y-1">
          <Label className="text-xs font-medium">GSTIN</Label>
          <Input
            value={form.gstin}
            onChange={(e) => set("gstin", e.target.value.toUpperCase())}
            placeholder="27AABCU9603R1ZX"
            className={cn("font-mono", inputCls("gstin"))}
            disabled={readOnly}
          />
          <FieldError msg={errors.gstin} />
        </div>

        {/* Payment Terms */}
        <div className="col-span-2">
          <AC
            label="Payment Terms"
            value={form.paymentTerms}
            onChange={(value) => set("paymentTerms", value)}
            options={SUPPLIER_PAYMENT_TERMS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            placeholder="Select payment terms..."
            disabled={readOnly}
          />
        </div>

        {/* Address */}
        <div className="col-span-4 space-y-1">
          <Label className="text-xs font-medium">
            Address <span className="text-red-500">*</span>
          </Label>
          <Textarea
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            rows={3}
            placeholder="Street, area, landmark..."
            className={cn("text-xs rounded-lg resize-none min-h-[38px]", errors.address && "border-red-400")}
            disabled={readOnly}
          />
          <FieldError msg={errors.address} />
        </div>

        {/* CIB Regn # */}
        <div className="col-span-1 space-y-1">
          <Label className="text-xs font-medium">CIB Regn #</Label>
          <Input
            value={form.cibRegn}
            onChange={(e) => set("cibRegn", e.target.value)}
            className={inputCls("cibRegn")}
            disabled={readOnly}
          />
        </div>

        {/* CIB Regn Expiry */}
        <div className="col-span-1 space-y-1">
          <Label className="text-xs font-medium">CIB Regn Expiry</Label>
          <Input
            type="date"
            value={form.cibRegnExpiry}
            onChange={(e) => set("cibRegnExpiry", e.target.value)}
            className={inputCls("cibRegnExpiry")}
            disabled={readOnly}
          />
        </div>

        {/* FCO Regn # */}
        <div className="col-span-1 space-y-1">
          <Label className="text-xs font-medium">FCO Regn #</Label>
          <Input
            value={form.fcoRegn}
            onChange={(e) => set("fcoRegn", e.target.value)}
            className={inputCls("fcoRegn")}
            disabled={readOnly}
          />
        </div>

        {/* FCO Regn Expiry */}
        <div className="col-span-1 space-y-1">
          <Label className="text-xs font-medium">FCO Regn Expiry</Label>
          <Input
            type="date"
            value={form.fcoRegnExpiry}
            onChange={(e) => set("fcoRegnExpiry", e.target.value)}
            className={inputCls("fcoRegnExpiry")}
            disabled={readOnly}
          />
        </div>
      </div>
    </div>
  );
}

export function validateSupplierForm(form: SupplierFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.supplierName.trim()) errors.supplierName = "Supplier name is required";
  if (!form.mobile.trim()) errors.mobile = "Mobile number is required";
  else if (!validateSupplierMobile(form.mobile)) errors.mobile = "Enter a valid 10-digit mobile number";
  if (form.email.trim() && !validateSupplierEmail(form.email)) errors.email = "Enter a valid email address";
  if (form.gstin.trim() && !validateSupplierGSTIN(form.gstin)) errors.gstin = "Invalid GSTIN format";
  if (!form.address.trim()) errors.address = "Address is required";
  return errors;
}

export function formValuesToSupplier(
  form: SupplierFormValues,
  base: Partial<Supplier> & { id: number; supplierCode: string },
): Supplier {
  return {
    id: base.id,
    supplierCode: base.supplierCode,
    supplierName: form.supplierName.trim(),
    mobile: form.mobile.trim(),
    email: form.email.trim(),
    gstin: form.gstin.trim().toUpperCase(),
    address: form.address.trim(),
    paymentTerms: form.paymentTerms,
    status: form.status,
    cibRegn: form.cibRegn.trim(),
    cibRegnExpiry: form.cibRegnExpiry,
    fcoRegn: form.fcoRegn.trim(),
    fcoRegnExpiry: form.fcoRegnExpiry,
    createdBy: base.createdBy ?? "Admin",
    createdDate: base.createdDate ?? todayStr(),
    updatedBy: "Admin",
    updatedDate: todayStr(),
  };
}
