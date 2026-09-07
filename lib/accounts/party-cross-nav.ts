/**
 * Cross-module navigation between Bill-wise Outstanding ↔ Receivables / Payables
 * and related ledger / master / voucher screens. Href builders only — no posting logic.
 */

import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { loadVendors } from "@/app/(app)/masters/vendors/vendor-data";
import { buildGeneralLedgerHref } from "@/lib/accounts/general-ledger-data";
import {
  billWiseAdjustHref,
  billWiseOutstandingHref,
  type BillWisePartyKind,
} from "@/lib/accounts/bill-wise-outstanding";
import { resolvePartyLedgerUuidFromCoaId } from "@/lib/accounts/resolve-party-ledger";

export interface PartyCrossNavItem {
  label: string;
  href: string;
}

function resolveCustomerIdByName(name: string): number | null {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  const hit = loadCustomers().find((c) => c.customerName.trim().toLowerCase() === key);
  return hit?.id ?? null;
}

function resolveVendorIdByName(name: string): number | null {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  const hit = loadVendors().find((v) => v.vendorName.trim().toLowerCase() === key);
  return hit?.id ?? null;
}

/** Prefer stored partyId; fall back to master name match for demo / unlinked ledgers. */
export function resolveEffectivePartyId(opts: {
  partyKind: BillWisePartyKind;
  partyId: number;
  partyName: string;
}): number | null {
  if (opts.partyId > 0) return opts.partyId;
  if (opts.partyKind === "customer") return resolveCustomerIdByName(opts.partyName);
  return resolveVendorIdByName(opts.partyName);
}

/** Quick links on Bill-wise Outstanding (accountant transaction screen). */
export function buildBillWiseCrossNavLinks(opts: {
  partyKind: BillWisePartyKind;
  partyId: number;
  partyName: string;
  ledgerId: number;
}): PartyCrossNavItem[] {
  const partyId = resolveEffectivePartyId(opts);
  const common = {
    partyKind: opts.partyKind,
    ledgerId: opts.ledgerId,
    partyId: partyId ?? undefined,
  };

  const links: PartyCrossNavItem[] = [];

  if (opts.partyKind === "customer") {
    if (partyId != null && partyId > 0) {
      links.push({
        label: "View in Receivables",
        href: `/accounts/receivables/outstanding/${partyId}`,
      });
    }
    links.push({
      label: "View General Ledger",
      href: buildGeneralLedgerHref(opts.ledgerId),
    });
    if (partyId != null && partyId > 0) {
      links.push({
        label: "View Customer Master",
        href: `/masters/customers/${partyId}`,
      });
    }
    links.push({
      label: "New Receipt",
      href: billWiseAdjustHref({ ...common, voucher: "receipt" }),
    });
    links.push({
      label: "New Journal",
      href: billWiseAdjustHref({ ...common, voucher: "journal" }),
    });
    links.push({
      label: "New Credit Note",
      href: billWiseAdjustHref({ ...common, voucher: "credit_note" }),
    });
    return links;
  }

  if (partyId != null && partyId > 0) {
    links.push({
      label: "View in Payables",
      href: `/accounts/payables/outstanding/${partyId}`,
    });
  }
  links.push({
    label: "View General Ledger",
    href: buildGeneralLedgerHref(opts.ledgerId),
  });
  if (partyId != null && partyId > 0) {
    links.push({
      label: "View Supplier Master",
      href: `/masters/vendors/${partyId}`,
    });
  }
  links.push({
    label: "New Payment",
    href: billWiseAdjustHref({ ...common, voucher: "payment" }),
  });
  links.push({
    label: "New Journal",
    href: billWiseAdjustHref({ ...common, voucher: "journal" }),
  });
  links.push({
    label: "New Debit Note",
    href: billWiseAdjustHref({ ...common, voucher: "debit_note" }),
  });
  return links;
}

/** Quick links on Receivables customer outstanding detail (management screen). */
export function buildReceivablesDetailCrossNavLinks(opts: {
  customerId: number | string;
  ledgerId?: number;
  /** Backend AccountLedger UUID — preferred for Bill-wise Outstanding href. */
  partyLedgerId?: string | null;
}): PartyCrossNavItem[] {
  const links: PartyCrossNavItem[] = [];
  const ledgerId = opts.ledgerId ?? 0;
  const apiNodeId =
    opts.partyLedgerId && String(opts.partyLedgerId).trim()
      ? String(opts.partyLedgerId).trim()
      : ledgerId > 0
        ? resolvePartyLedgerUuidFromCoaId(ledgerId)
        : null;

  if (apiNodeId || ledgerId > 0) {
    links.push({
      label: "Bill-wise Outstanding",
      href: billWiseOutstandingHref(
        apiNodeId || ledgerId,
        undefined,
        apiNodeId,
      ),
    });
  }
  if (ledgerId > 0) {
    links.push({
      label: "View Ledger",
      href: buildGeneralLedgerHref(ledgerId),
    });
  }
  const customerId = opts.customerId;
  if (
    (typeof customerId === "number" && customerId > 0) ||
    (typeof customerId === "string" && customerId.trim() !== "")
  ) {
    links.push({
      label: "Customer Master",
      href: `/masters/customers/${customerId}`,
    });
  }
  return links;
}

/** Quick links on Payables supplier outstanding detail (management screen). */
export function buildPayablesDetailCrossNavLinks(opts: {
  vendorId: number | string;
  ledgerId?: number;
  /** Backend AccountLedger UUID — preferred for Bill-wise Outstanding href. */
  partyLedgerId?: string | null;
}): PartyCrossNavItem[] {
  const links: PartyCrossNavItem[] = [];
  const ledgerId = opts.ledgerId ?? 0;
  const apiNodeId =
    opts.partyLedgerId && String(opts.partyLedgerId).trim()
      ? String(opts.partyLedgerId).trim()
      : ledgerId > 0
        ? resolvePartyLedgerUuidFromCoaId(ledgerId)
        : null;

  if (apiNodeId || ledgerId > 0) {
    links.push({
      label: "Bill-wise Outstanding",
      href: billWiseOutstandingHref(
        apiNodeId || ledgerId,
        undefined,
        apiNodeId,
      ),
    });
  }
  if (ledgerId > 0) {
    links.push({
      label: "View Ledger",
      href: buildGeneralLedgerHref(ledgerId),
    });
  }
  const vendorId = opts.vendorId;
  if (
    (typeof vendorId === "number" && vendorId > 0) ||
    (typeof vendorId === "string" && vendorId.trim() !== "")
  ) {
    links.push({
      label: "Supplier Master",
      href: `/masters/vendors/${vendorId}`,
    });
  }
  return links;
}
