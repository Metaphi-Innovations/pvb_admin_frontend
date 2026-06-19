"use client";

import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { loadWarehouses } from "@/app/(app)/masters/warehouse/warehouse-data";
import { isSezGstCategory, type SezSupplyType } from "@/lib/masters/gst-compliance";
import { COMPANY_BILLING } from "@/lib/procurement/config";
import {
	MASTER_CURRENT_USER,
	masterToday,
	type MasterStatus,
} from "@/lib/masters/common";

export const LUT_SUPPLY_DECLARATION =
	"Supply under LUT without payment of IGST";

export interface LutDocument {
	fileName: string;
	dataUrl: string;
	uploadedAt: string;
}

export interface GstLutRecord {
	id: number;
	/** e.g. 2025-26 */
	financialYear: string;
	gstin: string;
	/** Empty = company-level; otherwise branch identifier */
	branchId: string;
	branchName: string;
	lutApplicable: boolean;
	lutNumber: string;
	lutValidFrom: string;
	lutValidTo: string;
	lutDocument?: LutDocument;
	status: MasterStatus;
	createdBy: string;
	createdDate: string;
	updatedBy: string;
	updatedDate: string;
}

export interface GstLutForm {
	financialYear: string;
	gstin: string;
	branchId: string;
	branchName: string;
	lutApplicable: boolean;
	lutNumber: string;
	lutValidFrom: string;
	lutValidTo: string;
	lutDocument?: LutDocument;
	status: MasterStatus;
}

export const DEFAULT_GST_LUT_FORM: GstLutForm = {
	financialYear: "",
	gstin: "",
	branchId: "",
	branchName: "",
	lutApplicable: false,
	lutNumber: "",
	lutValidFrom: "",
	lutValidTo: "",
	status: "active",
};

const STORAGE_KEY = "ds_company_gst_lut_v1";

export const GST_LUT_SEED: GstLutRecord[] = [
	{
		id: 1,
		financialYear: "2025-26",
		gstin: COMPANY_BILLING.gstNumber,
		branchId: "",
		branchName: "Head Office",
		lutApplicable: true,
		lutNumber: "LUT/2025-26/001",
		lutValidFrom: "2025-04-01",
		lutValidTo: "2026-03-31",
		status: "active",
		createdBy: MASTER_CURRENT_USER,
		createdDate: "2025-04-01",
		updatedBy: MASTER_CURRENT_USER,
		updatedDate: "2025-04-01",
	},
];

export interface FinancialYearOption {
	value: string;
	label: string;
	startDate: string;
	endDate: string;
}

export interface CompanyGstinOption {
	value: string;
	label: string;
}

export interface BranchGstinMappingOption {
	value: string;
	label: string;
	gstin: string;
	branchName: string;
}

export function normalizeFinancialYearKey(nameOrKey: string): string {
	const trimmed = nameOrKey.trim();
	if (trimmed.toUpperCase().startsWith("FY ")) {
		return trimmed.slice(3).trim();
	}
	return trimmed;
}

export function formatFinancialYearLabel(key: string): string {
	const normalized = normalizeFinancialYearKey(key);
	if (!normalized) return "—";
	return `FY ${normalized}`;
}

export function getFinancialYearOptions(): FinancialYearOption[] {
	return loadFinancialYears().map((fy) => ({
		value: normalizeFinancialYearKey(fy.name),
		label: fy.name,
		startDate: fy.startDate,
		endDate: fy.endDate,
	}));
}

export function getDefaultCompanyGstin(): string {
	return COMPANY_BILLING.gstNumber;
}

export function getCompanyGstinOptions(): CompanyGstinOption[] {
	const seen = new Set<string>();
	const options: CompanyGstinOption[] = [];

	const add = (gstin: string, label: string) => {
		const normalized = gstin.trim().toUpperCase();
		if (!normalized || seen.has(normalized)) return;
		seen.add(normalized);
		options.push({ value: normalized, label });
	};

	add(
		COMPANY_BILLING.gstNumber,
		`Company — ${COMPANY_BILLING.gstNumber}`,
	);

	for (const wh of loadWarehouses()) {
		if (wh.gstApplicable && wh.gstNumber.trim()) {
			add(wh.gstNumber, `${wh.warehouseName} — ${wh.gstNumber}`);
		}
	}

	return options;
}

export function getBranchGstinMappingOptions(): BranchGstinMappingOption[] {
	const options: BranchGstinMappingOption[] = [
		{
			value: "",
			label: "Company (no branch mapping)",
			gstin: getDefaultCompanyGstin(),
			branchName: "Head Office",
		},
	];

	for (const wh of loadWarehouses()) {
		if (!wh.gstApplicable || !wh.gstNumber.trim()) continue;
		options.push({
			value: String(wh.id),
			label: `${wh.warehouseName} — ${wh.gstNumber}`,
			gstin: wh.gstNumber.trim().toUpperCase(),
			branchName: wh.warehouseName,
		});
	}

	return options;
}

export function loadGstLutRecords(): GstLutRecord[] {
	if (typeof window === "undefined") return GST_LUT_SEED;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return GST_LUT_SEED;
		return JSON.parse(raw) as GstLutRecord[];
	} catch {
		return GST_LUT_SEED;
	}
}

export function saveGstLutRecords(records: GstLutRecord[]): void {
	if (typeof window === "undefined") return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function nextGstLutId(records: GstLutRecord[]): number {
	return records.length ? Math.max(...records.map((r) => r.id)) + 1 : 1;
}

export function recordToLutForm(record: GstLutRecord): GstLutForm {
	return {
		financialYear: record.financialYear,
		gstin: record.gstin,
		branchId: record.branchId,
		branchName: record.branchName,
		lutApplicable: record.lutApplicable,
		lutNumber: record.lutNumber,
		lutValidFrom: record.lutValidFrom,
		lutValidTo: record.lutValidTo,
		lutDocument: record.lutDocument,
		status: record.status,
	};
}

export function formToLutRecord(
	form: GstLutForm,
	id: number,
	existing?: GstLutRecord,
): GstLutRecord {
	const now = masterToday();
	return {
		id,
		financialYear: normalizeFinancialYearKey(form.financialYear),
		gstin: form.gstin.trim().toUpperCase(),
		branchId: form.branchId.trim(),
		branchName: form.branchName.trim() || "Head Office",
		lutApplicable: form.lutApplicable,
		lutNumber: form.lutApplicable ? form.lutNumber.trim() : "",
		lutValidFrom: form.lutApplicable ? form.lutValidFrom : "",
		lutValidTo: form.lutApplicable ? form.lutValidTo : "",
		lutDocument: form.lutApplicable ? form.lutDocument : undefined,
		status: form.status,
		createdBy: existing?.createdBy ?? MASTER_CURRENT_USER,
		createdDate: existing?.createdDate ?? now,
		updatedBy: MASTER_CURRENT_USER,
		updatedDate: now,
	};
}

export function validateGstLutForm(form: GstLutForm): Record<string, string> {
	const errors: Record<string, string> = {};
	if (!form.financialYear.trim()) {
		errors.financialYear = "Financial year is required.";
	}
	if (!form.gstin.trim()) {
		errors.gstin = "Company GSTIN is required.";
	}
	if (form.lutApplicable) {
		if (!form.lutNumber.trim()) {
			errors.lutNumber = "LUT number is required when LUT is applicable.";
		}
		if (!form.lutValidFrom) {
			errors.lutValidFrom = "LUT valid from date is required.";
		}
		if (!form.lutValidTo) {
			errors.lutValidTo = "LUT valid to date is required.";
		}
	}
	return errors;
}

/** Resolve active LUT for SEZ supply (company GSTIN + financial year). */
export function getActiveLutForInvoice(params: {
	financialYear: string;
	gstin?: string;
	branchId?: string;
	asOfDate?: string;
}): GstLutRecord | null {
	const asOf = params.asOfDate ?? masterToday();
	const fy = normalizeFinancialYearKey(params.financialYear);
	const records = loadGstLutRecords().filter(
		(r) =>
			r.status === "active" &&
			r.lutApplicable &&
			normalizeFinancialYearKey(r.financialYear) === fy &&
			(!params.gstin ||
				r.gstin === params.gstin.trim().toUpperCase()) &&
			(!params.branchId || !r.branchId || r.branchId === params.branchId),
	);

	return (
		records.find((r) => {
			if (!r.lutValidFrom || !r.lutValidTo) return true;
			return asOf >= r.lutValidFrom && asOf <= r.lutValidTo;
		}) ?? null
	);
}

/** Derive Indian FY label from a date, e.g. 2025-26. */
export function financialYearFromDate(dateStr: string): string {
	const d = new Date(dateStr);
	if (Number.isNaN(d.getTime())) return "";
	const year = d.getFullYear();
	const month = d.getMonth() + 1;
	if (month >= 4) {
		return `${year}-${String(year + 1).slice(-2)}`;
	}
	return `${year - 1}-${String(year).slice(-2)}`;
}

export function resolveSezLutSupply(params: {
	customerGstCategory?: string;
	transactionDate: string;
	companyGstin?: string;
	branchId?: string;
}): {
	appliesLut: boolean;
	lutNumber?: string;
	declaration?: string;
	sezSupplyType?: SezSupplyType;
} {
	if (!isSezGstCategory(params.customerGstCategory)) {
		return { appliesLut: false };
	}

	const fy = financialYearFromDate(params.transactionDate);
	const lut = getActiveLutForInvoice({
		financialYear: fy,
		gstin: params.companyGstin ?? getDefaultCompanyGstin(),
		branchId: params.branchId,
		asOfDate: params.transactionDate,
	});

	if (lut) {
		return {
			appliesLut: true,
			lutNumber: lut.lutNumber,
			declaration: LUT_SUPPLY_DECLARATION,
			sezSupplyType: "lut_bond",
		};
	}

	return { appliesLut: false, sezSupplyType: "with_igst" };
}

// Backward-compatible aliases (legacy master module imports)
export type CompanyGstLutRecord = GstLutRecord;
export type CompanyGstLutForm = GstLutForm;
export const DEFAULT_COMPANY_GST_LUT_FORM = DEFAULT_GST_LUT_FORM;
export const COMPANY_GST_LUT_SEED = GST_LUT_SEED;
export const loadCompanyGstLutRecords = loadGstLutRecords;
export const saveCompanyGstLutRecords = saveGstLutRecords;
export const nextCompanyGstLutId = nextGstLutId;
export const validateCompanyGstLutForm = validateGstLutForm;
