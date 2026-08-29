import { roundMoney } from "@/lib/accounts/money-format";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";

/** Expense heads — demo charge catalogue (not a real Charge Master API). */
export const INVOICE_EXPENSE_HEAD_OPTIONS = [
	"Freight Charges",
	"Transportation",
	"Packing Charges",
	"Loading Charges",
	"Unloading Charges",
	"Insurance",
	"Handling Charges",
	"Documentation Charges",
	"Courier Charges",
	"Other Charges",
] as const;

export type InvoiceExpenseHead = (typeof INVOICE_EXPENSE_HEAD_OPTIONS)[number];

/** Demo-only charge catalogue — IDs are frontend-local, not from a Charge Master backend. */
export interface InvoiceChargeMasterOption {
	id: string;
	chargeName: InvoiceExpenseHead;
	mappedLedgerPreferredNames: string[];
	gstApplicable: boolean;
	gstPct: number;
	chargeType: "expense_recovery";
	status: "active" | "inactive";
}

export const INVOICE_CHARGE_MASTER_DEMO: InvoiceChargeMasterOption[] = [
	{
		id: "chg-demo-freight",
		chargeName: "Freight Charges",
		mappedLedgerPreferredNames: ["Freight Outward", "Freight Inward", "Freight"],
		gstApplicable: true,
		gstPct: 18,
		chargeType: "expense_recovery",
		status: "active",
	},
	{
		id: "chg-demo-transport",
		chargeName: "Transportation",
		mappedLedgerPreferredNames: ["Freight Outward", "Transportation", "Freight"],
		gstApplicable: true,
		gstPct: 18,
		chargeType: "expense_recovery",
		status: "active",
	},
	{
		id: "chg-demo-packing",
		chargeName: "Packing Charges",
		mappedLedgerPreferredNames: ["Packing Charges", "Packing Material", "Selling Expenses"],
		gstApplicable: true,
		gstPct: 18,
		chargeType: "expense_recovery",
		status: "active",
	},
	{
		id: "chg-demo-loading",
		chargeName: "Loading Charges",
		mappedLedgerPreferredNames: ["Loading Charges", "Handling Charges", "Selling Expenses"],
		gstApplicable: true,
		gstPct: 18,
		chargeType: "expense_recovery",
		status: "active",
	},
	{
		id: "chg-demo-unloading",
		chargeName: "Unloading Charges",
		mappedLedgerPreferredNames: ["Unloading Charges", "Handling Charges", "Selling Expenses"],
		gstApplicable: true,
		gstPct: 18,
		chargeType: "expense_recovery",
		status: "active",
	},
	{
		id: "chg-demo-insurance",
		chargeName: "Insurance",
		mappedLedgerPreferredNames: ["Insurance", "Insurance Expenses"],
		gstApplicable: true,
		gstPct: 18,
		chargeType: "expense_recovery",
		status: "active",
	},
	{
		id: "chg-demo-handling",
		chargeName: "Handling Charges",
		mappedLedgerPreferredNames: ["Handling Charges", "Selling Expenses"],
		gstApplicable: true,
		gstPct: 18,
		chargeType: "expense_recovery",
		status: "active",
	},
	{
		id: "chg-demo-docs",
		chargeName: "Documentation Charges",
		mappedLedgerPreferredNames: ["Documentation Charges", "Office Expenses", "Selling Expenses"],
		gstApplicable: true,
		gstPct: 18,
		chargeType: "expense_recovery",
		status: "active",
	},
	{
		id: "chg-demo-courier",
		chargeName: "Courier Charges",
		mappedLedgerPreferredNames: ["Courier Charges", "Postage & Courier", "Selling Expenses"],
		gstApplicable: true,
		gstPct: 18,
		chargeType: "expense_recovery",
		status: "active",
	},
	{
		id: "chg-demo-other",
		chargeName: "Other Charges",
		mappedLedgerPreferredNames: ["Other Charges", "Miscellaneous Expenses", "Selling Expenses"],
		gstApplicable: false,
		gstPct: 0,
		chargeType: "expense_recovery",
		status: "active",
	},
];

/** Preferred COA ledger names per expense head (first match wins). */
const EXPENSE_HEAD_LEDGER_NAMES: Record<InvoiceExpenseHead, string[]> = Object.fromEntries(
	INVOICE_CHARGE_MASTER_DEMO.map((c) => [c.chargeName, c.mappedLedgerPreferredNames]),
) as Record<InvoiceExpenseHead, string[]>;

const FREIGHT_EXPENSE_HEADS = new Set<InvoiceExpenseHead>([
	"Freight Charges",
	"Transportation",
]);

export type InvoiceExpenseOrigin = "sales_order" | "manual" | "purchase_order";

export type InvoiceChargeSource = "ORDER" | "INVOICE";

export interface InvoiceAdditionalExpense {
	id: string;
	/** Free-text Particular (charge_name). Not bound to Additional Charge Master. */
	expenseHead: string;
	amount: number;
	gstApplicable: boolean;
	gstPct: number;
	remarks: string;
	/** Optional legacy / source Additional Charge Master id. */
	chargeMasterId?: string | null;
	/** Charge Master code (legacy). */
	chargeCode?: string | null;
	/** User-selected COA ledger (Income or Expense). */
	coaLedgerId?: number | string | null;
	coaLedgerName?: string;
	coaLedgerCode?: string;
	/** HSN Master id (required for new charge rows). */
	hsnId?: string | null;
	hsnCode?: string | null;
	/** Backend charge_source — ORDER for source-suggested, INVOICE for manual. */
	chargeSource?: InvoiceChargeSource;
	/** Prefetched from Sales Order / PO — may be edited (ledger/HSN required). */
	origin?: InvoiceExpenseOrigin;
}

/** Payload shape shared by Sales / Purchase invoice create APIs. */
export type InvoiceAdditionalChargePayload = {
	charge_name: string;
	ledger_id: string;
	hsn_id: string;
	amount: number;
	gst_applicable: boolean;
	gst_rate: number;
	remarks?: string | null;
	charge_source: InvoiceChargeSource;
	additional_charge_id?: string | null;
};

export type SuggestedAdditionalChargeLike = {
	charge_name?: string | null;
	amount?: string | number | null;
	gst_percent?: string | number | null;
	gst_applicable?: boolean | null;
	default_gst_rate?: string | number | null;
	charge_source?: string | null;
	matched_additional_charge_id?: string | null;
	/** Ignored for auto-selection — ledger must be chosen by the user. */
	matched_ledger_id?: string | null;
	hsn_id?: string | null;
	hsn_code?: string | null;
	sales_order_expense_id?: string | null;
};

export function getActiveInvoiceChargeOptions(): InvoiceChargeMasterOption[] {
	return INVOICE_CHARGE_MASTER_DEMO.filter((c) => c.status === "active");
}

export function resolveExpenseHeadCoaLedger(
	expenseHead: InvoiceExpenseHead | "",
): { coaLedgerId: number | null; coaLedgerName: string } {
	if (!expenseHead) return { coaLedgerId: null, coaLedgerName: "" };
	const names = EXPENSE_HEAD_LEDGER_NAMES[expenseHead] ?? [expenseHead];
	try {
		const ledgers = loadChartOfAccounts().filter((r) => r.nodeLevel === "ledger");
		for (const name of names) {
			const hit = ledgers.find(
				(l) => l.accountName.trim().toLowerCase() === name.toLowerCase(),
			);
			if (hit) return { coaLedgerId: hit.id, coaLedgerName: hit.accountName };
		}
		for (const name of names) {
			const hit = ledgers.find((l) =>
				l.accountName.toLowerCase().includes(name.toLowerCase()),
			);
			if (hit) return { coaLedgerId: hit.id, coaLedgerName: hit.accountName };
		}
	} catch {
		/* COA unavailable during SSR */
	}
	return { coaLedgerId: null, coaLedgerName: names[0] ?? expenseHead };
}

export function applyChargeMasterSelection(
	chargeName: InvoiceExpenseHead,
): Partial<InvoiceAdditionalExpense> {
	const master = INVOICE_CHARGE_MASTER_DEMO.find((c) => c.chargeName === chargeName);
	const ledger = resolveExpenseHeadCoaLedger(chargeName);
	return {
		expenseHead: chargeName,
		chargeMasterId: master?.id ?? null,
		gstApplicable: master?.gstApplicable ?? false,
		gstPct: master?.gstApplicable ? master.gstPct : 0,
		coaLedgerId: ledger.coaLedgerId,
		coaLedgerName: ledger.coaLedgerName,
	};
}

export function mapSalesOrderExpenseNameToHead(
	name: string,
): InvoiceExpenseHead | "" {
	const n = name.trim().toLowerCase();
	if (!n) return "";
	const hit = INVOICE_EXPENSE_HEAD_OPTIONS.find(
		(h) => h.toLowerCase() === n || n.includes(h.toLowerCase().replace(" charges", "")),
	);
	if (hit) return hit;
	if (n.includes("freight") || n.includes("transport")) return "Freight Charges";
	if (n.includes("pack")) return "Packing Charges";
	if (n.includes("load") && !n.includes("unload")) return "Loading Charges";
	if (n.includes("unload")) return "Unloading Charges";
	if (n.includes("insur")) return "Insurance";
	if (n.includes("handl")) return "Handling Charges";
	if (n.includes("doc")) return "Documentation Charges";
	if (n.includes("courier")) return "Courier Charges";
	return "Other Charges";
}

export interface InvoiceAdditionalExpenseCalc {
	amount: number;
	gstAmount: number;
	cgst: number;
	sgst: number;
	igst: number;
	totalAmount: number;
}

export interface InvoiceAdditionalExpensesTotals {
	taxableAmount: number;
	gstAmount: number;
	cgst: number;
	sgst: number;
	igst: number;
	totalAmount: number;
}

export function createEmptyAdditionalExpense(
	origin: InvoiceExpenseOrigin = "manual",
): InvoiceAdditionalExpense {
	return {
		id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		expenseHead: "",
		amount: 0,
		gstApplicable: false,
		gstPct: 0,
		remarks: "",
		chargeMasterId: null,
		chargeCode: null,
		coaLedgerId: null,
		coaLedgerName: "",
		coaLedgerCode: "",
		hsnId: null,
		hsnCode: null,
		chargeSource: origin === "manual" ? "INVOICE" : "ORDER",
		origin,
	};
}

function asSuggestedNumber(value: string | number | null | undefined): number {
	if (typeof value === "number") return Number.isFinite(value) ? value : 0;
	if (value == null || value === "") return 0;
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
}

/**
 * Map prepare/suggested ORDER charges into editable rows.
 * Ledger is intentionally left blank — never auto-fill from matched_ledger_id / master.
 */
export function mapSuggestedAdditionalChargesToExpenses(
	suggested: SuggestedAdditionalChargeLike[],
	origin: InvoiceExpenseOrigin = "sales_order",
): InvoiceAdditionalExpense[] {
	return (suggested || []).map((charge, idx) => {
		const gstPct =
			asSuggestedNumber(charge.gst_percent) ||
			asSuggestedNumber(charge.default_gst_rate);
		const gstApplicable =
			charge.gst_applicable == null ? gstPct > 0 : Boolean(charge.gst_applicable);
		const hsnId = charge.hsn_id?.trim() || null;
		return {
			id:
				charge.sales_order_expense_id?.trim() ||
				`suggested-${origin}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
			expenseHead: (charge.charge_name || "").trim(),
			amount: asSuggestedNumber(charge.amount),
			gstApplicable,
			gstPct: gstApplicable ? gstPct : 0,
			remarks: "",
			chargeMasterId: charge.matched_additional_charge_id || null,
			chargeCode: null,
			coaLedgerId: null,
			coaLedgerName: "",
			coaLedgerCode: "",
			hsnId,
			hsnCode: charge.hsn_code?.trim() || null,
			chargeSource: "ORDER",
			origin,
		};
	});
}

/** Build API charge payload when the row has enough identity to submit. */
export function toAdditionalChargePayload(
	row: InvoiceAdditionalExpense,
	fallbackSource: InvoiceChargeSource = "INVOICE",
): InvoiceAdditionalChargePayload | null {
	const particular = (row.expenseHead || "").trim();
	const ledgerId =
		row.coaLedgerId != null && String(row.coaLedgerId).trim()
			? String(row.coaLedgerId).trim()
			: "";
	const hsnId = row.hsnId?.trim() || "";
	const hasContent =
		Boolean(particular) || row.amount > 0 || Boolean(ledgerId) || Boolean(hsnId);
	if (!hasContent) return null;

	const source: InvoiceChargeSource =
		row.chargeSource ||
		(row.origin === "sales_order" || row.origin === "purchase_order"
			? "ORDER"
			: fallbackSource);

	return {
		charge_name: particular,
		ledger_id: ledgerId,
		hsn_id: hsnId,
		amount: roundMoney(Math.max(0, row.amount)),
		gst_applicable: Boolean(row.gstApplicable),
		gst_rate: row.gstApplicable ? Math.max(0, row.gstPct) : 0,
		remarks: row.remarks?.trim() || null,
		charge_source: source,
		additional_charge_id: row.chargeMasterId || null,
	};
}

export function toAdditionalChargePayloadList(
	rows: InvoiceAdditionalExpense[],
	fallbackSource: InvoiceChargeSource = "INVOICE",
): InvoiceAdditionalChargePayload[] {
	return rows
		.map((row) => toAdditionalChargePayload(row, fallbackSource))
		.filter((row): row is InvoiceAdditionalChargePayload => row != null);
}

export function calcAdditionalExpenseRow(
	row: Pick<InvoiceAdditionalExpense, "amount" | "gstApplicable" | "gstPct">,
	interstate = false,
): InvoiceAdditionalExpenseCalc {
	const amount = roundMoney(Math.max(0, row.amount));
	const gstPct = row.gstApplicable ? Math.max(0, row.gstPct) : 0;
	const gstAmount =
		gstPct > 0 ? roundMoney((amount * gstPct) / 100) : 0;
	const totalAmount = roundMoney(amount + gstAmount);
	if (!gstAmount) {
		return { amount, gstAmount: 0, cgst: 0, sgst: 0, igst: 0, totalAmount };
	}
	if (interstate) {
		return { amount, gstAmount, cgst: 0, sgst: 0, igst: gstAmount, totalAmount };
	}
	const cgst = roundMoney(gstAmount / 2);
	const sgst = roundMoney(gstAmount - cgst);
	return { amount, gstAmount, cgst, sgst, igst: 0, totalAmount };
}

export function calcAdditionalExpensesTotals(
	rows: InvoiceAdditionalExpense[],
	interstate = false,
): InvoiceAdditionalExpensesTotals {
	let taxableAmount = 0;
	let gstAmount = 0;
	let cgst = 0;
	let sgst = 0;
	let igst = 0;
	let totalAmount = 0;

	for (const row of rows) {
		if (!row.expenseHead?.trim() && row.amount <= 0) continue;
		const calc = calcAdditionalExpenseRow(row, interstate);
		taxableAmount += calc.amount;
		gstAmount += calc.gstAmount;
		cgst += calc.cgst;
		sgst += calc.sgst;
		igst += calc.igst;
		totalAmount += calc.totalAmount;
	}

	return {
		taxableAmount: roundMoney(taxableAmount),
		gstAmount: roundMoney(gstAmount),
		cgst: roundMoney(cgst),
		sgst: roundMoney(sgst),
		igst: roundMoney(igst),
		totalAmount: roundMoney(totalAmount),
	};
}

/** Map legacy freight / other charge fields to expense rows when loading old invoices. */
export function legacyChargesToAdditionalExpenses(
	shippingCharges = 0,
	otherCharges = 0,
): InvoiceAdditionalExpense[] {
	const rows: InvoiceAdditionalExpense[] = [];
	if (shippingCharges > 0) {
		rows.push({
			...createEmptyAdditionalExpense(),
			expenseHead: "Freight Charges",
			amount: shippingCharges,
		});
	}
	if (otherCharges > 0) {
		rows.push({
			...createEmptyAdditionalExpense(),
			expenseHead: "Other Charges",
			amount: otherCharges,
		});
	}
	return rows;
}

/** Backward-compatible shipping / other fields for records that still read legacy columns. */
export function deriveLegacyChargeFields(expenses: InvoiceAdditionalExpense[]): {
	shippingCharges: number;
	otherCharges: number;
} {
	let shippingCharges = 0;
	let otherCharges = 0;

	for (const row of expenses) {
		if (!row.expenseHead?.trim() && row.amount <= 0) continue;
		const { amount } = calcAdditionalExpenseRow(row);
		if (FREIGHT_EXPENSE_HEADS.has(row.expenseHead as InvoiceExpenseHead)) {
			shippingCharges += amount;
		} else {
			otherCharges += amount;
		}
	}

	return {
		shippingCharges: roundMoney(shippingCharges),
		otherCharges: roundMoney(otherCharges),
	};
}

export function resolveInvoiceAdditionalExpenses(
	additionalExpenses: InvoiceAdditionalExpense[] | undefined,
	shippingCharges?: number,
	otherCharges?: number,
): InvoiceAdditionalExpense[] {
	if (additionalExpenses?.length) return additionalExpenses;
	return legacyChargesToAdditionalExpenses(shippingCharges, otherCharges);
}
