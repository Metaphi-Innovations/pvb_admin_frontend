import type { Customer } from "@/app/(app)/masters/customers/customer-data";
import type { Vendor } from "@/app/(app)/masters/vendors/vendor-data";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { syncCustomerLedger, syncVendorLedger } from "@/lib/accounts/erp-accounting-mapping";
import { resolveMappingLedger } from "@/lib/accounts/ledger-mappings";

/** Fields syncCustomerLedger/applyCustomerMeta actually read — narrower than the full mock Customer type. */
export type CustomerLedgerInput = Pick<
  Customer,
  | "id"
  | "customerUuid"
  | "customerName"
  | "customerCode"
  | "status"
  | "gstApplicable"
  | "gstin"
  | "pan"
  | "tdsApplicable"
  | "creditLimit"
  | "paymentTerms"
  | "address"
  | "districtName"
  | "stateName"
  | "pincode"
  | "branches"
  | "salesManName"
  | "mobile"
  | "countryCode"
  | "email"
>;

/** @deprecated Use syncCustomerLedger(customer) — kept for name-only callers */
export function ensureCustomerLedger(customerName: string): ChartOfAccount | null {
  const name = customerName.trim();
  if (!name) return null;
  return resolveMappingLedger("sales_receivable", name, { createIfMissing: true, isSystemGenerated: true });
}

/** Full customer → ledger sync with metadata and stable ERP link */
export function ensureCustomerLedgerFromMaster(customer: CustomerLedgerInput): ChartOfAccount | null {
  return syncCustomerLedger(customer as Customer);
}

/** @deprecated Use syncVendorLedger(vendor) — kept for name-only callers */
export function ensureVendorLedger(vendorName: string): ChartOfAccount | null {
  const name = vendorName.trim();
  if (!name) return null;
  return resolveMappingLedger("purchase_payable", name, { createIfMissing: true, isSystemGenerated: true });
}

/** Full vendor → ledger sync with metadata and stable ERP link */
export function ensureVendorLedgerFromMaster(vendor: Vendor): ChartOfAccount | null {
  return syncVendorLedger(vendor);
}