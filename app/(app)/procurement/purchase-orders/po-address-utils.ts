import { BRANCH_OPTIONS, COMPANY_BILLING } from "@/lib/procurement/config";
import type { SalesOrderCustomerAddress } from "@/app/(app)/sales/orders/sales-order-address-utils";

/** Company branch billing addresses (buyer / Bill To). */
const BRANCH_BILLING_DETAILS: Record<
  string,
  Pick<
    SalesOrderCustomerAddress,
    "addressLine1" | "addressLine2" | "city" | "state" | "pincode" | "gstin" | "phone" | "email"
  >
> = {
  "hq-pune": {
    addressLine1: "Plot 12, Agri Park, Hinjawadi Phase 2",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411057",
    gstin: COMPANY_BILLING.gstNumber,
    phone: "+91 9876500001",
    email: "accounts@dharitrisutra.in",
  },
  "branch-mumbai": {
    addressLine1: "Unit 4B, Andheri Industrial Estate",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400053",
    gstin: "27AABCD1234E2Z6",
    phone: "+91 9876500002",
    email: "mumbai@dharitrisutra.in",
  },
  "branch-nagpur": {
    addressLine1: "12 MIDC Road, Kamptee",
    city: "Nagpur",
    state: "Maharashtra",
    pincode: "441001",
    gstin: "27AABCD1234E3Z1",
    phone: "+91 9876500003",
    email: "nagpur@dharitrisutra.in",
  },
  "warehouse-aurangabad": {
    addressLine1: "Warehouse Block, Chikalthana MIDC",
    city: "Aurangabad",
    state: "Maharashtra",
    pincode: "431006",
    gstin: "27AABCD1234E4Z8",
    phone: "+91 9876500004",
    email: "aurangabad@dharitrisutra.in",
  },
};

export function getPOBillToAddresses(): SalesOrderCustomerAddress[] {
  return BRANCH_OPTIONS.map((branch) => {
    const details = BRANCH_BILLING_DETAILS[branch.value] ?? {
      addressLine1: COMPANY_BILLING.billingAddress,
      city: COMPANY_BILLING.city,
      state: COMPANY_BILLING.state,
      pincode: COMPANY_BILLING.pincode,
      gstin: COMPANY_BILLING.gstNumber,
      phone: "—",
      email: "—",
    };
    const branchLabel = branch.label.split("—")[0]?.trim() || branch.label;
    return {
      id: `bill-${branch.value}`,
      label: `${branchLabel} — Bill To`,
      companyName: COMPANY_BILLING.companyName,
      addressLine1: details.addressLine1,
      addressLine2: details.addressLine2,
      city: details.city,
      state: details.state,
      pincode: details.pincode,
      gstin: details.gstin,
      phone: details.phone,
      email: details.email,
    };
  });
}

/** Ship-to addresses come from warehouse API dropdowns in the form — no local mock list. */
export function getPOShipToAddresses(): SalesOrderCustomerAddress[] {
  return [];
}

export function getDefaultPOBillShipIds(
  billAddresses: SalesOrderCustomerAddress[],
  shipAddresses: SalesOrderCustomerAddress[],
  warehouseId?: number | string | null,
): { billToAddressId: string; shipToAddressId: string } {
  const billTo =
    billAddresses.find((a) => a.id === "bill-hq-pune") ?? billAddresses[0];
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
