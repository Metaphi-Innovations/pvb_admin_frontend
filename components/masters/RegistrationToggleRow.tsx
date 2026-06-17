"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListingStatusToggle } from "@/components/listing";
import { cn } from "@/lib/utils";

function FieldError({ msg }: { msg?: string }) {
	if (!msg) return null;
	return <p className="text-[11px] text-red-500 mt-0.5">{msg}</p>;
}

/** Toggle + optional registration number field (MSME, FSSAI, etc.). */
export function RegistrationToggleRow({
	label,
	enabled,
	onEnabledChange,
	numberLabel,
	numberValue,
	onNumberChange,
	numberError,
	numberPlaceholder,
	readOnly,
	inputClassName = "h-8 text-xs",
}: {
	label: string;
	enabled: boolean;
	onEnabledChange: (enabled: boolean) => void;
	numberLabel?: string;
	numberValue?: string;
	onNumberChange?: (value: string) => void;
	numberError?: string;
	numberPlaceholder?: string;
	readOnly?: boolean;
	inputClassName?: string;
}) {
	return (
		<div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end border-b border-border/30 pb-3 last:border-0 last:pb-0">
			<div className="flex items-center justify-between gap-3 md:col-span-4">
				<Label className="text-xs font-medium text-foreground">{label}</Label>
				<ListingStatusToggle
					active={enabled}
					onChange={(active) => !readOnly && onEnabledChange(active)}
					disabled={readOnly}
				/>
			</div>
			{enabled && numberLabel && onNumberChange && (
				<div className="space-y-1 md:col-span-8">
					<Label className="text-xs font-medium">
						{numberLabel} <span className="text-red-500">*</span>
					</Label>
					<Input
						value={numberValue ?? ""}
						onChange={(e) => onNumberChange(e.target.value)}
						disabled={readOnly}
						className={cn(inputClassName, numberError && "border-red-400")}
						placeholder={numberPlaceholder}
					/>
					<FieldError msg={numberError} />
				</div>
			)}
		</div>
	);
}
