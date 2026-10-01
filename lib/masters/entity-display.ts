import type { Customer } from "@/app/(app)/masters/customers/customer-data";
import { CUSTOMER_TYPE_LABELS } from "@/app/(app)/masters/customers/customer-data";
import type { Vendor } from "@/app/(app)/masters/vendors/vendor-data";

export function formatCustomerDropdownLabel(customer: Customer): string {
  return `${customer.customerCode} | ${customer.customerName}`;
}

export function formatCustomerDropdownSublabel(customer: Customer): string {
  const typeLabel =
    CUSTOMER_TYPE_LABELS[customer.customerType] ?? customer.customerType;
  return `Customer Type: ${typeLabel}`;
}

export function customerMatchesTransactionSearch(
  customer: Customer,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const typeLabel =
    CUSTOMER_TYPE_LABELS[customer.customerType] ?? customer.customerType;
  return (
    customer.customerCode.toLowerCase().includes(q) ||
    customer.customerName.toLowerCase().includes(q) ||
    customer.customerType.toLowerCase().includes(q) ||
    typeLabel.toLowerCase().includes(q) ||
    customer.mobile.includes(q) ||
    (customer.email ?? "").toLowerCase().includes(q) ||
    (customer.gstin ?? "").toLowerCase().includes(q)
  );
}

export function formatVendorDropdownLabel(vendor: Vendor): string {
  return `${vendor.vendorCode} | ${vendor.vendorName}`;
}

export function formatVendorDropdownSublabel(vendor: Vendor): string {
  return `Supplier Type: ${vendor.vendorType || "—"}`;
}

export function vendorMatchesTransactionSearch(
  vendor: Vendor,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    vendor.vendorCode.toLowerCase().includes(q) ||
    vendor.vendorName.toLowerCase().includes(q) ||
    (vendor.vendorType ?? "").toLowerCase().includes(q) ||
    (vendor.contactPerson ?? "").toLowerCase().includes(q) ||
    vendor.mobile.includes(q) ||
    (vendor.email ?? "").toLowerCase().includes(q) ||
    (vendor.gstNumber ?? "").toLowerCase().includes(q)
  );
}
