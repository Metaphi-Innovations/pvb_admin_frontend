"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { YesNoRadio } from "@/components/masters/YesNoRadio";
import { cn } from "@/lib/utils";

function FieldError({ msg }: { msg?: string }) {
	if (!msg) return null;
	return <p className="text-[11px] text-red-500 mt-0.5">{msg}</p>;
}

/** Inline Yes/No toggle with optional number field on the same row. */
export function RegisteredNumberRow({
	label,
	registered,
	onRegisteredChange,
	numberLabel,
	numberValue,
	onNumberChange,
	numberError,
	numberPlaceholder,
	namePrefix,
	readOnly,
	inputClassName = "h-8 text-xs",
}: {
	label: string;
	registered: boolean;
	onRegisteredChange: (yes: boolean) => void;
	numberLabel: string;
	numberValue: string;
	onNumberChange: (value: string) => void;
	numberError?: string;
	numberPlaceholder?: string;
	namePrefix: string;
	readOnly?: boolean;
	inputClassName?: string;
}) {
	return (
		<div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
			<div className="space-y-1 md:col-span-3">
				<Label className="text-xs font-medium">{label}</Label>
				<YesNoRadio
					name={`${namePrefix}-registered`}
					value={registered}
					onChange={onRegisteredChange}
					disabled={readOnly}
				/>
			</div>
			{registered && (
				<div className="space-y-1 md:col-span-5">
					<Label className="text-xs font-medium">
						{numberLabel} <span className="text-red-500">*</span>
					</Label>
					<Input
						value={numberValue}
						onChange={(e) => onNumberChange(e.target.value)}
						disabled={readOnly}
						className={cn(
							inputClassName,
							numberError && "border-red-400",
						)}
						placeholder={numberPlaceholder}
					/>
					<FieldError msg={numberError} />
				</div>
			)}
		</div>
	);
}
