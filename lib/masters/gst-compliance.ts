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
	{ value: "rcm", label: "RCM (Reverse Charge Mechanism)" },
] as const;

export type GstRegistrationType =
	(typeof GST_REGISTRATION_TYPE_OPTIONS)[number]["value"];

/** All stored categories including legacy values. */
export const GST_CATEGORY_OPTIONS = [
	...GST_REGISTRATION_TYPE_OPTIONS,
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
	if (category === "rcm") return "rcm";
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
	if (gstApplicable === false) return false;
	if (gstApplicable === true) return true;
	if (gstCategory) return isGstCategoryRegistered(gstCategory);
	return !!gstin?.trim();
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
	if (gstApplicable === false) return GST_CATEGORY_UNREGISTERED;
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
	return /^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/.test(v.trim().toUpperCase());
}

export const MSME_NUMBER_ERROR =
	"Please enter valid UDYAM number. Example: UDYAM-MH-27-0123456";

/** Uppercase; allow only UDYAM-format characters. */
export function normalizeUdyamInput(v: string): string {
	return v.toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

/**
 * Formats UDYAM as user types: UDYAM-XX-00-0000000
 * First 5 chars = letters, then auto hyphen, then state letters, etc.
 */
export function formatUdyamInput(raw: string): string {
	const chars = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
	const g1 = chars.match(/^[A-Z]{0,5}/)?.[0] ?? "";
	const rest1 = chars.slice(g1.length);
	const g2 = rest1.match(/^[A-Z]{0,2}/)?.[0] ?? "";
	const rest2 = rest1.slice(g2.length);
	const g3 = rest2.match(/^[0-9]{0,2}/)?.[0] ?? "";
	const rest3 = rest2.slice(g3.length);
	const g4 = rest3.match(/^[0-9]{0,7}/)?.[0] ?? "";

	let result = g1;
	if (g1.length === 5) {
		result += "-";
		result += g2;
		if (g2.length === 2) {
			result += "-";
			result += g3;
			if (g3.length === 2) {
				result += "-";
				result += g4;
			}
		}
	}
	return result;
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
	addressLine2?: string;
	country?: string;
	district?: string;
	city: string;
	state: string;
	pincode: string;
}

export function gstDetailsToAddressSnapshot(
	details: GstRegistrationDetails,
): GstAddressSnapshot {
	return {
		address: details.registeredAddress,
		country: "India",
		district: details.district,
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
