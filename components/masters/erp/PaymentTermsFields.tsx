"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/app/(app)/masters/customers/components/SearchableSelect";
import {
	PAYMENT_TYPE_OPTIONS,
	type PaymentTermsFormValues,
	type PaymentType,
} from "@/lib/masters/payment-terms";
import { ERP } from "./erp-form-styles";
import { cn } from "@/lib/utils";

export function PaymentTermsFields({
	values,
	onChange,
	errors = {},
	readOnly,
	inputClassName,
	layout = "compact",
	className,
	hideCreditDays = false,
}: {
	values: PaymentTermsFormValues;
	onChange: (patch: Partial<PaymentTermsFormValues>) => void;
	errors?: Record<string, string>;
	readOnly?: boolean;
	inputClassName?: string;
	hideCreditDays?: boolean;
	/** embedded: fields join parent grid (e.g. beside Credit Limit). compact: self-contained row. */
	layout?: "embedded" | "compact";
	className?: string;
}) {
	const fieldClass = cn(ERP.input, "border-border/70 rounded-md bg-white", inputClassName);

	const handlePaymentTypeChange = (next: string) => {
		const paymentType = next as PaymentType;
		if (paymentType === "immediate") {
			onChange({ paymentType, creditDays: "0", advancePercentage: "" });
			return;
		}
		if (paymentType === "credit") {
			onChange({
				paymentType,
				creditDays: values.creditDays === "0" ? "30" : values.creditDays,
				advancePercentage: "",
			});
			return;
		}
		onChange({
			paymentType,
			creditDays: "0",
			advancePercentage: values.advancePercentage || "100",
		});
	};

	const fields = (
		<>
			<div className={ERP.field}>
				<Label className={ERP.label}>
					Payment Type <span className="text-red-500">*</span>
				</Label>
				<SearchableSelect
					value={values.paymentType}
					onChange={handlePaymentTypeChange}
					options={PAYMENT_TYPE_OPTIONS.map((o) => ({
						value: o.value,
						label: o.label,
					}))}
					placeholder="Select type..."
					disabled={readOnly}
				/>
				{errors.paymentType ? (
					<p className="text-xs text-red-500 mt-0.5">{errors.paymentType}</p>
				) : null}
			</div>

			{values.paymentType === "credit" && !hideCreditDays ? (
				<div className={ERP.field}>
					<Label className={ERP.label}>
						Credit Days <span className="text-red-500">*</span>
					</Label>
					<Input
						type="number"
						min={0}
						value={values.creditDays}
						onChange={(e) => {
							const raw = e.target.value.replace(/\D/g, "").slice(0, 3);
							onChange({ creditDays: raw });
						}}
						disabled={readOnly}
						placeholder="e.g. 30"
						className={fieldClass}
					/>
					{errors.creditDays ? (
						<p className="text-xs text-red-500 mt-0.5">{errors.creditDays}</p>
					) : null}
				</div>
			) : null}

			{values.paymentType === "advance" ? (
				<div className={ERP.field}>
					<Label className={ERP.label}>
						Advance % <span className="text-red-500">*</span>
					</Label>
					<Input
						type="number"
						min={1}
						max={100}
						value={values.advancePercentage}
						onChange={(e) => {
							const raw = e.target.value.replace(/\D/g, "").slice(0, 3);
							onChange({ advancePercentage: raw });
						}}
						disabled={readOnly}
						placeholder="1–100"
						className={fieldClass}
					/>
					{errors.advancePercentage ? (
						<p className="text-xs text-red-500 mt-0.5">
							{errors.advancePercentage}
						</p>
					) : null}
				</div>
			) : null}
		</>
	);

	if (layout === "embedded") {
		return <div className="contents">{fields}</div>;
	}

	return (
		<div
			className={cn(
				"grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:max-w-xl",
				className,
			)}
		>
			{fields}
		</div>
	);
}
