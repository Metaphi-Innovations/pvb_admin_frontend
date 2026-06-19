"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { YesNoRadio } from "@/components/masters/YesNoRadio";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	GST_REGISTRATION_TYPE_DEFAULT,
	GST_REGISTRATION_TYPE_OPTIONS,
} from "@/lib/masters/gst-compliance";

function FieldError({ msg }: { msg?: string }) {
	if (!msg) return null;
	return <p className="text-[11px] text-red-500 mt-0.5">{msg}</p>;
}

export interface GstRegistrationFieldValues {
	gstRegistered: boolean;
	gstRegistrationType: string;
	gstin: string;
}

export function GstRegistrationFields({
	values,
	onChange,
	errors = {},
	readOnly,
	fetchingGst,
	onFetchGst,
	namePrefix,
	inputClassName = "h-8 text-xs",
}: {
	values: GstRegistrationFieldValues;
	onChange: (next: GstRegistrationFieldValues) => void;
	errors?: Record<string, string>;
	readOnly?: boolean;
	fetchingGst?: boolean;
	onFetchGst?: () => void;
	namePrefix: string;
	inputClassName?: string;
}) {
	const set = <K extends keyof GstRegistrationFieldValues>(
		key: K,
		value: GstRegistrationFieldValues[K],
	) => onChange({ ...values, [key]: value });

	return (
		<div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
			<div className="space-y-1 md:col-span-2">
				<Label className="text-xs font-medium">GST Registered?</Label>
				<YesNoRadio
					name={`${namePrefix}-gst-registered`}
					value={values.gstRegistered}
					onChange={(yes) =>
						onChange({
							...values,
							gstRegistered: yes,
							gstRegistrationType: yes
								? values.gstRegistrationType || GST_REGISTRATION_TYPE_DEFAULT
								: GST_REGISTRATION_TYPE_DEFAULT,
							gstin: yes ? values.gstin : "",
						})
					}
					disabled={readOnly}
				/>
			</div>

			{values.gstRegistered && (
				<>
					<div className="space-y-1 md:col-span-3">
						<Label className="text-xs font-medium">
							GST Registration Type <span className="text-red-500">*</span>
						</Label>
						<AutocompleteSelect
							options={GST_REGISTRATION_TYPE_OPTIONS.map((o) => ({
								value: o.value,
								label: o.label,
							}))}
							value={values.gstRegistrationType}
							onChange={(value) =>
								set("gstRegistrationType", String(value))
							}
							placeholder="Select type..."
							searchPlaceholder="Search type..."
							disabled={readOnly}
							className={inputClassName}
						/>
						<FieldError msg={errors.gstRegistrationType} />
					</div>

					<div className="space-y-1 md:col-span-4">
						<Label className="text-xs font-medium">
							GSTIN Number <span className="text-red-500">*</span>
						</Label>
						<Input
							value={values.gstin}
							onChange={(e) =>
								set("gstin", e.target.value.toUpperCase())
							}
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

					<div className="flex items-end md:col-span-3">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-8 w-full text-xs border-brand-200 text-brand-700 hover:bg-brand-50"
							disabled={readOnly || fetchingGst || !onFetchGst}
							onClick={onFetchGst}
						>
							{fetchingGst ? (
								<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
							) : null}
							Fetch Details
						</Button>
					</div>
				</>
			)}
		</div>
	);
}
