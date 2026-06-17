"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ComplianceRegistrationValues } from "@/lib/masters/compliance-registration";
import { YesNoRadio } from "@/components/masters/YesNoRadio";

function FieldError({ msg }: { msg?: string }) {
	if (!msg) return null;
	return <p className="text-[11px] text-red-500 mt-0.5">{msg}</p>;
}

export function ComplianceRegistrationFields({
	values,
	onChange,
	errors = {},
	readOnly,
	namePrefix,
	inputClassName = "h-8 text-xs",
}: {
	values: ComplianceRegistrationValues;
	onChange: (next: ComplianceRegistrationValues) => void;
	errors?: Record<string, string>;
	readOnly?: boolean;
	/** Unique prefix for radio group names, e.g. "customer" or "vendor" */
	namePrefix: string;
	inputClassName?: string;
}) {
	const set = <K extends keyof ComplianceRegistrationValues>(
		key: K,
		value: ComplianceRegistrationValues[K],
	) => onChange({ ...values, [key]: value });

	return (
		<div className="space-y-3 pt-1 border-t border-border/40">
			<p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
				Compliance Registrations
			</p>

			<div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
				<div className="space-y-1 md:col-span-3">
					<Label className="text-xs font-medium">FSSAI Registered?</Label>
					<YesNoRadio
						name={`${namePrefix}-fssai`}
						value={values.fssaiRegistered}
						onChange={(yes) =>
							onChange({ ...values, fssaiRegistered: yes, fssai: yes ? values.fssai : "" })
						}
						disabled={readOnly}
					/>
				</div>
				{values.fssaiRegistered && (
					<div className="space-y-1 md:col-span-5">
						<Label className="text-xs font-medium">
							FSSAI Number <span className="text-red-500">*</span>
						</Label>
						<Input
							value={values.fssai}
							onChange={(e) => set("fssai", e.target.value)}
							disabled={readOnly}
							className={cn(inputClassName, errors.fssai && "border-red-400")}
							placeholder="FSSAI license number"
						/>
						<FieldError msg={errors.fssai} />
					</div>
				)}
			</div>

			<div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
				<div className="space-y-1 md:col-span-3">
					<Label className="text-xs font-medium">CIB Registered?</Label>
					<YesNoRadio
						name={`${namePrefix}-cib`}
						value={values.cibRegistered}
						onChange={(yes) =>
							onChange({ ...values, cibRegistered: yes, cibRegn: yes ? values.cibRegn : "" })
						}
						disabled={readOnly}
					/>
				</div>
				{values.cibRegistered && (
					<div className="space-y-1 md:col-span-5">
						<Label className="text-xs font-medium">
							CIB Registration Number <span className="text-red-500">*</span>
						</Label>
						<Input
							value={values.cibRegn}
							onChange={(e) => set("cibRegn", e.target.value)}
							disabled={readOnly}
							className={cn(inputClassName, errors.cibRegn && "border-red-400")}
							placeholder="CIB registration number"
						/>
						<FieldError msg={errors.cibRegn} />
					</div>
				)}
			</div>

			<div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
				<div className="space-y-1 md:col-span-3">
					<Label className="text-xs font-medium">FCO Registered?</Label>
					<YesNoRadio
						name={`${namePrefix}-fco`}
						value={values.fcoRegistered}
						onChange={(yes) =>
							onChange({ ...values, fcoRegistered: yes, fcoRegn: yes ? values.fcoRegn : "" })
						}
						disabled={readOnly}
					/>
				</div>
				{values.fcoRegistered && (
					<div className="space-y-1 md:col-span-5">
						<Label className="text-xs font-medium">
							FCO Registration Number <span className="text-red-500">*</span>
						</Label>
						<Input
							value={values.fcoRegn}
							onChange={(e) => set("fcoRegn", e.target.value)}
							disabled={readOnly}
							className={cn(inputClassName, errors.fcoRegn && "border-red-400")}
							placeholder="FCO registration number"
						/>
						<FieldError msg={errors.fcoRegn} />
					</div>
				)}
			</div>
		</div>
	);
}
