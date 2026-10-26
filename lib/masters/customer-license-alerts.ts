import { showToast, type AppToastType } from "@/lib/toast";

/** Days before expiry treated as “nearing expiry”. */
export const LICENSE_NEAR_EXPIRY_DAYS = 30;

export type CustomerLicenseStatus =
	| "valid"
	| "near_expiry"
	| "expired"
	| "missing_expiry";

export interface CustomerLicenseFields {
	customerName?: string | null;
	msmeRegistered?: boolean | null;
	msmeNumber?: string | null;
	msmeValidityDate?: string | null;
	fssaiRegistered?: boolean | null;
	fssai?: string | null;
	fssaiValidityDate?: string | null;
	cibRegistered?: boolean | null;
	cibRegn?: string | null;
	cibValidityDate?: string | null;
	fcoRegistered?: boolean | null;
	fcoRegn?: string | null;
	fcoValidityDate?: string | null;
}

/** Raw Customer Master / view API shape (snake_case). */
export interface CustomerLicenseApiFields {
	customer_name?: string | null;
	msme_applicable?: boolean | null;
	msme_reg_no?: string | null;
	msme_expiry_date?: string | Date | null;
	fssai_applicable?: boolean | null;
	fssai_no?: string | null;
	fssai_expiry_date?: string | Date | null;
	cib_applicable?: boolean | null;
	cib_reg_no?: string | null;
	cib_expiry_date?: string | Date | null;
	fco_applicable?: boolean | null;
	fco_reg_no?: string | null;
	fco_expiry_date?: string | Date | null;
}

export interface CustomerLicenseAlert {
	key: string;
	label: string;
	status: CustomerLicenseStatus;
	expiryDate: string | null;
	daysRemaining: number | null;
	message: string;
	toastType: AppToastType;
}

function sliceDate(value: unknown): string {
	if (value == null || value === "") return "";
	return String(value).slice(0, 10);
}

function parseDateOnly(value: string): Date | null {
	const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!m) return null;
	const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
	return Number.isNaN(d.getTime()) ? null : d;
}

function formatDisplayDate(value: string): string {
	const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!m) return value;
	return `${m[3]}-${m[2]}-${m[1]}`;
}

function startOfToday(asOf: Date): Date {
	return new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
}

function daysBetween(from: Date, to: Date): number {
	const ms = to.getTime() - from.getTime();
	return Math.round(ms / (24 * 60 * 60 * 1000));
}

function evaluateOne(
	key: string,
	label: string,
	applicable: boolean,
	expiryRaw: string | null | undefined,
	customerLabel: string,
	asOf: Date,
): CustomerLicenseAlert | null {
	if (!applicable) return null;

	const expiryDate = sliceDate(expiryRaw);
	if (!expiryDate) {
		return {
			key,
			label,
			status: "missing_expiry",
			expiryDate: null,
			daysRemaining: null,
			message: `${label} licence for ${customerLabel} is marked applicable but has no expiry date on record. Please verify before proceeding.`,
			toastType: "warning",
		};
	}

	const expiry = parseDateOnly(expiryDate);
	if (!expiry) {
		return {
			key,
			label,
			status: "missing_expiry",
			expiryDate,
			daysRemaining: null,
			message: `${label} licence for ${customerLabel} has an invalid expiry date. Please verify before proceeding.`,
			toastType: "warning",
		};
	}

	const today = startOfToday(asOf);
	const remaining = daysBetween(today, expiry);
	const displayExpiry = formatDisplayDate(expiryDate);

	if (remaining < 0) {
		return {
			key,
			label,
			status: "expired",
			expiryDate,
			daysRemaining: remaining,
			message: `${label} licence for ${customerLabel} expired on ${displayExpiry}. Do not process until renewed.`,
			toastType: "error",
		};
	}

	if (remaining <= LICENSE_NEAR_EXPIRY_DAYS) {
		const dayLabel = remaining === 0 ? "today" : remaining === 1 ? "in 1 day" : `in ${remaining} days`;
		return {
			key,
			label,
			status: "near_expiry",
			expiryDate,
			daysRemaining: remaining,
			message: `${label} licence for ${customerLabel} expires ${dayLabel} (${displayExpiry}). Please verify before processing.`,
			toastType: "warning",
		};
	}

	return {
		key,
		label,
		status: "valid",
		expiryDate,
		daysRemaining: remaining,
		message: `${label} licence for ${customerLabel} is valid until ${displayExpiry}.`,
		toastType: "success",
	};
}

export function customerLicenseFieldsFromApi(
	details: CustomerLicenseApiFields | null | undefined,
): CustomerLicenseFields | null {
	if (!details) return null;
	return {
		customerName: details.customer_name || "",
		msmeRegistered: !!details.msme_applicable,
		msmeNumber: details.msme_reg_no || "",
		msmeValidityDate: sliceDate(details.msme_expiry_date),
		fssaiRegistered: !!details.fssai_applicable,
		fssai: details.fssai_no || "",
		fssaiValidityDate: sliceDate(details.fssai_expiry_date),
		cibRegistered: !!details.cib_applicable,
		cibRegn: details.cib_reg_no || "",
		cibValidityDate: sliceDate(details.cib_expiry_date),
		fcoRegistered: !!details.fco_applicable,
		fcoRegn: details.fco_reg_no || "",
		fcoValidityDate: sliceDate(details.fco_expiry_date),
	};
}

/** Evaluate applicable customer licences (MSME / FSSAI / CIB / FCO). */
export function getCustomerLicenseAlerts(
	fields: CustomerLicenseFields | null | undefined,
	asOf: Date = new Date(),
): CustomerLicenseAlert[] {
	if (!fields) return [];
	const customerLabel = (fields.customerName || "this customer").trim() || "this customer";

	return [
		evaluateOne(
			"msme",
			"MSME",
			!!fields.msmeRegistered,
			fields.msmeValidityDate,
			customerLabel,
			asOf,
		),
		evaluateOne(
			"fssai",
			"FSSAI",
			!!fields.fssaiRegistered,
			fields.fssaiValidityDate,
			customerLabel,
			asOf,
		),
		evaluateOne(
			"cib",
			"CIB",
			!!fields.cibRegistered,
			fields.cibValidityDate,
			customerLabel,
			asOf,
		),
		evaluateOne(
			"fco",
			"FCO",
			!!fields.fcoRegistered,
			fields.fcoValidityDate,
			customerLabel,
			asOf,
		),
	].filter((a): a is CustomerLicenseAlert => a != null);
}

/**
 * Show one toast per applicable licence status.
 * Order: expired → near expiry / missing → valid (so critical alerts appear first).
 */
export function showCustomerLicenseToasts(
	fields: CustomerLicenseFields | null | undefined,
	asOf: Date = new Date(),
): CustomerLicenseAlert[] {
	const alerts = getCustomerLicenseAlerts(fields, asOf);
	const rank: Record<CustomerLicenseStatus, number> = {
		expired: 0,
		near_expiry: 1,
		missing_expiry: 1,
		valid: 2,
	};
	const ordered = [...alerts].sort(
		(a, b) => rank[a.status] - rank[b.status],
	);
	for (const alert of ordered) {
		showToast(alert.message, alert.toastType);
	}
	return ordered;
}
