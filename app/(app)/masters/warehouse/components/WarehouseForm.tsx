"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { AlertCircle, ChevronsUpDown, Check } from "lucide-react";
import {
	WAREHOUSE_TYPES,
	WAREHOUSE_STATUSES,
	OPERATED_BY_OPTIONS,
	STATE_OPTIONS,
	MANAGER_OPTIONS,
	getDistrictsForState,
	getCitiesForDistrict,
	type WarehouseType,
	type WarehouseStatus,
	type OperatedBy,
} from "../warehouse-data";

export interface WarehouseFormValues {
	warehouseName: string;
	warehouseType: WarehouseType;
	gstNumber: string;
	contactPerson: string;
	mobileNumber: string;
	emailAddress: string;
	address: string;
	state: string;
	district: string;
	city: string;
	pincode: string;
	capacity: string;
	manager: string;
	status: WarehouseStatus;
	operatedBy: OperatedBy;
}

export const INITIAL_FORM: WarehouseFormValues = {
	warehouseName: "",
	warehouseType: "Central Warehouse",
	gstNumber: "",
	contactPerson: "",
	mobileNumber: "",
	emailAddress: "",
	address: "",
	state: "",
	district: "",
	city: "",
	pincode: "",
	capacity: "",
	manager: "",
	status: "active",
	operatedBy: "Self",
};

export function validateWarehouseForm(
	form: WarehouseFormValues,
): Record<string, string> {
	const e: Record<string, string> = {};
	if (!form.warehouseName.trim())
		e.warehouseName = "Warehouse Name is required";
	if (!form.contactPerson.trim())
		e.contactPerson = "Contact Person is required";
	if (!form.mobileNumber.trim()) e.mobileNumber = "Mobile Number is required";
	else if (!/^\d{10}$/.test(form.mobileNumber.trim()))
		e.mobileNumber = "Enter valid 10-digit number";
	if (
		form.emailAddress.trim() &&
		!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailAddress.trim())
	) {
		e.emailAddress = "Enter valid email address";
	}
	if (form.pincode.trim() && !/^\d{6}$/.test(form.pincode.trim()))
		e.pincode = "Enter valid 6-digit pincode";
	return e;
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
		<p className='text-[11px] text-red-500 flex items-center gap-1 mt-1'>
			<AlertCircle className='flex-shrink-0 w-3 h-3' />
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

export function WarehouseForm({
	form,
	onChange,
	errors,
	onClearError,
	warehouseCode,
}: {
	form: WarehouseFormValues;
	onChange: (f: WarehouseFormValues) => void;
	errors: Record<string, string>;
	onClearError: (key: string) => void;
	warehouseCode: string;
}) {
	const set = (key: keyof WarehouseFormValues, value: string | boolean) => {
		const next = { ...form, [key]: value };
		if (key === "state") {
			next.district = "";
			next.city = "";
		}
		if (key === "district") {
			next.city = "";
		}
		onChange(next);
		if (errors[key]) onClearError(key);
	};

	const districts = getDistrictsForState(form.state);
	const cities = getCitiesForDistrict(form.district);

	const inputCls = (key: string) =>
		cn(
			"h-8 text-xs",
			errors[key] && "border-red-400 focus-visible:ring-red-300",
		);

	return (
		<div className='w-full space-y-5'>
			{/* ── Section 1: Basic Details ─────────────────────────── */}
			<div>
				<SectionHead label="Warehouse Basic Details" sub="Identity, classification, and operational status" />
				<div className='grid grid-cols-6 gap-3'>
					{/* Warehouse Code */}
					<div className='col-span-1 space-y-1'>
						<Label className='text-xs font-medium'>
							Warehouse Code (Auto Generated)
						</Label>
						<Input
							value={warehouseCode}
							disabled
							className='h-8 font-mono text-xs cursor-not-allowed bg-muted/30 text-muted-foreground'
						/>
					</div>
					{/* Warehouse Name */}
					<div className='col-span-2 space-y-1'>
						<Label className='text-xs font-medium'>
							Warehouse Name <span className='text-red-500'>*</span>
						</Label>
						<Input
							value={form.warehouseName}
							onChange={(e) => set("warehouseName", e.target.value)}
							placeholder='e.g., Central Distribution Hub'
							className={inputCls("warehouseName")}
						/>
						<FieldError msg={errors.warehouseName} />
					</div>

					

					{/* Warehouse Type */}
					<div className='col-span-2'>
						<AC
							label="Warehouse Type"
							value={form.warehouseType}
							onChange={(v) => set("warehouseType", v)}
							options={WAREHOUSE_TYPES.filter(Boolean).map((t) => ({ value: t, label: t }))}
							placeholder="Select type…"
						/>
					</div>

					{/* Status */}
					{/* <div className='col-span-1'>
						<AC
							label="Status"
							value={form.status}
							onChange={(v) => set("status", v)}
							options={WAREHOUSE_STATUSES.filter((s) => s && s.value).map((s) => ({ value: s.value, label: s.label }))}
							placeholder="Select status…"
						/>
					</div> */}

					{/* Operated By */}
					<div className='col-span-1'>
						<AC
							label="Operated By"
							value={form.operatedBy}
							onChange={(v) => set("operatedBy", v)}
							options={OPERATED_BY_OPTIONS.filter(Boolean).map((o) => ({ value: o, label: o }))}
							placeholder="Select operator…"
						/>
					</div>
				</div>
			</div>

			{/* ── Section 2: Contact Details ────────────────────────── */}
			<div className="pt-4 border-t border-border/60">
				<SectionHead label="Contact Details" sub="Contact person details and identifiers" />
				<div className='grid grid-cols-4 gap-3'>
					{/* Contact Person */}
					<div className='col-span-2 space-y-1'>
						<Label className='text-xs font-medium'>
							Contact Person <span className='text-red-500'>*</span>
						</Label>
						<Input
							value={form.contactPerson}
							onChange={(e) => set("contactPerson", e.target.value)}
							placeholder='e.g., Suresh Mehta'
							className={inputCls("contactPerson")}
						/>
						<FieldError msg={errors.contactPerson} />
					</div>

					{/* Mobile Number */}
					<div className='col-span-2 space-y-1'>
						<Label className='text-xs font-medium'>
							Mobile Number <span className='text-red-500'>*</span>
						</Label>
						<Input
							value={form.mobileNumber}
							onChange={(e) =>
								set("mobileNumber", e.target.value.replace(/\D/g, ""))
							}
							placeholder='e.g., 9876543210'
							maxLength={10}
							className={inputCls("mobileNumber")}
						/>
						<FieldError msg={errors.mobileNumber} />
					</div>

					{/* Email Address */}
					<div className='col-span-2 space-y-1'>
						<Label className='text-xs font-medium'>Email Address</Label>
						<Input
							value={form.emailAddress}
							onChange={(e) => set("emailAddress", e.target.value)}
							placeholder='e.g., suresh@pvb.com'
							type='email'
							className={inputCls("emailAddress")}
						/>
						<FieldError msg={errors.emailAddress} />
					</div>

					{/* GST Number */}
					<div className='col-span-2 space-y-1'>
						<Label className='text-xs font-medium'>GST Number</Label>
						<Input
							value={form.gstNumber}
							onChange={(e) => set("gstNumber", e.target.value.toUpperCase())}
							placeholder='e.g., 27AABCT1234F1ZA'
							className='h-8 font-mono text-xs'
							maxLength={15}
						/>
					</div>
				</div>
			</div>

			{/* ── Section 3: Address Details ────────────────────────── */}
			<div className="pt-4 border-t border-border/60">
				<SectionHead label="Address & Location Details" sub="Warehouse location and postal address" />
				<div className='grid grid-cols-4 gap-3'>
					{/* Address Textarea */}
					<div className='col-span-4 space-y-1'>
						<Label className='text-xs font-medium'>Address</Label>
						<Textarea
							value={form.address}
							onChange={(e) => set("address", e.target.value)}
							placeholder='Street address, building, area...'
							rows={2}
							className='text-xs resize-none rounded-lg min-h-[38px]'
						/>
					</div>

					{/* State */}
					<div className='col-span-1'>
						<AC
							label="State"
							value={form.state}
							onChange={(v) => set("state", v)}
							options={STATE_OPTIONS.filter(Boolean).map((s) => ({ value: s, label: s }))}
							placeholder="Select state…"
						/>
					</div>

					{/* District */}
					<div className='col-span-1'>
						<AC
							label="District"
							value={form.district}
							onChange={(v) => set("district", v)}
							disabled={!form.state}
							options={districts.filter(Boolean).map((d) => ({ value: d, label: d }))}
							placeholder={form.state ? "Select district…" : "Select state first"}
						/>
					</div>

					{/* City */}
					<div className='col-span-1'>
						<AC
							label="City"
							value={form.city}
							onChange={(v) => set("city", v)}
							disabled={!form.district}
							options={cities.filter(Boolean).map((c) => ({ value: c, label: c }))}
							placeholder={form.district ? "Select city…" : "Select district first"}
						/>
					</div>

					{/* Pincode */}
					<div className='col-span-1 space-y-1'>
						<Label className='text-xs font-medium'>Pincode</Label>
						<Input
							value={form.pincode}
							onChange={(e) =>
								set("pincode", e.target.value.replace(/\D/g, ""))
							}
							placeholder='e.g., 411028'
							maxLength={6}
							className={inputCls("pincode")}
						/>
						<FieldError msg={errors.pincode} />
					</div>
				</div>
			</div>

			{/* ── Section 4: Capacity & Management Details ──────────── */}
			<div className="pt-4 border-t border-border/60">
				<SectionHead label="Capacity & Management Details" sub="Size, volume capacity, and assigned manager" />
				<div className='grid grid-cols-4 gap-3'>
					{/* Capacity */}
					<div className='col-span-2 space-y-1'>
						<Label className='text-xs font-medium'>Capacity (sq.ft)</Label>
						<Input
							value={form.capacity}
							onChange={(e) => set("capacity", e.target.value)}
							placeholder='e.g., 20000'
							type='number'
							className='h-8 text-xs'
						/>
					</div>

					{/* Manager */}
					<div className='col-span-2'>
						<AC
							label="Manager"
							value={form.manager}
							onChange={(v) => set("manager", v)}
							options={MANAGER_OPTIONS.filter(Boolean).map((m) => ({ value: m, label: m }))}
							placeholder="Select manager…"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
