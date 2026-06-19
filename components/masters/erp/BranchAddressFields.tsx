"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { cn } from "@/lib/utils";
import { ERP } from "./erp-form-styles";
import {
	ADDRESS_COUNTRIES,
	getGstCodeForState,
} from "@/app/(app)/masters/geography/geo-data";
import type { BranchAddress } from "@/app/(app)/masters/customers/components/CustomerForm";

function FieldError({ msg }: { msg?: string }) {
	if (!msg) return null;
	return <p className="text-[11px] text-red-500 leading-tight">{msg}</p>;
}

/** Branch address field order: Country → Line 1 → Line 2 → Pincode → City | State */
export function BranchAddressFields({
	address,
	onChange,
	onPincodeChange,
	readOnly,
	errors = {},
	stateOptions = [],
}: {
	address: BranchAddress;
	onChange: (next: BranchAddress) => void;
	onPincodeChange?: (pincode: string) => void;
	readOnly?: boolean;
	errors?: {
		address?: string;
		state?: string;
		city?: string;
		pincode?: string;
	};
	stateOptions?: { value: string; label: string }[];
}) {
	const set = <K extends keyof BranchAddress>(key: K, value: BranchAddress[K]) =>
		onChange({ ...address, [key]: value });

	const country = address.country ?? "India";
	const isIndia = country === "India";
	const stateGstCode = isIndia ? getGstCodeForState(address.state) : undefined;
	const fieldClass = cn(ERP.input, "border-border/70 rounded-md bg-white");

	return (
		<div className="grid grid-cols-12 gap-2">
			{/* 1. Country */}
			<div className={cn(ERP.field, "col-span-12 md:col-span-4")}>
				<Label className={ERP.label}>Country</Label>
				<AutocompleteSelect
					disabled={readOnly}
					value={country}
					onChange={(value) =>
						onChange({
							...address,
							country: String(value) || "India",
						})
					}
					options={ADDRESS_COUNTRIES.map((c) => ({ value: c, label: c }))}
					placeholder="Country"
					className={fieldClass}
				/>
			</div>

			{/* 2. Address Line 1 */}
			<div className={cn(ERP.field, "col-span-12")}>
				<Label className={ERP.label}>
					Address Line 1 <span className="text-red-500">*</span>
				</Label>
				<Input
					value={address.address}
					onChange={(e) => set("address", e.target.value)}
					disabled={readOnly}
					placeholder="Building, street, area"
					className={cn(fieldClass, errors.address && "border-red-400")}
				/>
				<FieldError msg={errors.address} />
			</div>

			{/* 3. Address Line 2 */}
			<div className={cn(ERP.field, "col-span-12")}>
				<Label className={ERP.label}>Address Line 2</Label>
				<Input
					value={address.addressLine2 ?? ""}
					onChange={(e) => set("addressLine2", e.target.value)}
					disabled={readOnly}
					placeholder="Landmark, floor (optional)"
					className={fieldClass}
				/>
			</div>

			{/* 4. Pincode */}
			<div className={cn(ERP.field, "col-span-12 md:col-span-3")}>
				<Label className={ERP.label}>
					Pincode <span className="text-red-500">*</span>
				</Label>
				<Input
					value={address.pincode}
					onChange={(e) =>
						onPincodeChange
							? onPincodeChange(e.target.value)
							: set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))
					}
					disabled={readOnly}
					placeholder="6-digit"
					inputMode="numeric"
					maxLength={6}
					className={cn(fieldClass, "font-mono", errors.pincode && "border-red-400")}
				/>
				<FieldError msg={errors.pincode} />
			</div>

			{/* 5. City | State */}
			<div className={cn(ERP.field, "col-span-12 md:col-span-5")}>
				<Label className={ERP.label}>
					City <span className="text-red-500">*</span>
				</Label>
				<Input
					disabled={readOnly}
					value={address.city}
					onChange={(e) => set("city", e.target.value)}
					className={cn(fieldClass, errors.city && "border-red-400")}
					placeholder="City / district"
				/>
				<FieldError msg={errors.city} />
			</div>

			<div className={cn(ERP.field, "col-span-12 md:col-span-4")}>
				<Label className={ERP.label}>
					State <span className="text-red-500">*</span>
				</Label>
				{isIndia && stateOptions.length > 0 ? (
					<AutocompleteSelect
						disabled={readOnly}
						value={address.state}
						onChange={(value) => set("state", String(value))}
						options={stateOptions}
						placeholder="Select state..."
						searchPlaceholder="Search state..."
						className={cn(fieldClass, errors.state && "border-red-400")}
					/>
				) : (
					<Input
						disabled={readOnly}
						value={address.state}
						onChange={(e) => set("state", e.target.value)}
						className={cn(fieldClass, errors.state && "border-red-400")}
						placeholder="State"
					/>
				)}
				{stateGstCode && (
					<p className="text-[10px] text-muted-foreground leading-tight">
						State GST code: {stateGstCode}
					</p>
				)}
				<FieldError msg={errors.state} />
			</div>
		</div>
	);
}
