import {
	ACCOUNTS_CURRENT_USER,
	ACCOUNTS_INVOICE_ADMIN,
} from "@/lib/accounts/config";
import {
	getCustomersForTransactionDropdown,
	type Customer,
} from "@/app/(app)/masters/customers/customer-data";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import { resolveSalesUnitPrice } from "@/lib/pricing/resolve-pricing";
import type { SezSupplyType } from "@/lib/masters/gst-compliance";
import type { PaymentMode } from "../expenses/expense-data";

export type InvoiceStatus = "draft" | "sent" | "cancelled";
export type InvoicePaymentStatus = "unpaid" | "partially_paid" | "paid";
export type InvoiceCreditStatus =
	| "no_credit"
	| "partially_credited"
	| "fully_credited";
export type SOAdjustmentStatus = "open" | "partially_returned" | "closed";

export interface InvoiceLineItem {
	id: string;
	productId: number | null;
	productName: string;
	description: string;
	qty: number;
	unit: string;
	unitPrice: number;
	discountPct: number;
	taxPct: number;
	amount: number;
	creditedQty?: number;
	creditedAmount?: number;
}

export interface InvoiceAttachment {
	id: string;
	documentName: string;
	fileName: string;
	dataUrl?: string;
	uploadedAt: string;
}

export interface InvoiceCollectionEntry {
	id: number;
	paymentDate: string;
	amount: number;
	paymentMode: PaymentMode;
	referenceNo: string;
	remarks: string;
	createdBy: string;
	createdAt: string;
}

export interface InvoiceActivityEntry {
	at: string;
	action: string;
	by: string;
	detail: string;
}

export interface InvoiceRecord {
	id: number;
	invoiceNo: string;
	invoiceDate: string;
	dueDate: string;
	referenceNo: string;
	remarks: string;
	customerId: number | null;
	customerName: string;
	customerMobile: string;
	customerEmail: string;
	customerGst: string;
	customerGstCategory?: string;
	sezSupplyType?: SezSupplyType;
	lutNumber?: string;
	lutDeclaration?: string;
	billingAddress: string;
	lineItems: InvoiceLineItem[];
	subtotal: number;
	discountTotal: number;
	taxAmount: number;
	grandTotal: number;
	amountReceived: number;
	balanceAmount: number;
	amountCredited?: number;
	balanceCreditAllowed?: number;
	creditStatus?: InvoiceCreditStatus;
	salesOrderNo?: string;
	soAdjustmentStatus?: SOAdjustmentStatus;
	invoiceStatus: InvoiceStatus;
	paymentStatus: InvoicePaymentStatus;
	collections: InvoiceCollectionEntry[];
	attachments: InvoiceAttachment[];
	activity: InvoiceActivityEntry[];
	cancellationReason?: string;
	/** Future: sales order link */
	salesOrderId?: number | null;
	createdBy: string;
	updatedBy: string;
	createdAt: string;
	updatedAt: string;
}

const STORAGE_KEY = "ds_accounts_invoices_v1";

export function parseTaxPct(value: string | number): number {
	if (typeof value === "number") return value;
	const n = parseFloat(String(value).replace("%", "").trim());
	return Number.isFinite(n) ? n : 0;
}

export function calcLineAmounts(
	line: Pick<InvoiceLineItem, "qty" | "unitPrice" | "discountPct" | "taxPct">,
) {
	const base = Math.max(0, line.qty * line.unitPrice);
	const discountAmt = Math.round(base * (line.discountPct / 100) * 100) / 100;
	const taxable = Math.max(0, base - discountAmt);
	const taxAmt = Math.round(taxable * (line.taxPct / 100) * 100) / 100;
	const amount = Math.round((taxable + taxAmt) * 100) / 100;
	return { base, discountAmt, taxAmt, amount };
}

export function recalculateLineItem(line: InvoiceLineItem): InvoiceLineItem {
	const { amount } = calcLineAmounts(line);
	return { ...line, amount };
}

export function calculateInvoiceTotals(lines: InvoiceLineItem[]) {
	let subtotal = 0;
	let discountTotal = 0;
	let taxAmount = 0;
	for (const line of lines) {
		const { base, discountAmt, taxAmt } = calcLineAmounts(line);
		subtotal += base;
		discountTotal += discountAmt;
		taxAmount += taxAmt;
	}
	const grandTotal =
		Math.round((subtotal - discountTotal + taxAmount) * 100) / 100;
	return {
		subtotal: Math.round(subtotal * 100) / 100,
		discountTotal: Math.round(discountTotal * 100) / 100,
		taxAmount: Math.round(taxAmount * 100) / 100,
		grandTotal,
	};
}

export function derivePaymentStatus(
	grandTotal: number,
	amountReceived: number,
): InvoicePaymentStatus {
	if (amountReceived <= 0) return "unpaid";
	if (amountReceived >= grandTotal) return "paid";
	return "partially_paid";
}

export function deriveCreditStatus(
	grandTotal: number,
	amountCredited: number,
): InvoiceCreditStatus {
	if (amountCredited <= 0) return "no_credit";
	if (amountCredited >= grandTotal) return "fully_credited";
	return "partially_credited";
}

export function normalizeInvoice(rec: InvoiceRecord): InvoiceRecord {
	const lines = rec.lineItems.map((l) =>
		recalculateLineItem({
			...l,
			creditedQty: l.creditedQty ?? 0,
			creditedAmount: l.creditedAmount ?? 0,
		}),
	);
	const totals = calculateInvoiceTotals(lines);
	const amountReceived = rec.collections.reduce((s, c) => s + c.amount, 0);
	const balanceAmount = Math.max(
		0,
		Math.round((totals.grandTotal - amountReceived) * 100) / 100,
	);
	const amountCredited = lines.reduce((s, l) => s + (l.creditedAmount ?? 0), 0);
	const balanceCreditAllowed = Math.max(
		0,
		Math.round((totals.grandTotal - amountCredited) * 100) / 100,
	);
	const paymentStatus =
		rec.invoiceStatus === "cancelled"
			? rec.paymentStatus
			: derivePaymentStatus(totals.grandTotal, amountReceived);
	const creditStatus = deriveCreditStatus(totals.grandTotal, amountCredited);
	let soAdjustmentStatus = rec.soAdjustmentStatus ?? "open";
	if (creditStatus === "fully_credited") soAdjustmentStatus = "closed";
	else if (amountCredited > 0) soAdjustmentStatus = "partially_returned";

	return {
		...rec,
		lineItems: lines,
		...totals,
		amountReceived: Math.round(amountReceived * 100) / 100,
		balanceAmount,
		amountCredited: Math.round(amountCredited * 100) / 100,
		balanceCreditAllowed,
		creditStatus,
		soAdjustmentStatus,
		paymentStatus,
	};
}

export function createEmptyLine(): InvoiceLineItem {
	return {
		id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		productId: null,
		productName: "",
		description: "",
		qty: 1,
		unit: "PCS",
		unitPrice: 0,
		discountPct: 0,
		taxPct: 0,
		amount: 0,
	};
}

export interface InvoiceProductOption {
	id: number;
	code: string;
	name: string;
	unit: string;
	taxPct: number;
	unitPrice: number;
}

export function getProductsForInvoice(customerId?: number): InvoiceProductOption[] {
	return loadProducts()
		.filter((p) => p.status === "active")
		.map((p) => {
			const resolved = resolveSalesUnitPrice(p.id, customerId);
			return {
				id: p.id,
				code: p.sku,
				name: p.productName,
				unit: p.baseUnit || "PCS",
				taxPct: parseTaxPct(p.gstRate),
				unitPrice: resolved.amount,
			};
		});
}

export function applyProductToInvoiceLine(
	line: InvoiceLineItem,
	product: InvoiceProductOption,
): InvoiceLineItem {
	return recalculateLineItem({
		...line,
		productId: product.id,
		productName: product.name,
		unit: product.unit,
		unitPrice: product.unitPrice,
		taxPct: product.taxPct,
	});
}

export function customerToInvoiceFields(c: Customer) {
	const mobile =
		c.countryCode && c.mobile ? `${c.countryCode} ${c.mobile}` : c.mobile;
	const address = [c.address, c.districtName, c.stateName, c.pincode]
		.filter(Boolean)
		.join(", ");
	const gstRegistered = !!(c.gstApplicable && c.gstin?.trim());
	return {
		customerId: c.id,
		customerName: c.customerName,
		customerMobile: mobile,
		customerEmail: c.email,
		customerGst: gstRegistered ? c.gstin : "",
		customerGstCategory: c.gstCategory,
		billingAddress: address,
	};
}

function nextInvoiceNo(records: InvoiceRecord[]): string {
	const max = records.reduce((m, r) => {
		const n = parseInt(r.invoiceNo.replace(/\D/g, ""), 10);
		return Number.isFinite(n) ? Math.max(m, n) : m;
	}, 0);
	return `INV-${String(max + 1).padStart(4, "0")}`;
}

function nextCollectionId(records: InvoiceRecord[]): number {
	let max = 0;
	for (const r of records) {
		for (const c of r.collections) max = Math.max(max, c.id);
	}
	return max + 1;
}

function pushActivity(
	rec: InvoiceRecord,
	action: string,
	detail: string,
	by = ACCOUNTS_CURRENT_USER,
): InvoiceActivityEntry[] {
	return [
		...rec.activity,
		{ at: new Date().toISOString(), action, by, detail },
	];
}

const SEED: InvoiceRecord[] = [
	{
		id: 1,
		invoiceNo: "INV-0001",
		invoiceDate: "2026-05-28",
		dueDate: "2026-06-27",
		referenceNo: "PO-4421",
		remarks: "Q1 supply invoice",
		customerId: 1,
		customerName: "Agro Solutions Pvt Ltd",
		customerMobile: "+91 9876543210",
		customerEmail: "billing@agrosolutions.in",
		customerGst: "27AABCU9603R1ZM",
		billingAddress: "Pune, Maharashtra",
		lineItems: [
			recalculateLineItem({
				id: "l1",
				productId: 1,
				productName: "NPK Blend",
				description: "19:19:19 grade",
				qty: 100,
				unit: "KG",
				unitPrice: 850,
				discountPct: 5,
				taxPct: 5,
				amount: 0,
			}),
		],
		subtotal: 0,
		discountTotal: 0,
		taxAmount: 0,
		grandTotal: 0,
		amountReceived: 0,
		balanceAmount: 0,
		invoiceStatus: "sent",
		paymentStatus: "partially_paid",
		collections: [
			{
				id: 1,
				paymentDate: "2026-06-01",
				amount: 40000,
				paymentMode: "UPI",
				referenceNo: "UPI-8821",
				remarks: "Advance collection",
				createdBy: "Admin",
				createdAt: "2026-06-01T10:00:00.000Z",
			},
		],
		attachments: [],
		activity: [
			{
				at: "2026-05-28T09:00:00.000Z",
				action: "created",
				by: "Admin",
				detail: "Invoice created as sent",
			},
		],
		createdBy: "Admin",
		updatedBy: "Admin",
		createdAt: "2026-05-28T09:00:00.000Z",
		updatedAt: "2026-06-01T10:00:00.000Z",
	},
	{
		id: 2,
		invoiceNo: "INV-0002",
		invoiceDate: "2026-06-02",
		dueDate: "2026-07-02",
		referenceNo: "",
		remarks: "",
		customerId: 2,
		customerName: "Kisan FPO Cooperative",
		customerMobile: "+91 9123456780",
		customerEmail: "accounts@kisanfpo.org",
		customerGst: "",
		billingAddress: "Nagpur, Maharashtra",
		lineItems: [
			recalculateLineItem({
				id: "l2",
				productId: null,
				productName: "Consulting Services",
				description: "Field advisory — June",
				qty: 1,
				unit: "Job",
				unitPrice: 25000,
				discountPct: 0,
				taxPct: 18,
				amount: 0,
			}),
		],
		subtotal: 0,
		discountTotal: 0,
		taxAmount: 0,
		grandTotal: 0,
		amountReceived: 0,
		balanceAmount: 0,
		invoiceStatus: "draft",
		paymentStatus: "unpaid",
		collections: [],
		attachments: [],
		activity: [
			{
				at: "2026-06-02T08:00:00.000Z",
				action: "created",
				by: "Admin",
				detail: "Saved as draft",
			},
		],
		createdBy: "Admin",
		updatedBy: "Admin",
		createdAt: "2026-06-02T08:00:00.000Z",
		updatedAt: "2026-06-02T08:00:00.000Z",
	},
];

export function loadInvoices(): InvoiceRecord[] {
	if (typeof window === "undefined") return SEED.map(normalizeInvoice);
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		const list: InvoiceRecord[] = raw ? JSON.parse(raw) : SEED;
		const normalized = list.map(normalizeInvoice);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
		return normalized;
	} catch {
		return SEED.map(normalizeInvoice);
	}
}

export function saveInvoices(records: InvoiceRecord[]): void {
	if (typeof window === "undefined") return;
	localStorage.setItem(
		STORAGE_KEY,
		JSON.stringify(records.map(normalizeInvoice)),
	);
}

export function getInvoiceById(id: number): InvoiceRecord | undefined {
	const r = loadInvoices().find((i) => i.id === id);
	return r ? normalizeInvoice(r) : undefined;
}

export function getCustomersForInvoice() {
	return getCustomersForTransactionDropdown();
}

export interface InvoiceListFilters {
	tab: string;
	search: string;
	invoiceStatus: string;
	paymentStatus: string;
	dateFrom: string;
	dateTo: string;
	createdBy: string;
}

export function tabMatchesInvoice(rec: InvoiceRecord, tab: string): boolean {
	if (tab === "all") return rec.invoiceStatus !== "cancelled";
	if (tab === "draft") return rec.invoiceStatus === "draft";
	if (tab === "sent") return rec.invoiceStatus === "sent";
	if (tab === "partially_paid")
		return (
			rec.paymentStatus === "partially_paid" &&
			rec.invoiceStatus !== "cancelled"
		);
	if (tab === "paid")
		return rec.paymentStatus === "paid" && rec.invoiceStatus !== "cancelled";
	if (tab === "cancelled") return rec.invoiceStatus === "cancelled";
	return true;
}

export function filterInvoices(
	records: InvoiceRecord[],
	filters: InvoiceListFilters,
): InvoiceRecord[] {
	let r = records
		.map(normalizeInvoice)
		.filter((e) => tabMatchesInvoice(e, filters.tab));
	if (filters.invoiceStatus && filters.invoiceStatus !== "all") {
		r = r.filter((e) => e.invoiceStatus === filters.invoiceStatus);
	}
	if (filters.paymentStatus && filters.paymentStatus !== "all") {
		r = r.filter((e) => e.paymentStatus === filters.paymentStatus);
	}
	if (filters.createdBy && filters.createdBy !== "all") {
		r = r.filter((e) => e.createdBy === filters.createdBy);
	}
	if (filters.search.trim()) {
		const q = filters.search.toLowerCase();
		r = r.filter(
			(e) =>
				e.invoiceNo.toLowerCase().includes(q) ||
				e.customerName.toLowerCase().includes(q) ||
				e.customerMobile.toLowerCase().includes(q),
		);
	}
	if (filters.dateFrom) r = r.filter((e) => e.invoiceDate >= filters.dateFrom);
	if (filters.dateTo) r = r.filter((e) => e.invoiceDate <= filters.dateTo);
	return r;
}

export function computeInvoiceTabCounts(
	records: InvoiceRecord[],
): Record<string, number> {
	const n = records.map(normalizeInvoice);
	return {
		all: n.filter((r) => tabMatchesInvoice(r, "all")).length,
		draft: n.filter((r) => tabMatchesInvoice(r, "draft")).length,
		sent: n.filter((r) => tabMatchesInvoice(r, "sent")).length,
		partially_paid: n.filter((r) => tabMatchesInvoice(r, "partially_paid"))
			.length,
		paid: n.filter((r) => tabMatchesInvoice(r, "paid")).length,
		cancelled: n.filter((r) => tabMatchesInvoice(r, "cancelled")).length,
	};
}

export function canEditInvoice(rec: InvoiceRecord): boolean {
	if (ACCOUNTS_INVOICE_ADMIN) return true;
	if (rec.invoiceStatus === "cancelled" || rec.paymentStatus === "paid")
		return false;
	return rec.invoiceStatus === "draft" || rec.invoiceStatus === "sent";
}

export function getInvoiceRowActions(
	rec: InvoiceRecord,
): ("view" | "edit" | "pdf" | "email" | "receive" | "cancel")[] {
	const actions: ReturnType<typeof getInvoiceRowActions> = ["view", "pdf"];
	if (canEditInvoice(rec)) actions.push("edit");
	if (rec.invoiceStatus === "sent" && rec.paymentStatus !== "paid")
		actions.push("email");
	if (rec.invoiceStatus !== "cancelled" && rec.balanceAmount > 0)
		actions.push("receive");
	if (rec.invoiceStatus !== "cancelled" && rec.paymentStatus !== "paid")
		actions.push("cancel");
	return actions;
}

export type InvoiceFormInput = {
	invoiceDate: string;
	dueDate: string;
	referenceNo: string;
	remarks: string;
	customerId: number | null;
	customerName: string;
	customerMobile: string;
	customerEmail: string;
	customerGst: string;
	customerGstCategory?: string;
	sezSupplyType?: SezSupplyType;
	lutNumber?: string;
	lutDeclaration?: string;
	billingAddress: string;
	lineItems: InvoiceLineItem[];
	attachments: InvoiceAttachment[];
	invoiceStatus: InvoiceStatus;
};

export function createInvoice(input: InvoiceFormInput): InvoiceRecord {
	const all = loadInvoices();
	const id = all.length ? Math.max(...all.map((r) => r.id)) + 1 : 1;
	const base: InvoiceRecord = {
		id,
		invoiceNo: nextInvoiceNo(all),
		...input,
		subtotal: 0,
		discountTotal: 0,
		taxAmount: 0,
		grandTotal: 0,
		amountReceived: 0,
		balanceAmount: 0,
		paymentStatus: "unpaid",
		collections: [],
		activity: [
			{
				at: new Date().toISOString(),
				action: "created",
				by: ACCOUNTS_CURRENT_USER,
				detail:
					input.invoiceStatus === "draft"
						? "Invoice saved as draft"
						: "Invoice created and sent",
			},
		],
		createdBy: ACCOUNTS_CURRENT_USER,
		updatedBy: ACCOUNTS_CURRENT_USER,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};
	const rec = normalizeInvoice(base);
	saveInvoices([...all, rec]);
	return rec;
}

export function updateInvoice(
	id: number,
	input: InvoiceFormInput,
): InvoiceRecord {
	const all = loadInvoices();
	const idx = all.findIndex((r) => r.id === id);
	if (idx < 0) throw new Error("Invoice not found");
	const cur = normalizeInvoice(all[idx]);
	if (!canEditInvoice(cur))
		throw new Error("Invoice cannot be edited in current status.");

	const updated = normalizeInvoice({
		...cur,
		...input,
		activity: pushActivity(cur, "updated", "Invoice details updated"),
		updatedBy: ACCOUNTS_CURRENT_USER,
		updatedAt: new Date().toISOString(),
	});
	all[idx] = updated;
	saveInvoices(all);
	return updated;
}

export function markInvoiceSent(id: number): InvoiceRecord {
	const all = loadInvoices();
	const idx = all.findIndex((r) => r.id === id);
	if (idx < 0) throw new Error("Invoice not found");
	const cur = all[idx];
	if (cur.invoiceStatus === "cancelled")
		throw new Error("Cancelled invoice cannot be sent.");
	const updated = normalizeInvoice({
		...cur,
		invoiceStatus: "sent",
		activity: pushActivity(cur, "sent", "Invoice marked as sent"),
		updatedBy: ACCOUNTS_CURRENT_USER,
		updatedAt: new Date().toISOString(),
	});
	all[idx] = updated;
	saveInvoices(all);
	return updated;
}

export function receiveInvoicePayment(
	id: number,
	payload: {
		paymentDate: string;
		amount: number;
		paymentMode: PaymentMode;
		referenceNo: string;
		remarks: string;
	},
): InvoiceRecord {
	const all = loadInvoices();
	const idx = all.findIndex((r) => r.id === id);
	if (idx < 0) throw new Error("Invoice not found");
	const cur = normalizeInvoice(all[idx]);
	if (cur.invoiceStatus === "cancelled")
		throw new Error("Cannot collect on cancelled invoice.");
	if (payload.amount <= 0) throw new Error("Amount must be greater than zero.");
	if (payload.amount > cur.balanceAmount)
		throw new Error(`Amount exceeds balance (${cur.balanceAmount}).`);

	const entry: InvoiceCollectionEntry = {
		id: nextCollectionId(all),
		paymentDate: payload.paymentDate,
		amount: payload.amount,
		paymentMode: payload.paymentMode,
		referenceNo: payload.referenceNo,
		remarks: payload.remarks,
		createdBy: ACCOUNTS_CURRENT_USER,
		createdAt: new Date().toISOString(),
	};

	const updated = normalizeInvoice({
		...cur,
		collections: [...cur.collections, entry],
		activity: pushActivity(
			cur,
			"payment_received",
			`Received ${payload.amount} via ${payload.paymentMode}`,
		),
		updatedBy: ACCOUNTS_CURRENT_USER,
		updatedAt: new Date().toISOString(),
	});
	all[idx] = updated;
	saveInvoices(all);
	return updated;
}

export function cancelInvoice(id: number, reason: string): InvoiceRecord {
	const all = loadInvoices();
	const idx = all.findIndex((r) => r.id === id);
	if (idx < 0) throw new Error("Invoice not found");
	const cur = all[idx];
	const updated = normalizeInvoice({
		...cur,
		invoiceStatus: "cancelled",
		cancellationReason: reason.trim(),
		activity: pushActivity(cur, "cancelled", reason.trim()),
		updatedBy: ACCOUNTS_CURRENT_USER,
		updatedAt: new Date().toISOString(),
	});
	all[idx] = updated;
	saveInvoices(all);
	return updated;
}

export function listInvoiceCreators(records: InvoiceRecord[]): string[] {
	return [...new Set(records.map((r) => r.createdBy))].sort();
}

export function listCreditableSalesInvoices(): InvoiceRecord[] {
	return loadInvoices().filter(
		(i) => i.invoiceStatus === "sent" && i.creditStatus !== "fully_credited",
	);
}

export type SalesInvoiceCreditLookup = {
	invoice: InvoiceRecord;
	lines: {
		lineId: string;
		productName: string;
		invoiceQty: number;
		alreadyReturnedQty: number;
		balanceQty: number;
		invoiceAmount: number;
		alreadyCreditedAmount: number;
		balanceCreditAllowed: number;
		taxPct: number;
	}[];
};

export function lookupSalesInvoiceForCredit(
	invoiceId: number,
): SalesInvoiceCreditLookup | null {
	const invoice = getInvoiceById(invoiceId);
	if (!invoice || invoice.invoiceStatus !== "sent") return null;
	return {
		invoice,
		lines: invoice.lineItems.map((l) => ({
			lineId: l.id,
			productName: l.productName,
			invoiceQty: l.qty,
			alreadyReturnedQty: l.creditedQty ?? 0,
			balanceQty: Math.max(0, l.qty - (l.creditedQty ?? 0)),
			invoiceAmount: l.amount,
			alreadyCreditedAmount: l.creditedAmount ?? 0,
			balanceCreditAllowed: Math.max(0, l.amount - (l.creditedAmount ?? 0)),
			taxPct: l.taxPct,
		})),
	};
}

export function reconcileInvoiceCredits(
	invoiceId: number,
	lineCredits: {
		lineId: string;
		creditedQty: number;
		creditedAmount: number;
	}[],
): void {
	const all = loadInvoices();
	const idx = all.findIndex((r) => r.id === invoiceId);
	if (idx < 0) return;
	const cur = all[idx];
	const lines = cur.lineItems.map((l) => {
		const c = lineCredits.find((x) => x.lineId === l.id);
		if (!c) return l;
		return {
			...l,
			creditedQty: Math.min(l.qty, (l.creditedQty ?? 0) + c.creditedQty),
			creditedAmount: (l.creditedAmount ?? 0) + c.creditedAmount,
		};
	});
	all[idx] = normalizeInvoice({
		...cur,
		lineItems: lines,
		updatedAt: new Date().toISOString(),
		activity: [
			...cur.activity,
			{
				at: new Date().toISOString(),
				action: "credit_applied",
				by: ACCOUNTS_CURRENT_USER,
				detail: "Credit note approved — receivable reduced",
			},
		],
	});
	saveInvoices(all);
}
