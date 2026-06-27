// ── Customer Master — types, seed, storage, validation, master linkages ─────

import { loadGSTMasters, type GSTMaster } from "../gst/gst-data";
import { loadTDSMasters, type TDSMaster } from "../tds/tds-data";
import { loadGeoNodes, getChildren, type GeoNode } from "../geography/geo-data";
import {
	loadEmployees,
	type Employee,
} from "../../user-management/employee/employee-data";
import {
	generateTypedMasterCode,
	isMasterCodeEmpty,
} from "@/lib/masters/code-generation";
import { getInitialCodeForCustomerType } from "../customer-types/customer-type-data";
import { deriveGstCategory } from "@/lib/masters/gst-compliance";
import {
	type PaymentType,
	paymentTermsToLegacy,
	resolveStructuredPaymentTerms,
} from "@/lib/masters/payment-terms";

export type CustomerStatus = "active" | "inactive" | "draft" | "blocked";

export interface StatusChange {
	date: string;
	from: string;
	to: string;
	by: string;
	reason: string;
}

export interface CustomerProductMapping {
	id: string;
	productId: string;
	productName: string;
	sku?: string;
	/** Customer-specific sales price — overrides Pricing Master DP/RP */
	price?: number;
	discountType?: "Percentage" | "Flat";
	discountValue?: number;
	status: "Active" | "Inactive";
}

export interface BranchAddress {
	address: string;
	city: string;
	state: string;
	pincode: string;
}

export interface BranchDocument {
	documentName: string;
	required: boolean;
	fileName?: string;
	fileUrl?: string;
}

export interface CustomerBranch {
	branchName: string;
	isMain?: boolean;
	billingAddress: BranchAddress;
	shippingAddress: BranchAddress;
	documents: BranchDocument[];
}

export interface Customer {
	id: number;
	customerCode: string;
	customerName: string;
	customerType: string;
	status: CustomerStatus;
	blockReason: string;

	countryCode: string;
	mobile: string;
	email: string;

	gstApplicable: boolean;
	gstin: string;
	gstCategory?: string;
	registeredLegalName?: string;
	registeredAddress?: string;
	gstMasterId: number | null;
	tdsApplicable: boolean;
	tdsMasterId: number | null;
	pan?: string;
	/** @deprecated removed from UI — retained for legacy records */
	tan?: string;
	msmeRegistered?: boolean;
	msmeNumber?: string;
	fssaiRegistered?: boolean;
	cibRegistered?: boolean;
	fcoRegistered?: boolean;
	cibRegn: string;
	fcoRegn: string;
	fssai: string;

	address: string;
	stateId: number | null;
	stateName: string;
	districtId: number | null;
	districtName: string;
	territoryId: number | null;
	territoryName: string;
	pincode: string;

	salesManId: number | null;
	salesManName: string;

	creditLimit: number;
	interestRate: number;
	/** @deprecated Legacy string — synced from structured fields for downstream modules */
	paymentTerms: string;
	paymentType?: PaymentType;
	creditDays?: number;
	advancePercentage?: number;

	bankName: string;
	bankBranchAddress: string;
	bankAccountNo: string;
	ifscCode: string;

	// New aligned bank fields
	accountHolderName?: string;
	branch?: string;
	swiftCode?: string;

	createdBy: string;
	createdDate: string;
	updatedBy: string;
	updatedDate: string;
	lastStatusChange: string;
	statusHistory: StatusChange[];
	documents?: {
		requiredDocuments: {
			documentTypeId: string;
			documentName: string;
			required: true;
			fileName?: string;
			fileUrl?: string;
		}[];
		additionalDocuments: {
			id: string;
			title: string;
			fileName?: string;
			fileUrl?: string;
		}[];
	};

	// NEW FIELDS
	customerProducts?: CustomerProductMapping[];
	products?: CustomerProductMapping[];
	branches?: CustomerBranch[];
}

export const CUSTOMER_TYPE_OPTIONS = [
	{ value: "farmer", label: "Farmer" },
	{ value: "distributor", label: "Distributor" },
	{ value: "dealer", label: "Dealer" },
	{ value: "retailer", label: "Retailer" },
	{ value: "cf", label: "C&F" },
	{ value: "cbbo", label: "CBBO" },
	{ value: "fpo", label: "FPO" },
];

export const CUSTOMER_TYPE_LABELS: Record<string, string> = {
	farmer: "Farmer",
	distributor: "Distributor",
	dealer: "Dealer",
	retailer: "Retailer",
	cf: "C&F",
	cbbo: "CBBO",
	fpo: "FPO",
};

export const COUNTRY_CODES = [
	{ code: "+91", label: "+91 India" },
	{ code: "+1", label: "+1 USA / Canada" },
	{ code: "+44", label: "+44 UK" },
	{ code: "+971", label: "+971 UAE" },
	{ code: "+65", label: "+65 Singapore" },
	{ code: "+60", label: "+60 Malaysia" },
	{ code: "+61", label: "+61 Australia" },
];

export const PAYMENT_TERMS_OPTIONS = [
	{ value: "advance", label: "Advance (Full)" },
	{ value: "net-7", label: "Net 7 Days" },
	{ value: "net-15", label: "Net 15 Days" },
	{ value: "net-30", label: "Net 30 Days" },
	{ value: "net-45", label: "Net 45 Days" },
	{ value: "net-60", label: "Net 60 Days" },
	{ value: "net-90", label: "Net 90 Days" },
	{ value: "net-120", label: "Net 120 Days" },
	{ value: "net-150", label: "Net 150 Days" },
	{ value: "net-180", label: "Net 180 Days" },
];

/** Select sentinel — stored value uses `net-{days}` instead. */
export const CUSTOM_PAYMENT_TERMS_KEY = "__custom__";

export function isPresetPaymentTerms(value: string): boolean {
	return PAYMENT_TERMS_OPTIONS.some((p) => p.value === value);
}

export function parsePaymentTermDays(value: string): number | null {
	const match = value.match(/^net-(\d+)$/);
	return match ? parseInt(match[1], 10) : null;
}

export function buildNetPaymentTerms(days: number): string {
	return `net-${days}`;
}

export function formatPaymentTerms(value: string): string {
	if (!value) return "—";
	const preset = PAYMENT_TERMS_OPTIONS.find((p) => p.value === value);
	if (preset) return preset.label;
	const days = parsePaymentTermDays(value);
	if (days != null) return `Net ${days} Days`;
	return value;
}

function applyStructuredPaymentTerms<
	T extends {
		paymentType?: PaymentType;
		creditDays?: number;
		advancePercentage?: number;
		paymentTerms?: string;
	},
>(record: T): T & {
	paymentType: PaymentType;
	creditDays: number;
	advancePercentage: number;
	paymentTerms: string;
} {
	const structured = resolveStructuredPaymentTerms(record);
	return {
		...record,
		paymentType: structured.paymentType,
		creditDays: structured.creditDays,
		advancePercentage: structured.advancePercentage,
		paymentTerms: paymentTermsToLegacy(structured),
	};
}

const STORAGE_KEY = "ds_customers_v4";

const SEED_CUSTOMERS_RAW = [
	{
		id: 1,
		customerCode: "CUST-0001",
		customerName: "Agro Solutions Pvt Ltd",
		customerType: "distributor",
		status: "active",
		blockReason: "",
		countryCode: "+91",
		mobile: "9876543210",
		email: "ramesh@agrosolutions.com",
		gstApplicable: true,
		gstin: "27AABCU9603R1ZX",
		gstCategory: "regular",
		gstMasterId: 4,
		tdsApplicable: true,
		tdsMasterId: 1,
		pan: "AABCU9603R",
		tan: "PNEA12345A",
		msmeRegistered: false,
		msmeNumber: "",
		cibRegn: "CIB/MH/2020/001",
		fcoRegn: "FCO/MH/2019/045",
		fssai: "11522980000001",
		address: "123 Market Road, Shivaji Nagar, Pune",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 8,
		districtName: "Pune Region",
		territoryId: null,
		territoryName: "Pune North",
		pincode: "411004",
		salesManId: 1,
		salesManName: "Rajesh Kumar",
		creditLimit: 500000,
		interestRate: 12,
		paymentTerms: "net-30",
		bankName: "HDFC Bank",
		bankBranchAddress: "FC Road, Pune",
		bankAccountNo: "50100234567890",
		ifscCode: "HDFC0001234",
		accountHolderName: "Agro Solutions Private Limited",
		branch: "FC Road Branch",
		swiftCode: "HDFCINBBXXX",
		createdBy: "Admin",
		createdDate: "2024-01-10",
		updatedBy: "Admin",
		updatedDate: "2024-03-15",
		lastStatusChange: "2024-01-10",
		statusHistory: [
			{
				date: "2024-01-10",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "New customer onboarded",
			},
		],
		branches: [
			{
				branchName: "Mumbai Corporate Office",
				isMain: true,
				billingAddress: {
					address: "456 Corporate Towers, Bandra Kurla Complex",
					city: "Mumbai",
					state: "Maharashtra",
					pincode: "400051",
				},
				shippingAddress: {
					address: "Plot 12, BKC Logistics Zone",
					city: "Mumbai",
					state: "Maharashtra",
					pincode: "400051",
				},
				documents: [
					{
						documentName: "Shop Act License",
						required: true,
						fileName: "shop_act_mumbai.pdf",
						fileUrl: "/mock-documents/shop_act.pdf",
					},
					{
						documentName: "GST Certificate",
						required: true,
						fileName: "gst_cert_mumbai.pdf",
						fileUrl: "/mock-documents/gst_cert.pdf",
					},
				],
			},
			{
				branchName: "Pune Warehouse Branch",
				isMain: false,
				billingAddress: {
					address: "123 Market Road, Shivaji Nagar",
					city: "Pune",
					state: "Maharashtra",
					pincode: "411004",
				},
				shippingAddress: {
					address: "123 Market Road, Shivaji Nagar",
					city: "Pune",
					state: "Maharashtra",
					pincode: "411004",
				},
				documents: [
					{
						documentName: "Rent Agreement",
						required: false,
						fileName: "pune_rent_agreement.pdf",
						fileUrl: "/mock-documents/rent_agreement.pdf",
					},
				],
			},
		],
		products: [
			{
				id: "m-1",
				productId: "prod-1",
				productName: "Organic Neem Fertilizer",
				sku: "FERT-NEEM-1KG",
				price: 280,
				discountType: "Percentage",
				discountValue: 20,
				status: "Active",
			},
			{
				id: "m-2",
				productId: "prod-2",
				productName: "Urea Premium Blend",
				sku: "FERT-UREA-50KG",
				price: 1080,
				discountType: "Flat",
				discountValue: 120,
				status: "Active",
			},
			{
				id: "m-3",
				productId: "prod-3",
				productName: "NPK Booster Spray",
				sku: "FERT-NPK-500ML",
				price: 450,
				discountType: "Percentage",
				discountValue: 0,
				status: "Inactive",
			},
		],
		customerProducts: [
			{
				id: "m-1",
				productId: "prod-1",
				productName: "Organic Neem Fertilizer",
				sku: "FERT-NEEM-1KG",
				price: 280,
				discountType: "Percentage",
				discountValue: 20,
				status: "Active",
			},
			{
				id: "m-2",
				productId: "prod-2",
				productName: "Urea Premium Blend",
				sku: "FERT-UREA-50KG",
				price: 1080,
				discountType: "Flat",
				discountValue: 120,
				status: "Active",
			},
			{
				id: "m-3",
				productId: "prod-3",
				productName: "NPK Booster Spray",
				sku: "FERT-NPK-500ML",
				price: 450,
				discountType: "Percentage",
				discountValue: 0,
				status: "Inactive",
			},
		],
		documents: {
			requiredDocuments: [
				{
					documentTypeId: "doc-gst",
					documentName: "GST Registration Certificate",
					required: true,
					fileName: "gst_certificate.pdf",
					fileUrl: "/mock-documents/gst_cert.pdf",
				},
				{
					documentTypeId: "doc-pan",
					documentName: "PAN Card copy",
					required: true,
					fileName: "pan_card_copy.pdf",
					fileUrl: "/mock-documents/pan_card.pdf",
				},
			],
			additionalDocuments: [
				{
					id: "doc-add-1",
					title: "Partnership Deed / Incorporation Certificate",
					fileName: "inc_cert.pdf",
					fileUrl: "/mock-documents/inc_cert.pdf",
				},
			],
		},
	},
	{
		id: 1001,
		customerCode: "CUST-1001",
		customerName: "Krishna C&F Logistics",
		customerType: "cf",
		status: "active",
		blockReason: "",
		countryCode: "+91",
		mobile: "9876501122",
		email: "krishna@cflogistics.in",
		gstApplicable: true,
		gstin: "27AAECK1234F1Z9",
		gstMasterId: 2,
		tdsApplicable: true,
		tdsMasterId: 1,
		tan: "PNEA22222A",
		cibRegn: "CIB/MH/2024/102",
		fcoRegn: "FCO/MH/2024/102",
		fssai: "11522980000022",
		address: "Plot 8, MIDC, Nashik, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 8,
		districtName: "Pune Region",
		territoryId: null,
		territoryName: "Nashik",
		pincode: "422010",
		salesManId: 1,
		salesManName: "Rajesh Kumar",
		creditLimit: 450000,
		interestRate: 11,
		paymentTerms: "net-30",
		bankName: "HDFC Bank",
		bankBranchAddress: "Nashik Main",
		bankAccountNo: "50100234567891",
		ifscCode: "HDFC0001235",
		createdBy: "Admin",
		createdDate: "2024-01-12",
		updatedBy: "Admin",
		updatedDate: "2024-03-18",
		lastStatusChange: "2024-01-12",
		statusHistory: [
			{
				date: "2024-01-12",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "Demo C&F customer added",
			},
		],
	},
	{
		id: 1002,
		customerCode: "CUST-1002",
		customerName: "Saraswati C&F Agents",
		customerType: "cf",
		status: "active",
		blockReason: "",
		countryCode: "+91",
		mobile: "9876512233",
		email: "saraswati@cfagents.in",
		gstApplicable: true,
		gstin: "27AAECS4567F1Z7",
		gstMasterId: 3,
		tdsApplicable: false,
		tdsMasterId: null,
		tan: "",
		cibRegn: "CIB/MH/2024/103",
		fcoRegn: "FCO/MH/2024/103",
		fssai: "11522980000033",
		address: "Shop 12, APMC Yard, Sangli, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 8,
		districtName: "Pune Region",
		territoryId: null,
		territoryName: "Sangli",
		pincode: "416416",
		salesManId: 2,
		salesManName: "Priya Singh",
		creditLimit: 380000,
		interestRate: 10,
		paymentTerms: "net-45",
		bankName: "Axis Bank",
		bankBranchAddress: "Sangli Branch",
		bankAccountNo: "50100234567892",
		ifscCode: "UTIB0000456",
		createdBy: "Admin",
		createdDate: "2024-01-18",
		updatedBy: "Admin",
		updatedDate: "2024-03-20",
		lastStatusChange: "2024-01-18",
		statusHistory: [
			{
				date: "2024-01-18",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "Demo C&F customer added",
			},
		],
	},
	{
		id: 1003,
		customerCode: "CUST-1003",
		customerName: "Vijay C&F Services",
		customerType: "cf",
		status: "inactive",
		blockReason: "",
		countryCode: "+91",
		mobile: "9876523344",
		email: "vijay@cfservices.in",
		gstApplicable: true,
		gstin: "27AAECV7890F1Z5",
		gstMasterId: 4,
		tdsApplicable: true,
		tdsMasterId: 2,
		tan: "PNEA33333A",
		cibRegn: "CIB/MH/2024/104",
		fcoRegn: "FCO/MH/2024/104",
		fssai: "11522980000044",
		address: "Near Old Bus Stand, Aurangabad, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 8,
		districtName: "Pune Region",
		territoryId: null,
		territoryName: "Aurangabad",
		pincode: "431001",
		salesManId: 1,
		salesManName: "Rajesh Kumar",
		creditLimit: 220000,
		interestRate: 12,
		paymentTerms: "net-30",
		bankName: "SBI",
		bankBranchAddress: "Aurangabad Main",
		bankAccountNo: "50100234567893",
		ifscCode: "SBIN0003456",
		createdBy: "Admin",
		createdDate: "2024-01-25",
		updatedBy: "Admin",
		updatedDate: "2024-04-02",
		lastStatusChange: "2024-01-25",
		statusHistory: [
			{
				date: "2024-01-25",
				from: "-",
				to: "inactive",
				by: "Admin",
				reason: "Demo C&F customer added",
			},
		],
	},
	{
		id: 5,
		customerCode: "CUST-0005",
		customerName: "Kisan FPO Cooperative",
		customerType: "fpo",
		status: "active",
		blockReason: "",
		countryCode: "+91",
		mobile: "9812345678",
		email: "suresh@kisanfpo.org",
		gstApplicable: true,
		gstin: "24BCDEF1234G2ZY",
		gstMasterId: 2,
		tdsApplicable: false,
		tdsMasterId: null,
		tan: "",
		cibRegn: "",
		fcoRegn: "FCO/MH/2021/012",
		fssai: "",
		address: "FPO Office, Near APMC, Mahadeo Nagar, Nashik",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 8,
		districtName: "Pune Region",
		territoryId: null,
		territoryName: "Nashik",
		pincode: "422001",
		salesManId: 2,
		salesManName: "Priya Singh",
		creditLimit: 250000,
		interestRate: 10,
		paymentTerms: "net-45",
		bankName: "SBI",
		bankBranchAddress: "Nashik Main",
		bankAccountNo: "30012345678",
		ifscCode: "SBIN0001234",
		createdBy: "Admin",
		createdDate: "2024-01-15",
		updatedBy: "Field Agent",
		updatedDate: "2024-02-20",
		lastStatusChange: "2024-01-15",
		statusHistory: [
			{
				date: "2024-01-15",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "FPO registration approved",
			},
		],
	},
	{
		id: 3,
		customerCode: "CUST-0003",
		customerName: "Green Earth CBBO Society",
		customerType: "cbbo",
		status: "inactive",
		blockReason: "",
		countryCode: "+91",
		mobile: "9898765432",
		email: "priya@greencbbo.com",
		gstApplicable: true,
		gstin: "29XYZAB5678H3ZW",
		gstMasterId: 3,
		tdsApplicable: true,
		tdsMasterId: 3,
		tan: "",
		cibRegn: "",
		fcoRegn: "",
		fssai: "",
		address: "Village Panchayat, Block C, Nagpur",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 7,
		districtName: "Mumbai Region",
		territoryId: null,
		territoryName: "Vidarbha East",
		pincode: "440001",
		salesManId: null,
		salesManName: "",
		creditLimit: 150000,
		interestRate: 14,
		paymentTerms: "net-15",
		bankName: "",
		bankBranchAddress: "",
		bankAccountNo: "",
		ifscCode: "",
		createdBy: "Admin",
		createdDate: "2024-02-01",
		updatedBy: "Admin",
		updatedDate: "2024-04-01",
		lastStatusChange: "2024-04-01",
		statusHistory: [
			{
				date: "2024-02-01",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "Initial onboarding",
			},
			{
				date: "2024-04-01",
				from: "active",
				to: "inactive",
				by: "Admin",
				reason: "Off-season",
			},
		],
	},
	{
		id: 4,
		customerCode: "CUST-0004",
		customerName: "Maharashtra Agri Distributors",
		customerType: "distributor",
		status: "blocked",
		blockReason: "Outstanding dues exceed ₹5L — payment overdue 90+ days",
		countryCode: "+91",
		mobile: "9765432109",
		email: "mohan@mahagri.com",
		gstApplicable: true,
		gstin: "27MNOPQ9876R4ZV",
		gstMasterId: 4,
		tdsApplicable: true,
		tdsMasterId: 1,
		tan: "PNEM98765B",
		cibRegn: "",
		fcoRegn: "",
		fssai: "",
		address: "Plot 45, Industrial Estate, Aurangabad",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 8,
		districtName: "Pune Region",
		territoryId: null,
		territoryName: "Marathwada",
		pincode: "431003",
		salesManId: 1,
		salesManName: "Rajesh Kumar",
		creditLimit: 0,
		interestRate: 0,
		paymentTerms: "advance",
		bankName: "ICICI Bank",
		bankBranchAddress: "CIDCO, Aurangabad",
		bankAccountNo: "012345678901",
		ifscCode: "ICIC0000456",
		createdBy: "Admin",
		createdDate: "2024-03-01",
		updatedBy: "Admin",
		updatedDate: "2024-05-10",
		lastStatusChange: "2024-05-10",
		statusHistory: [
			{
				date: "2024-03-01",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "New distributor",
			},
			{
				date: "2024-05-10",
				from: "active",
				to: "blocked",
				by: "Admin",
				reason: "Outstanding dues exceed ₹5L — payment overdue 90+ days",
			},
		],
	},
	{
		id: 5,
		customerCode: "CUST-0005",
		customerName: "Vidarbha Farmers Producer Org",
		customerType: "fpo",
		status: "draft",
		blockReason: "",
		countryCode: "+91",
		mobile: "9654321098",
		email: "anil@vidarbhafpo.in",
		gstApplicable: false,
		gstin: "",
		gstMasterId: null,
		tdsApplicable: false,
		tdsMasterId: null,
		tan: "",
		cibRegn: "",
		fcoRegn: "",
		fssai: "",
		address: "Near Gram Panchayat Office, Taluka Amravati",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 8,
		districtName: "Pune Region",
		territoryId: null,
		territoryName: "Amravati",
		pincode: "444601",
		salesManId: 2,
		salesManName: "Priya Singh",
		creditLimit: 200000,
		interestRate: 11,
		paymentTerms: "net-30",
		bankName: "",
		bankBranchAddress: "",
		bankAccountNo: "",
		ifscCode: "",
		createdBy: "Field Agent",
		createdDate: "2024-03-15",
		updatedBy: "Field Agent",
		updatedDate: "2024-03-15",
		lastStatusChange: "2024-03-15",
		statusHistory: [
			{
				date: "2024-03-15",
				from: "-",
				to: "draft",
				by: "Field Agent",
				reason: "Draft saved",
			},
		],
	},
	{
		id: 6,
		customerCode: "CUST-0006",
		customerName: "Shivneri Agro Traders",
		customerType: "dealer",
		status: "active",
		blockReason: "",
		countryCode: "+91",
		mobile: "9800074070",
		email: "nitin@shivneriagro.in",
		gstApplicable: true,
		gstin: "27ABCDE0006F1Z6",
		gstMasterId: 3,
		tdsApplicable: true,
		tdsMasterId: 1,
		tan: "PNE10006A",
		cibRegn: "CIB/MH/2024/006",
		fcoRegn: "FCO/MH/2024/006",
		fssai: "",
		address: "Main Road, Kolhapur, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 8,
		districtName: "Pune Region",
		territoryId: null,
		territoryName: "Kolhapur",
		pincode: "416003",
		salesManId: 1,
		salesManName: "Rajesh Kumar",
		creditLimit: 350000,
		interestRate: 11,
		paymentTerms: "net-30",
		bankName: "Axis Bank",
		bankBranchAddress: "Kolhapur Main",
		bankAccountNo: "50100000004662",
		ifscCode: "UTIB0000123",
		createdBy: "Admin",
		createdDate: "2024-06-13",
		updatedBy: "Admin",
		updatedDate: "2024-02-19",
		lastStatusChange: "2024-06-13",
		statusHistory: [
			{
				date: "2024-06-13",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "Customer verified and approved",
			},
		],
	},
	{
		id: 7,
		customerCode: "CUST-0007",
		customerName: "Satara Krushi Seva Kendra",
		customerType: "retailer",
		status: "active",
		blockReason: "",
		countryCode: "+91",
		mobile: "9800086415",
		email: "mahesh@satarakrushi.com",
		gstApplicable: true,
		gstin: "27ABCDE0007F1Z7",
		gstMasterId: 4,
		tdsApplicable: false,
		tdsMasterId: null,
		tan: "",
		cibRegn: "",
		fcoRegn: "FCO/MH/2024/007",
		fssai: "11522980000007",
		address: "Main Road, Satara, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 7,
		districtName: "Mumbai Region",
		territoryId: null,
		territoryName: "Satara",
		pincode: "415001",
		salesManId: 2,
		salesManName: "Priya Singh",
		creditLimit: 120000,
		interestRate: 13,
		paymentTerms: "net-15",
		bankName: "Bank of Baroda",
		bankBranchAddress: "Satara Road",
		bankAccountNo: "50100000005439",
		ifscCode: "BARB0SATARA",
		createdBy: "Admin",
		createdDate: "2024-01-15",
		updatedBy: "Admin",
		updatedDate: "2024-03-22",
		lastStatusChange: "2024-01-15",
		statusHistory: [
			{
				date: "2024-01-15",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "Customer verified and approved",
			},
		],
	},
	{
		id: 8,
		customerCode: "CUST-0008",
		customerName: "Konkan Fertilizer Depot",
		customerType: "distributor",
		status: "inactive",
		blockReason: "",
		countryCode: "+91",
		mobile: "9800098760",
		email: "sameer@konkanfert.com",
		gstApplicable: true,
		gstin: "27ABCDE0008F1Z8",
		gstMasterId: 1,
		tdsApplicable: true,
		tdsMasterId: 3,
		tan: "PNE10008A",
		cibRegn: "CIB/MH/2024/008",
		fcoRegn: "FCO/MH/2024/008",
		fssai: "11522980000008",
		address: "Main Road, Ratnagiri, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 8,
		districtName: "Pune Region",
		territoryId: null,
		territoryName: "Ratnagiri",
		pincode: "415612",
		salesManId: 1,
		salesManName: "Rajesh Kumar",
		creditLimit: 280000,
		interestRate: 12,
		paymentTerms: "net-45",
		bankName: "Canara Bank",
		bankBranchAddress: "Ratnagiri Branch",
		bankAccountNo: "50100000006216",
		ifscCode: "CNRB0002345",
		createdBy: "Admin",
		createdDate: "2024-02-17",
		updatedBy: "Admin",
		updatedDate: "2024-04-25",
		lastStatusChange: "2024-02-17",
		statusHistory: [
			{
				date: "2024-02-17",
				from: "-",
				to: "inactive",
				by: "Admin",
				reason: "Temporarily inactive",
			},
		],
	},
	{
		id: 9,
		customerCode: "CUST-0009",
		customerName: "Ahmednagar Farmer Group",
		customerType: "farmer",
		status: "active",
		blockReason: "",
		countryCode: "+91",
		mobile: "9800111105",
		email: "vilas@ahmedfarmer.org",
		gstApplicable: false,
		gstin: "",
		gstMasterId: null,
		tdsApplicable: false,
		tdsMasterId: null,
		tan: "",
		cibRegn: "",
		fcoRegn: "",
		fssai: "",
		address: "Main Road, Ahmednagar, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 7,
		districtName: "Mumbai Region",
		territoryId: null,
		territoryName: "Ahmednagar",
		pincode: "414001",
		salesManId: 2,
		salesManName: "Priya Singh",
		creditLimit: 90000,
		interestRate: 10,
		paymentTerms: "net-7",
		bankName: "SBI",
		bankBranchAddress: "Ahmednagar Main",
		bankAccountNo: "50100000006993",
		ifscCode: "SBIN0001456",
		createdBy: "Admin",
		createdDate: "2024-03-19",
		updatedBy: "Admin",
		updatedDate: "2024-05-28",
		lastStatusChange: "2024-03-19",
		statusHistory: [
			{
				date: "2024-03-19",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "Customer verified and approved",
			},
		],
	},
	{
		id: 10,
		customerCode: "CUST-0010",
		customerName: "Jalgaon Agri Inputs",
		customerType: "dealer",
		status: "active",
		blockReason: "",
		countryCode: "+91",
		mobile: "9800123450",
		email: "prakash@jalgaonagri.in",
		gstApplicable: true,
		gstin: "27ABCDE0010F1Z0",
		gstMasterId: 3,
		tdsApplicable: true,
		tdsMasterId: 2,
		tan: "PNE10010A",
		cibRegn: "CIB/MH/2024/010",
		fcoRegn: "FCO/MH/2024/010",
		fssai: "",
		address: "Main Road, Jalgaon, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 8,
		districtName: "Pune Region",
		territoryId: null,
		territoryName: "Jalgaon",
		pincode: "425001",
		salesManId: 1,
		salesManName: "Rajesh Kumar",
		creditLimit: 300000,
		interestRate: 12,
		paymentTerms: "net-30",
		bankName: "ICICI Bank",
		bankBranchAddress: "Jalgaon Market",
		bankAccountNo: "50100000007770",
		ifscCode: "ICIC0000789",
		createdBy: "Admin",
		createdDate: "2024-04-21",
		updatedBy: "Admin",
		updatedDate: "2024-06-03",
		lastStatusChange: "2024-04-21",
		statusHistory: [
			{
				date: "2024-04-21",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "Customer verified and approved",
			},
		],
	},
	{
		id: 11,
		customerCode: "CUST-0011",
		customerName: "Solapur Seed Distributors",
		customerType: "distributor",
		status: "blocked",
		blockReason: "Payment overdue more than 60 days",
		countryCode: "+91",
		mobile: "9800135795",
		email: "dinesh@solapurseeds.com",
		gstApplicable: true,
		gstin: "27ABCDE0011F1Z1",
		gstMasterId: 4,
		tdsApplicable: true,
		tdsMasterId: 3,
		tan: "PNE10011A",
		cibRegn: "CIB/MH/2024/011",
		fcoRegn: "FCO/MH/2024/011",
		fssai: "11522980000011",
		address: "Main Road, Solapur, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 7,
		districtName: "Mumbai Region",
		territoryId: null,
		territoryName: "Solapur",
		pincode: "413001",
		salesManId: 2,
		salesManName: "Priya Singh",
		creditLimit: 0,
		interestRate: 0,
		paymentTerms: "advance",
		bankName: "HDFC Bank",
		bankBranchAddress: "Solapur Camp",
		bankAccountNo: "50100000008547",
		ifscCode: "HDFC0001122",
		createdBy: "Admin",
		createdDate: "2024-05-23",
		updatedBy: "Admin",
		updatedDate: "2024-01-06",
		lastStatusChange: "2024-05-23",
		statusHistory: [
			{
				date: "2024-05-23",
				from: "-",
				to: "blocked",
				by: "Admin",
				reason: "Payment overdue and account blocked",
			},
		],
	},
	{
		id: 12,
		customerCode: "CUST-0012",
		customerName: "Nagpur Rural Retailers",
		customerType: "retailer",
		status: "active",
		blockReason: "",
		countryCode: "+91",
		mobile: "9800148140",
		email: "kunal@nagpurrural.in",
		gstApplicable: true,
		gstin: "27ABCDE0012F1Z2",
		gstMasterId: 1,
		tdsApplicable: false,
		tdsMasterId: null,
		tan: "",
		cibRegn: "",
		fcoRegn: "FCO/MH/2024/012",
		fssai: "11522980000012",
		address: "Main Road, Nagpur, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 8,
		districtName: "Pune Region",
		territoryId: null,
		territoryName: "Nagpur",
		pincode: "440010",
		salesManId: null,
		salesManName: "",
		creditLimit: 100000,
		interestRate: 14,
		paymentTerms: "net-15",
		bankName: "Union Bank",
		bankBranchAddress: "Nagpur Civil Lines",
		bankAccountNo: "50100000009324",
		ifscCode: "UBIN0534567",
		createdBy: "Admin",
		createdDate: "2024-06-25",
		updatedBy: "Admin",
		updatedDate: "2024-02-09",
		lastStatusChange: "2024-06-25",
		statusHistory: [
			{
				date: "2024-06-25",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "Customer verified and approved",
			},
		],
	},
	{
		id: 13,
		customerCode: "CUST-0013",
		customerName: "Akola Organic FPO",
		customerType: "fpo",
		status: "draft",
		blockReason: "",
		countryCode: "+91",
		mobile: "9800160485",
		email: "sanjay@akolaorganic.org",
		gstApplicable: false,
		gstin: "",
		gstMasterId: null,
		tdsApplicable: false,
		tdsMasterId: null,
		tan: "",
		cibRegn: "",
		fcoRegn: "",
		fssai: "",
		address: "Main Road, Akola, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 7,
		districtName: "Mumbai Region",
		territoryId: null,
		territoryName: "Akola",
		pincode: "444001",
		salesManId: 1,
		salesManName: "Rajesh Kumar",
		creditLimit: 180000,
		interestRate: 11,
		paymentTerms: "net-30",
		bankName: "",
		bankBranchAddress: "",
		bankAccountNo: "",
		ifscCode: "",
		createdBy: "Admin",
		createdDate: "2024-01-27",
		updatedBy: "Admin",
		updatedDate: "2024-03-12",
		lastStatusChange: "2024-01-27",
		statusHistory: [
			{
				date: "2024-01-27",
				from: "-",
				to: "draft",
				by: "Admin",
				reason: "Draft saved",
			},
		],
	},
	{
		id: 14,
		customerCode: "CUST-0014",
		customerName: "Latur Crop Care Agency",
		customerType: "dealer",
		status: "active",
		blockReason: "",
		countryCode: "+91",
		mobile: "9800172830",
		email: "rohit@laturcropcare.com",
		gstApplicable: true,
		gstin: "27ABCDE0014F1Z4",
		gstMasterId: 3,
		tdsApplicable: true,
		tdsMasterId: 3,
		tan: "PNE10014A",
		cibRegn: "CIB/MH/2024/014",
		fcoRegn: "FCO/MH/2024/014",
		fssai: "",
		address: "Main Road, Latur, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 8,
		districtName: "Pune Region",
		territoryId: null,
		territoryName: "Latur",
		pincode: "413512",
		salesManId: 2,
		salesManName: "Priya Singh",
		creditLimit: 240000,
		interestRate: 12,
		paymentTerms: "net-30",
		bankName: "Punjab National Bank",
		bankBranchAddress: "Latur Main",
		bankAccountNo: "50100000010878",
		ifscCode: "PUNB0123400",
		createdBy: "Admin",
		createdDate: "2024-02-01",
		updatedBy: "Admin",
		updatedDate: "2024-04-15",
		lastStatusChange: "2024-02-01",
		statusHistory: [
			{
				date: "2024-02-01",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "Customer verified and approved",
			},
		],
	},
	{
		id: 15,
		customerCode: "CUST-0015",
		customerName: "Sangli Sugarcane Farmers",
		customerType: "farmer",
		status: "active",
		blockReason: "",
		countryCode: "+91",
		mobile: "9800185175",
		email: "ganesh@sanglifarmers.org",
		gstApplicable: false,
		gstin: "",
		gstMasterId: null,
		tdsApplicable: false,
		tdsMasterId: null,
		tan: "",
		cibRegn: "",
		fcoRegn: "",
		fssai: "",
		address: "Main Road, Sangli, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 7,
		districtName: "Mumbai Region",
		territoryId: null,
		territoryName: "Sangli",
		pincode: "416416",
		salesManId: 1,
		salesManName: "Rajesh Kumar",
		creditLimit: 110000,
		interestRate: 10,
		paymentTerms: "net-7",
		bankName: "SBI",
		bankBranchAddress: "Sangli Branch",
		bankAccountNo: "50100000011655",
		ifscCode: "SBIN0009876",
		createdBy: "Admin",
		createdDate: "2024-03-03",
		updatedBy: "Admin",
		updatedDate: "2024-05-18",
		lastStatusChange: "2024-03-03",
		statusHistory: [
			{
				date: "2024-03-03",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "Customer verified and approved",
			},
		],
	},
	{
		id: 16,
		customerCode: "CUST-0016",
		customerName: "Nanded Agri Mart",
		customerType: "retailer",
		status: "inactive",
		blockReason: "",
		countryCode: "+91",
		mobile: "9800197520",
		email: "arun@nandedagrimart.in",
		gstApplicable: true,
		gstin: "27ABCDE0016F1Z6",
		gstMasterId: 1,
		tdsApplicable: false,
		tdsMasterId: null,
		tan: "",
		cibRegn: "",
		fcoRegn: "FCO/MH/2024/016",
		fssai: "11522980000016",
		address: "Main Road, Nanded, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 8,
		districtName: "Pune Region",
		territoryId: null,
		territoryName: "Nanded",
		pincode: "431601",
		salesManId: 2,
		salesManName: "Priya Singh",
		creditLimit: 95000,
		interestRate: 13,
		paymentTerms: "net-15",
		bankName: "Axis Bank",
		bankBranchAddress: "Nanded Road",
		bankAccountNo: "50100000012432",
		ifscCode: "UTIB0000456",
		createdBy: "Admin",
		createdDate: "2024-04-05",
		updatedBy: "Admin",
		updatedDate: "2024-06-21",
		lastStatusChange: "2024-04-05",
		statusHistory: [
			{
				date: "2024-04-05",
				from: "-",
				to: "inactive",
				by: "Admin",
				reason: "Temporarily inactive",
			},
		],
	},
	{
		id: 17,
		customerCode: "CUST-0017",
		customerName: "Beed Farm Supply Co",
		customerType: "dealer",
		status: "active",
		blockReason: "",
		countryCode: "+91",
		mobile: "9800209865",
		email: "yogesh@beedfarmsupply.com",
		gstApplicable: true,
		gstin: "27ABCDE0017F1Z7",
		gstMasterId: 2,
		tdsApplicable: true,
		tdsMasterId: 3,
		tan: "PNE10017A",
		cibRegn: "CIB/MH/2024/017",
		fcoRegn: "FCO/MH/2024/017",
		fssai: "",
		address: "Main Road, Beed, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 7,
		districtName: "Mumbai Region",
		territoryId: null,
		territoryName: "Beed",
		pincode: "431122",
		salesManId: 1,
		salesManName: "Rajesh Kumar",
		creditLimit: 210000,
		interestRate: 12,
		paymentTerms: "net-30",
		bankName: "Bank of Maharashtra",
		bankBranchAddress: "Beed Main",
		bankAccountNo: "50100000013209",
		ifscCode: "MAHB0001678",
		createdBy: "Admin",
		createdDate: "2024-05-07",
		updatedBy: "Admin",
		updatedDate: "2024-01-24",
		lastStatusChange: "2024-05-07",
		statusHistory: [
			{
				date: "2024-05-07",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "Customer verified and approved",
			},
		],
	},
	{
		id: 18,
		customerCode: "CUST-0018",
		customerName: "Wardha Growers Producer Co",
		customerType: "fpo",
		status: "active",
		blockReason: "",
		countryCode: "+91",
		mobile: "9800222210",
		email: "mangesh@wardhagrowers.org",
		gstApplicable: true,
		gstin: "27ABCDE0018F1Z8",
		gstMasterId: 3,
		tdsApplicable: true,
		tdsMasterId: 1,
		tan: "PNE10018A",
		cibRegn: "",
		fcoRegn: "",
		fssai: "",
		address: "Main Road, Wardha, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 8,
		districtName: "Pune Region",
		territoryId: null,
		territoryName: "Wardha",
		pincode: "442001",
		salesManId: 2,
		salesManName: "Priya Singh",
		creditLimit: 260000,
		interestRate: 11,
		paymentTerms: "net-45",
		bankName: "Canara Bank",
		bankBranchAddress: "Wardha Branch",
		bankAccountNo: "50100000013986",
		ifscCode: "CNRB0003456",
		createdBy: "Admin",
		createdDate: "2024-06-09",
		updatedBy: "Admin",
		updatedDate: "2024-02-27",
		lastStatusChange: "2024-06-09",
		statusHistory: [
			{
				date: "2024-06-09",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "Customer verified and approved",
			},
		],
	},
	{
		id: 19,
		customerCode: "CUST-0019",
		customerName: "Chandrapur Krushi Bhandar",
		customerType: "retailer",
		status: "active",
		blockReason: "",
		countryCode: "+91",
		mobile: "9800234555",
		email: "deepak@chandrapurkrushi.in",
		gstApplicable: true,
		gstin: "27ABCDE0019F1Z9",
		gstMasterId: 4,
		tdsApplicable: false,
		tdsMasterId: null,
		tan: "",
		cibRegn: "",
		fcoRegn: "FCO/MH/2024/019",
		fssai: "11522980000019",
		address: "Main Road, Chandrapur, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 7,
		districtName: "Mumbai Region",
		territoryId: null,
		territoryName: "Chandrapur",
		pincode: "442401",
		salesManId: 1,
		salesManName: "Rajesh Kumar",
		creditLimit: 130000,
		interestRate: 14,
		paymentTerms: "net-15",
		bankName: "ICICI Bank",
		bankBranchAddress: "Chandrapur Main",
		bankAccountNo: "50100000014763",
		ifscCode: "ICIC0001235",
		createdBy: "Admin",
		createdDate: "2024-01-11",
		updatedBy: "Admin",
		updatedDate: "2024-03-02",
		lastStatusChange: "2024-01-11",
		statusHistory: [
			{
				date: "2024-01-11",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "Customer verified and approved",
			},
		],
	},
	{
		id: 20,
		customerCode: "CUST-0020",
		customerName: "Osmanabad Seeds And Fertilizers",
		customerType: "dealer",
		status: "blocked",
		blockReason: "Payment overdue more than 60 days",
		countryCode: "+91",
		mobile: "9800246900",
		email: "harish@osmanabadseeds.com",
		gstApplicable: true,
		gstin: "27ABCDE0020F1Z0",
		gstMasterId: 1,
		tdsApplicable: true,
		tdsMasterId: 3,
		tan: "PNE10020A",
		cibRegn: "CIB/MH/2024/020",
		fcoRegn: "FCO/MH/2024/020",
		fssai: "",
		address: "Main Road, Osmanabad, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 8,
		districtName: "Pune Region",
		territoryId: null,
		territoryName: "Osmanabad",
		pincode: "413501",
		salesManId: 2,
		salesManName: "Priya Singh",
		creditLimit: 0,
		interestRate: 0,
		paymentTerms: "advance",
		bankName: "HDFC Bank",
		bankBranchAddress: "Osmanabad Market",
		bankAccountNo: "50100000015540",
		ifscCode: "HDFC0001345",
		createdBy: "Admin",
		createdDate: "2024-02-13",
		updatedBy: "Admin",
		updatedDate: "2024-04-05",
		lastStatusChange: "2024-02-13",
		statusHistory: [
			{
				date: "2024-02-13",
				from: "-",
				to: "blocked",
				by: "Admin",
				reason: "Payment overdue and account blocked",
			},
		],
	},
	{
		id: 21,
		customerCode: "CUST-0021",
		customerName: "Parbhani Agro Center",
		customerType: "distributor",
		status: "active",
		blockReason: "",
		countryCode: "+91",
		mobile: "9800259245",
		email: "naresh@parbhaniagro.in",
		gstApplicable: true,
		gstin: "27ABCDE0021F1Z1",
		gstMasterId: 2,
		tdsApplicable: true,
		tdsMasterId: 1,
		tan: "PNE10021A",
		cibRegn: "CIB/MH/2024/021",
		fcoRegn: "FCO/MH/2024/021",
		fssai: "11522980000021",
		address: "Main Road, Parbhani, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 7,
		districtName: "Mumbai Region",
		territoryId: null,
		territoryName: "Parbhani",
		pincode: "431401",
		salesManId: 1,
		salesManName: "Rajesh Kumar",
		creditLimit: 320000,
		interestRate: 12,
		paymentTerms: "net-30",
		bankName: "SBI",
		bankBranchAddress: "Parbhani Main",
		bankAccountNo: "50100000016317",
		ifscCode: "SBIN0002222",
		createdBy: "Admin",
		createdDate: "2024-03-15",
		updatedBy: "Admin",
		updatedDate: "2024-05-08",
		lastStatusChange: "2024-03-15",
		statusHistory: [
			{
				date: "2024-03-15",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "Customer verified and approved",
			},
		],
	},
	{
		id: 22,
		customerCode: "CUST-0022",
		customerName: "Dhule Farmers Collective",
		customerType: "farmer",
		status: "draft",
		blockReason: "",
		countryCode: "+91",
		mobile: "9800271590",
		email: "rakesh@dhulefarmers.org",
		gstApplicable: false,
		gstin: "",
		gstMasterId: null,
		tdsApplicable: false,
		tdsMasterId: null,
		tan: "",
		cibRegn: "",
		fcoRegn: "",
		fssai: "",
		address: "Main Road, Dhule, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 8,
		districtName: "Pune Region",
		territoryId: null,
		territoryName: "Dhule",
		pincode: "424001",
		salesManId: 2,
		salesManName: "Priya Singh",
		creditLimit: 85000,
		interestRate: 10,
		paymentTerms: "net-7",
		bankName: "",
		bankBranchAddress: "",
		bankAccountNo: "",
		ifscCode: "",
		createdBy: "Admin",
		createdDate: "2024-04-17",
		updatedBy: "Admin",
		updatedDate: "2024-06-11",
		lastStatusChange: "2024-04-17",
		statusHistory: [
			{
				date: "2024-04-17",
				from: "-",
				to: "draft",
				by: "Admin",
				reason: "Draft saved",
			},
		],
	},
	{
		id: 23,
		customerCode: "CUST-0023",
		customerName: "Bhandara Agri Retail",
		customerType: "retailer",
		status: "active",
		blockReason: "",
		countryCode: "+91",
		mobile: "9800283935",
		email: "ajay@bhandaraagri.com",
		gstApplicable: true,
		gstin: "27ABCDE0023F1Z3",
		gstMasterId: 4,
		tdsApplicable: false,
		tdsMasterId: null,
		tan: "",
		cibRegn: "",
		fcoRegn: "FCO/MH/2024/023",
		fssai: "11522980000023",
		address: "Main Road, Bhandara, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 7,
		districtName: "Mumbai Region",
		territoryId: null,
		territoryName: "Bhandara",
		pincode: "441904",
		salesManId: 1,
		salesManName: "Rajesh Kumar",
		creditLimit: 105000,
		interestRate: 13,
		paymentTerms: "net-15",
		bankName: "Union Bank",
		bankBranchAddress: "Bhandara Branch",
		bankAccountNo: "50100000017871",
		ifscCode: "UBIN0543210",
		createdBy: "Admin",
		createdDate: "2024-05-19",
		updatedBy: "Admin",
		updatedDate: "2024-01-14",
		lastStatusChange: "2024-05-19",
		statusHistory: [
			{
				date: "2024-05-19",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "Customer verified and approved",
			},
		],
	},
	{
		id: 24,
		customerCode: "CUST-0024",
		customerName: "Gondia Crop Solutions",
		customerType: "dealer",
		status: "active",
		blockReason: "",
		countryCode: "+91",
		mobile: "9800296280",
		email: "santosh@gondiacrop.in",
		gstApplicable: true,
		gstin: "27ABCDE0024F1Z4",
		gstMasterId: 1,
		tdsApplicable: true,
		tdsMasterId: 1,
		tan: "PNE10024A",
		cibRegn: "CIB/MH/2024/024",
		fcoRegn: "FCO/MH/2024/024",
		fssai: "",
		address: "Main Road, Gondia, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 8,
		districtName: "Pune Region",
		territoryId: null,
		territoryName: "Gondia",
		pincode: "441601",
		salesManId: 2,
		salesManName: "Priya Singh",
		creditLimit: 225000,
		interestRate: 12,
		paymentTerms: "net-30",
		bankName: "Bank of Baroda",
		bankBranchAddress: "Gondia Main",
		bankAccountNo: "50100000018648",
		ifscCode: "BARB0GONDIA",
		createdBy: "Admin",
		createdDate: "2024-06-21",
		updatedBy: "Admin",
		updatedDate: "2024-02-17",
		lastStatusChange: "2024-06-21",
		statusHistory: [
			{
				date: "2024-06-21",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "Customer verified and approved",
			},
		],
	},
	{
		id: 25,
		customerCode: "CUST-0025",
		customerName: "Yavatmal Cotton FPO",
		customerType: "fpo",
		status: "active",
		blockReason: "",
		countryCode: "+91",
		mobile: "9800308625",
		email: "balu@yavatmalcotton.org",
		gstApplicable: true,
		gstin: "27ABCDE0025F1Z5",
		gstMasterId: 2,
		tdsApplicable: true,
		tdsMasterId: 2,
		tan: "PNE10025A",
		cibRegn: "",
		fcoRegn: "",
		fssai: "",
		address: "Main Road, Yavatmal, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 7,
		districtName: "Mumbai Region",
		territoryId: null,
		territoryName: "Yavatmal",
		pincode: "445001",
		salesManId: 1,
		salesManName: "Rajesh Kumar",
		creditLimit: 275000,
		interestRate: 11,
		paymentTerms: "net-45",
		bankName: "Canara Bank",
		bankBranchAddress: "Yavatmal Branch",
		bankAccountNo: "50100000019425",
		ifscCode: "CNRB0004567",
		createdBy: "Admin",
		createdDate: "2024-01-23",
		updatedBy: "Admin",
		updatedDate: "2024-03-20",
		lastStatusChange: "2024-01-23",
		statusHistory: [
			{
				date: "2024-01-23",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "Customer verified and approved",
			},
		],
	},
	{
		id: 1004,
		customerCode: "CUST-1004",
		customerName: "Balaji CNF Services",
		customerType: "CNF",
		status: "active",
		blockReason: "",
		countryCode: "+91",
		mobile: "9876534455",
		email: "balaji@cnfservices.in",
		gstApplicable: true,
		gstin: "27AAECA1234B1Z2",
		gstMasterId: 3,
		tdsApplicable: false,
		tdsMasterId: null,
		tan: "",
		cibRegn: "",
		fcoRegn: "",
		fssai: "",
		address: "A-54, Industrial Area, Nagpur, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 8,
		districtName: "Pune Region",
		territoryId: null,
		territoryName: "Nagpur",
		pincode: "440012",
		salesManId: 1,
		salesManName: "Rajesh Kumar",
		creditLimit: 300000,
		interestRate: 12,
		paymentTerms: "net-30",
		bankName: "SBI",
		bankBranchAddress: "Nagpur Main",
		bankAccountNo: "30012345679",
		ifscCode: "SBIN0001235",
		createdBy: "Admin",
		createdDate: "2026-06-11",
		updatedBy: "Admin",
		updatedDate: "2026-06-11",
		lastStatusChange: "2026-06-11",
		statusHistory: [
			{
				date: "2026-06-11",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "Reference CNF customer added",
			},
		],
	},
	{
		id: 1005,
		customerCode: "CUST-1005",
		customerName: "Royal C&F Agent Group",
		customerType: "C&F Agent",
		status: "active",
		blockReason: "",
		countryCode: "+91",
		mobile: "9876545566",
		email: "royal@cfagent.in",
		gstApplicable: true,
		gstin: "27AAECR5678C1Z3",
		gstMasterId: 2,
		tdsApplicable: true,
		tdsMasterId: 1,
		tan: "PNEA33333A",
		cibRegn: "",
		fcoRegn: "",
		fssai: "",
		address: "Plot 120, Sector 4, Kalamboli, Navi Mumbai",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 7,
		districtName: "Mumbai Region",
		territoryId: null,
		territoryName: "Navi Mumbai",
		pincode: "410218",
		salesManId: 2,
		salesManName: "Priya Singh",
		creditLimit: 500000,
		interestRate: 11,
		paymentTerms: "net-45",
		bankName: "HDFC Bank",
		bankBranchAddress: "Panvel Main",
		bankAccountNo: "50100234567895",
		ifscCode: "HDFC0001236",
		createdBy: "Admin",
		createdDate: "2026-06-11",
		updatedBy: "Admin",
		updatedDate: "2026-06-11",
		lastStatusChange: "2026-06-11",
		statusHistory: [
			{
				date: "2026-06-11",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "Reference C&F Agent customer added",
			},
		],
	},
];

const SEED_CUSTOMERS: Customer[] = SEED_CUSTOMERS_RAW.map((c) =>
	applyStructuredPaymentTerms(c) as Customer,
);

function migrateCustomer(raw: Record<string, unknown>): Customer {
	const c = raw as Partial<Customer> & {
		phones?: { countryCode: string; number: string }[];
		emails?: { email: string }[];
		contactPerson?: string;
		addressLine1?: string;
		addressLine2?: string;
		city?: string;
		state?: string;
		territory?: string;
		tdsPercent?: number;
		pan?: string;
	};

	const phones = c.phones ?? [];
	const emails = c.emails ?? [];

	return {
		id: c.id ?? 0,
		customerCode: c.customerCode ?? "",
		customerName: c.customerName ?? "",
		customerType: c.customerType ?? "distributor",
		status: (c.status as CustomerStatus) ?? "inactive",
		blockReason: c.blockReason ?? "",
		countryCode: c.countryCode ?? phones[0]?.countryCode ?? "+91",
		mobile: c.mobile ?? phones[0]?.number ?? "",
		email: c.email ?? emails[0]?.email ?? "",
		gstApplicable: c.gstApplicable ?? !!c.gstin,
		gstin: c.gstin ?? "",
		gstCategory: deriveGstCategory(
			c.gstApplicable,
			c.gstin,
			c.gstCategory,
		),
		gstMasterId: c.gstMasterId ?? null,
		tdsApplicable: c.tdsApplicable ?? Number(c.tdsPercent) > 0,
		tdsMasterId: c.tdsMasterId ?? null,
		pan: c.pan ?? "",
		tan: c.tan ?? "",
		msmeRegistered: c.msmeRegistered ?? false,
		msmeNumber: c.msmeNumber ?? "",
		fssaiRegistered: c.fssaiRegistered ?? !!c.fssai?.trim(),
		cibRegistered: c.cibRegistered ?? !!c.cibRegn?.trim(),
		fcoRegistered: c.fcoRegistered ?? !!c.fcoRegn?.trim(),
		cibRegn: c.cibRegn ?? "",
		fcoRegn: c.fcoRegn ?? "",
		fssai: c.fssai ?? "",
		address:
			c.address ??
			[c.addressLine1, c.addressLine2, c.city].filter(Boolean).join(", "),
		stateId: c.stateId ?? null,
		stateName: c.stateName ?? c.state ?? "",
		districtId: c.districtId ?? null,
		districtName: c.districtName ?? "",
		territoryId: c.territoryId ?? null,
		territoryName: c.territoryName ?? c.territory ?? "",
		pincode: c.pincode ?? "",
		salesManId: c.salesManId ?? null,
		salesManName: c.salesManName ?? "",
		creditLimit: c.creditLimit ?? 0,
		interestRate: c.interestRate ?? 0,
		...applyStructuredPaymentTerms({
			paymentType: c.paymentType,
			creditDays: c.creditDays,
			advancePercentage: c.advancePercentage,
			paymentTerms: c.paymentTerms ?? "net-30",
		}),
		bankName: c.bankName ?? "",
		bankBranchAddress: c.bankBranchAddress ?? "",
		bankAccountNo: c.bankAccountNo ?? "",
		ifscCode: c.ifscCode ?? "",
		accountHolderName: c.accountHolderName ?? "",
		branch: c.branch ?? "",
		swiftCode: c.swiftCode ?? "",
		createdBy: c.createdBy ?? "Admin",
		createdDate: c.createdDate ?? "",
		updatedBy: c.updatedBy ?? "Admin",
		updatedDate: c.updatedDate ?? "",
		lastStatusChange: c.lastStatusChange ?? "",
		statusHistory: c.statusHistory ?? [],
		documents: c.documents ?? {
			requiredDocuments: [],
			additionalDocuments: [],
		},
		customerProducts: c.customerProducts ?? (c as any).products ?? [],
		products: c.customerProducts ?? (c as any).products ?? [],
		branches: c.branches ?? [],
	};
}

export function loadCustomers(): Customer[] {
	if (typeof window === "undefined") return SEED_CUSTOMERS;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return SEED_CUSTOMERS;
		const data = JSON.parse(raw) as Record<string, unknown>[];
		let loaded = data.map(migrateCustomer);
		const hasReference = loaded.some(c => c.id === 1004 || c.id === 1005);
		if (!hasReference) {
			const refCustomers = SEED_CUSTOMERS.filter(c => c.id === 1004 || c.id === 1005);
			if (refCustomers.length > 0) {
				loaded = [...loaded, ...refCustomers];
			}
		}
		const needsCodes = loaded.some((c) => isMasterCodeEmpty(c.customerCode));
		if (needsCodes) {
			const codes = loaded
				.map((c) => c.customerCode)
				.filter((c) => !isMasterCodeEmpty(c));
			let changed = false;
			loaded = loaded.map((c) => {
				if (!isMasterCodeEmpty(c.customerCode)) return c;
				const prefix = getInitialCodeForCustomerType(c.customerType);
				if (!prefix) return c;
				const code = generateTypedMasterCode(prefix, codes);
				codes.push(code);
				changed = true;
				return { ...c, customerCode: code };
			});
			if (changed) {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
			}
		} else if (!hasReference) {
			const refCustomers = SEED_CUSTOMERS.filter(c => c.id === 1004 || c.id === 1005);
			if (refCustomers.length > 0) {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
			}
		}
		return loaded;
	} catch {
		return SEED_CUSTOMERS;
	}
}

export function saveCustomers(list: Customer[]): void {
	if (typeof window === "undefined") return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function nextCustomerId(list: Customer[]): number {
	return Math.max(0, ...list.map((c) => c.id)) + 1;
}

export function generateCustomerCode(list: Customer[]): string {
	const maxNum = list.reduce((max, c) => {
		const m = c.customerCode.match(/CUST-(\d+)/);
		return m ? Math.max(max, parseInt(m[1], 10)) : max;
	}, 0);
	return `CUST-${String(maxNum + 1).padStart(4, "0")}`;
}

/** Generate per-type customer code (e.g. DIS-001). Falls back to legacy CUST-xxxx if type has no initial code. */
export function generateCustomerCodeForType(
	customerType: string,
	customers: Customer[],
	excludeCode?: string,
): string {
	const initialCode = getInitialCodeForCustomerType(customerType);
	if (!initialCode) {
		return generateCustomerCode(customers);
	}
	return generateTypedMasterCode(
		initialCode,
		customers.map((c) => c.customerCode),
		excludeCode,
	);
}

export function todayStr(): string {
	return new Date().toISOString().slice(0, 10);
}

export function validateGSTIN(v: string): boolean {
	return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
		v.trim(),
	);
}

export { validatePAN, validateTAN, validateMSMENumber } from "@/lib/masters/gst-compliance";

export function validateMobile(v: string): boolean {
	return /^[6-9][0-9]{9}$/.test(v.trim());
}

export function validateEmail(v: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function validatePincode(v: string): boolean {
	return /^[1-9][0-9]{5}$/.test(v.trim());
}

export function validateIFSC(v: string): boolean {
	return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.trim().toUpperCase());
}

/** Only active customers can be used in new transactions */
export function isCustomerTransactable(c: Customer): boolean {
	return c.status === "active";
}

/** For SO / invoice customer dropdowns */
export function getCustomersForTransactionDropdown(): Customer[] {
	return loadCustomers().filter(isCustomerTransactable);
}

export function getActiveGSTMasters(): GSTMaster[] {
	return loadGSTMasters().filter((g) => g.status === "active");
}

export function getActiveTDSMasters(): TDSMaster[] {
	return loadTDSMasters().filter((t) => t.status === "active");
}

/** Active State-level nodes */
export function getActiveGeoStates(nodes?: GeoNode[]): GeoNode[] {
	const list = nodes ?? loadGeoNodes();
	return list.filter((n) => n.level === "State" && n.status === "active");
}

/** District nodes under a State (descendants) */
export function getDistrictsForState(
	stateId: number,
	nodes?: GeoNode[],
): GeoNode[] {
	const list = nodes ?? loadGeoNodes();
	const result: GeoNode[] = [];
	function walk(parentId: number) {
		for (const child of getChildren(parentId, list)) {
			if (child.status !== "active") continue;
			if (child.level === "District") result.push(child);
			else walk(child.id);
		}
	}
	walk(stateId);
	return result;
}

/** Territory ancestor of a District (for state → district → territory cascade) */
export function getTerritoriesUnderDistrict(
	districtId: number,
	nodes?: GeoNode[],
): GeoNode[] {
	const list = nodes ?? loadGeoNodes();
	let cur = list.find((n) => n.id === districtId);
	while (cur) {
		if (cur.parentId === null) break;
		const parent = list.find((n) => n.id === cur!.parentId);
		if (!parent) break;
		if (parent.level === "Territory" && parent.status === "active") return [parent];
		cur = parent;
	}
	return [];
}

export function getPincodesForTerritory(
	territoryId: number,
	nodes?: GeoNode[],
): string[] {
	const list = nodes ?? loadGeoNodes();
	const codes = new Set<string>();
	function walk(parentId: number) {
		for (const child of getChildren(parentId, list)) {
			if (child.pincode) codes.add(child.pincode);
			walk(child.id);
		}
	}
	walk(territoryId);
	return Array.from(codes).sort();
}

export function getActiveSalesEmployees(): Employee[] {
	return loadEmployees().filter((e) => e.status === "active");
}

export function formatMobile(countryCode: string, mobile: string): string {
	if (!mobile) return "—";
	return `${countryCode} ${mobile}`;
}

export function formatCreditLimit(n: number): string {
	if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
	if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
	return `₹${n}`;
}
