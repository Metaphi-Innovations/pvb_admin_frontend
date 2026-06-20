/**
 * ERP → Accounting auto-mapping layer.
 * Syncs Customer, Vendor, Product, and GST masters into COA ledgers and metadata.
 */

import type { Customer } from "@/app/(app)/masters/customers/customer-data";
import type { Vendor } from "@/app/(app)/masters/vendors/vendor-data";
import type { Product } from "@/app/(app)/masters/products/product-data";
import type { GSTMaster } from "@/app/(app)/masters/gst/gst-data";
import {
  loadChartOfAccounts,
  saveChartOfAccounts,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import { resolveMappingLedger, DEFAULT_MAPPING_TARGETS } from "@/lib/accounts/ledger-mappings";
import {
  loadLedgerMeta,
  saveLedgerMeta,
  type LedgerExtendedMeta,
} from "@/lib/accounts/ledger-metadata";
import {
  findErpPartyLink,
  findErpPartyLinkByLedgerId,
  upsertErpPartyLink,
  type ErpSourceModule,
} from "@/lib/accounts/erp-party-links";
import { coaHrefForLedger, isMasterLinkedLedger } from "@/lib/accounts/coa-master-link";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { loadVendors } from "@/app/(app)/masters/vendors/vendor-data";
import { computeCustomerOutstanding } from "@/lib/accounts/receivables-data";
import { computeVendorOutstanding } from "@/lib/accounts/payables-data";

export type { ErpSourceModule };

export interface PartyAccountingSummary {
  ledgerId: number | null;
  ledgerName: string;
  ledgerCode: string;
  outstanding: number;
  coaHref: string;
  ledgerHref: string;
  isSystemGenerated: boolean;
}

export interface ProductAccountingConfig {
  inventoryAccount: string;
  salesAccount: string;
  purchaseAccount: string;
  cogsAccount: string;
  hsnCode: string;
  gstRate: string;
  gstId: number | null;
  hsnId: number | null;
  isComplete: boolean;
  missingFields: string[];
}

const DEFAULT_PRODUCT_ACCOUNTS = {
  inventoryAccount: "Inventory / Stock in Hand",
  salesAccount: "Sales",
  purchaseAccount: "Purchases",
  cogsAccount: "Cost of Goods Sold",
} as const;

function customerAddress(c: Customer): string {
  return [c.address, c.districtName, c.stateName, c.pincode].filter(Boolean).join(", ");
}

function customerShipping(c: Customer): string {
  const main = c.branches?.find((b) => b.isMain) ?? c.branches?.[0];
  if (!main) return customerAddress(c);
  const s = main.shippingAddress;
  return [s.address, s.city, s.state, s.pincode].filter(Boolean).join(", ");
}

function creditDaysFromTerms(terms: string): string {
  const m = terms.match(/(\d+)/);
  return m ? m[1] : "30";
}

function updateCoaLedger(
  ledgerId: number,
  patch: Partial<ChartOfAccount>,
): ChartOfAccount | null {
  const records = loadChartOfAccounts();
  const idx = records.findIndex((r) => r.id === ledgerId);
  if (idx < 0) return null;
  const updated = { ...records[idx], ...patch };
  records[idx] = updated;
  saveChartOfAccounts(records);
  return updated;
}

function applyCustomerMeta(ledgerId: number, c: Customer, existing?: LedgerExtendedMeta) {
  const meta: LedgerExtendedMeta = {
    ...(existing ?? loadLedgerMeta(ledgerId)),
    ledgerType: "Customer",
    customerCode: c.customerCode,
    vendorCode: "",
    gstin: c.gstApplicable ? c.gstin : "",
    pan: c.pan ?? "",
    creditLimit: c.creditLimit != null ? String(c.creditLimit) : "",
    creditDays: creditDaysFromTerms(c.paymentTerms ?? ""),
    billingAddress: customerAddress(c),
    shippingAddress: customerShipping(c),
    contactPerson: c.salesManName ?? "",
    mobile: c.mobile ? `${c.countryCode ?? ""} ${c.mobile}`.trim() : "",
    email: c.email ?? "",
    paymentTerms: c.paymentTerms ?? "",
    address: customerAddress(c),
    gstApplicableMeta: c.gstApplicable,
    tdsApplicableMeta: c.tdsApplicable,
  };
  saveLedgerMeta(ledgerId, meta);
}

function applyVendorMeta(ledgerId: number, v: Vendor, existing?: LedgerExtendedMeta) {
  const addr = v.billingAddress;
  const address = [addr?.line1, addr?.line2, addr?.city, addr?.state, addr?.pincode]
    .filter(Boolean)
    .join(", ");
  const meta: LedgerExtendedMeta = {
    ...(existing ?? loadLedgerMeta(ledgerId)),
    ledgerType: "Vendor",
    vendorCode: v.vendorCode,
    customerCode: "",
    gstin: v.gstApplicable ? v.gstNumber : "",
    pan: v.panNumber ?? "",
    creditDays: v.creditPeriodValue != null ? String(v.creditPeriodValue) : "",
    billingAddress: address,
    shippingAddress: address,
    contactPerson: v.contactPerson ?? "",
    mobile: v.mobile ? `${v.mobileCountryCode ?? ""} ${v.mobile}`.trim() : "",
    email: v.email ?? "",
    paymentTerms: v.paymentTerms ?? "",
    address,
    gstApplicableMeta: v.gstApplicable,
    tdsApplicableMeta: v.tdsApplicable,
  };
  saveLedgerMeta(ledgerId, meta);
}

/** Create or update customer ledger from Customer Master. */
export function syncCustomerLedger(customer: Customer): ChartOfAccount | null {
  const name = customer.customerName.trim();
  if (!name || customer.status === "draft") return null;

  const existingLink = findErpPartyLink("customer_master", customer.id);
  let ledger: ChartOfAccount | null = null;

  if (existingLink) {
    ledger = loadChartOfAccounts().find((r) => r.id === existingLink.ledgerId) ?? null;
    if (ledger) {
      ledger = updateCoaLedger(ledger.id, {
        accountName: name,
        gstApplicable: customer.gstApplicable,
        status: customer.status === "active" ? "active" : "inactive",
        updatedBy: "ERP Sync",
        isSystemGenerated: true,
        erpSourceModule: "customer_master",
        erpSourceId: customer.id,
      });
    }
  }

  if (!ledger) {
    ledger = resolveMappingLedger("sales_receivable", name, {
      createIfMissing: true,
      erpSourceModule: "customer_master",
      erpSourceId: customer.id,
      isSystemGenerated: true,
    });
  }

  if (!ledger) return null;

  applyCustomerMeta(ledger.id, customer);
  upsertErpPartyLink({
    ledgerId: ledger.id,
    erpSourceModule: "customer_master",
    erpSourceId: customer.id,
    partyCode: customer.customerCode,
    partyName: name,
  });

  return ledger;
}

/** Create or update vendor ledger from Vendor Master. */
export function syncVendorLedger(vendor: Vendor): ChartOfAccount | null {
  const name = vendor.vendorName.trim();
  if (!name || vendor.status !== "active") return null;

  const existingLink = findErpPartyLink("vendor_master", vendor.id);
  let ledger: ChartOfAccount | null = null;

  if (existingLink) {
    ledger = loadChartOfAccounts().find((r) => r.id === existingLink.ledgerId) ?? null;
    if (ledger) {
      ledger = updateCoaLedger(ledger.id, {
        accountName: name,
        gstApplicable: vendor.gstApplicable,
        status: vendor.status === "active" ? "active" : "inactive",
        updatedBy: "ERP Sync",
        isSystemGenerated: true,
        erpSourceModule: "vendor_master",
        erpSourceId: vendor.id,
      });
    }
  }

  if (!ledger) {
    ledger = resolveMappingLedger("purchase_payable", name, {
      createIfMissing: true,
      erpSourceModule: "vendor_master",
      erpSourceId: vendor.id,
      isSystemGenerated: true,
    });
  }

  if (!ledger) return null;

  applyVendorMeta(ledger.id, vendor);
  upsertErpPartyLink({
    ledgerId: ledger.id,
    erpSourceModule: "vendor_master",
    erpSourceId: vendor.id,
    partyCode: vendor.vendorCode,
    partyName: name,
  });

  return ledger;
}

export function resolveProductAccountingDefaults(): {
  inventoryAccount: string;
  salesAccount: string;
  purchaseAccount: string;
  cogsAccount: string;
} {
  return {
    inventoryAccount: DEFAULT_MAPPING_TARGETS.purchase_inventory.subGroupName,
    salesAccount: DEFAULT_MAPPING_TARGETS.sales_revenue.subGroupName,
    purchaseAccount: "Purchases",
    cogsAccount: "Cost of Goods Sold",
  };
}

export function getProductAccountingConfig(product: Product): ProductAccountingConfig {
  const defaults = resolveProductAccountingDefaults();
  const missingFields: string[] = [];
  if (!product.hsnCode?.trim()) missingFields.push("HSN Code");
  if (!product.gstRate?.trim() && !product.gstId) missingFields.push("GST Rate");
  if (!product.hsnId) missingFields.push("HSN Master link");

  return {
    inventoryAccount: product.inventoryAccount ?? defaults.inventoryAccount,
    salesAccount: product.salesAccount ?? defaults.salesAccount,
    purchaseAccount: product.purchaseAccount ?? defaults.purchaseAccount,
    cogsAccount: product.cogsAccount ?? defaults.cogsAccount,
    hsnCode: product.hsnCode ?? "",
    gstRate: product.gstRate ?? "",
    gstId: product.gstId ?? null,
    hsnId: product.hsnId ?? null,
    isComplete: missingFields.length === 0,
    missingFields,
  };
}

export function validateProductForSalesInvoice(product: Product): string | null {
  const cfg = getProductAccountingConfig(product);
  if (!cfg.isComplete) {
    return `Product "${product.productName}" missing accounting mapping: ${cfg.missingFields.join(", ")}. Update Product Master.`;
  }
  return null;
}

export function validateProductForPurchaseInvoice(product: Product): string | null {
  return validateProductForSalesInvoice(product);
}

export function getCustomerAccountingSummary(customer: Customer): PartyAccountingSummary {
  const link = findErpPartyLink("customer_master", customer.id);
  const ledger = link ? loadChartOfAccounts().find((r) => r.id === link.ledgerId) : null;
  const outstandingRow = computeCustomerOutstanding().find(
    (r) =>
      r.ledgerId === link?.ledgerId ||
      r.customerName.toLowerCase() === customer.customerName.trim().toLowerCase(),
  );

  return {
    ledgerId: ledger?.id ?? link?.ledgerId ?? null,
    ledgerName: ledger?.accountName ?? customer.customerName,
    ledgerCode: ledger?.accountCode ?? "—",
    outstanding: outstandingRow?.outstanding ?? 0,
    coaHref: ledger ? coaHrefForLedger(ledger.id) : "/accounts/masters/chart-of-accounts",
    ledgerHref: ledger ? `/accounts/masters/ledgers/${ledger.id}` : "/accounts/masters/ledgers",
    isSystemGenerated: ledger?.isSystemGenerated ?? false,
  };
}

export function getVendorAccountingSummary(vendor: Vendor): PartyAccountingSummary {
  const link = findErpPartyLink("vendor_master", vendor.id);
  const ledger = link ? loadChartOfAccounts().find((r) => r.id === link.ledgerId) : null;
  const outstandingRow = computeVendorOutstanding().find(
    (r) =>
      r.ledgerId === link?.ledgerId ||
      r.vendorName.toLowerCase() === vendor.vendorName.trim().toLowerCase(),
  );

  return {
    ledgerId: ledger?.id ?? link?.ledgerId ?? null,
    ledgerName: ledger?.accountName ?? vendor.vendorName,
    ledgerCode: ledger?.accountCode ?? "—",
    outstanding: outstandingRow?.outstanding ?? 0,
    coaHref: ledger ? coaHrefForLedger(ledger.id) : "/accounts/masters/chart-of-accounts",
    ledgerHref: ledger ? `/accounts/masters/ledgers/${ledger.id}` : "/accounts/masters/ledgers",
    isSystemGenerated: ledger?.isSystemGenerated ?? false,
  };
}

/** Validate GST master has ledger mapping before activation. */
export function validateGstMasterForActivation(gst: GSTMaster): string | null {
  if (gst.taxType === "Exempt" || gst.taxType === "Nil Rated" || gst.taxType === "Zero Rated") {
    return null;
  }
  const hasOutput =
    gst.outputCgstLedgerId || gst.outputSgstLedgerId || gst.outputIgstLedgerId;
  const hasInput = gst.inputCgstLedgerId || gst.inputSgstLedgerId || gst.inputIgstLedgerId;
  if (!hasOutput && !hasInput) {
    return "GST Master cannot be activated without Input/Output tax ledger mapping.";
  }
  return null;
}

/** Backfill party ledgers for all active customers and vendors. */
export function backfillErpPartyLedgers() {
  if (typeof window === "undefined") return;
  for (const c of loadCustomers()) {
    if (c.status === "active") syncCustomerLedger(c);
  }
  for (const v of loadVendors()) {
    if (v.status === "active") syncVendorLedger(v);
  }
}

export function isErpSystemGeneratedLedger(ledger: ChartOfAccount): boolean {
  return ledger.isSystemGenerated === true || isMasterLinkedLedger(ledger);
}
