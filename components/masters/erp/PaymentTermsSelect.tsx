"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/app/(app)/masters/customers/components/SearchableSelect";
import {
	PAYMENT_TERMS_OPTIONS,
	CUSTOM_PAYMENT_TERMS_KEY,
	isPresetPaymentTerms,
	parsePaymentTermDays,
	buildNetPaymentTerms,
} from "@/app/(app)/masters/customers/customer-data";
import { ERP } from "./erp-form-styles";
import { cn } from "@/lib/utils";

export function PaymentTermsSelect({
	value,
	onChange,
	readOnly,
	required,
}: {
	value: string;
	onChange: (value: string) => void;
	readOnly?: boolean;
	required?: boolean;
}) {
	const isCustom = !isPresetPaymentTerms(value);
	const selectValue = isCustom ? CUSTOM_PAYMENT_TERMS_KEY : value;
	const customDays = isCustom ? String(parsePaymentTermDays(value) ?? "") : "";

	const options = [
		...PAYMENT_TERMS_OPTIONS.map((option) => ({
			value: option.value,
			label: option.label,
		})),
		{ value: CUSTOM_PAYMENT_TERMS_KEY, label: "Custom..." },
	];

	return (
		<div className="space-y-2">
			<SearchableSelect
				value={selectValue}
				onChange={(next) => {
					if (next === CUSTOM_PAYMENT_TERMS_KEY) {
						const days = parsePaymentTermDays(value) ?? 30;
						onChange(buildNetPaymentTerms(days));
						return;
					}
					onChange(next);
				}}
				options={options}
				placeholder="Select terms..."
				disabled={readOnly}
			/>
			{isCustom && (
				<div className={ERP.field}>
					<Label className={ERP.label}>
						Credit Days{" "}
						{required ? <span className="text-red-500">*</span> : null}
					</Label>
					<Input
						type="number"
						min={1}
						max={365}
						value={customDays}
						onChange={(e) => {
							const raw = e.target.value.replace(/\D/g, "").slice(0, 3);
							if (!raw) return;
							const days = parseInt(raw, 10);
							if (days >= 1 && days <= 365) {
								onChange(buildNetPaymentTerms(days));
							}
						}}
						disabled={readOnly}
						placeholder="e.g. 21"
						className={cn(ERP.input, "border-border/70 rounded-md bg-white")}
					/>
				</div>
			)}
		</div>
	);
}
