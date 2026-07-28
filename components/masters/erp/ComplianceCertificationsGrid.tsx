"use client";

import { Input } from "@/components/ui/input";
import { ListingStatusToggle } from "@/components/listing";
import { cn } from "@/lib/utils";
import { ERP } from "./erp-form-styles";
import { formatUdyamInput } from "@/lib/masters/gst-compliance";
import {
	FSSAI_HELPER_TEXT,
	normalizeFssaiInput,
} from "@/lib/masters/compliance-registration";

export interface ComplianceGridValues {
	msmeRegistered: boolean;
	msmeNumber: string;
	msmeValidityDate?: string;
	fssaiRegistered: boolean;
	fssai: string;
	fssaiValidityDate?: string;
	cibRegistered: boolean;
	cibRegn: string;
	cibValidityDate?: string;
	fcoRegistered: boolean;
	fcoRegn: string;
	fcoValidityDate?: string;
}

type RowId = "msme" | "fssai" | "cib" | "fco";

const ROWS: {
	id: RowId;
	toggleKey: keyof ComplianceGridValues;
	numberKey: keyof ComplianceGridValues;
	validityKey?: keyof ComplianceGridValues;
	label: string;
	placeholder: string;
	errorKey: string;
	validityErrorKey?: string;
	helperText?: string;
}[] = [
	{
		id: "msme",
		toggleKey: "msmeRegistered",
		numberKey: "msmeNumber",
		validityKey: "msmeValidityDate",
		label: "MSME",
		placeholder: "UDYAM-MH-27-0123456",
		errorKey: "msmeNumber",
		validityErrorKey: "msmeValidityDate",
	},
	{
		id: "fssai",
		toggleKey: "fssaiRegistered",
		numberKey: "fssai",
		validityKey: "fssaiValidityDate",
		label: "FSSAI",
		placeholder: "14-digit license number",
		errorKey: "fssai",
		validityErrorKey: "fssaiValidityDate",
		helperText: FSSAI_HELPER_TEXT,
	},
	{
		id: "cib",
		toggleKey: "cibRegistered",
		numberKey: "cibRegn",
		validityKey: "cibValidityDate",
		label: "CIB",
		placeholder: "Registration number",
		errorKey: "cibRegn",
		validityErrorKey: "cibValidityDate",
	},
	{
		id: "fco",
		toggleKey: "fcoRegistered",
		numberKey: "fcoRegn",
		validityKey: "fcoValidityDate",
		label: "FCO",
		placeholder: "Registration number",
		errorKey: "fcoRegn",
		validityErrorKey: "fcoValidityDate",
	},
];

function formatRegistrationInput(id: RowId, value: string): string {
	if (id === "msme") return formatUdyamInput(value);
	if (id === "fssai") return normalizeFssaiInput(value);
	return value;
}

export function ComplianceCertificationsGrid({
	values,
	onChange,
	errors = {},
	readOnly,
	onFieldBlur,
	rows,
	showValidityDates = false,
}: {
	values: ComplianceGridValues;
	onChange: (next: ComplianceGridValues) => void;
	errors?: Record<string, string>;
	readOnly?: boolean;
	onFieldBlur?: (fieldKey: string) => void;
	/** Subset of rows to render; defaults to all registrations. */
	rows?: RowId[];
	/** Show License Validity Date column (Accounts customer ledger flow). */
	showValidityDates?: boolean;
}) {
	const setToggle = (
		toggleKey: keyof ComplianceGridValues,
		numberKey: keyof ComplianceGridValues,
		validityKey: keyof ComplianceGridValues | undefined,
		enabled: boolean,
	) => {
		onChange({
			...values,
			[toggleKey]: enabled,
			[numberKey]: enabled ? (values[numberKey] as string) : "",
			...(validityKey
				? { [validityKey]: enabled ? (values[validityKey] as string) : "" }
				: {}),
		});
	};

	const setNumber = (
		id: RowId,
		numberKey: keyof ComplianceGridValues,
		value: string,
	) => {
		onChange({ ...values, [numberKey]: formatRegistrationInput(id, value) });
	};

	const visibleRows = rows
		? ROWS.filter((row) => rows.includes(row.id))
		: ROWS;

	const gridCols = showValidityDates
		? "grid-cols-[72px_64px_minmax(260px,1fr)_minmax(140px,160px)]"
		: "grid-cols-[72px_64px_minmax(0,1fr)]";

	return (
		<div className="overflow-hidden rounded border border-border/80 text-xs">
			<div
				className={cn(
					"grid items-center gap-x-3 border-b border-border/70 bg-muted/30 px-2.5 py-1.5",
					gridCols,
				)}
			>
				<span className={cn(ERP.label, "text-muted-foreground")}>Registration</span>
				<span className={cn(ERP.label, "text-muted-foreground text-center")}>
					Applicable
				</span>
				<span className={cn(ERP.label, "text-muted-foreground")}>
					Registration Number
				</span>
				{showValidityDates ? (
					<span className={cn(ERP.label, "text-muted-foreground")}>
						License Validity Date
					</span>
				) : null}
			</div>
			{visibleRows.map((row, idx) => {
				const enabled = values[row.toggleKey] as boolean;
				const numberVal = values[row.numberKey] as string;
				const validityVal = row.validityKey
					? ((values[row.validityKey] as string) ?? "")
					: "";
				const err = errors[row.errorKey];
				const validityErr = row.validityErrorKey
					? errors[row.validityErrorKey]
					: undefined;
				return (
					<div
						key={row.label}
						className={cn(
							"grid items-start gap-x-3 px-2.5 py-1.5",
							gridCols,
							idx < visibleRows.length - 1 && "border-b border-border/50",
						)}
					>
						<span className="pt-1.5 text-[11px] font-semibold text-foreground">
							{row.label}
						</span>
						<div className="flex justify-center pt-1">
							<ListingStatusToggle
								active={enabled}
								onChange={(active) =>
									!readOnly &&
									setToggle(row.toggleKey, row.numberKey, row.validityKey, active)
								}
								disabled={readOnly}
							/>
						</div>
						<div className={cn(ERP.field, "min-w-0")}>
							<Input
								value={numberVal}
								onChange={(e) => setNumber(row.id, row.numberKey, e.target.value)}
								onBlur={() => enabled && onFieldBlur?.(row.errorKey)}
								disabled={readOnly || !enabled}
								placeholder={enabled ? row.placeholder : "—"}
								inputMode={row.id === "fssai" ? "numeric" : "text"}
								maxLength={row.id === "fssai" ? 14 : row.id === "msme" ? 19 : undefined}
								className={cn(
									showValidityDates ? "h-9 text-sm rounded-lg" : ERP.input,
									showValidityDates && "min-w-0 w-full",
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
						{showValidityDates && row.validityKey ? (
							<div className={cn(ERP.field, "min-w-0")}>
								<Input
									type="date"
									value={validityVal}
									onChange={(e) =>
										onChange({ ...values, [row.validityKey!]: e.target.value })
									}
									onBlur={() =>
										enabled &&
										row.validityErrorKey &&
										onFieldBlur?.(row.validityErrorKey)
									}
									disabled={readOnly || !enabled}
									className={cn(
										ERP.input,
										!enabled && "bg-muted/40 text-muted-foreground",
										validityErr && enabled && "border-red-400",
									)}
								/>
								{validityErr && enabled && (
									<p className="text-[10px] text-red-500 leading-tight">
										{validityErr}
									</p>
								)}
							</div>
						) : null}
					</div>
				);
			})}
		</div>
	);
}
