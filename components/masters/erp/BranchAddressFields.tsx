"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ERP } from "./erp-form-styles";
import type { BranchAddress } from "@/app/(app)/masters/customers/components/CustomerForm";

function FieldError({ msg }: { msg?: string }) {
	if (!msg) return null;
	return <p className="text-[10px] text-red-500 leading-tight">{msg}</p>;
}

export function BranchAddressFields({
	address,
	onChange,
	onPincodeChange,
	readOnly,
	errors = {},
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
}) {
	const set = <K extends keyof BranchAddress>(key: K, value: BranchAddress[K]) =>
		onChange({ ...address, [key]: value });

	return (
		<div className="space-y-2">
			<div className={ERP.grid2}>
				<div className={ERP.field}>
					<Label className={ERP.label}>
						Address Line 1 <span className="text-red-500">*</span>
					</Label>
					<Input
						value={address.address}
						onChange={(e) => set("address", e.target.value)}
						disabled={readOnly}
						placeholder="Street, building, area"
						className={cn(ERP.input, errors.address && "border-red-400")}
					/>
					<FieldError msg={errors.address} />
				</div>
				<div className={ERP.field}>
					<Label className={ERP.label}>Address Line 2</Label>
					<Input
						value={address.addressLine2 ?? ""}
						onChange={(e) => set("addressLine2", e.target.value)}
						disabled={readOnly}
						placeholder="Landmark, floor (optional)"
						className={ERP.input}
					/>
				</div>
			</div>

			<div className={ERP.grid3}>
				<div className={ERP.field}>
					<Label className={ERP.label}>Country</Label>
					<Input
						value={address.country ?? "India"}
						onChange={(e) => set("country", e.target.value)}
						disabled={readOnly}
						className={ERP.input}
					/>
				</div>
				<div className={ERP.field}>
					<Label className={ERP.label}>
						State <span className="text-red-500">*</span>
					</Label>
					<Input
						value={address.state}
						onChange={(e) => set("state", e.target.value)}
						disabled={readOnly}
						placeholder="State"
						className={cn(ERP.input, errors.state && "border-red-400")}
					/>
					<FieldError msg={errors.state} />
				</div>
				<div className={ERP.field}>
					<Label className={ERP.label}>District</Label>
					<Input
						value={address.district ?? ""}
						onChange={(e) => set("district", e.target.value)}
						disabled={readOnly}
						placeholder="District"
						className={ERP.input}
					/>
				</div>
			</div>

			<div className={ERP.grid2}>
				<div className={ERP.field}>
					<Label className={ERP.label}>
						City <span className="text-red-500">*</span>
					</Label>
					<Input
						value={address.city}
						onChange={(e) => set("city", e.target.value)}
						disabled={readOnly}
						placeholder="City"
						className={cn(ERP.input, errors.city && "border-red-400")}
					/>
					<FieldError msg={errors.city} />
				</div>
				<div className={ERP.field}>
					<Label className={ERP.label}>Pincode</Label>
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
						className={cn(ERP.input, errors.pincode && "border-red-400")}
					/>
					<FieldError msg={errors.pincode} />
				</div>
			</div>
		</div>
	);
}
