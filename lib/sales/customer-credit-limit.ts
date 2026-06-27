/**
 * Customer credit limit — utilized credit from receivables + open sales orders.
 */

import type { Customer } from "@/app/(app)/masters/customers/customer-data";
import type { OrderStatus, SalesOrder } from "@/app/(app)/sales/orders/orders-data";
import { loadOrders } from "@/app/(app)/sales/orders/orders-data";
import {
	getCustomerOutstandingDetail,
	getPostedSalesInvoices,
} from "@/lib/accounts/receivables-data";
import { formatMoneyNumber } from "@/lib/accounts/money-format";

/** Order statuses that consume credit until invoiced / closed. */
export const CREDIT_UTILIZING_ORDER_STATUSES: OrderStatus[] = [
	"pending_approval",
	"approved",
	"confirmed",
	"dispatched",
];

/** Available credit ≤ this fraction of total limit → amber "Near Credit Limit". */
export const CREDIT_NEAR_LIMIT_AVAILABLE_RATIO = 0.15;

export type CreditLimitIndicator = "healthy" | "warning" | "exceeded";

export interface CustomerCreditSummary {
	totalCreditLimit: number;
	invoiceOutstanding: number;
	openOrdersAmount: number;
	rawUtilizedCredit: number;
	alreadyUtilizedCredit: number;
	availableCreditLimit: number;
	currentOrderValue: number;
	balanceAfterOrder: number;
	excessAmount: number;
	indicator: CreditLimitIndicator;
	utilizedCreditCapped: boolean;
}

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

export function formatCreditRupee(amount: number): string {
	return `₹${formatMoneyNumber(amount)}`;
}

export function getCustomerInvoiceOutstanding(customerId: number): number {
	const detail = getCustomerOutstandingDetail(customerId);
	return round2(Math.max(0, detail?.currentOutstanding ?? 0));
}

export function getInvoicedSalesOrderLookups(): {
	soNumbers: Set<string>;
	orderIds: Set<number>;
} {
	const soNumbers = new Set<string>();
	const orderIds = new Set<number>();

	for (const inv of getPostedSalesInvoices()) {
		if (inv.salesOrderId != null) orderIds.add(inv.salesOrderId);
		const soNo = inv.salesOrderNo?.trim();
		if (soNo) soNumbers.add(soNo);
		const ref = inv.referenceNo?.trim();
		if (ref && /^SO-\d{4}-\d+/i.test(ref)) soNumbers.add(ref);
	}

	return { soNumbers, orderIds };
}

export function isSalesOrderAlreadyInvoiced(
	order: SalesOrder,
	lookups: { soNumbers: Set<string>; orderIds: Set<number> },
): boolean {
	if (lookups.orderIds.has(order.id)) return true;
	return lookups.soNumbers.has(order.soNumber);
}

export function getOpenSalesOrdersCreditAmount(
	customerId: number,
	excludeOrderId?: number,
	orders: SalesOrder[] = loadOrders(),
): number {
	const lookups = getInvoicedSalesOrderLookups();

	return round2(
		orders
			.filter(
				(o) =>
					o.customerId === customerId &&
					CREDIT_UTILIZING_ORDER_STATUSES.includes(o.status) &&
					(excludeOrderId == null || o.id !== excludeOrderId) &&
					!isSalesOrderAlreadyInvoiced(o, lookups),
			)
			.reduce((sum, o) => sum + Math.max(0, o.totalAmount || 0), 0),
	);
}

export function getCreditLimitIndicator(
	totalCreditLimit: number,
	availableCreditLimit: number,
	alreadyUtilizedCredit: number,
	currentOrderValue: number,
): CreditLimitIndicator {
	if (currentOrderValue > availableCreditLimit + 0.009) return "exceeded";
	if (availableCreditLimit <= 0.009 && currentOrderValue > 0.009) return "exceeded";

	if (
		totalCreditLimit > 0 &&
		availableCreditLimit <= 0.009 &&
		alreadyUtilizedCredit >= totalCreditLimit - 0.009
	) {
		return "exceeded";
	}

	if (totalCreditLimit > 0 && availableCreditLimit > 0.009) {
		const availableRatio = availableCreditLimit / totalCreditLimit;
		if (availableRatio <= CREDIT_NEAR_LIMIT_AVAILABLE_RATIO) return "warning";
	}

	if (availableCreditLimit > 0) {
		const orderRatio = currentOrderValue / availableCreditLimit;
		if (orderRatio > 0.8) return "warning";
	}

	return "healthy";
}

export function capUtilizedCredit(
	totalCreditLimit: number,
	rawUtilizedCredit: number,
): { utilizedCredit: number; capped: boolean } {
	const raw = round2(Math.max(0, rawUtilizedCredit));
	if (totalCreditLimit <= 0) {
		return { utilizedCredit: 0, capped: raw > 0 };
	}
	const capped = raw > totalCreditLimit + 0.009;
	return {
		utilizedCredit: round2(Math.min(raw, totalCreditLimit)),
		capped,
	};
}

export function calculateCustomerCreditSummary(params: {
	customer: Customer;
	currentOrderValue: number;
	excludeOrderId?: number;
	orders?: SalesOrder[];
}): CustomerCreditSummary {
	const { customer, currentOrderValue, excludeOrderId, orders } = params;
	const totalCreditLimit = round2(Math.max(0, customer.creditLimit ?? 0));
	const invoiceOutstanding = getCustomerInvoiceOutstanding(customer.id);
	const openOrdersAmount = getOpenSalesOrdersCreditAmount(
		customer.id,
		excludeOrderId,
		orders,
	);
	const rawUtilizedCredit = round2(invoiceOutstanding + openOrdersAmount);
	const { utilizedCredit: alreadyUtilizedCredit, capped: utilizedCreditCapped } =
		capUtilizedCredit(totalCreditLimit, rawUtilizedCredit);
	const availableCreditLimit = round2(
		Math.max(0, totalCreditLimit - alreadyUtilizedCredit),
	);
	const orderValue = round2(Math.max(0, currentOrderValue));
	const balanceAfterOrder = round2(availableCreditLimit - orderValue);
	const excessAmount = round2(Math.max(0, orderValue - availableCreditLimit));
	const indicator = getCreditLimitIndicator(
		totalCreditLimit,
		availableCreditLimit,
		alreadyUtilizedCredit,
		orderValue,
	);

	return {
		totalCreditLimit,
		invoiceOutstanding,
		openOrdersAmount,
		rawUtilizedCredit,
		alreadyUtilizedCredit,
		availableCreditLimit,
		currentOrderValue: orderValue,
		balanceAfterOrder,
		excessAmount,
		indicator,
		utilizedCreditCapped,
	};
}

export function isCreditLimitExceeded(summary: CustomerCreditSummary): boolean {
	if (summary.currentOrderValue <= 0.009) return false;
	return summary.currentOrderValue > summary.availableCreditLimit + 0.009;
}

export function checkSalesOrderCreditLimit(params: {
	customer: Customer | null | undefined;
	currentOrderValue: number;
	excludeOrderId?: number;
}): { exceeded: boolean; summary: CustomerCreditSummary | null } {
	const { customer, currentOrderValue, excludeOrderId } = params;
	if (!customer) return { exceeded: false, summary: null };

	const summary = calculateCustomerCreditSummary({
		customer,
		currentOrderValue,
		excludeOrderId,
	});

	return {
		exceeded: isCreditLimitExceeded(summary),
		summary,
	};
}
