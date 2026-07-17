"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import {
	AlertCircle,
	ChevronDown,
	Check,
	Eye,
	Download,
	Upload,
	Trash2,
	Plus,
	FileText,
	X,
	CheckCircle2,
	XCircle,
	Pencil,
	ChevronsUpDown,
	Search,
	Loader2,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "./SearchableSelect";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { formatIndianRupeeDisplay } from "@/lib/currency/indian-rupee";
import { getStandardMrp } from "@/lib/pricing/resolve-pricing";
import {
	GST_REGISTRATION_TYPE_DEFAULT,
	GST_CATEGORY_UNREGISTERED,
	deriveGstCategory,
	deriveGstRegistered,
	deriveGstRegistrationType,
	buildGstCategory,
	fetchGstRegistrationDetailsAsync,
	gstApplicableFromCategory,
	gstDetailsToAddressSnapshot,
	isGstCategoryRegistered,
	type GstAddressSnapshot,
	MSME_NUMBER_ERROR,
	validateMSMENumber,
} from "@/lib/masters/gst-compliance";
import { GstRegistrationFields, GstRegisteredToggleControl } from "@/components/masters/GstRegistrationFields";
import { ErpFormSection } from "@/components/masters/erp/ErpFormSection";
import { CustomerDistributorCreditSection } from "./CustomerDistributorCreditSection";
import {
	isDistributorConvertedForm,
	validateDistributorCreditOverride,
	hasCreditOverrideFromRecommended,
} from "@/lib/masters/customer-credit";
import { ComplianceCertificationsGrid } from "@/components/masters/erp/ComplianceCertificationsGrid";
import { BranchAddressFields } from "@/components/masters/erp/BranchAddressFields";
import { PaymentTermsFields } from "@/components/masters/erp/PaymentTermsFields";
import {
	formValuesToStructured,
	paymentTermsToLegacy,
	resolveStructuredPaymentTerms,
	structuredToFormValues,
	validatePaymentTermsForm,
	type PaymentType,
} from "@/lib/masters/payment-terms";
import { ERP } from "@/components/masters/erp/erp-form-styles";
import {
	complianceRegistrationToStored,
	validateComplianceRegistration,
	validateFSSAINumber,
	FSSAI_NUMBER_ERROR,
} from "@/lib/masters/compliance-registration";
import { ListingStatusToggle } from "@/components/listing";
import { Button } from "@/components/ui/button";
import {
	type Customer,
	type CustomerStatus,
	type CustomerProductMapping,
	COUNTRY_CODES,
	CUSTOMER_TYPE_OPTIONS,
	getActiveGeoStates,
	getDistrictsForState,
	getTerritoriesUnderDistrict,
	getPincodesForTerritory,
	getActiveSalesEmployees,
	todayStr,
	validateGSTIN,
	validatePAN,
	validateMobile,
	validateEmail,
	validatePincode,
	validateIFSC,
} from "../customer-data";
import { loadGeoNodes, getStateSelectOptions } from "../../geography/geo-data";
import { loadCustomerTypes } from "../../customer-types/customer-type-data";
import { loadProducts } from "../../products/product-data";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { CustomerCreatePayload, CustomerListRecord, CustomerBranchPayload, CustomerUpdatePayload, CustomerBranchDocumentPayload, CustomerBranchDocument, buildFileKey } from "@/services/customer-list.service";
import { useGstDropdown, usePincode, useTdsDropdown } from "@/hooks/masters";
import { useSalesmenDropdown } from "@/hooks/sales/use-sales-orders";
import { CustomerTypeDocument } from "@/services/customer-type-list.service";
import { PincodeService } from "@/services/pincode.service";

export interface BranchAddress {
	address: string;
	addressLine2?: string;
	country?: string;
	district?: string;
	town?: string;
	city: string;
	state: string;
	pincode: string;
	pincodeId?: string;
}

export interface BranchDocument {
	documentTypeId?: string;
	documentName: string;
	required: boolean;
	fileName?: string;
	fileUrl?: string;
	file?: File;
	fileKey?: string;
}

export interface CustomerBranch {
	branchName: string;
	isMain?: boolean;
	billingAddress: BranchAddress;
	shippingAddress: BranchAddress;
	documents: BranchDocument[];
}

export interface CustomerTypeWithDocs {
	id: string;
	customerType: string;
	customerInitialCode?: string
	documents?: CustomerTypeDocument[];
}

export function getDocumentsForCustomerType(
	customerTypeId: string,
	customerTypes: CustomerTypeWithDocs[],
): BranchDocument[] {
	const ct = customerTypes.find((c) => c.id === customerTypeId);
	if (!ct?.documents?.length) return [];
	return ct.documents.map((d) => ({
		documentTypeId: d.documentTypeId,
		documentName: d.documentType?.title ?? "",
		required: true,
	}));
}

function extractPreviewSequence(previewNumber: string): string {
	const parts = previewNumber.split("-");
	return parts.length > 1 ? parts[parts.length - 1] : previewNumber;
}

export interface CustomerFormValues {
	customerName: string;
	countryCode: string;
	mobile: string;
	email: string;
	customerType: string;
	status: CustomerStatus;
	blockReason: string;
	gstApplicable: boolean;
	gstRegistered: boolean;
	gstRegistrationType: string;
	gstCategory: string;
	gstin: string;
	registeredLegalName: string;
	registeredAddress: string;
	gstMasterId: string;
	tdsApplicable: boolean;
	tdsMasterId: string;
	pan: string;
	msmeRegistered: boolean;
	msmeNumber: string;
	fssaiRegistered: boolean;
	cibRegistered: boolean;
	fcoRegistered: boolean;
	cibRegn: string;
	fcoRegn: string;
	fssai: string;
	address: string;
	stateId: string;
	districtId: string;
	territoryId: string;
	pincode: string;
	salesManId: string;
	creditLimit: string;
	paymentType: PaymentType | "";
	creditDays: string;
	advancePercentage: string;
	creditSource: "" | "direct" | "distributor_conversion";
	linkedDistributorId: string;
	linkedDistributorName: string;
	distributorScore: string;
	distributorCategory: string;
	recommendedCreditLimit: string;
	recommendedCreditDays: string;
	recommendedCreditStatus: string;
	finalCreditStatus: string;
	creditOverrideReason: string;
	bankName: string;
	bankBranchAddress: string;
	bankAccountNo: string;
	ifscCode: string;

	// New aligned bank fields
	accountHolderName: string;
	branch: string;
	accountNumber: string;
	confirmAccountNumber: string;
	swiftCode: string;
	requiredDocuments: {
		documentTypeId: string;
		documentName: string;
		required: true;
		fileName?: string;
		fileUrl?: string;
		file?: File;
	}[];
	additionalDocuments: {
		id: string;
		title: string;
		fileName?: string;
		fileUrl?: string;
		file?: File;
	}[];

	// NEW FIELDS
	customerProducts: CustomerProductMapping[];
	branches: CustomerBranch[];
}

export const DEFAULT_CUSTOMER_FORM: CustomerFormValues = {
	customerName: "",
	countryCode: "+91",
	mobile: "",
	email: "",
	customerType: "",
	status: "draft",
	blockReason: "",
	gstApplicable: false,
	gstRegistered: false,
	gstRegistrationType: GST_REGISTRATION_TYPE_DEFAULT,
	gstCategory: GST_CATEGORY_UNREGISTERED,
	gstin: "",
	registeredLegalName: "",
	registeredAddress: "",
	gstMasterId: "",
	tdsApplicable: true,
	tdsMasterId: "",
	pan: "",
	msmeRegistered: false,
	msmeNumber: "",
	fssaiRegistered: false,
	cibRegistered: false,
	fcoRegistered: false,
	cibRegn: "",
	fcoRegn: "",
	fssai: "",
	address: "",
	stateId: "",
	districtId: "",
	territoryId: "",
	pincode: "",
	salesManId: "",
	creditLimit: "",
	paymentType: "credit",
	creditDays: "30",
	advancePercentage: "",
	creditSource: "direct",
	linkedDistributorId: "",
	linkedDistributorName: "",
	distributorScore: "",
	distributorCategory: "",
	recommendedCreditLimit: "",
	recommendedCreditDays: "",
	recommendedCreditStatus: "",
	finalCreditStatus: "Credit Allowed",
	creditOverrideReason: "",
	bankName: "",
	bankBranchAddress: "",
	bankAccountNo: "",
	ifscCode: "",
	accountHolderName: "",
	branch: "",
	accountNumber: "",
	confirmAccountNumber: "",
	swiftCode: "",
	requiredDocuments: [],
	additionalDocuments: [],

	// NEW FIELDS
	customerProducts: [],
	branches: [
		{
			branchName: "Main Branch",
			isMain: true,
			billingAddress: {
				address: "",
				addressLine2: "",
				country: "India",
				district: "",
				town: "",
				city: "",
				state: "",
				pincode: "",
			},
			shippingAddress: {
				address: "",
				addressLine2: "",
				country: "India",
				district: "",
				town: "",
				city: "",
				state: "",
				pincode: "",
			},
			documents: [],
		},
	],
};

export function customerToFormValues(c: Customer, customerTypes: CustomerTypeWithDocs[]): CustomerFormValues {
	const gstCategory =
		c.gstCategory || deriveGstCategory(c.gstApplicable, c.gstin);
	const gstRegistered = deriveGstRegistered(
		c.gstApplicable,
		c.gstin,
		gstCategory,
	);
	return {
		customerName: c.customerName,
		countryCode: c.countryCode || "+91",
		mobile: c.mobile,
		email: c.email,
		customerType: c.customerType,
		status: c.status,
		blockReason: c.blockReason ?? "",
		gstApplicable: gstApplicableFromCategory(gstCategory),
		gstRegistered,
		gstRegistrationType: deriveGstRegistrationType(gstCategory),
		gstCategory,
		gstin: c.gstin,
		registeredLegalName: c.registeredLegalName ?? "",
		registeredAddress: c.registeredAddress ?? "",
		gstMasterId: c.gstMasterId != null ? String(c.gstMasterId) : "",
		tdsApplicable: c.tdsApplicable,
		tdsMasterId: c.tdsMasterId != null ? String(c.tdsMasterId) : "",
		pan: c.pan ?? "",
		msmeRegistered: c.msmeRegistered ?? false,
		msmeNumber: c.msmeNumber ?? "",
		fssaiRegistered: c.fssaiRegistered ?? !!c.fssai?.trim(),
		cibRegistered: c.cibRegistered ?? !!c.cibRegn?.trim(),
		fcoRegistered: c.fcoRegistered ?? !!c.fcoRegn?.trim(),
		cibRegn: c.cibRegn,
		fcoRegn: c.fcoRegn,
		fssai: c.fssai,
		address: c.address || "",
		stateId: c.stateId != null ? String(c.stateId) : "",
		districtId: c.districtId != null ? String(c.districtId) : "",
		territoryId: c.territoryId != null ? String(c.territoryId) : "",
		pincode: c.pincode || "",
		salesManId: c.salesManId != null ? String(c.salesManId) : "",
		creditLimit: c.creditLimit ? String(c.creditLimit) : "",
		creditSource: c.creditSource ?? (c.linkedDistributorId ? "distributor_conversion" : "direct"),
		linkedDistributorId: c.linkedDistributorId != null ? String(c.linkedDistributorId) : "",
		linkedDistributorName: c.linkedDistributorName ?? "",
		distributorScore:
			c.distributorScore != null ? String(c.distributorScore) : "",
		distributorCategory: c.distributorCategory ?? "",
		recommendedCreditLimit:
			c.recommendedCreditLimit != null ? String(c.recommendedCreditLimit) : "",
		recommendedCreditDays:
			c.recommendedCreditDays != null ? String(c.recommendedCreditDays) : "",
		recommendedCreditStatus: c.recommendedCreditStatus ?? "",
		finalCreditStatus: c.finalCreditStatus ?? c.recommendedCreditStatus ?? "Credit Allowed",
		creditOverrideReason: c.creditOverrideReason ?? "",
		...structuredToFormValues(
			resolveStructuredPaymentTerms({
				paymentType: c.paymentType,
				creditDays: c.creditDays,
				advancePercentage: c.advancePercentage,
				paymentTerms: c.paymentTerms,
			}),
		),
		bankName: c.bankName,
		bankBranchAddress: c.bankBranchAddress,
		bankAccountNo: c.bankAccountNo,
		ifscCode: c.ifscCode,
		accountHolderName: c.accountHolderName || "",
		branch: c.branch || c.bankBranchAddress || "",
		accountNumber: c.bankAccountNo || "",
		confirmAccountNumber: c.bankAccountNo || "",
		swiftCode: c.swiftCode || "",
		requiredDocuments: c.documents?.requiredDocuments || [],
		additionalDocuments: c.documents?.additionalDocuments || [],

		// Fallback mapping for existing customer structure
		customerProducts: (c as any).customerProducts || (c as any).products || [],
		branches: (
			(c as any).branches || [
				{
					branchName: "Main Branch",
					isMain: true,
					billingAddress: {
						address: c.address || "",
						city: c.districtName || "",
						state: c.stateName || "",
						pincode: c.pincode || "",
					},
					shippingAddress: {
						address: c.address || "",
						city: c.districtName || "",
						state: c.stateName || "",
						pincode: c.pincode || "",
					},
					documents: getDocumentsForCustomerType(c.customerType, customerTypes).map((doc) => {
						const existingDoc = c.documents?.requiredDocuments?.find(
							(rd) => rd.documentTypeId === doc.documentTypeId,
						);
						return {
							...doc,
							fileName: existingDoc?.fileName,
							fileUrl: existingDoc?.fileUrl,
						};
					}),
				},
			]
		).map((b: any, idx: number, arr: any[]) => {
			const hasMain = arr.some((x) => x.isMain);
			const isThisMain = hasMain
				? !!b.isMain
				: b.branchName === "Main Branch" || idx === 0;
			return {
				...b,
				isMain: isThisMain,
			};
		}),
	};
}

interface ToastState {
	msg: string;
	type: "success" | "error";
}

function LocalToast({
	toast,
	onDismiss,
}: {
	toast: ToastState;
	onDismiss: () => void;
}) {
	return (
		<div
			className={cn(
				"fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
				"animate-in slide-in-from-top-2 fade-in-0 duration-300",
				toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
			)}
		>
			{toast.type === "success" ? (
				<CheckCircle2 className='flex-shrink-0 w-4 h-4' />
			) : (
				<XCircle className='flex-shrink-0 w-4 h-4' />
			)}
			{toast.msg}
			<button onClick={onDismiss} className='ml-1 opacity-70 hover:opacity-100'>
				<X className='w-3.5 h-3.5' />
			</button>
		</div>
	);
}

function FieldError({ msg }: { msg?: string }) {
	if (!msg) return null;
	return (
		<p className='flex items-center gap-1 mt-1 text-[11px] text-red-500'>
			<AlertCircle className='flex-shrink-0 w-3 h-3' />
			{msg}
		</p>
	);
}

// const YES_NO_OPTIONS = [
// 	{ value: "yes", label: "Yes" },
// 	{ value: "no", label: "No" },
// ];

// const STATUS_OPTIONS = [
// 	{ value: "active", label: "Active" },
// 	{ value: "inactive", label: "Inactive" },
// 	{ value: "draft", label: "Draft" },
// 	{ value: "blocked", label: "Blocked" },
// ];

// function SectionHead({ label, sub }: { label: string; sub?: string }) {
// 	return (
// 		<div className='mb-2.5 mt-0.5'>
// 			<div className='flex items-center gap-2'>
// 				<span className='w-[3px] h-3.5 rounded-full bg-[#E57A1F] flex-shrink-0' />
// 				<p className='text-[10px] font-bold uppercase tracking-widest text-[#0F172A]'>
// 					{label}
// 				</p>
// 			</div>
// 			{sub && <p className='text-[11px] text-muted-foreground mt-0.5'>{sub}</p>}
// 		</div>
// 	);
// }

function CountryCodePicker({
	value,
	onChange,
	disabled,
	hasError,
}: {
	value: string;
	onChange: (v: string) => void;
	disabled?: boolean;
	hasError?: boolean;
}) {
	const [open, setOpen] = useState(false);
	return (
		<Popover open={open && !disabled} onOpenChange={setOpen}>
			<PopoverTrigger asChild disabled={disabled}>
				<button
					type='button'
					disabled={disabled}
					className={cn(
						"h-8 px-2 text-xs border border-border rounded-lg bg-background flex items-center gap-1 hover:bg-muted/30 transition-colors flex-shrink-0",
						hasError && "border-red-400",
						disabled && "opacity-50 cursor-not-allowed bg-muted/30",
					)}
				>
					<span className='font-medium text-foreground'>{value}</span>
					<ChevronDown className='w-3 h-3 text-muted-foreground' />
				</button>
			</PopoverTrigger>
			<PopoverContent align='start' className='p-1 w-52'>
				{COUNTRY_CODES.map((cc) => (
					<button
						key={cc.code}
						type='button'
						onClick={() => {
							onChange(cc.code);
							setOpen(false);
						}}
						className={cn(
							"w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-muted/60 transition-colors flex items-center justify-between",
							value === cc.code && "bg-brand-50 text-brand-700",
						)}
					>
						{cc.label}
						{value === cc.code && <Check className='w-3 h-3 text-brand-600' />}
					</button>
				))}
			</PopoverContent>
		</Popover>
	);
}

function normalizeStateToOptionValue(
	raw: string,
	options: { value: string; label: string }[],
): string {
	const trimmed = raw.trim();
	if (!trimmed) return "";

	const exact = options.find((opt) => opt.value === trimmed);
	if (exact) return exact.value;

	const caseInsensitive = options.find(
		(opt) => opt.value.toLowerCase() === trimmed.toLowerCase(),
	);
	if (caseInsensitive) return caseInsensitive.value;

	const withoutSuffix = trimmed.replace(/\s+state$/i, "").trim();
	const suffixMatch = options.find(
		(opt) => opt.value.toLowerCase() === withoutSuffix.toLowerCase(),
	);
	if (suffixMatch) return suffixMatch.value;

	return trimmed;
}

function BranchAddressWithPincode({
	address,
	onChange,
	readOnly,
	stateOptions,
	errors,
}: {
	address: BranchAddress;
	onChange: (addr: BranchAddress) => void;
	readOnly?: boolean;
	stateOptions: ReturnType<typeof getStateSelectOptions>;
	errors?: Record<string, string | undefined>;
}) {
	const pincodeDigits = address.pincode.trim();
	const isCompletePincode = /^\d{6}$/.test(pincodeDigits);
	const pincodeQuery = usePincode(isCompletePincode ? pincodeDigits : null);
	const pincodeRecords = pincodeQuery.data ?? [];

	/** Unique states from pincode master rows (case-insensitive). */
	const uniqueStates = useMemo(() => {
		const seen = new Map<string, string>();
		for (const row of pincodeRecords) {
			const name = String(row.statename ?? "").trim();
			if (!name) continue;
			const key = name.toLowerCase();
			if (!seen.has(key)) seen.set(key, name);
		}
		return Array.from(seen.values());
	}, [pincodeRecords]);

	const townOptions = useMemo(() => {
		const towns = pincodeRecords
			.map((row) => String(row.officename ?? "").trim())
			.filter(Boolean);
		return Array.from(new Set(towns)).sort((a, b) => a.localeCompare(b));
	}, [pincodeRecords]);

	/**
	 * After a pincode match, only expose the state(s) that belong to that pincode.
	 * Prevents the full India state list from appearing for multi-office pincodes.
	 */
	const resolvedStateOptions = useMemo(() => {
		if (!isCompletePincode || pincodeRecords.length === 0) {
			return stateOptions;
		}
		if (uniqueStates.length === 0) {
			return stateOptions;
		}

		const matched = stateOptions.filter((opt) =>
			uniqueStates.some(
				(state) =>
					normalizeStateToOptionValue(state, stateOptions).toLowerCase() ===
					opt.value.toLowerCase(),
			),
		);
		if (matched.length > 0) return matched;

		return uniqueStates.map((state) => {
			const value = normalizeStateToOptionValue(state, stateOptions) || state;
			const fromGeo = stateOptions.find((opt) => opt.value === value);
			return fromGeo ?? { value, label: value };
		});
	}, [isCompletePincode, pincodeRecords.length, stateOptions, uniqueStates]);

	useEffect(() => {
		if (!isCompletePincode || pincodeRecords.length === 0) return;

		const preferredTown = address.town?.trim().toLowerCase();
		const matchedTown = preferredTown
			? pincodeRecords.find(
					(row) =>
						String(row.officename ?? "").trim().toLowerCase() === preferredTown,
				)
			: undefined;
		const pick = matchedTown ?? pincodeRecords[0];
		const rawState =
			uniqueStates.length === 1
				? uniqueStates[0]
				: String(pick.statename ?? "").trim() || address.state;
		const nextState = normalizeStateToOptionValue(rawState, stateOptions) || rawState;
		const nextDistrict = String(pick.district ?? "").trim() || address.district;
		const nextTown =
			pincodeRecords.length === 1
				? String(pick.officename ?? "").trim() || address.town
				: address.town;
		const nextCity =
			String(pick.district ?? "").trim() ||
			String(pick.officename ?? "").trim() ||
			address.city;
		const nextPincodeId =
			matchedTown?.id ||
			(pincodeRecords.length === 1 ? pick.id : address.pincodeId);

		const unchanged =
			address.state === nextState &&
			(address.district ?? "") === (nextDistrict ?? "") &&
			(address.town ?? "") === (nextTown ?? "") &&
			address.city === nextCity &&
			address.pincodeId === nextPincodeId;
		if (unchanged) return;

		onChange({
			...address,
			state: nextState,
			district: nextDistrict,
			town: nextTown,
			city: nextCity,
			pincodeId: nextPincodeId,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pincodeRecords, uniqueStates, isCompletePincode, stateOptions]);

	const handleAddressChange = (next: BranchAddress) => {
		if (
			isCompletePincode &&
			pincodeRecords.length > 0 &&
			next.town?.trim() &&
			next.town !== address.town
		) {
			const match = pincodeRecords.find(
				(row) =>
					String(row.officename ?? "").trim().toLowerCase() ===
					next.town!.trim().toLowerCase(),
			);
			if (match) {
				const rawState =
					uniqueStates.length === 1
						? uniqueStates[0]
						: String(match.statename ?? "").trim() || next.state;
				onChange({
					...next,
					pincodeId: match.id,
					district: String(match.district ?? "").trim() || next.district,
					state: normalizeStateToOptionValue(rawState, stateOptions) || rawState,
					city:
						String(match.district ?? "").trim() ||
						String(match.officename ?? "").trim() ||
						next.city,
				});
				return;
			}
		}
		onChange(next);
	};

	const handlePincodeChange = (raw: string) => {
		const digits = raw.replace(/\D/g, "").slice(0, 6);
		if (digits.length < 6) {
			onChange({
				...address,
				pincode: digits,
				city: "",
				town: "",
				district: "",
				state: "",
				pincodeId: undefined,
			});
			return;
		}
		onChange({ ...address, pincode: digits });
	};

	return (
		<BranchAddressFields
			address={address}
			onChange={handleAddressChange}
			onPincodeChange={handlePincodeChange}
			readOnly={readOnly}
			stateOptions={resolvedStateOptions}
			townOptions={pincodeRecords.length > 0 ? townOptions : undefined}
			forceGeographyLocked={false}
			errors={errors}
		/>
	);
}

interface ProductCatalogItem {
	productId: string;
	numericId: number;
	productName: string;
	sku: string;
	category?: string;
	unit?: string;
	packSize?: string;
	hsnCode?: string;
	gstRate?: string;
}

// function ProductSelect({
// 	products,
// 	value,
// 	onSelect,
// 	disabled,
// }: {
// 	products: ProductCatalogItem[];
// 	value: string;
// 	onSelect: (product: ProductCatalogItem) => void;
// 	disabled?: boolean;
// }) {
// 	const options = products.map((p) => ({
// 		value: p.productId,
// 		label: `${p.sku} - ${p.productName}`,
// 		sublabel: [
// 			p.category ? `Category: ${p.category}` : "",
// 			p.unit ? `Unit: ${p.unit}` : "",
// 			p.packSize ? `Pack Size: ${p.packSize}` : "",
// 			p.hsnCode ? `HSN: ${p.hsnCode}` : "",
// 			p.gstRate ? `GST: ${p.gstRate}` : "",
// 		]
// 			.filter(Boolean)
// 			.join(" | "),
// 		trailing: (
// 			<span className='text-[10px] text-muted-foreground'>
// 				MRP: {formatIndianRupeeDisplay(getStandardMrp(p.numericId))}
// 			</span>
// 		),
// 	}));

// 	return (
// 		<AutocompleteSelect
// 			options={options}
// 			value={value}
// 			onChange={(val) => {
// 				const prod = products.find((p) => p.productId === val);
// 				if (prod) onSelect(prod);
// 			}}
// 			placeholder='Select product by name, SKU, or code'
// 			searchPlaceholder='Search product...'
// 			disabled={disabled}
// 			className='h-8 text-xs font-normal'
// 			renderTriggerLabel={(selectedOpt) => {
// 				const option = Array.isArray(selectedOpt)
// 					? selectedOpt[0]
// 					: selectedOpt;
// 				if (!option) return "Select product by name, SKU, or code";
// 				const prod = products.find((p) => p.productId === option.value);
// 				const meta = prod
// 					? [
// 						prod.category ? `Category: ${prod.category}` : "",
// 						prod.unit ? `Unit: ${prod.unit}` : "",
// 						prod.packSize ? `Pack Size: ${prod.packSize}` : "",
// 						prod.hsnCode ? `HSN: ${prod.hsnCode}` : "",
// 						prod.gstRate ? `GST: ${prod.gstRate}` : "",
// 					]
// 						.filter(Boolean)
// 						.join(" | ")
// 					: "";
// 				return (
// 					<span className='flex items-center min-w-0 gap-2'>
// 						<span className='truncate text-foreground'>{option.label}</span>
// 						{meta && (
// 							<span className='truncate text-[10px] text-muted-foreground'>
// 								{meta}
// 							</span>
// 						)}
// 					</span>
// 				);
// 			}}
// 		/>
// 	);
// }

interface CustomerFormProps {
	form: CustomerFormValues;
	onChange: (form: CustomerFormValues) => void;
	errors: Record<string, string>;
	onSetErrors?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
	onClearError: (key: string) => void;
	readOnly?: boolean;
	isAdd?: boolean;
	/** Auto-generated code preview (add) or stored code (edit). */
	customerCode?: string;
	customerTypes: {
		id: string;
		customerType: string;
		documents: CustomerTypeDocument[];
	}[];
}

function branchDocumentsToPayload(
	documents: BranchDocument[],
	branchIndex: number,
): CustomerBranchDocumentPayload[] {
	return documents
		.filter((d): d is BranchDocument & { documentTypeId: string; file: File } =>
			!!d.documentTypeId && !!d.file,
		)
		.map((d) => ({
			document_type_id: d.documentTypeId,
			file_key: buildFileKey(branchIndex, d.documentTypeId),
		}));
}

function branchToPayload(
	branch: CustomerBranch,
	idx: number,
): { payload: CustomerBranchPayload } {
	return {
		payload: {
			branch_name: branch.branchName || `Branch #${idx + 1}`,
			is_main_branch: !!branch.isMain,

			billing_country: branch.billingAddress.country || "India",
			billing_address_line_1: branch.billingAddress.address,
			billing_address_line_2: branch.billingAddress.addressLine2 || "",
			billing_state: branch.billingAddress.state,
			billing_city: branch.billingAddress.city,
			billing_town: branch.billingAddress.town || "",
			billing_pincode: branch.billingAddress.pincode,
			billing_pincode_id: branch.billingAddress.pincodeId || "",

			shipping_country: branch.shippingAddress.country || "India",
			shipping_address_line_1: branch.shippingAddress.address,
			shipping_address_line_2: branch.shippingAddress.addressLine2 || "",
			shipping_state: branch.shippingAddress.state,
			shipping_city: branch.shippingAddress.city,
			shipping_town: branch.shippingAddress.town || "",
			shipping_pincode: branch.shippingAddress.pincode,
			shipping_pincode_id: branch.shippingAddress.pincodeId || "",

			documents: branchDocumentsToPayload(branch.documents, idx),

		},
	};
}

export function CustomerForm({
	form,
	onChange,
	errors,
	onSetErrors,
	onClearError,
	readOnly,
	isAdd,
	customerCode,
	customerTypes,
}: CustomerFormProps) {
	const { data: gstDropdownItems = [] } = useGstDropdown();
	const { data: tdsDropdownItems = [] } = useTdsDropdown();
	const { data: salesmanData = [] } = useSalesmenDropdown();

	const [geoNodes] = useState(() =>
		typeof window !== "undefined" ? loadGeoNodes() : [],
	);

	const stateOptions = useMemo(
		() => getStateSelectOptions(geoNodes),
		[geoNodes],
	);

	const [expandedBranches, setExpandedBranches] = useState<
		Record<number, boolean>
	>({ 0: true });
	const [expandedChecklists, setExpandedChecklists] = useState<
		Record<number, boolean>
	>({});
	const [bulkProductIds, setBulkProductIds] = useState<string[]>([]);
	const [fetchingGst, setFetchingGst] = useState(false);
	const [gstAddressSnapshot, setGstAddressSnapshot] =
		useState<GstAddressSnapshot | null>(null);

	const gstRegistered = form.gstRegistered;

	const handleFetchGst = async () => {
		if (readOnly) return;
		if (!form.gstin.trim()) {
			showToast("Enter GSTIN before fetching details.", "error");
			return;
		}
		if (!validateGSTIN(form.gstin)) {
			showToast("Enter a valid 15-character GSTIN.", "error");
			return;
		}
		setFetchingGst(true);
		try {
			const details = await fetchGstRegistrationDetailsAsync(form.gstin);
			if (!details) {
				showToast("Could not fetch GST details. Check GSTIN format.", "error");
				return;
			}
			const snap = gstDetailsToAddressSnapshot(details);

			let pincodeId: string | undefined;
			if (snap.pincode && /^\d{6}$/.test(snap.pincode.trim())) {
				const pincodeRecords = await PincodeService.getByPincode(snap.pincode.trim());
				if (pincodeRecords.length > 0) {
					pincodeId = pincodeRecords[0].id;
				}
			}

			const enrichedSnap = { ...snap, pincodeId };
			setGstAddressSnapshot(enrichedSnap);
			const displayName = details.tradeName || details.legalBusinessName;
			const updatedBranches = form.branches.map((b, idx) => {
				const isMain =
					b.isMain || (!form.branches.some((x) => x.isMain) && idx === 0);
				if (!isMain) return b;
				return {
					...b,
					billingAddress: {
						...enrichedSnap,
						addressLine2: enrichedSnap.addressLine2 ?? "",
						country: enrichedSnap.country ?? "India",
						district: enrichedSnap.district ?? enrichedSnap.city,
					},
					shippingAddress: {
						...enrichedSnap,
						addressLine2: enrichedSnap.addressLine2 ?? "",
						country: enrichedSnap.country ?? "India",
						district: enrichedSnap.district ?? enrichedSnap.city,
					},
				};
			});
			onChange({
				...form,
				registeredLegalName: details.legalBusinessName || displayName,
				registeredAddress: details.registeredAddress,
				customerName: form.customerName.trim() || displayName,
				pan: form.pan.trim() || form.gstin.trim().slice(2, 12),
				branches: updatedBranches,
			});
			showToast("GST details fetched and applied.", "success");
		} finally {
			setFetchingGst(false);
		}
	};

	const copyGstAddressToBranch = (bIdx: number) => {
		if (!gstAddressSnapshot) {
			showToast("Fetch GST details first to copy the registered address.", "error");
			return;
		}
		const updatedBranches = form.branches.map((b, idx) =>
			idx === bIdx
				? {
					...b,
					billingAddress: { ...gstAddressSnapshot },
					shippingAddress: { ...gstAddressSnapshot },
				}
				: b,
		);
		onChange({ ...form, branches: updatedBranches });
		showToast("GST registered address copied to branch.", "success");
	};

	const [toastState, setToastState] = useState<ToastState | null>(null);
	const showToast = (msg: string, type: "success" | "error") => {
		setToastState({ msg, type });
		setTimeout(() => setToastState(null), 3200);
	};

	const [previewDoc, setPreviewDoc] = useState<{
		title: string;
		fileUrl: string;
		fileName: string;
	} | null>(null);

	// States for adding additional documents
	const [activeBranchUpload, setActiveBranchUpload] = useState<{
		branchIndex: number;
		docIndex: number;
	} | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const triggerBranchUpload = (branchIndex: number, docIndex: number) => {
		setActiveBranchUpload({ branchIndex, docIndex });
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
			fileInputRef.current.click();
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (!activeBranchUpload) return;

		const { branchIndex, docIndex } = activeBranchUpload;
		const fileUrl = URL.createObjectURL(file);
		const fileName = file.name;

		const updatedBranches = [...form.branches];
		updatedBranches[branchIndex] = {
			...updatedBranches[branchIndex],
			documents: updatedBranches[branchIndex].documents.map((doc, idx) =>
				idx === docIndex ? { ...doc, fileName, fileUrl, file } : doc,
			),
		};
		onChange({ ...form, branches: updatedBranches });
		showToast("Document selected.", "success");
		setActiveBranchUpload(null);
	};
	// console.log('customerTypes[0]:', customerTypes[0]); // ⬅ add here

	const customerTypeOptions = useMemo(() => {
		return customerTypes.map((ct) => ({
			value: ct.id,
			label: ct.customerType,
		}));
	}, [customerTypes]);

	const set = <K extends keyof CustomerFormValues>(
		key: K,
		value: CustomerFormValues[K],
	) => {
		onChange({ ...form, [key]: value });
		onClearError(key);
	};

	const states = useMemo(() => getActiveGeoStates(geoNodes), [geoNodes]);

	const districts = useMemo(() => {
		if (!form.stateId) return [];
		return getDistrictsForState(Number(form.stateId), geoNodes);
	}, [form.stateId, geoNodes]);

	const territories = useMemo(() => {
		if (!form.districtId) return [];
		return getTerritoriesUnderDistrict(Number(form.districtId), geoNodes);
	}, [form.districtId, geoNodes]);

	const pincodeOptions = useMemo(() => {
		if (!form.territoryId) return [];
		return getPincodesForTerritory(Number(form.territoryId), geoNodes);
	}, [form.territoryId, geoNodes]);

	const salesOptions = useMemo(() => {
		return salesmanData.map((s: any) => {
			const name = `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.username || "";
			const label = s.geo_region ? `${name} (${s.geo_region})` : name;
			return {
				value: String(s.user_id),
				label,
				sublabel: [s.employee_id || s.username, s.mobile_no || s.mobile, s.role?.role_name || s.role_type]
					.filter(Boolean)
					.join(" - "),
			};
		});
	}, [salesmanData]);

	const activeProducts = useMemo((): ProductCatalogItem[] => {
		return loadProducts()
			.filter((p) => p.status === "active")
			.map((p) => ({
				productId: p.sku,
				numericId: p.id,
				productName: p.productName,
				sku: p.sku,
				category: p.category,
				unit: p.baseUnit,
				packSize: p.packagingUnit,
				hsnCode: p.hsnCode,
				gstRate: p.gstRate,
			}));
	}, []);
	const productOptions = useMemo(() => {
		return activeProducts.map((p) => ({
			value: p.productId,
			label: `${p.sku} - ${p.productName}`,
		}));
	}, [activeProducts]);

	useEffect(() => {
		if (
			form.districtId &&
			!districts.some((d) => String(d.id) === form.districtId)
		) {
			onChange({ ...form, districtId: "", territoryId: "", pincode: "" });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [form.stateId]);

	useEffect(() => {
		if (
			form.territoryId &&
			!territories.some((t) => String(t.id) === form.territoryId)
		) {
			onChange({ ...form, territoryId: "", pincode: "" });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [form.districtId]);

	useEffect(() => {
		onSetErrors?.((prev) => {
			const next = { ...prev };
			let changed = false;
			Object.keys(next).forEach((key) => {
				if (key.startsWith("product_")) {
					delete next[key];
					changed = true;
				}
			});
			return changed ? next : prev;
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [form.customerProducts]);

	const setProductFieldError = (index: number, msg: string) => {
		onSetErrors?.((prev) => ({
			...prev,
			[`product_${index}_id`]: msg,
		}));
	};

	const clearProductFieldError = (index: number) => {
		onSetErrors?.((prev) => {
			const next = { ...prev };
			delete next[`product_${index}_id`];
			return next;
		});
	};

	const addProductRow = () => {
		const incompleteIndex = (form.customerProducts || []).findIndex(
			(product) => !product.productId || !product.productName?.trim(),
		);

		if (incompleteIndex !== -1) {
			setProductFieldError(incompleteIndex, "Product is required.");
			showToast("Please select a product before adding.", "error");
			return;
		}

		const newId = `cp-${Math.random().toString(36).substring(2, 9)}`;
		const newRow = {
			id: newId,
			productId: "",
			productName: "",
			price: undefined,
			status: "Active" as const,
		};
		onChange({
			...form,
			customerProducts: [...(form.customerProducts || []), newRow],
		});
	};

	const addSelectedProducts = () => {
		if (bulkProductIds.length === 0) return;

		const selectedIds = Array.from(new Set(bulkProductIds));
		const existingIds = new Set(
			(form.customerProducts || []).map((product) => product.productId),
		);
		const selectedProducts = activeProducts.filter((product) =>
			selectedIds.includes(product.productId),
		);

		const nextRows = [...(form.customerProducts || [])];
		let addedCount = 0;

		for (const prod of selectedProducts) {
			if (existingIds.has(prod.productId)) continue;

			nextRows.push({
				id: `cp-${Math.random().toString(36).substring(2, 9)}`,
				productId: prod.productId,
				productName: prod.productName,
				sku: prod.sku,
				price: undefined,
				status: "Active" as const,
			});
			existingIds.add(prod.productId);
			addedCount += 1;
		}

		if (addedCount === 0) {
			showToast("All selected products are already mapped.", "error");
			return;
		}

		onChange({
			...form,
			customerProducts: nextRows,
		});
		setBulkProductIds([]);
		showToast(
			`${addedCount} product${addedCount === 1 ? "" : "s"} added.`,
			"success",
		);
	};

	const updateProductRow = (
		id: string,
		patch: Partial<CustomerProductMapping>,
	) => {
		if (patch.productId) {
			const isDuplicate = (form.customerProducts || []).some(
				(p) => p.id !== id && p.productId === patch.productId,
			);
			if (isDuplicate) {
				const rowIndex = (form.customerProducts || []).findIndex((p) => p.id === id);
				if (rowIndex !== -1) {
					setProductFieldError(rowIndex, "Duplicate product mapping is not allowed.");
				}
				showToast("This product is already mapped.", "error");
				return;
			}
		}

		const updated = (form.customerProducts || []).map((p) => {
			if (p.id !== id) return p;
			return { ...p, ...patch };
		});
		const rowIndex = updated.findIndex((product) => product.id === id);
		if (
			rowIndex !== -1 &&
			updated[rowIndex].productId &&
			updated[rowIndex].productName?.trim()
		) {
			clearProductFieldError(rowIndex);
		}
		onChange({ ...form, customerProducts: updated });
	};

	const removeProductRow = (id: string) => {
		const updated = (form.customerProducts || []).filter((p) => p.id !== id);
		onChange({ ...form, customerProducts: updated });
	};

	const setBranchAsMain = (bIdx: number) => {
		const updated = form.branches.map((b, idx) => ({
			...b,
			isMain: idx === bIdx,
		}));
		onChange({ ...form, branches: updated });
	};

	const updateBranchBillingAddress = (bIdx: number, addr: BranchAddress) => {
		const updated = [...form.branches];
		updated[bIdx] = { ...updated[bIdx], billingAddress: addr };
		onChange({ ...form, branches: updated });
	};

	const updateBranchShippingAddress = (bIdx: number, addr: BranchAddress) => {
		const updated = [...form.branches];
		updated[bIdx] = { ...updated[bIdx], shippingAddress: addr };
		onChange({ ...form, branches: updated });
	};

	const validateComplianceField = (fieldKey: string) => {
		if (!onSetErrors) return;
		onSetErrors((prev) => {
			const next = { ...prev };
			if (fieldKey === "msmeNumber" && form.msmeRegistered) {
				if (!form.msmeNumber.trim() || !validateMSMENumber(form.msmeNumber)) {
					next.msmeNumber = MSME_NUMBER_ERROR;
				} else {
					delete next.msmeNumber;
				}
			}
			if (fieldKey === "fssai" && form.fssaiRegistered) {
				if (!form.fssai.trim() || !validateFSSAINumber(form.fssai)) {
					next.fssai = FSSAI_NUMBER_ERROR;
				} else {
					delete next.fssai;
				}
			}
			return next;
		});
	};

	const inputCls = (key: string) =>
		cn(
			ERP.input,
			errors[key] && "border-red-400 focus-visible:ring-red-300",
		);
	const textareaCls = (key?: string) =>
		cn("text-xs resize-none min-h-[56px]", key && errors[key] && "border-red-400");
	const vendorFieldClass = (key: string) =>
		cn(
			ERP.input,
			"border-border/70 rounded-md bg-white shadow-none focus-visible:ring-1 focus-visible:ring-brand-500/30",
			errors[key] && "border-red-400 focus-visible:ring-red-300",
		);

	const panTdsFooter = (
		<div
			className={cn(
				"space-y-2",
				form.gstRegistered ? "pt-1.5 border-t border-border/50" : "",
			)}
		>
			<div className={ERP.field}>
				<Label className={ERP.label}>PAN Number</Label>
				<Input
					value={form.pan}
					onChange={(e) => set("pan", e.target.value.toUpperCase())}
					className={cn("font-mono", inputCls("pan"))}
					disabled={readOnly}
					maxLength={10}
					placeholder="ABCDE1234F"
				/>
				<FieldError msg={errors.pan} />
			</div>
			<div className="flex flex-wrap items-end gap-3">
				{/* <div className={ERP.field}>
					<Label className={ERP.label}>TDS Applicable</Label>
					<div className="flex h-8 items-center">
						<ListingStatusToggle
							active={form.tdsApplicable}
							onChange={(yes) =>
								!readOnly &&
								onChange({
									...form,
									tdsApplicable: yes,
									tdsMasterId: yes ? form.tdsMasterId : "",
								})
							}
							disabled={readOnly}
						/>
					</div>
				</div> */}
				<div className="flex flex-wrap items-end gap-3">
					<div className={cn(ERP.field, "min-w-[200px] flex-1")}>
						<Label className={ERP.label}>
							TDS Section <span className="text-red-500">*</span>
						</Label>
						<SearchableSelect
							value={form.tdsMasterId}
							onChange={(value) => set("tdsMasterId", value)}
							options={tdsDropdownItems.map((tds) => ({
								value: tds.tdsUuid,
								label: tds.sectionCode,
							}))}
							placeholder="Select TDS..."
							disabled={readOnly}
							error={!!errors.tdsMasterId}
						/>
						<FieldError msg={errors.tdsMasterId} />
					</div>
				</div>
			</div>
			{gstRegistered && (
				<div className={ERP.field}>
					<Label className={ERP.label}>GST Code</Label>
					<SearchableSelect
						value={form.gstMasterId}
						onChange={(value) => set("gstMasterId", value)}
						options={gstDropdownItems.map((gst) => ({
							value: gst.id,
							label: `${gst.gstPercentage}%`,
							sublabel: gst.remark,
						}))}
						placeholder="Select from GST Master..."
						searchPlaceholder="Search GST code..."
						disabled={readOnly}
						error={!!errors.gstMasterId}
					/>
					<FieldError msg={errors.gstMasterId} />
				</div>
			)}
		</div>
	);

	return (
		<div className='w-full'>
			<Tabs defaultValue='basic' className='w-full'>
				<TabsList className='w-full mb-2 h-8'>
					<TabsTrigger value='basic' className='text-xs'>
						Basic Details
					</TabsTrigger>
					<TabsTrigger value='branch' className='text-xs'>
						Branch
					</TabsTrigger>
					<TabsTrigger value='commercial' className='text-xs'>
						Bank & Commercial
					</TabsTrigger>
				</TabsList>

				<TabsContent value='basic' className='mt-0'>
					<div className={ERP.sectionGap}>
						<ErpFormSection title='Basic Information'>
							<div className={ERP.sectionGap}>
								<div className={ERP.grid3}>
									<div className={ERP.field}>
										<Label className={ERP.label}>
											Customer Type <span className='text-red-500'>*</span>
										</Label>
										<SearchableSelect
											value={form.customerType}
											onChange={(value) => {
												const branchDocs = getDocumentsForCustomerType(value, customerTypes);

												const updatedBranches = form.branches.map((b) => ({
													...b,
													documents: branchDocs.map((d) => {
														// match by documentTypeId, not name — stable across renames
														const existing = b.documents.find(
															(bd) => bd.documentTypeId === d.documentTypeId,
														);
														return {
															...d,
															fileName: existing?.fileName,
															fileUrl: existing?.fileUrl,
															file: existing?.file,
														};
													}),
												}));

												onChange({
													...form,
													customerType: value,
													branches: updatedBranches, // ⬅ this was missing
												});
												onClearError('customerType');
											}}
											options={customerTypeOptions}
											placeholder='Select type...'
											disabled={readOnly}
											error={!!errors.customerType}
										/>
										<FieldError msg={errors.customerType} />
									</div>

									<div className={ERP.field}>
										<Label className={ERP.label}>
											Customer Code <span className='text-red-500'>*</span>
										</Label>
										<Input
											value={
												customerCode ||
												(form.customerType ? 'Generating…' : 'Select type first')
											}
											readOnly
											disabled
											className='h-8 text-xs font-mono bg-muted/30 cursor-not-allowed'
										/>
									</div>

									<div className={ERP.field}>
										<Label className={ERP.label}>
											Customer Name <span className='text-red-500'>*</span>
										</Label>
										<Input
											value={form.customerName}
											onChange={(e) => set('customerName', e.target.value)}
											placeholder='Legal / trade name'
											className={inputCls('customerName')}
											disabled={readOnly}
										/>
										<FieldError msg={errors.customerName} />
									</div>
								</div>

								<div className={ERP.grid3}>
									<div className={ERP.field}>
										<Label className={ERP.label}>
											Mobile Number <span className='text-red-500'>*</span>
										</Label>
										<div className='flex gap-1'>
											<CountryCodePicker
												value={form.countryCode}
												onChange={(value) => set('countryCode', value)}
												disabled={readOnly}
												hasError={!!errors.mobile}
											/>
											<Input
												value={form.mobile}
												onChange={(e) =>
													set(
														'mobile',
														e.target.value.replace(/\D/g, '').slice(0, 10),
													)
												}
												placeholder='10-digit'
												className={cn('flex-1', inputCls('mobile'))}
												inputMode='numeric'
												disabled={readOnly}
											/>
										</div>
										<FieldError msg={errors.mobile} />
									</div>

									<div className={ERP.field}>
										<Label className={ERP.label}>Email ID</Label>
										<Input
											type='email'
											value={form.email}
											onChange={(e) => set('email', e.target.value)}
											placeholder='email@company.com'
											className={inputCls('email')}
											disabled={readOnly}
										/>
										<FieldError msg={errors.email} />
									</div>

									<div className={ERP.field}>
										<Label className={ERP.label}>
											Salesman <span className='text-red-500'>*</span>
										</Label>
										<SearchableSelect
											value={form.salesManId}
											onChange={(value) => set('salesManId', value)}
											options={salesOptions}
											placeholder='Search sales person...'
											searchPlaceholder='Name, ID, mobile...'
											disabled={readOnly}
											error={!!errors.salesManId}
										/>
										<FieldError msg={errors.salesManId} />
									</div>
								</div>

								{form.status === 'blocked' && (
									<div className={ERP.field}>
										<Label className={ERP.label}>
											Block Reason <span className='text-red-500'>*</span>
										</Label>
										<Textarea
											value={form.blockReason}
											onChange={(e) => set('blockReason', e.target.value)}
											rows={2}
											placeholder='Reason for blocking...'
											className={textareaCls('blockReason')}
											disabled={readOnly}
										/>
										<FieldError msg={errors.blockReason} />
									</div>
								)}
							</div>
						</ErpFormSection>

						<ErpFormSection
							title='GST & Tax Registration'
							headerRight={
								<GstRegisteredToggleControl
									active={form.gstRegistered}
									readOnly={readOnly}
									onChange={(yes) => {
										const gstRegistrationType = yes
											? form.gstRegistrationType || GST_REGISTRATION_TYPE_DEFAULT
											: GST_CATEGORY_UNREGISTERED;
										const gstCategory = buildGstCategory(
											yes,
											gstRegistrationType,
										);
										onChange({
											...form,
											gstRegistered: yes,
											gstRegistrationType,
											gstin: yes ? form.gstin : '',
											registeredLegalName: yes ? form.registeredLegalName : '',
											registeredAddress: yes ? form.registeredAddress : '',
											gstCategory,
											gstApplicable: gstApplicableFromCategory(gstCategory),
											gstMasterId: yes ? form.gstMasterId : '',
										});
										if (!yes) onClearError('gstin');
									}}
								/>
							}
						>
							<GstRegistrationFields
								showRegisteredToggle={false}
								values={{
									gstRegistered: form.gstRegistered,
									gstRegistrationType: form.gstRegistrationType,
									gstin: form.gstin,
									registeredLegalName: form.registeredLegalName,
									registeredAddress: form.registeredAddress,
								}}
								onChange={(gst) => {
									const gstCategory = buildGstCategory(
										gst.gstRegistered,
										gst.gstRegistrationType,
									);
									onChange({
										...form,
										...gst,
										gstCategory,
										gstApplicable: gstApplicableFromCategory(gstCategory),
										gstMasterId: gst.gstRegistered ? form.gstMasterId : '',
										registeredLegalName: gst.gstRegistered
											? (gst.registeredLegalName ?? form.registeredLegalName)
											: '',
										registeredAddress: gst.gstRegistered
											? (gst.registeredAddress ?? form.registeredAddress)
											: '',
									});
									if (!gst.gstRegistered) onClearError('gstin');
								}}
								errors={errors}
								readOnly={readOnly}
								fetchingGst={fetchingGst}
								onFetchGst={handleFetchGst}
								footer={panTdsFooter}
							/>
						</ErpFormSection>

						<ErpFormSection title='Compliance & Certifications' bodyClassName='p-2'>
							<ComplianceCertificationsGrid
								values={{
									msmeRegistered: form.msmeRegistered,
									msmeNumber: form.msmeNumber,
									fssaiRegistered: form.fssaiRegistered,
									fssai: form.fssai,
									cibRegistered: form.cibRegistered,
									cibRegn: form.cibRegn,
									fcoRegistered: form.fcoRegistered,
									fcoRegn: form.fcoRegn,
								}}
								onChange={(compliance) =>
									onChange({
										...form,
										...compliance,
									})
								}
								errors={errors}
								readOnly={readOnly}
								onFieldBlur={validateComplianceField}
							/>
						</ErpFormSection>
					</div>
				</TabsContent>

				{/* ── TAB 3: BANK & COMMERCIAL ── */}
				<TabsContent value='commercial' className='mt-0'>
					<div className={ERP.sectionGap}>
						{isDistributorConvertedForm(form) ? (
							<CustomerDistributorCreditSection
								form={form}
								errors={errors}
								onChange={onChange}
								onClearError={onClearError}
								readOnly={readOnly}
								inputCls={inputCls}
							/>
						) : (
							<ErpFormSection title='Credit Terms'>
								<div className={cn(ERP.grid3, "lg:grid-cols-3")}>
									<div className={ERP.field}>
										<Label className={ERP.label}>Credit Limit</Label>
										<Input
											type='number'
											min={0}
											step='0.01'
											value={form.creditLimit}
											onChange={(e) => set('creditLimit', e.target.value)}
											placeholder='0.00'
											className={inputCls('creditLimit')}
											disabled={readOnly}
										/>
										<FieldError msg={errors.creditLimit} />
									</div>
									<PaymentTermsFields
										layout="embedded"
										values={{
											paymentType: form.paymentType,
											creditDays: form.creditDays,
											advancePercentage: form.advancePercentage,
										}}
										onChange={(patch) => {
											onChange({ ...form, ...patch });
											for (const key of Object.keys(patch)) {
												onClearError(key);
											}
										}}
										errors={{
											paymentType: errors.paymentType,
											creditDays: errors.creditDays,
											advancePercentage: errors.advancePercentage,
										}}
										readOnly={readOnly}
										inputClassName={inputCls("paymentType")}
									/>
								</div>
							</ErpFormSection>
						)}

						<ErpFormSection title='Bank Details'>
							<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2'>
								{/* Account Holder Name */}
								<div className='space-y-1'>
									<Label className='text-xs font-medium text-foreground'>
										Account Holder Name
									</Label>
									<Input
										disabled={readOnly}
										value={form.accountHolderName}
										onChange={(e) => set("accountHolderName", e.target.value)}
										className={vendorFieldClass("accountHolderName")}
									/>
									<FieldError msg={errors.accountHolderName} />
								</div>

								{/* Bank Name */}
								<div className='space-y-1'>
									<Label className='text-xs font-medium text-foreground'>
										Bank Name
									</Label>
									<Input
										disabled={readOnly}
										value={form.bankName}
										onChange={(e) => set("bankName", e.target.value)}
										className={vendorFieldClass("bankName")}
									/>
									<FieldError msg={errors.bankName} />
								</div>

								{/* Branch Name */}
								<div className='space-y-1'>
									<Label className='text-xs font-medium text-foreground'>
										Branch Name
									</Label>
									<Input
										disabled={readOnly}
										value={form.branch}
										onChange={(e) => set("branch", e.target.value)}
										className={vendorFieldClass("branch")}
									/>
									<FieldError msg={errors.branch} />
								</div>

								{/* Account Number */}
								<div className='space-y-1'>
									<Label className='text-xs font-medium text-foreground'>
										Account Number
									</Label>
									<Input
										disabled={readOnly}
										value={form.accountNumber}
										onChange={(e) => set("accountNumber", e.target.value)}
										className={cn(vendorFieldClass("accountNumber"), "font-mono")}
									/>
									<FieldError msg={errors.accountNumber} />
								</div>

								{/* Confirm Account Number */}
								<div className='space-y-1'>
									<Label className='text-xs font-medium text-foreground'>
										Confirm Account Number
									</Label>
									<Input
										disabled={readOnly}
										value={form.confirmAccountNumber}
										onChange={(e) => set("confirmAccountNumber", e.target.value)}
										className={cn(
											vendorFieldClass("confirmAccountNumber"),
											"font-mono",
										)}
									/>
									<FieldError msg={errors.confirmAccountNumber} />
								</div>

								{/* IFSC Code */}
								<div className='space-y-1'>
									<Label className='text-xs font-medium text-foreground'>
										IFSC Code
									</Label>
									<Input
										disabled={readOnly}
										value={form.ifscCode}
										onChange={(e) =>
											set("ifscCode", e.target.value.toUpperCase())
										}
										className={cn(
											vendorFieldClass("ifscCode"),
											"font-mono uppercase",
										)}
									/>
									<FieldError msg={errors.ifscCode} />
								</div>

								{/* SWIFT Code */}
								<div className='space-y-1'>
									<Label className='text-xs font-medium text-foreground'>
										SWIFT Code
									</Label>
									<Input
										disabled={readOnly}
										value={form.swiftCode}
										onChange={(e) => set("swiftCode", e.target.value)}
										className={vendorFieldClass("swiftCode")}
										placeholder='Optional'
									/>
									<FieldError msg={errors.swiftCode} />
								</div>
							</div>
						</ErpFormSection>
					</div>
				</TabsContent>

				{/* ── TAB: BRANCH MAPPING & DOCUMENTS ── */}
				<TabsContent value='branch' className='mt-0 space-y-3'>
					<div>
						<div className='flex items-center justify-between mb-3'>
							<div>
								{/* <SectionHead label="Branch Details" sub="Manage customer branches and document checklists" /> */}
							</div>
							{!readOnly && (
								<Button
									type='button'
									size='sm'
									onClick={() => {
										const newIdx = form.branches.length;
										onChange({
											...form,
											branches: [
												...form.branches,
												{
													branchName: `Branch #${newIdx + 1}`,
													billingAddress: {
														address: "",
														addressLine2: "",
														country: "India",
														district: "",
														town: "",
														city: "",
														state: "",
														pincode: "",
													},
													shippingAddress: {
														address: "",
														addressLine2: "",
														country: "India",
														district: "",
														town: "",
														city: "",
														state: "",
														pincode: "",
													},
													documents: getDocumentsForCustomerType(
														form.customerType, customerTypes
													),
												},
											],
										});
										setExpandedBranches((prev) => ({
											...prev,
											[newIdx]: true,
										}));
									}}
								>
									<Plus className='w-3.5 h-3.5' /> Add Branch
								</Button>
							)}
						</div>

						{errors.branches && (
							<div className='flex items-center gap-1.5 text-xs text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100 mb-4'>
								<AlertCircle className='flex-shrink-0 w-4 h-4' />
								<span>{errors.branches}</span>
							</div>
						)}

						<div className='space-y-4'>
							{form.branches.map((branch, bIdx) => {
								const isMain = !!branch.isMain;
								const isExpanded = !!expandedBranches[bIdx];

								return (
									<div
										key={bIdx}
										className='overflow-hidden bg-white border shadow-sm border-border rounded-xl'
									>
										{/* Header Small Card */}
										<div
											onClick={() => {
												setExpandedBranches((prev) => ({
													...prev,
													[bIdx]: !prev[bIdx],
												}));
											}}
											className={cn(
												"flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-muted/10 transition-colors select-none",
												isExpanded ? "border-b border-border bg-muted/5" : "",
											)}
										>
											<div className='flex items-center flex-1 min-w-0 gap-3'>
												<span className='text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-lg shrink-0'>
													#{bIdx + 1}
												</span>

												{readOnly ? (
													<span className='text-xs font-semibold truncate text-foreground'>
														{branch.branchName}
													</span>
												) : (
													<div className='flex items-center flex-1 max-w-sm gap-2'>
														<Input
															value={branch.branchName}
															onChange={(e) => {
																const updated = [...form.branches];
																updated[bIdx] = {
																	...updated[bIdx],
																	branchName: e.target.value,
																};
																onChange({ ...form, branches: updated });
															}}
															readOnly={readOnly}
															placeholder='e.g. Warehouse, Office, Retail Outlet...'
															className={cn(
																"h-8 text-xs font-semibold w-full bg-background",
																readOnly && "cursor-default",
															)}
															onClick={(e) => {
																setExpandedBranches((prev) => ({
																	...prev,
																	[bIdx]: true,
																}));
																e.stopPropagation();
															}}
														/>
													</div>
												)}

												{isMain && (
													<span className='text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 rounded-md shrink-0'>
														Main Branch
													</span>
												)}
											</div>

											<div
												className='flex items-center gap-2'
												onClick={(e) => e.stopPropagation()}
											>
												{!isMain && !readOnly && (
													<Button
														type='button'
														variant='outline'
														size='sm'
														className='h-7 text-[10px] font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 border-brand-100 px-2.5'
														onClick={(e) => {
															e.stopPropagation();
															setBranchAsMain(bIdx);
														}}
													>
														Set as Main
													</Button>
												)}
												{!isMain && !readOnly && (
													<button
														type='button'
														onClick={(e) => {
															e.stopPropagation();
															const updated = form.branches.filter(
																(_, i) => i !== bIdx,
															);
															onChange({ ...form, branches: updated });
														}}
														className='p-1.5 hover:bg-red-50 rounded-md transition-colors text-red-500'
														title='Remove Branch'
													>
														<Trash2 className='w-3.5 h-3.5' />
													</button>
												)}
												<div
													className='p-1.5 hover:bg-muted rounded transition-colors'
													onClick={(e) => {
														e.stopPropagation();
														setExpandedBranches((prev) => ({
															...prev,
															[bIdx]: !prev[bIdx],
														}));
													}}
												>
													<ChevronDown
														className={cn(
															"w-4 h-4 text-muted-foreground transition-transform duration-200",
															isExpanded && "rotate-180",
														)}
													/>
												</div>
											</div>
										</div>

										{/* Collapsible Details */}
										{isExpanded && (
											<div className='p-2.5 space-y-2 duration-200 animate-in fade-in-50'>
												<ErpFormSection title='Address'>
													{!readOnly && gstAddressSnapshot && (
														<div className='flex justify-end mb-1'>
															<Button
																type='button'
																variant='outline'
																size='sm'
																className='h-7 text-[10px] px-2'
																onClick={() => copyGstAddressToBranch(bIdx)}
															>
																Copy GST Address
															</Button>
														</div>
													)}
													<BranchAddressWithPincode
														address={branch.billingAddress}
														onChange={(addr) =>
															updateBranchBillingAddress(bIdx, addr)
														}
														readOnly={readOnly}
														stateOptions={stateOptions}
														errors={
															isMain
																? {
																	address: errors.mainBranchBillingAddress,
																	state: errors.mainBranchBillingState,
																	city: errors.mainBranchBillingCity,
																	pincode: errors.mainBranchBillingPincode,
																}
																: undefined
														}
													/>
												</ErpFormSection>

												<ErpFormSection title='Shipping Address'>
													{!readOnly && (
														<div className='flex justify-end mb-1'>
															<Button
																type='button'
																variant='ghost'
																size='sm'
																className='h-6 text-[10px] px-2'
																onClick={() => {
																	const updated = [...form.branches];
																	updated[bIdx] = {
																		...updated[bIdx],
																		shippingAddress: {
																			...updated[bIdx].billingAddress,
																		},
																	};
																	onChange({ ...form, branches: updated });
																	showToast(
																		'Billing address copied to shipping.',
																		'success',
																	);
																}}
															>
																Same as billing
															</Button>
														</div>
													)}
													<BranchAddressWithPincode
														address={branch.shippingAddress}
														onChange={(addr) =>
															updateBranchShippingAddress(bIdx, addr)
														}
														readOnly={readOnly}
														stateOptions={stateOptions}
													/>
												</ErpFormSection>

												{/* Branch Documents Section */}
												<div className='pt-3 space-y-3 border-t border-border/40'>
													<p className='text-xs font-bold uppercase tracking-wider text-foreground flex items-center leading-none'>
														Document Upload Checklist <span className='text-red-500 ml-1'>*</span>
													</p>

													<div className='space-y-4 duration-200 animate-in fade-in-50'>
														{!form.customerType ? (
															<p className='text-xs italic text-muted-foreground'>
																Please select a Customer Type in Basic Details
																to view documents.
															</p>
														) : (
															<>
																<div className='overflow-x-auto border rounded-lg border-border/50'>
																	<table className='w-full text-xs min-w-[640px]'>
																		<thead>
																			<tr className='text-left border-b bg-muted/25 border-border/50 text-muted-foreground'>
																				<th className='px-3 py-2 font-medium'>
																					Document Name
																				</th>
																				<th className='px-3 py-2 font-medium'>
																					Upload File
																				</th>
																				<th className='w-10 px-3 py-2' />
																			</tr>
																		</thead>
																		<tbody>
																			{branch.documents.map(
																				(doc, originalIdx) => {
																					const isAttached = !!doc.fileName;
																					return (
																						<tr
																							key={originalIdx}
																							className='border-b border-border/40 last:border-0 hover:bg-muted/10'
																						>
																							<td className='px-3 py-2'>
																								<Input
																									disabled={
																										readOnly || doc.required
																									}
																									value={doc.documentName}
																									onChange={(e) => {
																										const updatedBranches = [
																											...form.branches,
																										];
																										updatedBranches[
																											bIdx
																										].documents[
																											originalIdx
																										].documentName =
																											e.target.value;
																										onChange({
																											...form,
																											branches:
																												updatedBranches,
																										});
																									}}
																									className={cn(
																										"h-8 text-xs border-border/60 bg-white disabled:opacity-100 disabled:text-neutral-800 disabled:bg-muted/40 font-medium",
																										doc.required &&
																										"cursor-not-allowed",
																									)}
																									placeholder='Document name'
																								/>
																								{errors[
																									`branch_${bIdx}_doc_${originalIdx}_name`
																								] && (
																										<p className='text-[10px] text-red-500 mt-0.5'>
																											{
																												errors[
																												`branch_${bIdx}_doc_${originalIdx}_name`
																												]
																											}
																										</p>
																									)}
																							</td>
																							<td className='px-3 py-2'>
																								{isAttached ? (
																									<button
																										type='button'
																										className='text-xs text-brand-600 hover:text-brand-700 hover:underline font-medium text-left truncate max-w-[280px] block'
																										title={`Click to view ${doc.fileName}`}
																										onClick={() => {
																											if (
																												doc.fileUrl &&
																												doc.fileName
																											) {
																												setPreviewDoc({
																													title:
																														doc.documentName ||
																														"Document",
																													fileUrl:
																														doc.fileUrl,
																													fileName:
																														doc.fileName,
																												});
																											}
																										}}
																									>
																										{doc.fileName}
																									</button>
																								) : readOnly ? (
																									<span className='text-muted-foreground'>
																										—
																									</span>
																								) : (
																									<div className='space-y-1'>
																										<Button
																											type='button'
																											variant='outline'
																											size='sm'
																											className='h-8 text-[11px] max-w-[180px] truncate'
																											onClick={() =>
																												triggerBranchUpload(
																													bIdx,
																													originalIdx,
																												)
																											}
																										>
																											<Upload className='w-3 h-3 mr-1 shrink-0' />
																											Choose File
																										</Button>
																										{errors[
																											`branch_${bIdx}_doc_${originalIdx}_file`
																										] && (
																												<p className='text-[10px] text-red-500 mt-0.5'>
																													{
																														errors[
																														`branch_${bIdx}_doc_${originalIdx}_file`
																														]
																													}
																												</p>
																											)}
																									</div>
																								)}
																							</td>
																							{/* <td className='px-3 py-2'>
																								{!readOnly && (
																									<Button
																										type='button'
																										variant='ghost'
																										className='w-8 h-8 p-0 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent'
																										disabled={
																											!isAttached &&
																											doc.required
																										}
																										onClick={() => {
																											if (doc.required) {
																												const updatedBranches =
																													[...form.branches];
																												updatedBranches[
																													bIdx
																												].documents[
																													originalIdx
																												] = {
																													...doc,
																													fileName: undefined,
																													fileUrl: undefined,
																													file: undefined,
																												};
																												onChange({
																													...form,
																													branches:
																														updatedBranches,
																												});
																												showToast(
																													"Document removed.",
																													"success",
																												);
																											} else {
																												const updatedBranches =
																													[...form.branches];
																												updatedBranches[
																													bIdx
																												].documents =
																													updatedBranches[
																														bIdx
																													].documents.filter(
																														(_, idx) =>
																															idx !==
																															originalIdx,
																													);
																												onChange({
																													...form,
																													branches:
																														updatedBranches,
																												});
																												showToast(
																													"Document row removed.",
																													"success",
																												);
																											}
																										}}
																									>
																										<Trash2 className='w-3.5 h-3.5' />
																									</Button>
																								)}
																							</td> */}
																						</tr>
																					);
																				},
																			)}
																		</tbody>
																	</table>
																</div>

																{errors[`branch_${bIdx}_documents`] && (
																	<div className='flex items-center gap-1.5 mt-2 text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100'>
																		<AlertCircle className='flex-shrink-0 w-4 h-4' />
																		<span>
																			{errors[`branch_${bIdx}_documents`]}
																		</span>
																	</div>
																)}

																{/* {!readOnly && (
																	<Button
																		type='button'
																		variant='outline'
																		size='sm'
																		className='h-8 mt-1 text-xs border-dashed'
																		onClick={() => {
																			const updatedBranches = [
																				...form.branches,
																			];
																			updatedBranches[bIdx].documents = [
																				...updatedBranches[bIdx].documents,
																				{ documentName: "", required: false },
																			];
																			onChange({
																				...form,
																				branches: updatedBranches,
																			});
																		}}
																	>
																		<Plus className='w-3.5 h-3.5 mr-1' /> Add
																		Document Row
																	</Button>
																)} */}
															</>
														)}
													</div>
												</div>
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>
				</TabsContent>
			</Tabs>

			{/* Hidden File Input */}
			<input
				type='file'
				ref={fileInputRef}
				className='hidden'
				onChange={handleFileChange}
			/>

			{/* Local Toast alerts */}
			{toastState && (
				<LocalToast toast={toastState} onDismiss={() => setToastState(null)} />
			)}

			{/* Image / PDF Preview Modal */}
			<Dialog
				open={!!previewDoc}
				onOpenChange={(open) => !open && setPreviewDoc(null)}
			>
				<DialogContent className='max-w-2xl bg-white'>
					<DialogHeader>
						<DialogTitle className='text-sm font-semibold'>
							{previewDoc?.title}
						</DialogTitle>
					</DialogHeader>
					<div className='flex flex-col items-center justify-center p-4 border border-dashed rounded-lg border-border bg-muted/10 min-h-[300px]'>
						{previewDoc &&
							(/\.(jpe?g|png|webp|gif)$/i.test(previewDoc.fileName) ? (
								<img
									src={previewDoc.fileUrl}
									alt={previewDoc.title}
									className='max-h-[50vh] max-w-full object-contain rounded-md animate-in zoom-in-95 duration-200'
								/>
							) : (
								<div className='space-y-4 text-center'>
									<div className='inline-flex p-3 border rounded-full bg-brand-50 border-brand-100 text-brand-600'>
										<svg
											className='w-8 h-8'
											fill='none'
											viewBox='0 0 24 24'
											stroke='currentColor'
										>
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												strokeWidth={2}
												d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
											/>
										</svg>
									</div>
									<div>
										<p className='text-xs font-semibold text-foreground'>
											{previewDoc.fileName}
										</p>
										<p className='text-[11px] text-muted-foreground mt-1'>
											This file type cannot be previewed directly.
										</p>
									</div>
									<a
										href={previewDoc.fileUrl}
										target='_blank'
										rel='noreferrer'
										className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-xs font-medium text-white hover:bg-brand-700 transition-colors'
									>
										Open in new tab
									</a>
								</div>
							))}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// Shape of what the customer detail API actually returns
export interface CustomerApiBranchDocument {
	customer_branch_document_id: string;
	document_type_id: string;
	file_url: string;
	document_type?: { id: string; title: string };
}

export interface CustomerApiBranch {
	branch_id?: string;
	branch_name: string;
	is_main_branch: boolean;
	billing_country?: string;
	billing_address_line_1?: string;
	billing_address_line_2?: string;
	billing_state?: string;
	billing_city?: string;
	billing_town?: string;
	billing_pincode?: string;
	billing_pincode_id?: string;
	shipping_country?: string;
	shipping_address_line_1?: string;
	shipping_address_line_2?: string;
	shipping_state?: string;
	shipping_city?: string;
	shipping_town?: string;
	shipping_pincode?: string;
	shipping_pincode_id?: string;
	documents?: CustomerApiBranchDocument[];
}

export interface CustomerApiRecord {
	customer_id: string;
	customer_code: string;
	customer_name: string;
	country_code?: string;
	mobile_no: string;
	email?: string;
	customer_type_id: string;
	sales_man_id?: string;
	cib_applicable?: boolean;
	cib_reg_no?: string;
	fco_applicable?: boolean;
	fco_reg_no?: string;
	fssai_applicable?: boolean;
	fssai_no?: string;
	msme_applicable?: boolean;
	msme_reg_no?: string;
	gst_applicable?: boolean;
	registration_type?: string;
	gstin_no?: string;
	registered_legal_name?: string;
	registered_gst_address?: string;
	pan_no?: string;
	tds_applicable?: boolean;
	tds_section_id?: string;
	credit_limit?: string | number;
	payment_type?: string;
	credit_days?: string | number;
	advance?: string | number;
	account_holder?: string;
	bank_name?: string;
	branch_name?: string;
	account_number?: string;
	ifsc_code?: string;
	swift_code?: string;
	status?: string;
	branches?: CustomerApiBranch[];
}

function apiDocToBranchDocument(doc: CustomerApiBranchDocument): BranchDocument {
	const fileName = doc.file_url ? doc.file_url.split("/").pop() : undefined;
	return {
		documentTypeId: doc.document_type_id,
		documentName: doc.document_type?.title ?? "",
		required: true,
		fileUrl: doc.file_url || undefined,
		fileName: fileName || undefined,
	};
}

function apiBranchToFormBranch(b: CustomerApiBranch): CustomerBranch {
	return {
		branchName: b.branch_name ?? "",
		isMain: !!b.is_main_branch,
		billingAddress: {
			address: b.billing_address_line_1 ?? "",
			addressLine2: b.billing_address_line_2 ?? "",
			country: b.billing_country ?? "India",
			district: b.billing_city ?? "",
			town: b.billing_town ?? "",
			city: b.billing_city ?? "",
			state: b.billing_state ?? "",
			pincode: b.billing_pincode ?? "",
			pincodeId: b.billing_pincode_id || undefined,
		},
		shippingAddress: {
			address: b.shipping_address_line_1 ?? "",
			addressLine2: b.shipping_address_line_2 ?? "",
			country: b.shipping_country ?? "India",
			district: b.shipping_city ?? "",
			town: b.shipping_town ?? "",
			city: b.shipping_city ?? "",
			state: b.shipping_state ?? "",
			pincode: b.shipping_pincode ?? "",
			pincodeId: b.shipping_pincode_id || undefined,
		},
		documents: (b.documents ?? []).map(apiDocToBranchDocument),
	};
}

export function customerApiRecordToFormValues(
	record: CustomerApiRecord,
): CustomerFormValues {
	const gstApplicable = !!record.gst_applicable;
	const gstin = record.gstin_no ?? "";
	const gstCategory =
		record.registration_type || deriveGstCategory(gstApplicable, gstin);
	const gstRegistered = deriveGstRegistered(gstApplicable, gstin, gstCategory);

	const branches: CustomerBranch[] = record.branches?.length
		? record.branches.map(apiBranchToFormBranch)
		: DEFAULT_CUSTOMER_FORM.branches;

	return {
		...DEFAULT_CUSTOMER_FORM,
		customerName: record.customer_name ?? "",
		countryCode: record.country_code || "+91",
		mobile: record.mobile_no ?? "",
		email: record.email ?? "",
		customerType: record.customer_type_id ?? "",
		status: (record.status?.toLowerCase() as CustomerStatus) ?? "draft",
		blockReason: "",

		gstApplicable,
		gstRegistered,
		gstRegistrationType: gstRegistered
			? deriveGstRegistrationType(gstCategory)
			: GST_CATEGORY_UNREGISTERED,
		gstCategory,
		gstin: gstRegistered ? gstin : "",
		registeredLegalName: gstRegistered ? (record.registered_legal_name ?? "") : "",
		registeredAddress: gstRegistered ? (record.registered_gst_address ?? "") : "",
		gstMasterId: "",

		tdsApplicable: true,
		tdsMasterId: record.tds_section_id ?? "",
		pan: record.pan_no ?? "",

		msmeRegistered: !!record.msme_applicable,
		msmeNumber: record.msme_reg_no ?? "",
		fssaiRegistered: !!record.fssai_applicable,
		fssai: record.fssai_no ?? "",
		cibRegistered: !!record.cib_applicable,
		cibRegn: record.cib_reg_no ?? "",
		fcoRegistered: !!record.fco_applicable,
		fcoRegn: record.fco_reg_no ?? "",

		address: branches[0]?.billingAddress?.address ?? "",
		pincode: branches[0]?.billingAddress?.pincode ?? "",

		salesManId: record.sales_man_id ?? "",
		creditLimit: record.credit_limit != null ? String(record.credit_limit) : "",
		...structuredToFormValues(
			resolveStructuredPaymentTerms({
				paymentType: record.payment_type as any,
				creditDays:
					record.credit_days !== undefined && record.credit_days !== null
						? Number(record.credit_days)
						: undefined,
				advancePercentage:
					record.advance !== undefined && record.advance !== null
						? Number(record.advance)
						: undefined,
			}),
		),

		bankName: record.bank_name ?? "",
		bankBranchAddress: record.branch_name ?? "",
		bankAccountNo: record.account_number ?? "",
		ifscCode: record.ifsc_code ?? "",
		accountHolderName: record.account_holder ?? "",
		branch: record.branch_name ?? "",
		accountNumber: record.account_number ?? "",
		confirmAccountNumber: record.account_number ?? "",
		swiftCode: record.swift_code ?? "",

		branches,
	};
}

export function validateCustomerForm(
	form: CustomerFormValues,
	isAdd?: boolean,
): Record<string, string> {
	const e: Record<string, string> = {};
	if (!form.customerName.trim()) e.customerName = "Customer name is required";
	if (!form.customerType) e.customerType = "Customer type is required";
	if (!form.mobile.trim()) e.mobile = "Mobile number is required";
	else if (!validateMobile(form.mobile))
		e.mobile = "Enter a valid 10-digit mobile number";
	if (form.email.trim() && !validateEmail(form.email))
		e.email = "Enter a valid email address";
	if (form.gstRegistered) {
		if (!form.gstin.trim())
			e.gstin = "GSTIN is required when GST registered";
		else if (!validateGSTIN(form.gstin)) e.gstin = "Invalid GSTIN format";
		if (!isAdd && !form.gstMasterId)
			e.gstMasterId = "Select GST code from master";
	}
	if (!form.salesManId) e.salesManId = "Salesman is required";
	if (form.pan.trim() && !validatePAN(form.pan))
		e.pan = "Enter a valid PAN number (e.g. ABCDE1234F)";
	if (form.msmeRegistered) {
		if (!form.msmeNumber.trim() || !validateMSMENumber(form.msmeNumber)) {
			e.msmeNumber = MSME_NUMBER_ERROR;
		}
	}
	if (!form.tdsMasterId)
		e.tdsMasterId = "Select TDS section from master";
	Object.assign(e, validateComplianceRegistration(form));

	// Validate Main Branch
	const mainBranch =
		form.branches.find((b) => b.isMain) ||
		form.branches.find((b) => b.branchName === "Main Branch");
	if (!mainBranch) {
		e.branches = "Main Branch is mandatory";
	} else {
		if (!mainBranch.billingAddress.address.trim()) {
			e.mainBranchBillingAddress = "Main Branch billing address is required";
		}
		if (!mainBranch.billingAddress.city.trim()) {
			e.mainBranchBillingCity = "Main Branch billing city is required";
		}
		if (!mainBranch.billingAddress.state.trim()) {
			e.mainBranchBillingState = "Main Branch billing state is required";
		}
		if (!mainBranch.billingAddress.pincode.trim()) {
			e.mainBranchBillingPincode = "Pincode is required";
		} else if (!validatePincode(mainBranch.billingAddress.pincode)) {
			e.mainBranchBillingPincode = "Enter a valid 6-digit pincode";
		}
	}

	// Validate branch-wise document uploads
	form.branches.forEach((branch, bIdx) => {
		const missing = branch.documents.some(
			(doc) => doc.required && !doc.fileName,
		);
		if (missing) {
			e[`branch_${bIdx}_documents`] =
				`Please upload all required documents for ${branch.branchName}.`;
		}

		branch.documents.forEach((doc, docIdx) => {
			if (!doc.required) {
				const hasName = !!doc.documentName.trim();
				const hasFile = !!doc.fileName;
				if (hasName && !hasFile) {
					e[`branch_${bIdx}_doc_${docIdx}_file`] = "File is required";
				}
				if (hasFile && !hasName) {
					e[`branch_${bIdx}_doc_${docIdx}_name`] = "Document name is required";
				}
			}
		});
	});

	if (form.creditLimit.trim() && isNaN(parseFloat(form.creditLimit)))
		e.creditLimit = "Invalid amount";
	Object.assign(e, validateDistributorCreditOverride(form));
	Object.assign(
		e,
		validatePaymentTermsForm({
			paymentType: form.paymentType,
			creditDays: form.creditDays,
			advancePercentage: form.advancePercentage,
		}),
	);
	if (form.accountNumber && form.accountNumber !== form.confirmAccountNumber) {
		e.confirmAccountNumber = "Account number mismatch";
	}
	if (form.ifscCode.trim() && !validateIFSC(form.ifscCode))
		e.ifscCode = "Invalid IFSC format";
	if (form.status === "blocked" && !form.blockReason.trim())
		e.blockReason = "Block reason is required when status is Blocked";

	return e;
}

export function customerRecordToFormValues(
	record: CustomerListRecord,
): CustomerFormValues {
	const gstApplicable = record.gstApplicable;
	const gstin = record.gstinNo ?? "";
	const gstCategory =
		record.registrationType || deriveGstCategory(gstApplicable, gstin);
	const gstRegistered = deriveGstRegistered(gstApplicable, gstin, gstCategory);

	// record.branches is still the RAW API shape (snake_case), never transformed
	// by the service layer — map it through apiBranchToFormBranch here.
	const rawBranches = (record.branches ?? []) as unknown as CustomerApiBranch[];
	const branches: CustomerBranch[] = rawBranches.length
		? rawBranches.map(apiBranchToFormBranch)
		: DEFAULT_CUSTOMER_FORM.branches;

	return {
		...DEFAULT_CUSTOMER_FORM,
		customerName: record.customerName,
		countryCode: record.countryCode || "+91",
		mobile: record.mobileNo,
		email: record.email,
		customerType: record.customerTypeId ?? "",
		status: record.status,
		blockReason: "",

		gstApplicable,
		gstRegistered,
		gstRegistrationType: gstRegistered
			? deriveGstRegistrationType(gstCategory)
			: GST_CATEGORY_UNREGISTERED,
		gstCategory,
		gstin: gstRegistered ? gstin : "",
		registeredLegalName: gstRegistered ? (record.registeredLegalName ?? "") : "",
		registeredAddress: gstRegistered ? (record.registeredGstAddress ?? "") : "",
		gstMasterId: "",

		tdsApplicable: record.tdsApplicable,
		tdsMasterId: record.tdsSectionId ?? "",
		pan: record.panNo ?? "",

		msmeRegistered: record.msmeApplicable,
		msmeNumber: record.msmeRegNo ?? "",
		fssaiRegistered: record.fssaiApplicable,
		fssai: record.fssaiNo ?? "",
		cibRegistered: record.cibApplicable,
		cibRegn: record.cibRegNo ?? "",
		fcoRegistered: record.fcoApplicable,
		fcoRegn: record.fcoRegNo ?? "",

		address: branches[0]?.billingAddress?.address ?? "",
		pincode: branches[0]?.billingAddress?.pincode ?? "",

		salesManId: record.salesManId ?? "",
		creditLimit: record.creditLimit != null ? String(record.creditLimit) : "",
		...structuredToFormValues(
			resolveStructuredPaymentTerms({
				paymentType: record.paymentType as any,
				creditDays: record.creditDays ?? undefined,
				advancePercentage: record.advance ?? undefined,
			}),
		),

		bankName: record.bankName ?? "",
		bankBranchAddress: record.branchName ?? "",
		bankAccountNo: record.accountNumber ?? "",
		ifscCode: record.ifscCode ?? "",
		accountHolderName: record.accountHolder ?? "",
		branch: record.branchName ?? "",
		accountNumber: record.accountNumber ?? "",
		confirmAccountNumber: record.accountNumber ?? "",
		swiftCode: record.swiftCode ?? "",

		branches,
	};
}

export function formValuesToUpdatePayload(
	form: CustomerFormValues,
): CustomerUpdatePayload {
	return {
		customer_name: form.customerName.trim(),
		customer_type_id: form.customerType,
		country_code: form.countryCode,
		mobile_no: form.mobile.trim(),
		email: form.email.trim(),
		sales_man_id: form.salesManId,

		cib_applicable: form.cibRegistered,
		cib_reg_no: form.cibRegistered ? form.cibRegn : "",

		fco_applicable: form.fcoRegistered,
		fco_reg_no: form.fcoRegistered ? form.fcoRegn : "",

		fssai_applicable: form.fssaiRegistered,
		fssai_no: form.fssaiRegistered ? form.fssai : "",

		msme_applicable: form.msmeRegistered,
		msme_reg_no: form.msmeRegistered ? form.msmeNumber : "",

		gst_applicable: form.gstRegistered,
		registration_type: form.gstRegistered
			? form.gstRegistrationType
			: GST_CATEGORY_UNREGISTERED,
		gstin_no: form.gstRegistered ? form.gstin.trim().toUpperCase() : "",
		registered_legal_name: form.gstRegistered ? form.registeredLegalName : "",
		registered_gst_address: form.gstRegistered ? form.registeredAddress : "",
		pan_no: form.pan.trim().toUpperCase(),

		tds_applicable: form.tdsApplicable,
		tds_section_id: form.tdsMasterId,

		credit_limit: form.creditLimit ? parseFloat(form.creditLimit) : 0,
		payment_type: form.paymentType || undefined,
		credit_days: form.creditDays ? Number(form.creditDays) : undefined,
		advance: form.advancePercentage ? Number(form.advancePercentage) : undefined,

		account_holder: form.accountHolderName.trim(),
		bank_name: form.bankName.trim(),
		branch_name: form.branch.trim(),
		account_number: form.accountNumber.trim(),
		ifsc_code: form.ifscCode.trim().toUpperCase(),
		swift_code: form.swiftCode.trim(),

		branches: form.branches.map((branch, idx) => branchToPayload(branch, idx).payload),
	};
}

export function formValuesToCreatePayload(
	form: CustomerFormValues,
): CustomerCreatePayload {
	return {
		customer_name: form.customerName.trim(),
		customer_type_id: form.customerType,
		country_code: form.countryCode,
		mobile_no: form.mobile.trim(),
		email: form.email.trim(),
		sales_man_id: form.salesManId,

		cib_applicable: form.cibRegistered,
		cib_reg_no: form.cibRegistered ? form.cibRegn : "",

		fco_applicable: form.fcoRegistered,
		fco_reg_no: form.fcoRegistered ? form.fcoRegn : "",

		fssai_applicable: form.fssaiRegistered,
		fssai_no: form.fssaiRegistered ? form.fssai : "",

		msme_applicable: form.msmeRegistered,
		msme_reg_no: form.msmeRegistered ? form.msmeNumber : "",

		gst_applicable: form.gstRegistered,
		registration_type: form.gstRegistered
			? form.gstRegistrationType
			: GST_CATEGORY_UNREGISTERED,
		gstin_no: form.gstRegistered ? form.gstin.trim().toUpperCase() : "",
		registered_legal_name: form.gstRegistered ? form.registeredLegalName : "",
		registered_gst_address: form.gstRegistered ? form.registeredAddress : "",
		pan_no: form.pan.trim().toUpperCase(),

		tds_applicable: true,
		tds_section_id: form.tdsMasterId,

		credit_limit: form.creditLimit ? parseFloat(form.creditLimit) : 0,
		payment_type: form.paymentType || undefined,
		credit_days: form.creditDays ? Number(form.creditDays) : undefined,
		advance: form.advancePercentage ? Number(form.advancePercentage) : undefined,

		account_holder: form.accountHolderName.trim(),
		bank_name: form.bankName.trim(),
		branch_name: form.branch.trim(),
		account_number: form.accountNumber.trim(),
		ifsc_code: form.ifscCode.trim().toUpperCase(),
		swift_code: form.swiftCode.trim(),

		branches: form.branches.map((branch, idx) => branchToPayload(branch, idx).payload),
	};
}

export function formValuesToCustomer(
	form: CustomerFormValues,
	base: Partial<Customer> & { id: number; customerCode: string },
	geoNodes?: ReturnType<typeof loadGeoNodes>,
	employees?: ReturnType<typeof getActiveSalesEmployees>,
): Customer {
	const nodes = geoNodes ?? loadGeoNodes();
	const staff = employees ?? getActiveSalesEmployees();
	const sales = staff.find((e) => e.id === Number(form.salesManId));

	const mainBranch =
		form.branches.find((b) => b.isMain) ||
		form.branches.find((b) => b.branchName === "Main Branch") ||
		form.branches[0];

	// Clean custom documents for storage
	const cleanBranches = form.branches.map((b) => ({
		...b,
		documents: b.documents.filter(
			(d) => d.required || d.documentName.trim() || d.fileName,
		),
	}));

	const cleanMainBranch =
		cleanBranches.find((b) => b.isMain) ||
		cleanBranches.find((b) => b.branchName === "Main Branch") ||
		cleanBranches[0];

	return {
		id: base.id,
		customerCode: base.customerCode,
		customerName: form.customerName.trim(),
		customerType: form.customerType,
		status: form.status,
		blockReason: form.status === "blocked" ? form.blockReason.trim() : "",
		countryCode: form.countryCode,
		mobile: form.mobile.trim(),
		email: form.email.trim(),
		gstApplicable: form.gstRegistered,
		gstCategory: buildGstCategory(
			form.gstRegistered,
			form.gstRegistrationType,
		),
		gstin: form.gstRegistered ? form.gstin.trim().toUpperCase() : "",
		registeredLegalName: form.gstRegistered
			? form.registeredLegalName.trim()
			: "",
		registeredAddress: form.gstRegistered
			? form.registeredAddress.trim()
			: "",
		gstMasterId:
			form.gstRegistered && form.gstMasterId
				? Number(form.gstMasterId)
				: null,
		tdsApplicable: true,
		tdsMasterId: form.tdsMasterId ? Number(form.tdsMasterId) : null,
		pan: form.pan.trim().toUpperCase(),
		tan: "",
		msmeRegistered: form.msmeRegistered,
		msmeNumber: form.msmeRegistered ? form.msmeNumber.trim() : "",
		...complianceRegistrationToStored({
			fssaiRegistered: form.fssaiRegistered,
			fssai: form.fssai,
			cibRegistered: form.cibRegistered,
			cibRegn: form.cibRegn,
			fcoRegistered: form.fcoRegistered,
			fcoRegn: form.fcoRegn,
		}),

		// For backwards compatibility and listing/view pages:
		address: cleanMainBranch?.billingAddress?.address?.trim() || "",
		stateId: form.stateId ? Number(form.stateId) : null,
		stateName: cleanMainBranch?.billingAddress?.state?.trim() || "",
		districtId: form.districtId ? Number(form.districtId) : null,
		districtName:
			cleanMainBranch?.billingAddress?.district?.trim() ||
			cleanMainBranch?.billingAddress?.city?.trim() ||
			"",
		territoryId: form.territoryId ? Number(form.territoryId) : null,
		territoryName: "",
		pincode: cleanMainBranch?.billingAddress?.pincode?.trim() || "",

		salesManId: form.salesManId ? Number(form.salesManId) : null,
		salesManName:
			sales?.fullName ??
			(sales ? `${sales.firstName} ${sales.lastName}`.trim() : ""),
		creditLimit: parseFloat(form.creditLimit) || 0,
		interestRate: 0,
		creditSource: form.creditSource || "direct",
		linkedDistributorId: form.linkedDistributorId
			? Number(form.linkedDistributorId)
			: null,
		linkedDistributorName: form.linkedDistributorName.trim() || null,
		distributorScore: form.distributorScore
			? Number.parseFloat(form.distributorScore)
			: null,
		distributorCategory: (form.distributorCategory as "A" | "B" | "C") || null,
		recommendedCreditLimit: form.recommendedCreditLimit
			? parseFloat(form.recommendedCreditLimit)
			: null,
		recommendedCreditDays: form.recommendedCreditDays
			? Number.parseInt(form.recommendedCreditDays, 10)
			: null,
		recommendedCreditStatus: form.recommendedCreditStatus || null,
		finalCreditStatus: form.finalCreditStatus || null,
		creditOverrideReason: hasCreditOverrideFromRecommended(form)
			? form.creditOverrideReason.trim()
			: null,
		creditAuditLog: (base as Customer).creditAuditLog ?? [],
		...((): {
			paymentType: PaymentType;
			creditDays: number;
			advancePercentage: number;
			paymentTerms: string;
		} => {
			const structured = formValuesToStructured({
				paymentType: form.paymentType,
				creditDays: form.creditDays,
				advancePercentage: form.advancePercentage,
			})!;
			return {
				paymentType: structured.paymentType,
				creditDays: structured.creditDays,
				advancePercentage: structured.advancePercentage,
				paymentTerms: paymentTermsToLegacy(structured),
			};
		})(),
		bankName: form.bankName.trim(),
		bankBranchAddress: form.branch.trim(),
		bankAccountNo: form.accountNumber.trim(),
		ifscCode: form.ifscCode.trim().toUpperCase(),

		// New aligned bank fields
		accountHolderName: form.accountHolderName.trim(),
		branch: form.branch.trim(),
		swiftCode: form.swiftCode.trim(),

		createdBy: base.createdBy ?? "Admin",
		createdDate: base.createdDate ?? todayStr(),
		updatedBy: "Admin",
		updatedDate: todayStr(),
		lastStatusChange: base.lastStatusChange ?? todayStr(),
		statusHistory: base.statusHistory ?? [],

		documents: {
			requiredDocuments: (cleanMainBranch?.documents || []).map((d) => ({
				documentTypeId: d.documentTypeId,
				documentName: d.documentName,
				required: d.required,
				fileName: d.fileName,
				fileUrl: d.fileUrl,
			})),
			additionalDocuments: [],
		},

		// NEW FIELDS
		products: form.customerProducts,
		customerProducts: form.customerProducts,
		branches: cleanBranches,
	} as any;
}
