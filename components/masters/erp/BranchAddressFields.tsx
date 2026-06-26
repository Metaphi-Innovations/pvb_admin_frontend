"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { cn } from "@/lib/utils";
import { ERP } from "./erp-form-styles";
import { getGstCodeForState } from "@/app/(app)/masters/geography/geo-data";
import type { BranchAddress } from "@/app/(app)/masters/customers/components/CustomerForm";
import { hydratePostalMaster } from "@/lib/geography/postal-master-store";
import {
	getTownsForPincode,
	lookupPostalPincode,
} from "@/lib/address/postal-lookup";

function FieldError({ msg }: { msg?: string }) {
	if (!msg) return null;
	return <p className="text-[11px] text-red-500 leading-tight">{msg}</p>;
}

/** Branch address field order: Line 1 + Line 2 → Pincode → City → Town → State */
export function BranchAddressFields({
	address,
	onChange,
	onPincodeChange,
	readOnly,
	errors = {},
	stateOptions = [],
	showTown = true,
	showDistrict = false,
}: {
	address: BranchAddress;
	onChange: (next: BranchAddress) => void;
	/** @deprecated handled internally when omitted */
	onPincodeChange?: (pincode: string) => void;
	readOnly?: boolean;
	errors?: {
		address?: string;
		state?: string;
		city?: string;
		town?: string;
		district?: string;
		pincode?: string;
	};
	stateOptions?: { value: string; label: string }[];
	/** When false, hides the Town field (e.g. vendor registered address). */
	showTown?: boolean;
	/** When true, shows District (auto-filled from pincode). */
	showDistrict?: boolean;
}) {
	const [postalReady, setPostalReady] = useState(false);
	const [townOptions, setTownOptions] = useState<string[]>([]);

	const country = address.country ?? "India";
	const isIndia = country === "India";

	useEffect(() => {
		let active = true;
		hydratePostalMaster().then(() => {
			if (active) setPostalReady(true);
		});
		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		if (!postalReady || address.pincode.length !== 6) {
			setTownOptions([]);
			return;
		}
		setTownOptions(getTownsForPincode(address.pincode));
	}, [postalReady, address.pincode]);

	// Resolve geography when postal master finishes loading after pincode entry
	useEffect(() => {
		if (onPincodeChange || !postalReady || !isIndia || address.pincode.length !== 6) {
			return;
		}

		const loc = lookupPostalPincode(address.pincode, address.town);
		if (!loc) return;

		const needsUpdate =
			address.state !== loc.state ||
			(address.district ?? "") !== loc.district ||
			address.city !== loc.city ||
			(loc.town && (address.town ?? "") !== loc.town);

		if (!needsUpdate) return;

		onChange({
			...address,
			pincode: loc.pincode,
			city: loc.city,
			town: loc.town,
			district: loc.district,
			state: loc.state,
		});
	}, [
		postalReady,
		address.pincode,
		address.town,
		address.city,
		address.district,
		address.state,
		isIndia,
		onPincodeChange,
		onChange,
		address,
	]);

	const set = <K extends keyof BranchAddress>(key: K, value: BranchAddress[K]) =>
		onChange({ ...address, [key]: value });

	const stateGstCode = isIndia ? getGstCodeForState(address.state) : undefined;
	const fieldClass = cn(ERP.input, "border-border/70 rounded-md bg-white");

	const pincodeResolved = useMemo(() => {
		if (!postalReady || address.pincode.length !== 6) return null;
		return lookupPostalPincode(address.pincode, address.town);
	}, [postalReady, address.pincode, address.town]);

	const geographyLocked = Boolean(pincodeResolved);

	const applyPostalLocation = (digits: string, preferredTown?: string) => {
		const loc = lookupPostalPincode(digits, preferredTown);
		if (loc) {
			return {
				...address,
				pincode: digits,
				city: loc.city,
				town: loc.town,
				district: loc.district,
				state: loc.state,
			};
		}
		return {
			...address,
			pincode: digits,
			city: "",
			town: "",
			district: "",
			state: "",
		};
	};

	const handlePincodeChange = (raw: string) => {
		if (onPincodeChange) {
			onPincodeChange(raw);
			return;
		}
		const digits = raw.replace(/\D/g, "").slice(0, 6);
		if (digits.length === 6 && isIndia) {
			if (postalReady) {
				onChange(applyPostalLocation(digits));
			} else {
				onChange({ ...address, pincode: digits });
			}
		} else if (digits.length < 6) {
			onChange({
				...address,
				pincode: digits,
				city: "",
				town: "",
				district: "",
				state: "",
			});
		} else {
			set("pincode", digits);
		}
	};

	const handleTownChange = (town: string) => {
		if (!address.pincode || address.pincode.length !== 6) {
			set("town", town);
			return;
		}
		onChange(applyPostalLocation(address.pincode, town));
	};

	const townSelectOptions = useMemo(
		() => townOptions.map((t) => ({ value: t, label: t })),
		[townOptions],
	);

	const pincodeCol = showDistrict ? "col-span-12 md:col-span-2" : "col-span-12 md:col-span-3";
	const cityCol = showDistrict ? "col-span-12 md:col-span-2" : "col-span-12 md:col-span-3";
	const townCol = showDistrict ? "col-span-12 md:col-span-3" : "col-span-12 md:col-span-3";
	const stateCol = showDistrict
		? "col-span-12 md:col-span-3"
		: showTown
			? "col-span-12 md:col-span-3"
			: "col-span-12 md:col-span-6";

	return (
		<div className="grid grid-cols-12 gap-2">
			<div className={cn(ERP.field, "col-span-12 md:col-span-6")}>
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

			<div className={cn(ERP.field, "col-span-12 md:col-span-6")}>
				<Label className={ERP.label}>Address Line 2</Label>
				<Input
					value={address.addressLine2 ?? ""}
					onChange={(e) => set("addressLine2", e.target.value)}
					disabled={readOnly}
					placeholder="Landmark, floor (optional)"
					className={fieldClass}
				/>
			</div>

			<div className={cn(ERP.field, pincodeCol)}>
				<Label className={ERP.label}>
					Pincode <span className="text-red-500">*</span>
				</Label>
				<Input
					value={address.pincode}
					onChange={(e) => handlePincodeChange(e.target.value)}
					disabled={readOnly}
					placeholder="6-digit"
					inputMode="numeric"
					maxLength={6}
					className={cn(fieldClass, "font-mono", errors.pincode && "border-red-400")}
				/>
				<FieldError msg={errors.pincode} />
			</div>

			{showDistrict ? (
				<div className={cn(ERP.field, "col-span-12 md:col-span-2")}>
					<Label className={ERP.label}>District</Label>
					<Input
						disabled={readOnly || (geographyLocked && isIndia)}
						value={address.district ?? ""}
						onChange={(e) => set("district", e.target.value)}
						className={cn(fieldClass, errors.district && "border-red-400")}
						placeholder={
							address.pincode.length === 6 && !postalReady
								? "Loading location..."
								: address.pincode.length === 6 && !address.district
									? "Auto-filled from pincode"
									: "Enter pincode first"
						}
					/>
					<FieldError msg={errors.district} />
				</div>
			) : null}

			<div className={cn(ERP.field, cityCol)}>
				<Label className={ERP.label}>
					City <span className="text-red-500">*</span>
				</Label>
				<Input
					disabled={readOnly || (geographyLocked && isIndia)}
					value={address.city}
					onChange={(e) => set("city", e.target.value)}
					className={cn(fieldClass, errors.city && "border-red-400")}
					placeholder={
						address.pincode.length === 6 && !postalReady
							? "Loading location..."
							: address.pincode.length === 6 && !address.city
								? "Pincode not found"
								: "Enter pincode first"
					}
				/>
				<FieldError msg={errors.city} />
			</div>

			{showTown ? (
				<div className={cn(ERP.field, townCol)}>
					<Label className={ERP.label}>
						Town <span className="text-red-500">*</span>
					</Label>
					{townSelectOptions.length > 1 ? (
						<AutocompleteSelect
							disabled={
								readOnly || !address.pincode || address.pincode.length !== 6
							}
							value={address.town ?? ""}
							onChange={(value) => handleTownChange(String(value))}
							options={townSelectOptions}
							placeholder="Select town..."
							searchPlaceholder="Search town..."
							className={cn(fieldClass, errors.town && "border-red-400")}
						/>
					) : (
						<Input
							disabled={
								readOnly ||
								(geographyLocked && isIndia) ||
								address.pincode.length !== 6
							}
							value={address.town ?? ""}
							onChange={(e) => handleTownChange(e.target.value)}
							className={cn(fieldClass, errors.town && "border-red-400")}
							placeholder={
								address.pincode.length === 6 && !postalReady
									? "Loading location..."
									: address.pincode.length === 6 && !address.town
										? "Pincode not found"
										: "Enter pincode first"
							}
						/>
					)}
					<FieldError msg={errors.town} />
				</div>
			) : null}

			<div className={cn(ERP.field, stateCol)}>
				<Label className={ERP.label}>
					State <span className="text-red-500">*</span>
				</Label>
				{isIndia && stateOptions.length > 0 ? (
					<AutocompleteSelect
						disabled={readOnly || geographyLocked}
						value={address.state}
						onChange={(value) => set("state", String(value))}
						options={stateOptions}
						placeholder="Select state..."
						searchPlaceholder="Search state..."
						className={cn(fieldClass, errors.state && "border-red-400")}
					/>
				) : (
					<Input
						disabled={readOnly || geographyLocked}
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
