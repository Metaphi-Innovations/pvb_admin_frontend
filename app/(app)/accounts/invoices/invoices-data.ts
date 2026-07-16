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
import { attachWorkflowOnCreate } from "@/lib/accounts/accounts-workflow-persist";
import {
	calcAdditionalExpensesTotals,
	deriveLegacyChargeFields,
	resolveInvoiceAdditionalExpenses,
	type InvoiceAdditionalExpense,
} from "./invoice-additional-expenses";
import { maybePostSalesInvoice } from "@/lib/accounts/document-posting-bridge";
import { findPostedSalesInvoiceVoucher } from "@/lib/accounts/sales-invoice-accounting";
import { invalidateAccountsDataCache } from "@/lib/accounts/accounts-data-service";
import {
	ensureDocumentWorkflow,
	type AccountsDocumentWorkflow,
} from "@/lib/accounts/accounts-maker-checker";
import { syncCustomerLedger } from "@/lib/accounts/erp-accounting-mapping";
import { ensureCustomerLedger } from "@/lib/accounts/party-ledger-sync";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { customerMasterToTransactionFields } from "@/lib/accounts/transaction-master-fetch";
import { validateProductForSalesInvoice } from "@/lib/accounts/erp-accounting-mapping";
import { backfillInvoiceCustomerLedgerLinks } from "@/lib/accounts/invoice-ledger-match";
import {
  NEAR_EXPIRY_SETTLEMENT_REQUIRED_LABEL,
} from "@/app/(app)/warehouse/dispatch/near-expiry-dispatch";
import { mergeNearExpiryDemoSalesInvoice } from "@/lib/accounts/near-expiry-scheme-invoice-demo";
import type {
	InvoiceDocumentType,
	SalesInvoiceSourceType,
} from "@/lib/accounts/invoice-type";
import {
	nextInvoiceDocumentNo,
	nextPvbSalesOrderInvoiceNo,
} from "@/lib/accounts/invoice-type";
import {
  mergeSalesInvoiceSeed,
  buildSalesInvoiceSeed,
  SALES_INVOICE_SEED_VERSION,
} from "@/lib/accounts/sales-invoice-seed";

export const SCHEME_SETTLEMENT_SETTLED_LABEL = "Settled";

export function isSchemeSettlementPending(status: string | undefined): boolean {
  if (!status) return true;
  const normalized = status.trim().toLowerCase();
  return normalized !== "settled" && normalized !== "completed" && normalized !== "closed";
}

/** Listing badge: Settlement Required | Settled | null (no scheme). */
export function getInvoiceSchemeSettlementLabel(
  invoice: Pick<InvoiceRecord, "nearExpirySchemeSettlements">,
): string | null {
  const entries = invoice.nearExpirySchemeSettlements;
  if (!entries?.length) return null;
  const hasPending = entries.some((entry) => isSchemeSettlementPending(entry.settlementStatus));
  return hasPending ? NEAR_EXPIRY_SETTLEMENT_REQUIRED_LABEL : SCHEME_SETTLEMENT_SETTLED_LABEL;
}

export type InvoiceStatus = "draft" | "sent" | "cancelled";
export type InvoicePaymentStatus = "unpaid" | "partially_paid" | "paid";
export type InvoiceCreditStatus =
	| "no_credit"
	| "partially_credited"
	| "fully_credited";
export type SOAdjustmentStatus = "open" | "partially_returned" | "closed";

/** Near Expiry scheme settlement carried from dispatch — informational only; does not affect invoice totals. */
export interface InvoiceNearExpirySchemeSettlement {
	schemeId: number;
	schemeCode: string;
	schemeName: string;
	schemeType: "Near Expiry";
	schemeStatus: string;
	product: string;
	productId: string;
	batchNumber: string;
	batchExpiryDate: string;
	remainingExpiryDays: number;
	benefitType: string;
	benefitValue: number;
	estimatedBenefitAmount: number;
	settlementMethod: string;
	settlementStatus: string;
	invoiceNo?: string;
	customerName?: string;
	salesOrderNo?: string;
	settlementDocumentType?: "credit_note" | "journal_voucher";
	settlementDocumentNo?: string;
	settlementDate?: string;
	settlementAmount?: number;
	settledBy?: string;
}

export interface InvoiceLineItem {
	id: string;
	productId: number | null;
	productName: string;
	productCode?: string;
	description: string;
	hsn?: string;
	qty: number;
	unit: string;
	unitPrice: number;
	discountPct: number;
	taxPct: number;
	amount: number;
	creditedQty?: number;
	creditedAmount?: number;
	/** Dispatch batch snapshot (Sales Order generation). */
	batchNo?: string;
	manufacturingDate?: string;
	expiryDate?: string;
	/** Product Discount Scheme — carried from sales order / dispatch */
	schemeApplied?: "Yes" | "No";
	schemeCode?: string;
	schemeName?: string;
	schemeDiscountPercent?: number;
	schemeDiscountAmount?: number;
	schemeDiscountType?: "Percentage" | "Rupees";
	dealerPrice?: number;
	finalRate?: number;
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
	invoiceType?: InvoiceDocumentType;
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
	/** Maker-checker workflow from User Management approver mapping */
	workflow?: AccountsDocumentWorkflow;
	/** Linked GL voucher after successful posting */
	postedVoucherId?: number | null;
	postedVoucherNo?: string | null;
	paymentStatus: InvoicePaymentStatus;
	collections: InvoiceCollectionEntry[];
	attachments: InvoiceAttachment[];
	activity: InvoiceActivityEntry[];
	cancellationReason?: string;
	/** Future: sales order link */
	salesOrderId?: number | null;
	sourceDispatchId?: string;
	/** Persisted dispatch date (survives if dispatch record is later removed). */
	dispatchDate?: string;
	/**
	 * Upstream generation source — preferred by Sales Invoice listing tabs.
	 * Optional for backward compatibility with older localStorage records.
	 */
	sourceType?: SalesInvoiceSourceType;
	customerLedgerId?: number | null;
	dispatchNo?: string;
	branch?: string;
	warehouse?: string;
	/** Bank account for payment instructions / print */
	bankAccountId?: number | null;
	paymentTerms?: string;
	creditDays?: number;
	placeOfSupply?: string;
	state?: string;
	salesperson?: string;
	shippingAddress?: string;
	pan?: string;
	contactPerson?: string;
	gstTreatment?: string;
	receivableLedger?: string;
	customerNotes?: string;
	termsAndConditions?: string;
	internalRemarks?: string;
	shippingCharges?: number;
	otherCharges?: number;
	additionalExpenses?: InvoiceAdditionalExpense[];
	roundOff?: number;
	adjustment?: number;
	tdsTcs?: number;
	createdBy: string;
	updatedBy: string;
	createdAt: string;
	updatedAt: string;
	/** Pending Near Expiry scheme settlements — informational; no impact on invoice totals. */
	nearExpirySchemeSettlements?: InvoiceNearExpirySchemeSettlement[];
}

const STORAGE_KEY = "ds_accounts_invoices_v2";
const SEED_VERSION_KEY = "ds_accounts_invoices_seed_version";

/** Column labels — GST-inclusive totals must be explicit across Accounts UI. */
export const INVOICE_AMOUNT_LABELS = {
	taxableValue: "Taxable Value",
	gstAmount: "GST Amount",
	invoiceTotal: "Invoice Total (Incl. GST)",
} as const;

/** Pre-GST taxable value, GST, and final payable total for a sales invoice. */
export function getInvoiceAmountBreakup(
	inv: Pick<InvoiceRecord, "subtotal" | "discountTotal" | "taxAmount" | "grandTotal">,
) {
	const taxableValue =
		Math.round((inv.subtotal - inv.discountTotal) * 100) / 100;
	const gstAmount = Math.round(inv.taxAmount * 100) / 100;
	const invoiceTotal = Math.round(inv.grandTotal * 100) / 100;
	return { taxableValue, gstAmount, invoiceTotal };
}

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
	return { base, discountAmt, taxable, taxAmt, amount };
}

/** Split GST into CGST/SGST (intrastate) or IGST (interstate). */
export function calcGstLineSplit(
	line: Pick<InvoiceLineItem, "qty" | "unitPrice" | "discountPct" | "taxPct">,
	interstate = false,
) {
	const { taxable, taxAmt, amount } = calcLineAmounts(line);
	if (interstate) {
		return { taxable, taxAmt, cgst: 0, sgst: 0, igst: taxAmt, lineTotal: amount };
	}
	const cgst = Math.round(taxAmt * 50) / 100;
	const sgst = Math.round((taxAmt - cgst) * 100) / 100;
	return { taxable, taxAmt, cgst, sgst, igst: 0, lineTotal: amount };
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
	const lineTotals = calculateInvoiceTotals(lines);
	const additionalExpenses = resolveInvoiceAdditionalExpenses(
		rec.additionalExpenses,
		rec.shippingCharges,
		rec.otherCharges,
	);
	const expenseTotals = calcAdditionalExpensesTotals(additionalExpenses);
	const legacyCharges = deriveLegacyChargeFields(additionalExpenses);

	const subtotal = Math.round((lineTotals.subtotal + expenseTotals.taxableAmount) * 100) / 100;
	const discountTotal = lineTotals.discountTotal;
	const taxAmount =
		Math.round((lineTotals.taxAmount + expenseTotals.gstAmount) * 100) / 100;
	const chargeDelta =
		(rec.roundOff ?? 0) - (rec.adjustment ?? 0) + (rec.tdsTcs ?? 0);
	const grandTotal = Math.round(
		(lineTotals.subtotal -
			lineTotals.discountTotal +
			lineTotals.taxAmount +
			expenseTotals.taxableAmount +
			expenseTotals.gstAmount +
			chargeDelta) *
			100,
	) / 100;
	const amountReceived = rec.collections.reduce((s, c) => s + c.amount, 0);
	const balanceAmount = Math.max(
		0,
		Math.round((grandTotal - amountReceived) * 100) / 100,
	);
	const amountCredited = lines.reduce((s, l) => s + (l.creditedAmount ?? 0), 0);
	const balanceCreditAllowed = Math.max(
		0,
		Math.round((grandTotal - amountCredited) * 100) / 100,
	);
	const paymentStatus =
		rec.invoiceStatus === "cancelled"
			? rec.paymentStatus
			: derivePaymentStatus(grandTotal, amountReceived);
	const creditStatus = deriveCreditStatus(grandTotal, amountCredited);
	let soAdjustmentStatus = rec.soAdjustmentStatus ?? "open";
	if (creditStatus === "fully_credited") soAdjustmentStatus = "closed";
	else if (amountCredited > 0) soAdjustmentStatus = "partially_returned";

	return {
		...rec,
		lineItems: lines,
		additionalExpenses,
		shippingCharges: legacyCharges.shippingCharges,
		otherCharges: legacyCharges.otherCharges,
		subtotal,
		discountTotal,
		taxAmount,
		grandTotal,
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
	hsn?: string;
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
				hsn: p.hsnCode || "",
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
		hsn: product.hsn ?? line.hsn,
	});
}

export function customerToInvoiceFields(c: Customer) {
	const f = customerMasterToTransactionFields(c);
	return {
		customerId: f.customerId,
		customerCode: f.customerCode,
		customerName: f.customerName,
		customerMobile: f.customerMobile,
		customerEmail: f.customerEmail,
		customerGst: f.customerGst,
		customerGstCategory: f.customerGstCategory,
		billingAddress: f.billingAddress,
		shippingAddress: f.shippingAddress,
		pan: f.pan,
		contactPerson: f.contactPerson,
		paymentTerms: f.paymentTerms,
		creditDays: f.creditDays,
		placeOfSupply: f.placeOfSupply,
		state: f.state,
		gstTreatment: f.gstTreatment,
		receivableLedger: f.receivableLedger,
	};
}

function nextInvoiceNo(
	records: InvoiceRecord[],
	type: InvoiceDocumentType,
	invoiceDate: string,
): string {
	return nextInvoiceDocumentNo(records, type, invoiceDate);
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

function buildPostedWorkflow(
	workflow: AccountsDocumentWorkflow,
	remarks: string,
): AccountsDocumentWorkflow {
	return {
		...workflow,
		status: "posted",
		history: [
			...workflow.history,
			{
				at: new Date().toISOString(),
				action: "posted",
				by: ACCOUNTS_CURRENT_USER,
				byRole: workflow.makerRole,
				remarks,
			},
		],
	};
}

function ensureInvoiceCustomerLedgerLink(invoice: InvoiceRecord): InvoiceRecord {
	if (invoice.customerLedgerId) return invoice;

	const customer = invoice.customerId
		? loadCustomers().find((c) => c.id === invoice.customerId)
		: undefined;

	if (customer) {
		const ledger = syncCustomerLedger(customer);
		if (ledger) {
			return {
				...invoice,
				customerLedgerId: ledger.id,
				receivableLedger: ledger.accountName,
			};
		}
	}

	const name = invoice.customerName.trim();
	if (name) {
		const ledger = ensureCustomerLedger(name);
		if (ledger) {
			return {
				...invoice,
				customerLedgerId: ledger.id,
				receivableLedger: ledger.accountName,
			};
		}
	}

	return invoice;
}

function reconcileSalesInvoicePostingState(
	invoices: InvoiceRecord[],
): { invoices: InvoiceRecord[]; changed: boolean } {
	let changed = false;
	const next = invoices.map((inv) => {
		if (inv.invoiceStatus !== "sent") return inv;
		if (inv.workflow?.status === "posted" && inv.postedVoucherId) return inv;

		const voucher = findPostedSalesInvoiceVoucher(inv.invoiceNo);
		if (!voucher) return inv;

		changed = true;
		const workflow = ensureDocumentWorkflow(inv.workflow);
		return {
			...inv,
			workflow: { ...workflow, status: "posted" as const },
			postedVoucherId: voucher.id,
			postedVoucherNo: voucher.voucherNumber,
		};
	});
	return { invoices: next, changed };
}

/**
 * Post sales invoice to GL and mark workflow as posted.
 * Throws when accounting posting fails — caller must roll back the invoice save.
 */
export function commitSalesInvoiceAccounting(
	invoiceId: number,
	activityDetail?: string,
): InvoiceRecord {
	const current = getInvoiceById(invoiceId);
	if (!current) throw new Error("Invoice not found.");
	if (current.invoiceStatus === "cancelled") {
		throw new Error("Cancelled invoice cannot be posted.");
	}

	const linked = ensureInvoiceCustomerLedgerLink(current);
	if (linked.customerLedgerId !== current.customerLedgerId) {
		const all = loadInvoices();
		const idx = all.findIndex((r) => r.id === invoiceId);
		if (idx >= 0) {
			all[idx] = { ...all[idx], ...linked };
			saveInvoices(all);
		}
	}

	const inv = getInvoiceById(invoiceId);
	if (!inv) throw new Error("Invoice not found.");

	const existingVoucher = findPostedSalesInvoiceVoucher(inv.invoiceNo);
	const result = existingVoucher
		? {
				success: true as const,
				voucherId: existingVoucher.id,
				voucherNumber: existingVoucher.voucherNumber,
			}
		: maybePostSalesInvoice(inv);

	if (!result?.success) {
		throw new Error(
			result?.error ?? "Accounting posting failed. Invoice was not saved.",
		);
	}

	const workflow = ensureDocumentWorkflow(inv.workflow);
	const detail =
		activityDetail ??
		`Posted to ledger — ${result.voucherNumber ?? inv.invoiceNo}`;

	const all = loadInvoices();
	const idx = all.findIndex((r) => r.id === invoiceId);
	if (idx < 0) throw new Error("Invoice not found.");

	const updated: InvoiceRecord = {
		...all[idx],
		invoiceStatus: "sent",
		workflow: buildPostedWorkflow(workflow, detail),
		postedVoucherId: result.voucherId ?? existingVoucher?.id ?? null,
		postedVoucherNo: result.voucherNumber ?? existingVoucher?.voucherNumber ?? null,
		activity: pushActivity(all[idx], "posted", detail),
		updatedBy: ACCOUNTS_CURRENT_USER,
		updatedAt: new Date().toISOString(),
	};

	all[idx] = updated;
	saveInvoices(all);
	invalidateSalesInvoiceCaches();
	return normalizeInvoice(updated);
}

function invalidateSalesInvoiceCaches(): void {
	invalidateAccountsDataCache("invoices");
	invalidateAccountsDataCache("vouchers");
	invalidateAccountsDataCache("receivables");
	invalidateAccountsDataCache("coa");
}

function postSentInvoiceOrRollback(
	invoiceId: number,
	rollback: () => void,
	activityDetail: string,
): InvoiceRecord {
	try {
		return commitSalesInvoiceAccounting(invoiceId, activityDetail);
	} catch (e) {
		rollback();
		throw e;
	}
}

const SEED: InvoiceRecord[] = buildSalesInvoiceSeed();

export function loadInvoices(): InvoiceRecord[] {
	if (typeof window === "undefined") return SEED.map(normalizeInvoice);
	try {
		const version = localStorage.getItem(SEED_VERSION_KEY);
		const raw = localStorage.getItem(STORAGE_KEY);
		let list: InvoiceRecord[] =
			version === String(SALES_INVOICE_SEED_VERSION) && raw
				? JSON.parse(raw)
				: mergeSalesInvoiceSeed(SEED);
		const normalized = mergeNearExpiryDemoSalesInvoice(list.map(normalizeInvoice));
		const merged = mergeSalesInvoiceSeed(normalized);
		const { invoices: linked, changed } = backfillInvoiceCustomerLedgerLinks(merged);
		const { invoices: reconciled, changed: postingChanged } =
			reconcileSalesInvoicePostingState(linked);
		if (changed || postingChanged || version !== String(SALES_INVOICE_SEED_VERSION) || !raw) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(reconciled));
			localStorage.setItem(SEED_VERSION_KEY, String(SALES_INVOICE_SEED_VERSION));
		}
		return reconciled;
	} catch {
		return mergeSalesInvoiceSeed(SEED).map(normalizeInvoice);
	}
}

export function saveInvoices(records: InvoiceRecord[]): void {
	if (typeof window === "undefined") return;
	localStorage.setItem(
		STORAGE_KEY,
		JSON.stringify(records.map(normalizeInvoice)),
	);
	invalidateSalesInvoiceCaches();
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
	if (rec.invoiceStatus === "sent" && findPostedSalesInvoiceVoucher(rec.invoiceNo)) return false;
	return rec.invoiceStatus === "draft" || rec.invoiceStatus === "sent";
}

export function getInvoiceRowActions(
	rec: InvoiceRecord,
): ("view" | "edit" | "pdf" | "email" | "receive" | "cancel" | "post" | "credit_note")[] {
	const actions: ReturnType<typeof getInvoiceRowActions> = ["view", "pdf"];
	if (canEditInvoice(rec)) actions.push("edit");
	if (rec.invoiceStatus === "draft") actions.push("post");
	if (rec.invoiceStatus === "sent") actions.push("credit_note");
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
	shippingAddress?: string;
	pan?: string;
	contactPerson?: string;
	paymentTerms?: string;
	creditDays?: number;
	placeOfSupply?: string;
	state?: string;
	gstTreatment?: string;
	receivableLedger?: string;
	salesOrderNo?: string;
	salesOrderId?: number | null;
	sourceDispatchId?: string;
	dispatchDate?: string;
	sourceType?: SalesInvoiceSourceType;
	customerLedgerId?: number | null;
	dispatchNo?: string;
	branch?: string;
	warehouse?: string;
	bankAccountId?: number | null;
	salesperson?: string;
	customerNotes?: string;
	termsAndConditions?: string;
	internalRemarks?: string;
	shippingCharges?: number;
	otherCharges?: number;
	additionalExpenses?: InvoiceAdditionalExpense[];
	roundOff?: number;
	adjustment?: number;
	tdsTcs?: number;
	lineItems: InvoiceLineItem[];
	attachments: InvoiceAttachment[];
	invoiceStatus: InvoiceStatus;
	invoiceType?: InvoiceDocumentType;
	nearExpirySchemeSettlements?: InvoiceNearExpirySchemeSettlement[];
};

/** True when a non-cancelled Sales Order invoice already exists for this dispatch. */
export function findExistingSalesOrderInvoiceForDispatch(
	records: InvoiceRecord[],
	opts: { sourceDispatchId?: string; dispatchNo?: string },
): InvoiceRecord | undefined {
	const dispatchId = opts.sourceDispatchId?.trim();
	const dispatchNo = opts.dispatchNo?.trim();
	if (!dispatchId && !dispatchNo) return undefined;
	return records.find((inv) => {
		if (inv.invoiceStatus === "cancelled") return false;
		if (inv.sourceType && inv.sourceType !== "sales_order") return false;
		if (dispatchId && inv.sourceDispatchId?.trim() === dispatchId) return true;
		if (dispatchNo && inv.dispatchNo?.trim() === dispatchNo) return true;
		return false;
	});
}

export function createInvoice(input: InvoiceFormInput): InvoiceRecord {
	for (const line of input.lineItems) {
		if (!line.productId) continue;
		const product = loadProducts().find((p) => p.id === line.productId);
		if (product) {
			const err = validateProductForSalesInvoice(product);
			if (err) throw new Error(err);
		}
	}
	const all = loadInvoices();
	if (input.sourceType === "sales_order") {
		const dup = findExistingSalesOrderInvoiceForDispatch(all, {
			sourceDispatchId: input.sourceDispatchId,
			dispatchNo: input.dispatchNo,
		});
		if (dup) {
			throw new Error(
				`Invoice already generated for this dispatch (${dup.invoiceNo}). Open the existing invoice instead.`,
			);
		}
		if (!input.invoiceDate?.trim()) {
			throw new Error("Invoice Date is required.");
		}
		if (input.bankAccountId == null) {
			throw new Error("Select a Bank Account for the invoice.");
		}
	}
	const id = all.length ? Math.max(...all.map((r) => r.id)) + 1 : 1;
	const invoiceType = input.invoiceType ?? "sales";
	const invoiceNo =
		input.sourceType === "sales_order"
			? nextPvbSalesOrderInvoiceNo(all, input.invoiceDate)
			: nextInvoiceNo(all, invoiceType, input.invoiceDate);
	const nearExpirySchemeSettlements = input.nearExpirySchemeSettlements?.length
		? input.nearExpirySchemeSettlements.map((entry) => ({
				...entry,
				invoiceNo,
				customerName: input.customerName.trim(),
				salesOrderNo: entry.salesOrderNo ?? input.salesOrderNo ?? "",
			}))
		: undefined;
	const base: InvoiceRecord = {
		id,
		invoiceNo,
		invoiceType,
		...input,
		nearExpirySchemeSettlements,
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
	attachWorkflowOnCreate("sales_invoice", rec.id);
	if (rec.invoiceStatus === "sent") {
		return postSentInvoiceOrRollback(
			rec.id,
			() => saveInvoices(all),
			"Invoice created and posted to ledger",
		);
	}
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
	const priorSnapshot = [...all];
	all[idx] = updated;
	saveInvoices(all);
	if (updated.invoiceStatus === "sent") {
		return postSentInvoiceOrRollback(
			id,
			() => saveInvoices(priorSnapshot),
			"Invoice updated and posted to ledger",
		);
	}
	return updated;
}

export function markInvoiceSent(id: number): InvoiceRecord {
	const all = loadInvoices();
	const idx = all.findIndex((r) => r.id === id);
	if (idx < 0) throw new Error("Invoice not found");
	const cur = all[idx];
	if (cur.invoiceStatus === "cancelled")
		throw new Error("Cancelled invoice cannot be sent.");
	const priorSnapshot = [...all];
	const updated = normalizeInvoice({
		...cur,
		invoiceStatus: "sent",
		activity: pushActivity(cur, "sent", "Invoice marked as sent"),
		updatedBy: ACCOUNTS_CURRENT_USER,
		updatedAt: new Date().toISOString(),
	});
	all[idx] = updated;
	saveInvoices(all);
	return postSentInvoiceOrRollback(
		id,
		() => saveInvoices(priorSnapshot),
		"Invoice posted to ledger",
	);
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

/** Apply a lump-sum credit amount across one or more invoices (manual / direct adjustment CNs). */
export function applyCreditAmountToInvoices(
	invoiceIds: number[],
	amount: number,
): void {
	if (!invoiceIds.length || amount <= 0) return;

	const all = loadInvoices();
	const uniqueIds = [...new Set(invoiceIds)];
	const targets = uniqueIds
		.map((id) => all.find((inv) => inv.id === id))
		.filter((inv): inv is InvoiceRecord => inv != null && inv.invoiceStatus !== "cancelled");

	if (!targets.length) return;

	let remaining = Math.round(amount * 100) / 100;
	const perInvoice =
		targets.length === 1
			? remaining
			: Math.round((amount / targets.length) * 100) / 100;

	for (let i = 0; i < targets.length; i++) {
		const inv = targets[i];
		const idx = all.findIndex((r) => r.id === inv.id);
		if (idx < 0) continue;

		const balanceAllowed = Math.max(
			0,
			inv.balanceCreditAllowed ??
				inv.grandTotal - (inv.amountCredited ?? 0) - (inv.amountReceived ?? 0),
		);
		const alloc =
			i === targets.length - 1
				? Math.min(remaining, balanceAllowed)
				: Math.min(perInvoice, balanceAllowed, remaining);
		if (alloc <= 0) continue;

		const lines = inv.lineItems.length
			? inv.lineItems.map((l, lineIdx) =>
					lineIdx === 0
						? { ...l, creditedAmount: (l.creditedAmount ?? 0) + alloc }
						: l,
				)
			: inv.lineItems;

		all[idx] = normalizeInvoice({
			...inv,
			lineItems: lines,
			updatedAt: new Date().toISOString(),
			activity: [
				...inv.activity,
				{
					at: new Date().toISOString(),
					action: "credit_applied",
					by: ACCOUNTS_CURRENT_USER,
					detail: `Credit note posted — ${alloc.toFixed(2)} applied to receivable`,
				},
			],
		});
		remaining = Math.round((remaining - alloc) * 100) / 100;
	}

	saveInvoices(all);
}
