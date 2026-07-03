import {
  loadInvoices,
  getInvoiceAmountBreakup,
  calcLineAmounts,
  type InvoiceRecord,
} from "@/app/(app)/accounts/invoices/invoices-data";
import { loadPurchaseInvoices } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { loadVendors } from "@/app/(app)/masters/vendors/vendor-data";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import { roundMoney } from "@/lib/accounts/money-format";

export type RegisterViewMode = "invoice" | "party" | "month" | "commodity";

export const SALES_VIEW_BY_OPTIONS: { value: RegisterViewMode; label: string }[] = [
  { value: "invoice", label: "Invoice View" },
  { value: "party", label: "Party-wise" },
  { value: "month", label: "Month-wise" },
  { value: "commodity", label: "Commodity-wise" },
];

export const PURCHASE_VIEW_BY_OPTIONS: { value: RegisterViewMode; label: string }[] = [
  { value: "invoice", label: "Invoice View" },
  { value: "party", label: "Vendor-wise" },
  { value: "month", label: "Month-wise" },
  { value: "commodity", label: "Commodity-wise" },
];

export interface RegisterLineItemSnapshot {
  productId: number | null;
  productName: string;
  productCode: string;
  hsn: string;
  qty: number;
  taxable: number;
  tax: number;
  total: number;
  unitPrice: number;
}

export interface SalesRegisterSourceRow {
  docNo: string;
  date: string;
  party: string;
  partyId: number | null;
  sourceId: number;
  gstin: string;
  pan: string;
  state: string;
  branch: string;
  taxable: number;
  tax: number;
  total: number;
  outstanding: number;
  status: string;
  lineItems: RegisterLineItemSnapshot[];
}

export interface PurchaseRegisterSourceRow {
  docNo: string;
  date: string;
  party: string;
  partyId: number;
  sourceId: number;
  gstin: string;
  pan: string;
  state: string;
  taxable: number;
  tax: number;
  total: number;
  payable: number;
  status: string;
  lineItems: RegisterLineItemSnapshot[];
}

/** @deprecated Use SalesRegisterSourceRow — kept for backward compatibility */
export interface SalesRegisterRow {
  docNo: string;
  date: string;
  party: string;
  taxable: number;
  tax: number;
  total: number;
  status: string;
}

/** @deprecated Use PurchaseRegisterSourceRow — kept for backward compatibility */
export interface PurchaseRegisterRow {
  docNo: string;
  date: string;
  party: string;
  taxable: number;
  tax: number;
  total: number;
  status: string;
}

export interface RegisterPartyWiseRow {
  groupKey: string;
  partyName: string;
  gstin: string;
  pan: string;
  docCount: number;
  taxable: number;
  tax: number;
  total: number;
  balance: number;
}

export interface RegisterMonthWiseRow {
  groupKey: string;
  monthLabel: string;
  docCount: number;
  taxable: number;
  tax: number;
  total: number;
  balance: number;
}

export interface RegisterCommodityWiseRow {
  groupKey: string;
  productName: string;
  productCode: string;
  hsn: string;
  qty: number;
  taxable: number;
  tax: number;
  total: number;
  avgRate: number;
}

export interface RegisterFilterParams {
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  partyId?: string;
  product?: string;
  state?: string;
  branch?: string;
}

function productCodeLookup(
  productId: number | null,
  productName: string,
  cache: Map<string, string>,
): string {
  const key = productId != null ? `id:${productId}` : `name:${productName}`;
  if (cache.has(key)) return cache.get(key)!;
  const products = loadProducts();
  const match =
    productId != null
      ? products.find((p) => p.id === productId)
      : products.find((p) => p.productName === productName);
  const code = match?.productCode ?? match?.sku ?? "—";
  cache.set(key, code);
  return code;
}

function monthKeyFromDate(date: string): string {
  return date.slice(0, 7);
}

export function formatRegisterMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export function monthDateRange(monthKey: string): { from: string; to: string } {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, "0");
  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

function resolveCustomerMeta(customerId: number | null, customerName: string) {
  const customers = loadCustomers();
  const customer =
    customerId != null
      ? customers.find((c) => c.id === customerId)
      : customers.find((c) => c.customerName === customerName);
  return {
    gstin: customer?.gstin || "",
    pan: customer?.pan || "",
    state: customer?.stateName || "",
  };
}

function resolveVendorMeta(vendorId: number) {
  const vendor = loadVendors().find((v) => v.id === vendorId);
  return {
    gstin: vendor?.gstNumber || "",
    pan: vendor?.panNumber || "",
    state: vendor?.billingAddress?.state || "",
  };
}

function mapSalesLineItems(
  inv: InvoiceRecord,
  cache: Map<string, string>,
): RegisterLineItemSnapshot[] {
  return inv.lineItems.map((line) => {
    const { taxable, taxAmt, amount } = calcLineAmounts(line);
    return {
      productId: line.productId,
      productName: line.productName,
      productCode: productCodeLookup(line.productId, line.productName, cache),
      hsn: line.hsn || "—",
      qty: line.qty,
      taxable: roundMoney(taxable),
      tax: roundMoney(taxAmt),
      total: roundMoney(amount),
      unitPrice: line.unitPrice,
    };
  });
}

export function buildSalesRegisterSourceRows(
  dateFrom?: string,
  dateTo?: string,
): SalesRegisterSourceRow[] {
  const productCache = new Map<string, string>();

  return loadInvoices()
    .filter((inv) => inv.invoiceStatus !== "cancelled")
    .filter((inv) => {
      if (dateFrom && inv.invoiceDate < dateFrom) return false;
      if (dateTo && inv.invoiceDate > dateTo) return false;
      return true;
    })
    .map((inv) => {
      const { taxableValue, gstAmount, invoiceTotal } = getInvoiceAmountBreakup(inv);
      const meta = resolveCustomerMeta(inv.customerId, inv.customerName);
      return {
        docNo: inv.invoiceNo,
        date: inv.invoiceDate,
        party: inv.customerName,
        partyId: inv.customerId,
        sourceId: inv.id,
        gstin: inv.customerGst || meta.gstin,
        pan: inv.pan || meta.pan,
        state: inv.state || meta.state,
        branch: inv.branch || "—",
        taxable: taxableValue,
        tax: gstAmount,
        total: invoiceTotal,
        outstanding: roundMoney(inv.balanceAmount ?? Math.max(0, inv.grandTotal - inv.amountReceived)),
        status:
          inv.paymentStatus === "paid"
            ? "Paid"
            : inv.paymentStatus === "partially_paid"
              ? "Part Paid"
              : "Posted",
        lineItems: mapSalesLineItems(inv, productCache),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function buildPurchaseRegisterSourceRows(
  dateFrom?: string,
  dateTo?: string,
): PurchaseRegisterSourceRow[] {
  const productCache = new Map<string, string>();

  return loadPurchaseInvoices()
    .filter((inv) => {
      if (dateFrom && inv.invoiceDate < dateFrom) return false;
      if (dateTo && inv.invoiceDate > dateTo) return false;
      return true;
    })
    .map((inv) => {
      const taxable = inv.productAmount ?? inv.subtotal;
      const tax = inv.taxAmount;
      const total = inv.grandTotal;
      const meta = resolveVendorMeta(inv.vendorId);
      let status = "Posted";
      if (inv.amountPaid >= inv.grandTotal && inv.grandTotal > 0) status = "Paid";
      else if (inv.amountPaid > 0) status = "Part Paid";

      const lineItems: RegisterLineItemSnapshot[] = inv.lineItems.map((line) => ({
        productId: line.productId,
        productName: line.productName,
        productCode: productCodeLookup(line.productId, line.productName, productCache),
        hsn: "—",
        qty: line.invoiceQty,
        taxable: roundMoney(line.lineAmount),
        tax: roundMoney(line.taxAmount),
        total: roundMoney(line.lineAmount + line.taxAmount),
        unitPrice: line.unitPrice,
      }));

      return {
        docNo: inv.invoiceNo,
        date: inv.invoiceDate,
        party: inv.vendorName,
        partyId: inv.vendorId,
        sourceId: inv.id,
        gstin: inv.vendorGst || meta.gstin,
        pan: meta.pan,
        state: meta.state,
        taxable,
        tax,
        total,
        payable: roundMoney(Math.max(0, inv.grandTotal - inv.amountPaid)),
        status,
        lineItems,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** @deprecated Use buildSalesRegisterSourceRows */
export function buildSalesRegisterRows(
  dateFrom?: string,
  dateTo?: string,
): SalesRegisterRow[] {
  return buildSalesRegisterSourceRows(dateFrom, dateTo).map((r) => ({
    docNo: r.docNo,
    date: r.date,
    party: r.party,
    taxable: r.taxable,
    tax: r.tax,
    total: r.total,
    status: r.status,
  }));
}

/** @deprecated Use buildPurchaseRegisterSourceRows */
export function buildPurchaseRegisterRows(
  dateFrom?: string,
  dateTo?: string,
): PurchaseRegisterRow[] {
  return buildPurchaseRegisterSourceRows(dateFrom, dateTo).map((r) => ({
    docNo: r.docNo,
    date: r.date,
    party: r.party,
    taxable: r.taxable,
    tax: r.tax,
    total: r.total,
    status: r.status,
  }));
}

function matchesSearch(search: string, parts: (string | number | undefined | null)[]): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return parts.some((p) => String(p ?? "").toLowerCase().includes(q));
}

export function filterSalesRegisterRows(
  rows: SalesRegisterSourceRow[],
  filters: RegisterFilterParams,
): SalesRegisterSourceRow[] {
  const customers = loadCustomers();

  return rows.filter((row) => {
    if (filters.partyId && filters.partyId !== "all") {
      const customer = customers.find((c) => String(c.id) === filters.partyId);
      if (customer && row.party !== customer.customerName) return false;
    }
    if (filters.state && filters.state !== "all" && row.state !== filters.state) return false;
    if (filters.branch && filters.branch !== "all" && row.branch !== filters.branch) return false;
    if (filters.product && filters.product !== "all") {
      const hasProduct = row.lineItems.some(
        (l) => l.productName === filters.product || l.productCode === filters.product,
      );
      if (!hasProduct) return false;
    }
    if (
      !matchesSearch(filters.search ?? "", [
        row.docNo,
        row.party,
        row.gstin,
        row.pan,
        row.state,
        ...row.lineItems.map((l) => l.productName),
        ...row.lineItems.map((l) => l.productCode),
      ])
    ) {
      return false;
    }
    return true;
  });
}

export function filterPurchaseRegisterRows(
  rows: PurchaseRegisterSourceRow[],
  filters: RegisterFilterParams,
): PurchaseRegisterSourceRow[] {
  const vendors = loadVendors();

  return rows.filter((row) => {
    if (filters.partyId && filters.partyId !== "all") {
      const vendor = vendors.find((v) => String(v.id) === filters.partyId);
      if (vendor && row.party !== vendor.vendorName) return false;
    }
    if (filters.state && filters.state !== "all" && row.state !== filters.state) return false;
    if (filters.product && filters.product !== "all") {
      const hasProduct = row.lineItems.some(
        (l) => l.productName === filters.product || l.productCode === filters.product,
      );
      if (!hasProduct) return false;
    }
    if (
      !matchesSearch(filters.search ?? "", [
        row.docNo,
        row.party,
        row.gstin,
        row.pan,
        row.state,
        ...row.lineItems.map((l) => l.productName),
        ...row.lineItems.map((l) => l.productCode),
      ])
    ) {
      return false;
    }
    return true;
  });
}

export function aggregateSalesPartyWise(rows: SalesRegisterSourceRow[]): RegisterPartyWiseRow[] {
  const map = new Map<string, RegisterPartyWiseRow>();

  for (const row of rows) {
    const key = row.partyId != null ? `id:${row.partyId}` : `name:${row.party}`;
    const existing = map.get(key);
    if (existing) {
      existing.docCount += 1;
      existing.taxable = roundMoney(existing.taxable + row.taxable);
      existing.tax = roundMoney(existing.tax + row.tax);
      existing.total = roundMoney(existing.total + row.total);
      existing.balance = roundMoney(existing.balance + row.outstanding);
    } else {
      map.set(key, {
        groupKey: key,
        partyName: row.party,
        gstin: row.gstin || "—",
        pan: row.pan || "—",
        docCount: 1,
        taxable: row.taxable,
        tax: row.tax,
        total: row.total,
        balance: row.outstanding,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.partyName.localeCompare(b.partyName));
}

export function aggregatePurchasePartyWise(
  rows: PurchaseRegisterSourceRow[],
): RegisterPartyWiseRow[] {
  const map = new Map<string, RegisterPartyWiseRow>();

  for (const row of rows) {
    const key = `id:${row.partyId}`;
    const existing = map.get(key);
    if (existing) {
      existing.docCount += 1;
      existing.taxable = roundMoney(existing.taxable + row.taxable);
      existing.tax = roundMoney(existing.tax + row.tax);
      existing.total = roundMoney(existing.total + row.total);
      existing.balance = roundMoney(existing.balance + row.payable);
    } else {
      map.set(key, {
        groupKey: key,
        partyName: row.party,
        gstin: row.gstin || "—",
        pan: row.pan || "—",
        docCount: 1,
        taxable: row.taxable,
        tax: row.tax,
        total: row.total,
        balance: row.payable,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.partyName.localeCompare(b.partyName));
}

function aggregateMonthWise<T extends { date: string; taxable: number; tax: number; total: number }>(
  rows: T[],
  balanceOf: (row: T) => number,
): RegisterMonthWiseRow[] {
  const map = new Map<string, RegisterMonthWiseRow>();

  for (const row of rows) {
    const key = monthKeyFromDate(row.date);
    const existing = map.get(key);
    if (existing) {
      existing.docCount += 1;
      existing.taxable = roundMoney(existing.taxable + row.taxable);
      existing.tax = roundMoney(existing.tax + row.tax);
      existing.total = roundMoney(existing.total + row.total);
      existing.balance = roundMoney(existing.balance + balanceOf(row));
    } else {
      map.set(key, {
        groupKey: key,
        monthLabel: formatRegisterMonthLabel(key),
        docCount: 1,
        taxable: row.taxable,
        tax: row.tax,
        total: row.total,
        balance: balanceOf(row),
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.groupKey.localeCompare(a.groupKey));
}

export function aggregateSalesMonthWise(rows: SalesRegisterSourceRow[]): RegisterMonthWiseRow[] {
  return aggregateMonthWise(rows, (r) => r.outstanding);
}

export function aggregatePurchaseMonthWise(
  rows: PurchaseRegisterSourceRow[],
): RegisterMonthWiseRow[] {
  return aggregateMonthWise(rows, (r) => r.payable);
}

function aggregateCommodityWise(
  rows: { lineItems: RegisterLineItemSnapshot[] }[],
): RegisterCommodityWiseRow[] {
  const map = new Map<string, RegisterCommodityWiseRow>();

  for (const row of rows) {
    for (const line of row.lineItems) {
      const key =
        line.productId != null ? `id:${line.productId}` : `name:${line.productName}`;
      const existing = map.get(key);
      if (existing) {
        existing.qty = roundMoney(existing.qty + line.qty);
        existing.taxable = roundMoney(existing.taxable + line.taxable);
        existing.tax = roundMoney(existing.tax + line.tax);
        existing.total = roundMoney(existing.total + line.total);
      } else {
        map.set(key, {
          groupKey: key,
          productName: line.productName,
          productCode: line.productCode,
          hsn: line.hsn,
          qty: line.qty,
          taxable: line.taxable,
          tax: line.tax,
          total: line.total,
          avgRate: line.unitPrice,
        });
      }
    }
  }

  for (const entry of map.values()) {
    entry.avgRate = entry.qty > 0 ? roundMoney(entry.taxable / entry.qty) : 0;
  }

  return Array.from(map.values()).sort((a, b) => a.productName.localeCompare(b.productName));
}

export function aggregateSalesCommodityWise(
  rows: SalesRegisterSourceRow[],
): RegisterCommodityWiseRow[] {
  return aggregateCommodityWise(rows);
}

export function aggregatePurchaseCommodityWise(
  rows: PurchaseRegisterSourceRow[],
): RegisterCommodityWiseRow[] {
  return aggregateCommodityWise(rows);
}

export function collectSalesStateOptions(): string[] {
  const states = new Set<string>();
  for (const c of loadCustomers()) {
    if (c.stateName?.trim()) states.add(c.stateName.trim());
  }
  for (const row of buildSalesRegisterSourceRows()) {
    if (row.state?.trim() && row.state !== "—") states.add(row.state.trim());
  }
  return Array.from(states).sort();
}

export function collectPurchaseStateOptions(): string[] {
  const states = new Set<string>();
  for (const v of loadVendors()) {
    const s = v.billingAddress?.state?.trim();
    if (s) states.add(s);
  }
  return Array.from(states).sort();
}

export function partyIdFromGroupKey(groupKey: string): string | null {
  if (groupKey.startsWith("id:")) return groupKey.slice(3);
  return null;
}

export function productNameFromCommodityKey(
  rows: SalesRegisterSourceRow[] | PurchaseRegisterSourceRow[],
  groupKey: string,
): string | null {
  for (const row of rows) {
    for (const line of row.lineItems) {
      const key =
        line.productId != null ? `id:${line.productId}` : `name:${line.productName}`;
      if (key === groupKey) return line.productName;
    }
  }
  return null;
}
