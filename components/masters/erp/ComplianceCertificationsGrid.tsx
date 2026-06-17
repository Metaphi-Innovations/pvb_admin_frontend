"use client";

import { Input } from "@/components/ui/input";
import { ListingStatusToggle } from "@/components/listing";
import { cn } from "@/lib/utils";
import { ERP } from "./erp-form-styles";
import { normalizeUdyamInput } from "@/lib/masters/gst-compliance";
import {
	FSSAI_HELPER_TEXT,
	normalizeFssaiInput,
} from "@/lib/masters/compliance-registration";

export interface ComplianceGridValues {
	msmeRegistered: boolean;
	msmeNumber: string;
	fssaiRegistered: boolean;
	fssai: string;
	cibRegistered: boolean;
	cibRegn: string;
	fcoRegistered: boolean;
	fcoRegn: string;
}

type RowId = "msme" | "fssai" | "cib" | "fco";

const ROWS: {
	id: RowId;
	toggleKey: keyof ComplianceGridValues;
	numberKey: keyof ComplianceGridValues;
	label: string;
	placeholder: string;
	errorKey: string;
	helperText?: string;
}[] = [
	{
		id: "msme",
		toggleKey: "msmeRegistered",
		numberKey: "msmeNumber",
		label: "MSME",
		placeholder: "UDYAM-MH-27-0123456",
		errorKey: "msmeNumber",
	},
	{
		id: "fssai",
		toggleKey: "fssaiRegistered",
		numberKey: "fssai",
		label: "FSSAI",
		placeholder: "14-digit license number",
		errorKey: "fssai",
		helperText: FSSAI_HELPER_TEXT,
	},
	{
		id: "cib",
		toggleKey: "cibRegistered",
		numberKey: "cibRegn",
		label: "CIB",
		placeholder: "Registration number",
		errorKey: "cibRegn",
	},
	{
		id: "fco",
		toggleKey: "fcoRegistered",
		numberKey: "fcoRegn",
		label: "FCO",
		placeholder: "Registration number",
		errorKey: "fcoRegn",
	},
];

function formatRegistrationInput(id: RowId, value: string): string {
	if (id === "msme") return normalizeUdyamInput(value);
	if (id === "fssai") return normalizeFssaiInput(value);
	return value;
}

export function ComplianceCertificationsGrid({
	values,
	onChange,
	errors = {},
	readOnly,
}: {
	values: ComplianceGridValues;
	onChange: (next: ComplianceGridValues) => void;
	errors?: Record<string, string>;
	readOnly?: boolean;
}) {
	const setToggle = (
		toggleKey: keyof ComplianceGridValues,
		numberKey: keyof ComplianceGridValues,
		enabled: boolean,
	) => {
		onChange({
			...values,
			[toggleKey]: enabled,
			[numberKey]: enabled ? (values[numberKey] as string) : "",
		});
	};

	const setNumber = (
		id: RowId,
		numberKey: keyof ComplianceGridValues,
		value: string,
	) => {
		onChange({ ...values, [numberKey]: formatRegistrationInput(id, value) });
	};

	return (
		<div className="overflow-hidden rounded border border-border/80 text-xs">
			<div className="grid grid-cols-[minmax(88px,1fr)_72px_minmax(0,2fr)] items-center gap-x-2 border-b border-border/70 bg-muted/30 px-2 py-1">
				<span className={cn(ERP.label, "text-muted-foreground")}>Registration</span>
				<span className={cn(ERP.label, "text-muted-foreground text-center")}>
					Applicable
				</span>
				<span className={cn(ERP.label, "text-muted-foreground")}>
					Registration Number
				</span>
			</div>
			{ROWS.map((row, idx) => {
				const enabled = values[row.toggleKey] as boolean;
				const numberVal = values[row.numberKey] as string;
				const err = errors[row.errorKey];
				return (
					<div
						key={row.label}
						className={cn(
							"grid grid-cols-[minmax(88px,1fr)_72px_minmax(0,2fr)] items-start gap-x-2 px-2 py-1",
							idx < ROWS.length - 1 && "border-b border-border/50",
						)}
					>
						<span className="pt-1.5 text-[11px] font-semibold text-foreground">
							{row.label}
						</span>
						<div className="flex justify-center pt-1">
							<ListingStatusToggle
								active={enabled}
								onChange={(active) =>
									!readOnly && setToggle(row.toggleKey, row.numberKey, active)
								}
								disabled={readOnly}
							/>
						</div>
						<div className={ERP.field}>
							<Input
								value={numberVal}
								onChange={(e) => setNumber(row.id, row.numberKey, e.target.value)}
								disabled={readOnly || !enabled}
								placeholder={enabled ? row.placeholder : "—"}
								inputMode={row.id === "fssai" ? "numeric" : "text"}
								maxLength={row.id === "fssai" ? 14 : undefined}
								className={cn(
									ERP.input,
									"h-7",
									row.id === "msme" && "font-mono uppercase",
									row.id === "fssai" && "font-mono",
									!enabled && "bg-muted/40 text-muted-foreground",
									err && enabled && "border-red-400",
								)}
							/>
							{enabled && row.helperText && !err && (
								<p className="text-[10px] leading-tight text-muted-foreground">
									{row.helperText}
								</p>
							)}
							{err && enabled && (
								<p className="text-[10px] text-red-500 leading-tight">{err}</p>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}
