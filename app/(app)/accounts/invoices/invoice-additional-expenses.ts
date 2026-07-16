import { roundMoney } from "@/lib/accounts/money-format";

/** Expense heads — future: load from Expense Ledger / COA. */
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

const FREIGHT_EXPENSE_HEADS = new Set<InvoiceExpenseHead>([
	"Freight Charges",
	"Transportation",
]);

export type InvoiceExpenseOrigin = "sales_order" | "manual";

export interface InvoiceAdditionalExpense {
	id: string;
	expenseHead: InvoiceExpenseHead | "";
	amount: number;
	gstApplicable: boolean;
	gstPct: number;
	remarks: string;
	/** Prefetched from Sales Order — not removable on the invoice screen. */
	origin?: InvoiceExpenseOrigin;
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
	totalAmount: number;
}

export interface InvoiceAdditionalExpensesTotals {
	taxableAmount: number;
	gstAmount: number;
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
		origin,
	};
}

export function calcAdditionalExpenseRow(
	row: Pick<InvoiceAdditionalExpense, "amount" | "gstApplicable" | "gstPct">,
): InvoiceAdditionalExpenseCalc {
	const amount = roundMoney(Math.max(0, row.amount));
	const gstPct = row.gstApplicable ? Math.max(0, row.gstPct) : 0;
	const gstAmount =
		gstPct > 0 ? roundMoney((amount * gstPct) / 100) : 0;
	const totalAmount = roundMoney(amount + gstAmount);
	return { amount, gstAmount, totalAmount };
}

export function calcAdditionalExpensesTotals(
	rows: InvoiceAdditionalExpense[],
): InvoiceAdditionalExpensesTotals {
	let taxableAmount = 0;
	let gstAmount = 0;
	let totalAmount = 0;

	for (const row of rows) {
		if (!row.expenseHead?.trim() && row.amount <= 0) continue;
		const calc = calcAdditionalExpenseRow(row);
		taxableAmount += calc.amount;
		gstAmount += calc.gstAmount;
		totalAmount += calc.totalAmount;
	}

	return {
		taxableAmount: roundMoney(taxableAmount),
		gstAmount: roundMoney(gstAmount),
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
