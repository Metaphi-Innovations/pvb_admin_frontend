"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { ListingStatusToggle } from "@/components/listing";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	GST_REGISTRATION_TYPE_DEFAULT,
	GST_REGISTRATION_TYPE_OPTIONS,
} from "@/lib/masters/gst-compliance";
import { ERP } from "@/components/masters/erp/erp-form-styles";

function FieldError({ msg }: { msg?: string }) {
	if (!msg) return null;
	return <p className="text-[10px] text-red-500 leading-tight">{msg}</p>;
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
}) {
	const set = <K extends keyof GstRegistrationFieldValues>(
		key: K,
		value: GstRegistrationFieldValues[K],
	) => onChange({ ...values, [key]: value });

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between gap-2 rounded border border-border/60 bg-muted/15 px-2 py-1">
				<Label className={ERP.label}>GST Registered</Label>
				<ListingStatusToggle
					active={values.gstRegistered}
					onChange={(yes) =>
						onChange({
							...values,
							gstRegistered: yes,
							gstRegistrationType: yes
								? values.gstRegistrationType || GST_REGISTRATION_TYPE_DEFAULT
								: GST_REGISTRATION_TYPE_DEFAULT,
							gstin: yes ? values.gstin : "",
							registeredLegalName: yes ? values.registeredLegalName : "",
							registeredAddress: yes ? values.registeredAddress : "",
						})
					}
					disabled={readOnly}
				/>
			</div>

			{values.gstRegistered && (
				<>
					<div className={ERP.grid3}>
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

						<div className={cn(ERP.field, "flex flex-col justify-end")}>
							<Label className={cn(ERP.label, "invisible hidden sm:block")}>.</Label>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-7 w-full text-xs"
								disabled={readOnly || fetchingGst || !onFetchGst}
								onClick={onFetchGst}
							>
								{fetchingGst ? (
									<Loader2 className="mr-1 h-3 w-3 animate-spin" />
								) : null}
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
