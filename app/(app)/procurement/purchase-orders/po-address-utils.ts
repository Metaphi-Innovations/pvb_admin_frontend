import type { SalesOrderCustomerAddress } from "@/app/(app)/sales/orders/sales-order-address-utils";
import type { WarehouseDropdownItem } from "@/services/warehouse.service";

/** Map a warehouse master record to a Bill To / Ship To address option. */
export function warehouseToPOAddress(
	w: WarehouseDropdownItem,
	kind: "bill" | "ship",
): SalesOrderCustomerAddress {
	const primary = w.contacts?.find((c) => c.is_primary) ?? w.contacts?.[0];
	const kindLabel = kind === "bill" ? "Bill To" : "Ship To";
	return {
		id: `${kind}-wh-${w.warehouse_id}`,
		label: `${w.warehouse_name} — ${kindLabel}`,
		companyName: w.warehouse_name || w.registered_legal_name || "",
		addressLine1: w.address || "",
		addressLine2: w.address_1 || "",
		city: w.city || "",
		state: w.state || "",
		pincode: w.pincode || "",
		gstin: w.gst_number || "",
		phone: primary?.mobile_number || "—",
		email: primary?.email_address || "—",
	};
}

/** Bill To options: every warehouse address. */
export function getPOBillToAddressesFromWarehouses(
	warehouses: WarehouseDropdownItem[],
): SalesOrderCustomerAddress[] {
	return warehouses.map((w) => warehouseToPOAddress(w, "bill"));
}

/** Ship To options: typically only the selected PO warehouse. */
export function getPOShipToAddressesFromWarehouses(
	warehouses: WarehouseDropdownItem[],
): SalesOrderCustomerAddress[] {
	return warehouses.map((w) => warehouseToPOAddress(w, "ship"));
}

export function getDefaultPOBillShipIds(
	billAddresses: SalesOrderCustomerAddress[],
	shipAddresses: SalesOrderCustomerAddress[],
	warehouseId?: number | string | null,
): { billToAddressId: string; shipToAddressId: string } {
	const billTo = warehouseId
		? billAddresses.find((a) => a.id === `bill-wh-${warehouseId}`) ?? billAddresses[0]
		: billAddresses[0];
	const shipTo = warehouseId
		? shipAddresses.find((a) => a.id === `ship-wh-${warehouseId}`) ?? shipAddresses[0]
		: shipAddresses[0];
	return {
		billToAddressId: billTo?.id ?? "",
		shipToAddressId: shipTo?.id ?? "",
	};
}

export function findPOAddressById(
	addresses: SalesOrderCustomerAddress[],
	id: string,
): SalesOrderCustomerAddress | null {
	return addresses.find((a) => a.id === id) ?? null;
}

/** Empty billing snapshot used before a Bill To warehouse is chosen. */
export const EMPTY_PO_BILLING = {
	companyName: "",
	billingAddress: "",
	gstNumber: "",
	state: "",
	city: "",
	pincode: "",
};

/** Billing snapshot fields from a selected Bill To warehouse address. */
export function billingFromPOAddress(address: SalesOrderCustomerAddress | null) {
	if (!address) return { ...EMPTY_PO_BILLING };
	const billingAddress = [address.addressLine1, address.addressLine2]
		.filter(Boolean)
		.join(", ");
	return {
		companyName: address.companyName || "",
		billingAddress,
		gstNumber: address.gstin || "",
		state: address.state || "",
		city: address.city || "",
		pincode: address.pincode || "",
	};
}
