/**
 * Sales Order — Credit Limit demo scenarios (frontend presentation / testing).
 *
 * Three customers @ ₹3,50,000 limit with fixed utilized / available balances
 * driven by posted demo invoices only (no open orders).
 */

export const CREDIT_LIMIT_DEMO_AMOUNT = 350_000;

export const CREDIT_LIMIT_DEMO_CUSTOMER_IDS = [1010, 1011, 1012] as const;

export type CreditLimitDemoCustomerId =
	(typeof CREDIT_LIMIT_DEMO_CUSTOMER_IDS)[number];

/** Utilized credit targets per demo customer (invoice outstanding). */
export const CREDIT_LIMIT_DEMO_UTILIZED: Record<CreditLimitDemoCustomerId, number> =
	{
		1010: 175_000,
		1011: 320_000,
		1012: 350_000,
	};

export function isCreditLimitDemoCustomerId(
	customerId: number,
): customerId is CreditLimitDemoCustomerId {
	return (CREDIT_LIMIT_DEMO_CUSTOMER_IDS as readonly number[]).includes(
		customerId,
	);
}

/** Minimal customer records merged into Customer Master seed. */
export const CREDIT_LIMIT_DEMO_CUSTOMERS_RAW = [
	{
		id: 1010,
		customerCode: "CUST-CL01",
		customerName: "Credit Demo — Healthy",
		customerType: "distributor",
		status: "active" as const,
		blockReason: "",
		countryCode: "+91",
		mobile: "9800001010",
		email: "healthy@credit-demo.in",
		gstApplicable: true,
		gstin: "27AABCD1010A1Z1",
		gstMasterId: 4,
		tdsApplicable: false,
		tdsMasterId: null,
		cibRegn: "",
		fcoRegn: "",
		fssai: "",
		address: "12 Demo Lane, Pune, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 8,
		districtName: "Pune Region",
		territoryId: null,
		territoryName: "Pune Demo",
		pincode: "411001",
		salesManId: 1,
		salesManName: "Rajesh Kumar",
		creditLimit: CREDIT_LIMIT_DEMO_AMOUNT,
		interestRate: 12,
		paymentTerms: "net-30",
		bankName: "HDFC Bank",
		bankBranchAddress: "Pune Demo Branch",
		bankAccountNo: "50100987654321",
		ifscCode: "HDFC0001010",
		createdBy: "Admin",
		createdDate: "2026-06-20",
		updatedBy: "Admin",
		updatedDate: "2026-06-20",
		lastStatusChange: "2026-06-20",
		statusHistory: [
			{
				date: "2026-06-20",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "Credit limit demo — healthy scenario",
			},
		],
		branches: [
			{
				branchName: "Main",
				isMain: true,
				billingAddress: {
					address: "12 Demo Lane, Pune",
					city: "Pune",
					state: "Maharashtra",
					pincode: "411001",
				},
				shippingAddress: {
					address: "12 Demo Lane, Pune",
					city: "Pune",
					state: "Maharashtra",
					pincode: "411001",
				},
				documents: [],
			},
		],
	},
	{
		id: 1011,
		customerCode: "CUST-CL02",
		customerName: "Credit Demo — Near Limit",
		customerType: "distributor",
		status: "active" as const,
		blockReason: "",
		countryCode: "+91",
		mobile: "9800001011",
		email: "nearlimit@credit-demo.in",
		gstApplicable: true,
		gstin: "27AABCD1011B1Z2",
		gstMasterId: 4,
		tdsApplicable: false,
		tdsMasterId: null,
		cibRegn: "",
		fcoRegn: "",
		fssai: "",
		address: "34 Warning Road, Nashik, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 8,
		districtName: "Pune Region",
		territoryId: null,
		territoryName: "Nashik Demo",
		pincode: "422001",
		salesManId: 2,
		salesManName: "Priya Singh",
		creditLimit: CREDIT_LIMIT_DEMO_AMOUNT,
		interestRate: 12,
		paymentTerms: "net-30",
		bankName: "ICICI Bank",
		bankBranchAddress: "Nashik Demo Branch",
		bankAccountNo: "50100987654322",
		ifscCode: "ICIC0001011",
		createdBy: "Admin",
		createdDate: "2026-06-20",
		updatedBy: "Admin",
		updatedDate: "2026-06-20",
		lastStatusChange: "2026-06-20",
		statusHistory: [
			{
				date: "2026-06-20",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "Credit limit demo — near limit scenario",
			},
		],
		branches: [
			{
				branchName: "Main",
				isMain: true,
				billingAddress: {
					address: "34 Warning Road, Nashik",
					city: "Nashik",
					state: "Maharashtra",
					pincode: "422001",
				},
				shippingAddress: {
					address: "34 Warning Road, Nashik",
					city: "Nashik",
					state: "Maharashtra",
					pincode: "422001",
				},
				documents: [],
			},
		],
	},
	{
		id: 1012,
		customerCode: "CUST-CL03",
		customerName: "Credit Demo — Limit Exceeded",
		customerType: "distributor",
		status: "active" as const,
		blockReason: "",
		countryCode: "+91",
		mobile: "9800001012",
		email: "exceeded@credit-demo.in",
		gstApplicable: true,
		gstin: "27AABCD1012C1Z3",
		gstMasterId: 4,
		tdsApplicable: false,
		tdsMasterId: null,
		cibRegn: "",
		fcoRegn: "",
		fssai: "",
		address: "56 Blocked Street, Nagpur, Maharashtra",
		stateId: 3,
		stateName: "Maharashtra",
		districtId: 8,
		districtName: "Pune Region",
		territoryId: null,
		territoryName: "Nagpur Demo",
		pincode: "440001",
		salesManId: 3,
		salesManName: "Amit Sharma",
		creditLimit: CREDIT_LIMIT_DEMO_AMOUNT,
		interestRate: 12,
		paymentTerms: "net-30",
		bankName: "SBI",
		bankBranchAddress: "Nagpur Demo Branch",
		bankAccountNo: "50100987654323",
		ifscCode: "SBIN0001012",
		createdBy: "Admin",
		createdDate: "2026-06-20",
		updatedBy: "Admin",
		updatedDate: "2026-06-20",
		lastStatusChange: "2026-06-20",
		statusHistory: [
			{
				date: "2026-06-20",
				from: "-",
				to: "active",
				by: "Admin",
				reason: "Credit limit demo — exceeded scenario",
			},
		],
		branches: [
			{
				branchName: "Main",
				isMain: true,
				billingAddress: {
					address: "56 Blocked Street, Nagpur",
					city: "Nagpur",
					state: "Maharashtra",
					pincode: "440001",
				},
				shippingAddress: {
					address: "56 Blocked Street, Nagpur",
					city: "Nagpur",
					state: "Maharashtra",
					pincode: "440001",
				},
				documents: [],
			},
		],
	},
];

function splitGstTotal(grandTotal: number): {
	subtotal: number;
	taxAmount: number;
} {
	const subtotal = Math.round((grandTotal / 1.18) * 100) / 100;
	const taxAmount = Math.round((grandTotal - subtotal) * 100) / 100;
	return { subtotal, taxAmount };
}

/** Posted sales invoice specs — outstanding = grandTotal (unpaid). */
export const CREDIT_LIMIT_DEMO_INVOICE_SPECS = (
	[
		{ id: 110, customerId: 1010, invoiceNo: "INV-2026-CL01", grandTotal: 175_000 },
		{ id: 111, customerId: 1011, invoiceNo: "INV-2026-CL02", grandTotal: 320_000 },
		{ id: 112, customerId: 1012, invoiceNo: "INV-2026-CL03", grandTotal: 350_000 },
	] as const
).map(({ id, customerId, invoiceNo, grandTotal }) => {
	const { subtotal, taxAmount } = splitGstTotal(grandTotal);
	return {
		id,
		invoiceNo,
		customerId,
		invoiceDate: "2026-06-15",
		dueDate: "2026-07-15",
		subtotal,
		taxAmount,
		grandTotal,
		amountReceived: 0,
		amountCredited: 0,
	};
});
