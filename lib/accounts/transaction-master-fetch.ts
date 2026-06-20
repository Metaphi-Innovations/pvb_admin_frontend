/**
 * Master-driven field resolution for Accounts transactions.
 * All customer/vendor/product data is read from Master modules — never duplicated here.
 */

import {
  loadCustomers,
  type Customer,
  type CustomerBranch,
  type BranchAddress,
} from "@/app/(app)/masters/customers/customer-data";
import {
  getActiveVendors,
  loadVendors,
  type Vendor,
  type VendorAddress,
} from "@/app/(app)/masters/vendors/vendor-data";
import { loadProducts, type Product } from "@/app/(app)/masters/products/product-data";
import {
  resolveSalesUnitPrice,
  resolvePurchaseCostPrice,
} from "@/lib/pricing/resolve-pricing";
import { ensureCustomerLedger, ensureVendorLedgerFromMaster } from "@/lib/accounts/party-ledger-sync";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PartyAddressOption {
  id: string;
  label: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  /** Formatted single-line address */
  formatted: string;
}

export interface CustomerTransactionFields {
  customerId: number;
  customerCode: string;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  customerGst: string;
  customerGstCategory?: string;
  pan: string;
  contactPerson: string;
  paymentTerms: string;
  creditDays: number;
  placeOfSupply: string;
  state: string;
  gstTreatment: string;
  receivableLedger: string;
  billingAddress: string;
  shippingAddress: string;
  billToOptions: PartyAddressOption[];
  shipToOptions: PartyAddressOption[];
  defaultBillToId: string;
  defaultShipToId: string;
}

export interface VendorTransactionFields {
  vendorId: number;
  vendorCode: string;
  vendorName: string;
  vendorMobile: string;
  vendorEmail: string;
  vendorGst: string;
  vendorGstCategory?: string;
  pan: string;
  contactPerson: string;
  paymentTerms: string;
  creditDays: number;
  payableLedger: string;
  billingAddress: string;
  shippingAddress: string;
  bankName: string;
  bankBranch: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  billToOptions: PartyAddressOption[];
  shipToOptions: PartyAddressOption[];
  defaultBillToId: string;
  defaultShipToId: string;
}

export interface TransactionProductOption {
  id: number;
  sku: string;
  name: string;
  unit: string;
  taxPct: number;
  unitPrice: number;
  hsn: string;
  category: string;
  gstRate: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function parseTaxPct(gstRate: string | undefined | null): number {
  if (!gstRate) return 0;
  const m = String(gstRate).match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

function formatBranchAddress(addr: BranchAddress | VendorAddress): string {
  const parts =
    "line1" in addr
      ? [addr.line1, addr.line2, addr.city, addr.state, addr.pincode]
      : [addr.address, addr.city, addr.state, addr.pincode];
  return parts.filter(Boolean).join(", ");
}

function branchToBillOption(customerName: string, branch: CustomerBranch, idx: number): PartyAddressOption {
  const label = `${customerName} - ${branch.branchName}`;
  const formatted = formatBranchAddress(branch.billingAddress);
  return {
    id: `bill-${idx}`,
    label,
    address: branch.billingAddress.address,
    city: branch.billingAddress.city,
    state: branch.billingAddress.state,
    pincode: branch.billingAddress.pincode,
    formatted,
  };
}

function branchToShipOption(customerName: string, branch: CustomerBranch, idx: number): PartyAddressOption {
  const shipCity = branch.shippingAddress.city || branch.branchName;
  const label = `${customerName} - ${shipCity} (${branch.branchName})`;
  const formatted = formatBranchAddress(branch.shippingAddress);
  return {
    id: `ship-${idx}`,
    label,
    address: branch.shippingAddress.address,
    city: branch.shippingAddress.city,
    state: branch.shippingAddress.state,
    pincode: branch.shippingAddress.pincode,
    formatted,
  };
}

function parseCreditDays(paymentTerms?: string): number {
  const terms = paymentTerms?.trim() || "Net 30";
  const m = terms.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 30;
}

function customerFallbackAddress(c: Customer): string {
  return [c.address, c.districtName, c.stateName, c.pincode].filter(Boolean).join(", ");
}

function buildCustomerBranchOptions(c: Customer): {
  billTo: PartyAddressOption[];
  shipTo: PartyAddressOption[];
} {
  const name = c.customerName;
  if (c.branches?.length) {
    return {
      billTo: c.branches.map((b, i) => branchToBillOption(name, b, i)),
      shipTo: c.branches.map((b, i) => branchToShipOption(name, b, i)),
    };
  }
  const fallback = customerFallbackAddress(c);
  const single: PartyAddressOption = {
    id: "bill-0",
    label: `${name} - Head Office`,
    address: c.address,
    city: c.districtName || "",
    state: c.stateName || "",
    pincode: c.pincode || "",
    formatted: fallback,
  };
  const ship: PartyAddressOption = {
    id: "ship-0",
    label: `${name} - Delivery`,
    address: c.address,
    city: c.districtName || "",
    state: c.stateName || "",
    pincode: c.pincode || "",
    formatted: fallback,
  };
  return { billTo: [single], shipTo: [ship] };
}

function buildVendorLocationOptions(v: Vendor): {
  billTo: PartyAddressOption[];
  shipTo: PartyAddressOption[];
} {
  const formatted = formatBranchAddress(v.billingAddress);
  const bill: PartyAddressOption = {
    id: "bill-0",
    label: `${v.vendorName} - Registered Office`,
    address: v.billingAddress.line1,
    city: v.billingAddress.city,
    state: v.billingAddress.state,
    pincode: v.billingAddress.pincode,
    formatted,
  };
  const ship: PartyAddressOption = {
    id: "ship-0",
    label: `${v.vendorName} - Delivery Address`,
    address: v.billingAddress.line1,
    city: v.billingAddress.city,
    state: v.billingAddress.state,
    pincode: v.billingAddress.pincode,
    formatted,
  };
  if (v.branch?.trim()) {
    ship.label = `${v.vendorName} - ${v.branch}`;
  }
  return { billTo: [bill], shipTo: [ship] };
}

// ── Customer ──────────────────────────────────────────────────────────────────

export function getCustomerById(id: number): Customer | undefined {
  return loadCustomers().find((c) => c.id === id && c.status === "active");
}

export function getActiveCustomersForTransaction(): Customer[] {
  return loadCustomers().filter((c) => c.status === "active");
}

export function customerMasterToTransactionFields(c: Customer): CustomerTransactionFields {
  const mobile =
    c.countryCode && c.mobile ? `${c.countryCode} ${c.mobile}` : c.mobile;
  const gstRegistered = !!(c.gstApplicable && c.gstin?.trim());
  const paymentTerms = c.paymentTerms?.trim() || "Net 30";
  const { billTo, shipTo } = buildCustomerBranchOptions(c);
  const mainBill = billTo.find((_, i) => c.branches?.[i]?.isMain) ?? billTo[0];
  const mainShip = shipTo.find((_, i) => c.branches?.[i]?.isMain) ?? shipTo[0];
  const ledger = ensureCustomerLedger(c.customerName);

  return {
    customerId: c.id,
    customerCode: c.customerCode,
    customerName: c.customerName,
    customerMobile: mobile,
    customerEmail: c.email,
    customerGst: gstRegistered ? c.gstin : "",
    customerGstCategory: c.gstCategory,
    pan: c.pan?.trim() ?? "",
    contactPerson: c.salesManName?.trim() || "",
    paymentTerms,
    creditDays: parseCreditDays(paymentTerms),
    placeOfSupply: c.stateName || "",
    state: c.stateName || "",
    gstTreatment: c.gstCategory || (gstRegistered ? "Registered" : "Unregistered"),
    receivableLedger: ledger?.accountName ?? c.customerName,
    billingAddress: mainBill?.formatted ?? customerFallbackAddress(c),
    shippingAddress: mainShip?.formatted ?? mainBill?.formatted ?? customerFallbackAddress(c),
    billToOptions: billTo,
    shipToOptions: shipTo,
    defaultBillToId: mainBill?.id ?? "bill-0",
    defaultShipToId: mainShip?.id ?? "ship-0",
  };
}

export function resolveBillToAddress(
  fields: CustomerTransactionFields,
  billToId: string,
): string {
  return fields.billToOptions.find((o) => o.id === billToId)?.formatted ?? fields.billingAddress;
}

export function resolveShipToAddress(
  fields: CustomerTransactionFields,
  shipToId: string,
): string {
  return fields.shipToOptions.find((o) => o.id === shipToId)?.formatted ?? fields.shippingAddress;
}

// ── Vendor ────────────────────────────────────────────────────────────────────

export function getVendorById(id: number): Vendor | undefined {
  return getActiveVendors().find((v) => v.id === id);
}

export function getActiveVendorsForTransaction(): Vendor[] {
  return getActiveVendors();
}

export function vendorMasterToTransactionFields(v: Vendor): VendorTransactionFields {
  const gstRegistered = !!(v.gstApplicable && v.gstNumber?.trim());
  const paymentTerms = v.paymentTerms?.trim() || "Net 30";
  const { billTo, shipTo } = buildVendorLocationOptions(v);
  const ledger = ensureVendorLedgerFromMaster(v);

  return {
    vendorId: v.id,
    vendorCode: v.vendorCode,
    vendorName: v.vendorName,
    vendorMobile:
      v.mobileCountryCode && v.mobile ? `${v.mobileCountryCode} ${v.mobile}` : v.mobile,
    vendorEmail: v.email,
    vendorGst: gstRegistered ? v.gstNumber : "",
    vendorGstCategory: v.gstCategory,
    pan: v.panNumber?.trim() ?? "",
    contactPerson: v.contactPerson?.trim() || "",
    paymentTerms,
    creditDays: parseCreditDays(
      v.creditPeriodValue
        ? `${v.creditPeriodValue} ${v.creditPeriodUnit ?? "days"}`
        : paymentTerms,
    ),
    payableLedger: ledger?.accountName ?? v.vendorName,
    billingAddress: billTo[0]?.formatted ?? "",
    shippingAddress: shipTo[0]?.formatted ?? "",
    bankName: v.bankName?.trim() ?? "",
    bankBranch: v.branch?.trim() ?? "",
    accountNumber: v.accountNumber?.trim() ?? "",
    ifscCode: v.ifscCode?.trim() ?? "",
    accountHolderName: v.accountHolderName?.trim() ?? v.vendorName,
    billToOptions: billTo,
    shipToOptions: shipTo,
    defaultBillToId: "bill-0",
    defaultShipToId: "ship-0",
  };
}

export function resolveVendorBillToAddress(
  fields: VendorTransactionFields,
  billToId: string,
): string {
  return fields.billToOptions.find((o) => o.id === billToId)?.formatted ?? fields.billingAddress;
}

export function resolveVendorShipToAddress(
  fields: VendorTransactionFields,
  shipToId: string,
): string {
  return fields.shipToOptions.find((o) => o.id === shipToId)?.formatted ?? fields.shippingAddress;
}

// ── Products ──────────────────────────────────────────────────────────────────

export function getProductsForSalesTransaction(customerId?: number): TransactionProductOption[] {
  return loadProducts()
    .filter((p) => p.status === "active")
    .map((p) => {
      const resolved = resolveSalesUnitPrice(p.id, customerId);
      return productToTransactionOption(p, resolved.amount);
    });
}

export function getProductsForPurchaseTransaction(vendorId?: number): TransactionProductOption[] {
  return loadProducts()
    .filter((p) => p.status === "active")
    .map((p) => {
      const resolved = resolvePurchaseCostPrice(p.id, vendorId);
      return productToTransactionOption(p, resolved.amount);
    });
}

function productToTransactionOption(p: Product, unitPrice: number): TransactionProductOption {
  return {
    id: p.id,
    sku: p.sku,
    name: p.productName,
    unit: p.baseUnit || "PCS",
    taxPct: parseTaxPct(p.gstRate),
    unitPrice,
    hsn: p.hsnCode || "",
    category: p.category || "",
    gstRate: p.gstRate,
  };
}

/** Match GRN / free-text product name to Product Master */
export function findProductByName(name: string): TransactionProductOption | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  const products = loadProducts().filter((p) => p.status === "active");
  const exact = products.find((p) => p.productName.toLowerCase() === q);
  if (exact) return productToTransactionOption(exact, 0);
  return products
    .filter((p) => p.productName.toLowerCase().includes(q) || q.includes(p.productName.toLowerCase()))
    .map((p) => productToTransactionOption(p, 0))[0];
}

export function getProductTransactionOption(
  productId: number,
  context: "sales" | "purchase",
  partyId?: number,
): TransactionProductOption | undefined {
  const p = loadProducts().find((x) => x.id === productId && x.status === "active");
  if (!p) return undefined;
  const price =
    context === "sales"
      ? resolveSalesUnitPrice(p.id, partyId).amount
      : resolvePurchaseCostPrice(p.id, partyId).amount;
  return productToTransactionOption(p, price);
}
