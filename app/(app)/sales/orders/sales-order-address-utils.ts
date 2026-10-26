import type { Customer, BranchAddress } from "@/app/(app)/masters/customers/customer-data";
import {
	paymentTermsToLegacy,
	resolveStructuredPaymentTerms,
	type PaymentType,
} from "@/lib/masters/payment-terms";

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

type CustomerBranchSalesMan = {
	is_main_branch?: boolean | null;
	sales_man_id?: string | null;
	sales_man?: { user_id?: string | null } | null;
};

/**
 * Assigned salesperson from Customer Master branches (main branch first).
 * Used to autofill salesman on sales/sample order create after customer select.
 */
export function resolveSalesManIdFromCustomerDetails(
	customerDetails:
		| { branches?: CustomerBranchSalesMan[] | null }
		| null
		| undefined,
): string | null {
	const branches = customerDetails?.branches;
	if (!branches?.length) return null;

	const main = branches.find((b) => b.is_main_branch) ?? branches[0];
	const ordered = [main, ...branches.filter((b) => b !== main)];

	for (const branch of ordered) {
		const id = branch?.sales_man_id || branch?.sales_man?.user_id;
		if (id) return String(id);
	}
	return null;
}

function sliceDate(value: unknown): string {
	if (value == null || value === "") return "";
	return String(value).slice(0, 10);
}

function salesManDisplayName(salesMan: {
	first_name?: string | null;
	last_name?: string | null;
	username?: string | null;
} | null | undefined): string {
	if (!salesMan) return "";
	const full = [salesMan.first_name, salesMan.last_name].filter(Boolean).join(" ").trim();
	return full || (salesMan.username ?? "").trim();
}

/** Partial customer from transaction dropdowns; enrich fills remaining fields from API. */
export type CustomerEnrichBase = Omit<Partial<Customer>, "status" | "id" | "salesManId"> & {
	id: Customer["id"] | string | number;
	customerName?: string;
	status?: Customer["status"] | string;
	salesManId?: Customer["salesManId"] | string | null;
};

/**
 * Merge Customer Master view/details into the order-form customer shape so
 * Customer Info (and address helpers) show real contact, salesman, address,
 * tax, and compliance fields.
 */
export function enrichCustomerFromApiDetails(
	base: CustomerEnrichBase,
	customerDetails: any | null | undefined,
): Customer {
	if (!customerDetails) return base as Customer;

	const apiBranches = Array.isArray(customerDetails.branches)
		? customerDetails.branches
		: [];
	const branches = apiBranches.map((b: any) => ({
		branchName: b.branch_name || "",
		isMain: !!b.is_main_branch,
		salesManId: b.sales_man_id || b.sales_man?.user_id || "",
		billingAddress: {
			address: `${b.billing_address_line_1 || ""} ${b.billing_address_line_2 || ""}`.trim(),
			addressLine2: b.billing_address_line_2 || "",
			city: b.billing_city || "",
			state: b.billing_state || "",
			pincode: b.billing_pincode || "",
			gstin: customerDetails.gstin_no || base.gstin || "",
		},
		shippingAddress: {
			address: `${b.shipping_address_line_1 || ""} ${b.shipping_address_line_2 || ""}`.trim(),
			addressLine2: b.shipping_address_line_2 || "",
			city: b.shipping_city || "",
			state: b.shipping_state || "",
			pincode: b.shipping_pincode || "",
			gstin: customerDetails.gstin_no || base.gstin || "",
		},
		documents: [],
	}));

	const mainApi =
		apiBranches.find((b: any) => b.is_main_branch) ?? apiBranches[0] ?? null;
	const mainMapped =
		branches.find((br: { isMain?: boolean }) => br.isMain) || branches[0] || null;

	const billingLine1 = (mainApi?.billing_address_line_1 || "").trim();
	const billingLine2 = (mainApi?.billing_address_line_2 || "").trim();
	const addressFromBranch =
		[billingLine1, billingLine2].filter(Boolean).join(", ") ||
		mainMapped?.billingAddress?.address ||
		"";

	const salesManId =
		mainApi?.sales_man_id ||
		mainApi?.sales_man?.user_id ||
		base.salesManId ||
		null;
	const salesManName =
		salesManDisplayName(mainApi?.sales_man) || base.salesManName || "";

	const paymentType = (customerDetails.payment_type ||
		base.paymentType ||
		undefined) as PaymentType | undefined;
	const creditDays = Number(
		customerDetails.credit_days ?? base.creditDays ?? 0,
	);
	const advancePercentage = Number(
		customerDetails.advance ?? base.advancePercentage ?? 0,
	);
	const structured = resolveStructuredPaymentTerms({
		paymentType,
		creditDays,
		advancePercentage,
		paymentTerms: base.paymentTerms,
	});

	const customerTypeName =
		customerDetails.customer_type?.customer_type_name ||
		base.customerType ||
		"";

	const tdsSection = customerDetails.tds_section;
	const tdsSectionLabel = tdsSection
		? [tdsSection.tds_code, tdsSection.tds_rate != null ? `${tdsSection.tds_rate}%` : ""]
				.filter(Boolean)
				.join(" — ")
		: "";

	return {
		...base,
		branches: branches.length ? (branches as Customer["branches"]) : base.branches,
		countryCode: customerDetails.country_code || base.countryCode || "+91",
		mobile: customerDetails.mobile_no || base.mobile,
		email: customerDetails.email || base.email,
		customerType: customerTypeName,
		gstApplicable: customerDetails.gst_applicable ?? base.gstApplicable,
		gstin: customerDetails.gstin_no || base.gstin,
		gstCategory:
			customerDetails.registration_type || base.gstCategory || undefined,
		registeredLegalName:
			customerDetails.registered_legal_name || base.registeredLegalName,
		registeredAddress:
			customerDetails.registered_gst_address || base.registeredAddress,
		pan: customerDetails.pan_no || base.pan,
		tdsApplicable: customerDetails.tds_applicable ?? base.tdsApplicable,
		tdsMasterId:
			customerDetails.tds_section_id != null
				? (customerDetails.tds_section_id as Customer["tdsMasterId"])
				: base.tdsMasterId,
		creditLimit: Number(
			customerDetails.credit_limit ?? base.creditLimit ?? 0,
		),
		creditDays,
		paymentType: structured.paymentType,
		advancePercentage: structured.advancePercentage,
		paymentTerms: paymentTermsToLegacy(structured),
		address: addressFromBranch || base.address || base.registeredAddress || "",
		stateName:
			mainMapped?.billingAddress?.state ||
			mainApi?.billing_state ||
			base.stateName ||
			"",
		districtName:
			mainApi?.billing_city ||
			mainApi?.billing_town ||
			mainMapped?.billingAddress?.city ||
			base.districtName ||
			"",
		pincode:
			mainApi?.billing_pincode ||
			mainMapped?.billingAddress?.pincode ||
			base.pincode ||
			"",
		salesManId: (salesManId as Customer["salesManId"]) ?? null,
		salesManName,
		msmeRegistered: !!customerDetails.msme_applicable,
		msmeNumber: customerDetails.msme_reg_no || "",
		msmeValidityDate: sliceDate(customerDetails.msme_expiry_date),
		fssaiRegistered: !!customerDetails.fssai_applicable,
		fssai: customerDetails.fssai_no || "",
		fssaiValidityDate: sliceDate(customerDetails.fssai_expiry_date),
		cibRegistered: !!customerDetails.cib_applicable,
		cibRegn: customerDetails.cib_reg_no || "",
		cibValidityDate: sliceDate(customerDetails.cib_expiry_date),
		fcoRegistered: !!customerDetails.fco_applicable,
		fcoRegn: customerDetails.fco_reg_no || "",
		fcoValidityDate: sliceDate(customerDetails.fco_expiry_date),
		// Soft display field for Customer Info TDS row (API has no numeric TDS master id).
		...(tdsSectionLabel ? { tdsSectionLabel } : {}),
	} as Customer & { tdsSectionLabel?: string };
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
