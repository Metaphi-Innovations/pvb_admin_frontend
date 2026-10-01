/**
 * Stable joins between sales invoices and customer COA ledgers.
 * Prefer customerId / customerLedgerId over denormalized customerName.
 */

import type { InvoiceRecord } from "@/app/(app)/accounts/invoices/invoices-data";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { loadVendors } from "@/app/(app)/masters/vendors/vendor-data";
import {
  findErpPartyLink,
  findErpPartyLinkByLedgerId,
} from "@/lib/accounts/erp-party-links";

function namesMatch(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Resolve customer master id for a receivable ledger node. */
export function resolveCustomerIdForLedger(
  ledgerId: number,
  ledgerName?: string,
): number | null {
  const link = findErpPartyLinkByLedgerId(ledgerId);
  if (link?.erpSourceModule === "customer_master") return link.erpSourceId;

  if (ledgerName) {
    const customer = loadCustomers().find((c) => namesMatch(c.customerName, ledgerName));
    if (customer) return customer.id;
  }

  return null;
}

/** Resolve vendor master id for a payable ledger node. */
export function resolveVendorIdForLedger(
  ledgerId: number,
  ledgerName?: string,
): number | null {
  const link = findErpPartyLinkByLedgerId(ledgerId);
  if (link?.erpSourceModule === "vendor_master") return link.erpSourceId;

  if (ledgerName) {
    const vendor = loadVendors().find((v) => namesMatch(v.vendorName, ledgerName));
    if (vendor) return vendor.id;
  }

  return null;
}

/** Whether an invoice belongs to the given customer receivable ledger. */
export function invoiceMatchesCustomerLedger(
  inv: InvoiceRecord,
  ledgerId: number,
  ledgerName?: string,
): boolean {
  if (inv.invoiceStatus === "cancelled") return false;

  if (inv.customerLedgerId === ledgerId) return true;

  if (inv.customerId != null) {
    const link = findErpPartyLink("customer_master", inv.customerId);
    if (link?.ledgerId === ledgerId) return true;
  }

  const ledgerCustomerId = resolveCustomerIdForLedger(ledgerId, ledgerName);
  if (ledgerCustomerId != null && inv.customerId === ledgerCustomerId) return true;

  return namesMatch(inv.customerName, ledgerName);
}

/** Backfill missing customerLedgerId from ERP party links — additive, preserves records. */
export function backfillInvoiceCustomerLedgerLinks(invoices: InvoiceRecord[]): {
  invoices: InvoiceRecord[];
  changed: boolean;
} {
  let changed = false;
  const next = invoices.map((inv) => {
    if (inv.customerLedgerId != null || inv.customerId == null) return inv;
    const link = findErpPartyLink("customer_master", inv.customerId);
    if (!link) return inv;
    changed = true;
    return {
      ...inv,
      customerLedgerId: link.ledgerId,
      receivableLedger: inv.receivableLedger || link.partyName,
    };
  });
  return { invoices: next, changed };
}
