"use client";

import React, { useEffect } from "react";
import { AlertCircle, Tags } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
	normalizeInitialCode,
} from "@/lib/masters/code-generation";
import {
	loadVendorTypes,
	resolveVendorTypeCode,
	type VendorTypeFormValues,
} from "../vendor-type-data";
import { ListingStatusToggle } from "@/components/listing";

function SectionHead({
	label,
	sub,
	required,
}: {
	label: string;
	sub?: string;
	required?: boolean;
}) {
	return (
		<div className='mb-2.5 mt-0.5'>
			<p className='text-xs font-bold uppercase tracking-wider text-foreground flex items-center'>
				{label}
				{required && <span className='text-red-500 ml-1'>*</span>}
			</p>
			{sub && <p className='text-[11px] text-muted-foreground mt-0.5'>{sub}</p>}
		</div>
	);
}

function FieldError({ msg }: { msg?: string }) {
	if (!msg) return null;
	return (
		<p className='flex items-center gap-1 mt-1 text-[11px] text-red-500'>
			<AlertCircle className='w-3.5 h-3.5 flex-shrink-0' />
			{msg}
		</p>
	);
}

export {
	DEFAULT_VENDOR_TYPE_FORM,
	validateVendorTypeForm,
	type VendorTypeFormValues,
} from "../vendor-type-data";

export function VendorTypeForm({
	form,
	onChange,
	errors,
	onClearError,
	readOnly,
	recordId,
	originalInitialCode,
}: {
	form: VendorTypeFormValues;
	onChange: React.Dispatch<React.SetStateAction<VendorTypeFormValues>>;
	errors: Record<string, string>;
	onClearError: (key: string) => void;
	readOnly?: boolean;
	recordId?: number;
	originalInitialCode?: string;
}) {
	useEffect(() => {
		const normalized = normalizeInitialCode(form.initialCode);
		if (!normalized) {
			onChange((prev) =>
				prev.vendorTypeCode ? { ...prev, vendorTypeCode: "" } : prev,
			);
			return;
		}

		const records = loadVendorTypes();
		const nextCode = resolveVendorTypeCode(form.initialCode, records, {
			recordId,
			existingCode: form.vendorTypeCode,
			originalInitialCode,
		});

		if (nextCode !== form.vendorTypeCode) {
			onChange((prev) => ({ ...prev, vendorTypeCode: nextCode }));
		}
	}, [form.initialCode, form.vendorTypeCode, recordId, originalInitialCode]);

	const set = <K extends keyof VendorTypeFormValues>(
		key: K,
		value: VendorTypeFormValues[K],
	) => {
		onChange((prev) => ({ ...prev, [key]: value }));
		onClearError(key);
	};

	const inputCls = (key: string) =>
		cn(
			"h-8 text-xs",
			errors[key] && "border-red-400 focus-visible:ring-red-300",
		);

	return (
		<div className='w-full space-y-4'>
			<div className='flex items-start gap-2.5 pb-3 border-b border-border'>
				<div className='flex items-center justify-center flex-shrink-0 border rounded-lg w-7 h-7 bg-brand-50 border-brand-100'>
					<Tags className='w-3.5 h-3.5 text-brand-600' />
				</div>
				<div>
					<p className='text-xs font-semibold text-foreground'>Vendor Type Master</p>
					<p className='text-[11px] text-muted-foreground'>
						Vendor type classification and code prefix configuration
					</p>
				</div>
			</div>

			<div className='pt-1 space-y-5'>
				<div>
					<SectionHead label='Vendor Type Details' required />
					<div className='grid grid-cols-1 gap-3 md:grid-cols-4'>
						<div className='space-y-1'>
							<Label className='text-xs font-medium'>
								Initial Code <span className='text-red-500'>*</span>
							</Label>
							<Input
								value={form.initialCode}
								onChange={(e) =>
									set("initialCode", normalizeInitialCode(e.target.value))
								}
								placeholder='e.g. CG'
								className={cn(inputCls("initialCode"), "font-mono uppercase")}
								disabled={readOnly}
								maxLength={5}
							/>
							<FieldError msg={errors.initialCode} />
						</div>

						<div className='space-y-1'>
							<Label className='text-xs font-medium'>
								Vendor Type Name <span className='text-red-500'>*</span>
							</Label>
							<Input
								value={form.vendorTypeName}
								onChange={(e) => set("vendorTypeName", e.target.value)}
								placeholder='e.g. Creditor for Goods'
								className={inputCls("vendorTypeName")}
								disabled={readOnly}
							/>
							<FieldError msg={errors.vendorTypeName} />
						</div>

						<div className='space-y-1'>
							<Label className='text-xs font-medium'>Vendor Type Code</Label>
							<Input
								value={form.vendorTypeCode}
								placeholder='Auto-generated from initial code'
								className={cn(
									inputCls("vendorTypeCode"),
									"font-mono bg-muted/30 cursor-not-allowed",
								)}
								disabled
								readOnly
							/>
							<FieldError msg={errors.vendorTypeCode} />
						</div>

						<div className='space-y-1 md:col-span-2 md:col-start-1'>
							<Label className='text-xs font-medium'>Description</Label>
							<Textarea
								value={form.description}
								onChange={(e) => set("description", e.target.value)}
								placeholder='Description...'
								className='min-h-[96px] text-xs resize-none rounded-lg'
								disabled={readOnly}
							/>
						</div>
					</div>
				</div>

				<div className='pt-4 border-t border-border/60'>
					<SectionHead label='Status' />
					<div className='flex items-center gap-3'>
						<ListingStatusToggle
							active={form.status === "active"}
							onChange={() =>
								!readOnly &&
								set("status", form.status === "active" ? "inactive" : "active")
							}
						/>
						<span className='text-xs text-muted-foreground'>
							{form.status === "active" ? "Active" : "Inactive"}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
