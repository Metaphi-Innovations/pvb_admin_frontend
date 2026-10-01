import type { Customer, BranchAddress } from "@/app/(app)/masters/customers/customer-data";

export interface SalesOrderCustomerAddress {
	id: string;
	label: string;
	companyName: string;
	addressLine1: string;
	addressLine2?: string;
	city: string;
	state: string;
	pincode: string;
	gstin: string;
	phone: string;
	email: string;
}

function formatPhone(customer: Customer): string {
	if (!customer.mobile) return "—";
	const code = customer.countryCode?.trim();
	return code ? `${code} ${customer.mobile}` : customer.mobile;
}

function branchToAddress(
	customer: Customer,
	branchName: string,
	addr: BranchAddress,
	kind: "billing" | "shipping",
	id: string,
): SalesOrderCustomerAddress {
	const kindLabel = kind === "billing" ? "Bill To" : "Ship To";
	return {
		id,
		label: branchName ? `${branchName} — ${kindLabel}` : kindLabel,
		companyName: customer.registeredLegalName || customer.customerName,
		addressLine1: addr.address,
		city: addr.city,
		state: addr.state,
		pincode: addr.pincode,
		gstin: customer.gstin || "—",
		phone: formatPhone(customer),
		email: customer.email || "—",
	};
}

function mainCustomerAddress(customer: Customer): SalesOrderCustomerAddress | null {
	const addressLine1 = customer.address || customer.registeredAddress || "";
	if (!addressLine1 && !customer.stateName) return null;
	return {
		id: "main-registered",
		label: "Registered Address",
		companyName: customer.registeredLegalName || customer.customerName,
		addressLine1,
		city: customer.districtName || "",
		state: customer.stateName || "",
		pincode: customer.pincode || "",
		gstin: customer.gstin || "—",
		phone: formatPhone(customer),
		email: customer.email || "—",
	};
}

/** Collect all bill/ship address options from Customer Master (read-only). */
export function getCustomerAddressesForSalesOrder(
	customer: Customer,
): SalesOrderCustomerAddress[] {
	const addresses: SalesOrderCustomerAddress[] = [];

	if (customer.branches?.length) {
		customer.branches.forEach((branch, index) => {
			addresses.push(
				branchToAddress(
					customer,
					branch.branchName,
					branch.billingAddress,
					"billing",
					`branch-${index}-billing`,
				),
			);
			addresses.push(
				branchToAddress(
					customer,
					branch.branchName,
					branch.shippingAddress,
					"shipping",
					`branch-${index}-shipping`,
				),
			);
		});
	}

	const main = mainCustomerAddress(customer);
	if (main && !addresses.some((a) => a.id === main.id)) {
		addresses.unshift(main);
	}

	if (addresses.length === 0 && main) {
		addresses.push(main);
	}

	return addresses;
}

export function getDefaultBillShipAddressIds(
	addresses: SalesOrderCustomerAddress[],
): { billToAddressId: string; shipToAddressId: string } {
	if (addresses.length === 0) {
		return { billToAddressId: "", shipToAddressId: "" };
	}
	if (addresses.length === 1) {
		return {
			billToAddressId: addresses[0].id,
			shipToAddressId: addresses[0].id,
		};
	}
	const bill =
		addresses.find((a) => a.id.includes("billing")) ?? addresses[0];
	const ship =
		addresses.find((a) => a.id.includes("shipping")) ?? addresses[0];
	return { billToAddressId: bill.id, shipToAddressId: ship.id };
}

export function formatAddressDropdownLines(addr: SalesOrderCustomerAddress): string[] {
	return [
		addr.companyName,
		[addr.addressLine1, addr.addressLine2].filter(Boolean).join(", "),
		[addr.city, addr.state, addr.pincode].filter(Boolean).join(", "),
		`GSTIN: ${addr.gstin}`,
		addr.phone,
		addr.email,
	].filter(Boolean);
}

export function formatAddressCompact(addr: SalesOrderCustomerAddress): {
	lines: string[];
} {
	const cityLine = [addr.city, addr.state, addr.pincode]
		.filter(Boolean)
		.join(", ");
	const addressLine = [addr.addressLine1, addr.addressLine2]
		.filter(Boolean)
		.join(", ");
	return {
		lines: [
			addr.companyName,
			`GSTIN: ${addr.gstin}`,
			addressLine,
			cityLine,
			addr.phone !== "—" ? addr.phone : "",
			addr.email !== "—" ? addr.email : "",
		].filter(Boolean),
	};
}
