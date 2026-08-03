/**
 * Compute sales order grand total for credit limit checks (matches form summary).
 */

import type { Customer } from "@/app/(app)/masters/customers/customer-data";
import {
	type SalesOrderFormValues,
	type TaxSupplyType,
	calculateOrderTotalsSummary,
	resolveTaxSupplyType,
} from "@/app/(app)/sales/orders/orders-data";
import { getCustomerAddressesForSalesOrder } from "@/app/(app)/sales/orders/sales-order-address-utils";
import { loadWarehouses } from "@/app/(app)/masters/warehouse/warehouse-data";
import { isSezGstCategory } from "@/lib/masters/gst-compliance";
import { resolveSezLutSupply } from "@/lib/settings/gst-tax-config";
import {
	checkSalesOrderCreditLimit,
	type CustomerCreditSummary,
} from "@/lib/sales/customer-credit-limit";

function resolveSalesOrderTaxOptions(
	form: SalesOrderFormValues,
	customer: Customer | null | undefined,
): { sezLutApplies: boolean; taxSupplyType: TaxSupplyType } {
	const warehouses = loadWarehouses();
	const warehouse = warehouses.find((w) => w.id === form.warehouseId);
	const addresses = customer ? getCustomerAddressesForSalesOrder(customer) : [];
	const shipTo = addresses.find((a) => a.id === form.shipToAddressId);
	const category =
		customer?.gstCategory ||
		(customer?.gstApplicable ? "regular" : "unregistered");
	const sezLutResolution = customer
		? resolveSezLutSupply({
				customerGstCategory: category ?? "unregistered",
				transactionDate: form.orderDate,
			})
		: { appliesLut: false };
	const taxSupplyType = resolveTaxSupplyType(
		warehouse?.state ?? "",
		shipTo?.state ?? customer?.stateName ?? "",
	);
	return {
		sezLutApplies: Boolean(
			customer &&
				isSezGstCategory(category ?? "unregistered") &&
				sezLutResolution.appliesLut,
		),
		taxSupplyType,
	};
}

export function getSalesOrderGrandTotal(
	form: SalesOrderFormValues,
	options?: { sezLutApplies?: boolean; taxSupplyType?: TaxSupplyType },
): number {
	return calculateOrderTotalsSummary(
		form.lineItems,
		form.additionalExpenses ?? [],
		{
			sezLutApplies: options?.sezLutApplies,
			taxSupplyType: options?.taxSupplyType,
		},
	).grandTotal;
}

export function validateSalesOrderCreditLimit(params: {
	form: SalesOrderFormValues;
	customer: Customer | null | undefined;
	excludeOrderId?: number;
	sezLutApplies?: boolean;
	taxSupplyType?: TaxSupplyType;
}): { exceeded: boolean; summary: CustomerCreditSummary | null } {
	const taxOptions =
		params.sezLutApplies !== undefined && params.taxSupplyType !== undefined
			? {
					sezLutApplies: params.sezLutApplies,
					taxSupplyType: params.taxSupplyType,
				}
			: resolveSalesOrderTaxOptions(params.form, params.customer);
	const grandTotal = getSalesOrderGrandTotal(params.form, taxOptions);
	return checkSalesOrderCreditLimit({
		customer: params.customer,
		currentOrderValue: grandTotal,
		excludeOrderId: params.excludeOrderId,
	});
}
