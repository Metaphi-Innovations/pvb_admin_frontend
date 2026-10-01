"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { ListingStatusToggle } from "@/components/listing";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	GST_REGISTRATION_TYPE_DEFAULT,
	GST_REGISTRATION_TYPE_OPTIONS,
} from "@/lib/masters/gst-compliance";
import { ERP } from "@/components/masters/erp/erp-form-styles";

function FieldError({ msg }: { msg?: string }) {
	if (!msg) return null;
	return <p className="text-[11px] text-red-500 leading-tight">{msg}</p>;
}

/** Inline GST Registered control — label + toggle + Yes/No status */
export function GstRegisteredToggleControl({
	active,
	onChange,
	readOnly,
	label,
}: {
	active: boolean;
	onChange: (active: boolean) => void;
	readOnly?: boolean;
	label?: string;
}) {
	const toggleLabel = label ?? "GST Registered";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-medium text-foreground whitespace-nowrap">
        {toggleLabel}
      </span>
			<ListingStatusToggle
				active={active}
				onChange={onChange}
				disabled={readOnly}
			/>
			<span
				className={cn(
					"text-[11px] font-semibold whitespace-nowrap",
					active ? "text-emerald-700" : "text-muted-foreground",
				)}
			>
				{active ? "Yes" : "No"}
			</span>
		</div>
	);
}

export interface GstRegistrationFieldValues {
	gstRegistered: boolean;
	gstRegistrationType: string;
	gstin: string;
	registeredLegalName?: string;
	registeredAddress?: string;
}

export function GstRegistrationFields({
	values,
	onChange,
	errors = {},
	readOnly,
	fetchingGst,
	onFetchGst,
	inputClassName = ERP.input,
	namePrefix: _namePrefix,
	footer,
	showRegisteredToggle = true,
}: {
	values: GstRegistrationFieldValues;
	onChange: (next: GstRegistrationFieldValues) => void;
	errors?: Record<string, string>;
	readOnly?: boolean;
	fetchingGst?: boolean;
	onFetchGst?: () => void;
	inputClassName?: string;
	/** @deprecated unused — kept for vendor form compatibility */
	namePrefix?: string;
	/** PAN / TDS row rendered below GST fields */
	footer?: React.ReactNode;
	/** When false, parent renders toggle in section header */
	showRegisteredToggle?: boolean;
}) {
	const set = <K extends keyof GstRegistrationFieldValues>(
		key: K,
		value: GstRegistrationFieldValues[K],
	) => onChange({ ...values, [key]: value });

	const handleGstRegisteredChange = (yes: boolean) =>
		onChange({
			...values,
			gstRegistered: yes,
			gstRegistrationType: yes
				? values.gstRegistrationType || GST_REGISTRATION_TYPE_DEFAULT
				: GST_REGISTRATION_TYPE_DEFAULT,
			gstin: yes ? values.gstin : "",
			registeredLegalName: yes ? values.registeredLegalName : "",
			registeredAddress: yes ? values.registeredAddress : "",
		});

	return (
		<div className="space-y-2">
			{showRegisteredToggle && (
				<div className="flex flex-wrap items-center gap-2 pb-1 border-b border-border/40">
					<GstRegisteredToggleControl
						active={values.gstRegistered}
						onChange={handleGstRegisteredChange}
						readOnly={readOnly}
					/>
					<span className="text-[10px] text-muted-foreground">
						{values.gstRegistered
							? "Enter GSTIN and fetch registered details"
							: "Customer is not GST registered"}
					</span>
				</div>
			)}

			{!values.gstRegistered && !showRegisteredToggle && (
				<p className="text-[10px] text-muted-foreground pb-0.5">
					GST registration is off. PAN and TDS fields below still apply.
				</p>
			)}

			{values.gstRegistered && (
				<>
					<div className="grid grid-cols-1 gap-2 lg:grid-cols-3 lg:items-end">
						<div className={ERP.field}>
							<Label className={ERP.label}>
								Registration Type <span className="text-red-500">*</span>
							</Label>
							<AutocompleteSelect
								options={GST_REGISTRATION_TYPE_OPTIONS.map((o) => ({
									value: o.value,
									label: o.label,
								}))}
								value={values.gstRegistrationType}
								onChange={(value) => set("gstRegistrationType", String(value))}
								placeholder="Select type..."
								searchPlaceholder="Search..."
								disabled={readOnly}
								className={inputClassName}
							/>
							<FieldError msg={errors.gstRegistrationType} />
						</div>

						<div className={ERP.field}>
							<Label className={ERP.label}>
								GSTIN Number <span className="text-red-500">*</span>
							</Label>
							<Input
								value={values.gstin}
								onChange={(e) => set("gstin", e.target.value.toUpperCase())}
								placeholder="27AABCU9603R1ZX"
								className={cn(
									inputClassName,
									"font-mono uppercase",
									errors.gstin && "border-red-400",
								)}
								disabled={readOnly}
								maxLength={15}
							/>
							<FieldError msg={errors.gstin} />
						</div>

						<div className={cn(ERP.field, "lg:pb-0")}>
							<Label className={cn(ERP.label, "hidden lg:block invisible")}>
								Action
							</Label>
							<Button
								type="button"
								size="sm"
								className="h-8 w-auto shrink-0 whitespace-nowrap px-2.5 text-xs bg-brand-600 hover:bg-brand-700 text-white"
								disabled={readOnly || fetchingGst || !onFetchGst}
								onClick={onFetchGst}
							>
								{fetchingGst ? (
									<Loader2 className="mr-1 h-3 w-3 animate-spin" />
								) : (
									<Search className="mr-1 h-3 w-3" />
								)}
								Fetch GST Details
							</Button>
						</div>
					</div>

					<div className={ERP.field}>
						<Label className={ERP.label}>Registered Legal Name</Label>
						<Input
							value={values.registeredLegalName ?? ""}
							readOnly
							disabled
							placeholder="Auto-filled from GSTIN"
							className={cn(inputClassName, "bg-muted/25 cursor-not-allowed")}
						/>
					</div>

					<div className={ERP.field}>
						<Label className={ERP.label}>Registered GST Address</Label>
						<Textarea
							value={values.registeredAddress ?? ""}
							readOnly
							disabled
							placeholder="Auto-filled from GSTIN"
							rows={1}
							className="min-h-[28px] resize-none text-xs bg-muted/25 cursor-not-allowed py-1.5"
						/>
					</div>
				</>
			)}

			{footer}
		</div>
	);
}
