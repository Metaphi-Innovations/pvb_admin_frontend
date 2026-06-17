/**
 * Shared GST / tax compliance helpers for Customer & Vendor masters.
 * `fetchGstRegistrationDetails` is structured for future API integration.
 */

export const GST_CATEGORY_UNREGISTERED = "unregistered";
export const GST_CATEGORY_SEZ = "sez";
export const GST_REGISTRATION_TYPE_DEFAULT = "regular";

/** Dropdown when GST Registered = Yes (party master only). */
export const GST_REGISTRATION_TYPE_OPTIONS = [
	{ value: "regular", label: "Regular" },
	{ value: "composition", label: "Composition" },
	{ value: GST_CATEGORY_SEZ, label: "SEZ Unit" },
] as const;

export type GstRegistrationType =
	(typeof GST_REGISTRATION_TYPE_OPTIONS)[number]["value"];

/** All stored categories including legacy values. */
export const GST_CATEGORY_OPTIONS = [
	...GST_REGISTRATION_TYPE_OPTIONS,
	{ value: "rcm", label: "RCM (Reverse Charge Mechanism)" },
	{ value: GST_CATEGORY_UNREGISTERED, label: "Unregistered" },
] as const;

export type GstCategory = (typeof GST_CATEGORY_OPTIONS)[number]["value"];

export function getGstCategoryLabel(value: string): string {
	const label = GST_CATEGORY_OPTIONS.find((o) => o.value === value)?.label;
	return label ?? (value || "—");
}

export function isGstCategoryRegistered(category: string): boolean {
	return !!category && category !== GST_CATEGORY_UNREGISTERED;
}

export function gstApplicableFromCategory(category: string): boolean {
	return isGstCategoryRegistered(category);
}

export function isSezGstCategory(category?: string): boolean {
	return category === GST_CATEGORY_SEZ;
}

/** Map legacy / stored category to registration type when GST registered. */
export function deriveGstRegistrationType(category?: string): GstRegistrationType {
	if (!category || category === GST_CATEGORY_UNREGISTERED) {
		return GST_REGISTRATION_TYPE_DEFAULT;
	}
	if (category === "rcm") return GST_REGISTRATION_TYPE_DEFAULT;
	if (
		GST_REGISTRATION_TYPE_OPTIONS.some(
			(o) => o.value === category,
		)
	) {
		return category as GstRegistrationType;
	}
	return GST_REGISTRATION_TYPE_DEFAULT;
}

/** Back-fill GST Registered toggle from stored party data. */
export function deriveGstRegistered(
	gstApplicable?: boolean,
	gstin?: string,
	gstCategory?: string,
): boolean {
	if (gstCategory) return isGstCategoryRegistered(gstCategory);
	if (gstApplicable === false && !gstin?.trim()) return false;
	return !!(gstApplicable || gstin?.trim());
}

export function buildGstCategory(
	gstRegistered: boolean,
	registrationType: string,
): string {
	if (!gstRegistered) return GST_CATEGORY_UNREGISTERED;
	return registrationType || GST_REGISTRATION_TYPE_DEFAULT;
}

/** Back-fill category from legacy gstApplicable + gstin. */
export function deriveGstCategory(
	gstApplicable?: boolean,
	gstin?: string,
	existing?: string,
): string {
	if (existing) return existing;
	if (!gstApplicable && !gstin?.trim()) return GST_CATEGORY_UNREGISTERED;
	return GST_REGISTRATION_TYPE_DEFAULT;
}

export function validateGSTIN(v: string): boolean {
	return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
		v.trim().toUpperCase(),
	);
}

export function validatePAN(v: string): boolean {
	return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.trim().toUpperCase());
}

export function validateTAN(v: string): boolean {
	return /^[A-Z]{4}[0-9]{5}[A-Z]$/.test(v.trim().toUpperCase());
}

export function validateMSMENumber(v: string): boolean {
	const trimmed = v.trim();
	if (!trimmed) return false;
	return /^[A-Za-z0-9]+$/.test(trimmed);
}

export interface GstRegistrationDetails {
	legalBusinessName: string;
	tradeName: string;
	registeredAddress: string;
	state: string;
	district: string;
	pincode: string;
}

const GST_STATE_MAP: Record<string, string> = {
	"27": "Maharashtra",
	"29": "Karnataka",
	"07": "Delhi",
	"33": "Tamil Nadu",
	"24": "Gujarat",
	"09": "Uttar Pradesh",
	"19": "West Bengal",
};

/**
 * Mock GST lookup — replace body with API call when integrated.
 * Returns null when GSTIN format is invalid.
 */
export function fetchGstRegistrationDetails(
	gstin: string,
): GstRegistrationDetails | null {
	const g = gstin.trim().toUpperCase();
	if (!validateGSTIN(g)) return null;

	const stateCode = g.slice(0, 2);
	const panSegment = g.slice(2, 12);
	const state = GST_STATE_MAP[stateCode] ?? "Maharashtra";
	const city =
		stateCode === "29"
			? "Bengaluru"
			: stateCode === "33"
				? "Chennai"
				: stateCode === "24"
					? "Ahmedabad"
					: "Pune";

	return {
		legalBusinessName: `Legal Entity — ${panSegment}`,
		tradeName: `Trade Name — ${panSegment}`,
		registeredAddress: `Registered Office, Industrial Area, ${city}`,
		state,
		district: city,
		pincode:
			stateCode === "29"
				? "560001"
				: stateCode === "33"
					? "600001"
					: "411001",
	};
}

/** Promise wrapper for future async API. */
export async function fetchGstRegistrationDetailsAsync(
	gstin: string,
): Promise<GstRegistrationDetails | null> {
	await new Promise((r) => setTimeout(r, 400));
	return fetchGstRegistrationDetails(gstin);
}

export interface GstAddressSnapshot {
	address: string;
	city: string;
	state: string;
	pincode: string;
}

export function gstDetailsToAddressSnapshot(
	details: GstRegistrationDetails,
): GstAddressSnapshot {
	return {
		address: details.registeredAddress,
		city: details.district,
		state: details.state,
		pincode: details.pincode,
	};
}

/** Sales invoice — SEZ supply classification (LUT handled at company/branch level). */
export const SEZ_SUPPLY_TYPE_OPTIONS = [
	{ value: "lut_bond", label: "SEZ Supply under LUT/Bond" },
	{ value: "with_igst", label: "SEZ Supply with IGST" },
] as const;

export type SezSupplyType = (typeof SEZ_SUPPLY_TYPE_OPTIONS)[number]["value"];

export function getSezSupplyTypeLabel(value?: string): string {
	const label = SEZ_SUPPLY_TYPE_OPTIONS.find((o) => o.value === value)?.label;
	return label ?? "—";
}
