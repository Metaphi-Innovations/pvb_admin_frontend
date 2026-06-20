import type { Customer } from "@/app/(app)/masters/customers/customer-data";
import type { Vendor } from "@/app/(app)/masters/vendors/vendor-data";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { syncCustomerLedger, syncVendorLedger } from "@/lib/accounts/erp-accounting-mapping";
import { resolveMappingLedger } from "@/lib/accounts/ledger-mappings";

/** @deprecated Use syncCustomerLedger(customer) — kept for name-only callers */
export function ensureCustomerLedger(customerName: string): ChartOfAccount | null {
  const name = customerName.trim();
  if (!name) return null;
  return resolveMappingLedger("sales_receivable", name, { createIfMissing: true, isSystemGenerated: true });
}

/** Full customer → ledger sync with metadata and stable ERP link */
export function ensureCustomerLedgerFromMaster(customer: Customer): ChartOfAccount | null {
  return syncCustomerLedger(customer);
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
