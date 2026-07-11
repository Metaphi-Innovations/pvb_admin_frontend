import {
  getInvoiceAmountBreakup,
  loadInvoices,
  type InvoiceRecord,
} from "@/app/(app)/accounts/invoices/invoices-data";
import { loadPurchaseInvoices, type PurchaseInvoiceRecord } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { loadVendors } from "@/app/(app)/masters/vendors/vendor-data";
import { demoToday } from "@/lib/accounts/demo-date-utils";
import { roundMoney } from "@/lib/accounts/money-format";
import type {
  RegisterGstRate,
  RegisterInvoiceStatus,
  RegisterPartyOption,
  RegisterPaymentStatus,
  RegisterReportRow,
} from "./register-types";

const VALID_GST_RATES: RegisterGstRate[] = [5, 12, 18, 28];

function clampGstRate(rate: number): RegisterGstRate {
  const rounded = Math.round(rate) as RegisterGstRate;
  if (VALID_GST_RATES.includes(rounded)) return rounded;
  if (rate <= 5) return 5;
  if (rate <= 12) return 12;
  if (rate <= 18) return 18;
  return 28;
}

function dominantGstRate(taxPcts: number[]): RegisterGstRate {
  if (taxPcts.length === 0) return 18;
  const counts = new Map<number, number>();
  for (const pct of taxPcts) {
    const key = clampGstRate(pct);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: RegisterGstRate = 18;
  let bestCount = 0;
  for (const rate of VALID_GST_RATES) {
    const c = counts.get(rate) ?? 0;
    if (c > bestCount) {
      bestCount = c;
      best = rate;
    }
  }
  return best;
}

function mapSalesInvoiceStatus(inv: InvoiceRecord): RegisterInvoiceStatus {
  if (inv.invoiceStatus === "cancelled") return "cancelled";
  if (inv.invoiceStatus === "draft") return "draft";
  return "posted";
}

function mapSalesPaymentStatus(inv: InvoiceRecord): RegisterPaymentStatus {
  if (inv.invoiceStatus === "cancelled") return "pending";
  if (inv.paymentStatus === "paid") return "paid";
  if (inv.paymentStatus === "partially_paid") return "partially_paid";
  const due = inv.dueDate?.slice(0, 10);
  if (due && due < demoToday()) return "overdue";
  return "pending";
}

function mapPurchasePaymentStatus(rec: PurchaseInvoiceRecord): RegisterPaymentStatus {
  if (rec.grandTotal <= 0) return "paid";
  if (rec.amountPaid >= rec.grandTotal) return "paid";
  if (rec.amountPaid > 0) return "partially_paid";
  const invoiceDate = rec.invoiceDate.slice(0, 10);
  const due = new Date(`${invoiceDate}T12:00:00`);
  due.setDate(due.getDate() + 45);
  if (due.toISOString().slice(0, 10) < demoToday()) return "overdue";
  return "pending";
}

function customerState(customerId: number | null, fallback?: string): string {
  if (fallback?.trim()) return fallback.trim();
  if (customerId == null) return "—";
  const customer = loadCustomers().find((c) => c.id === customerId);
  return customer?.stateName?.trim() || "—";
}

function vendorState(vendorId: number, fallbackGst?: string): string {
  const vendor = loadVendors().find((v) => v.id === vendorId);
  if (vendor?.billingAddress?.state?.trim()) return vendor.billingAddress.state.trim();
  if (fallbackGst && fallbackGst.length >= 2) {
    const code = fallbackGst.slice(0, 2);
    const stateCodes: Record<string, string> = {
      "27": "Maharashtra",
      "24": "Gujarat",
      "29": "Karnataka",
      "08": "Rajasthan",
      "23": "Madhya Pradesh",
      "03": "Punjab",
      "33": "Tamil Nadu",
      "07": "Delhi",
    };
    return stateCodes[code] ?? "—";
  }
  return "—";
}

function financialYearIdForDate(isoDate: string): number {
  const d = isoDate.slice(0, 10);
  const month = Number(d.slice(5, 7));
  const year = Number(d.slice(0, 4));
  const startYear = month >= 4 ? year : year - 1;
  return startYear;
}

export function salesInvoiceToRegisterRow(inv: InvoiceRecord): RegisterReportRow {
  const { taxableValue, gstAmount, invoiceTotal } = getInvoiceAmountBreakup(inv);
  const taxPcts = inv.lineItems.map((l) => l.taxPct).filter((n) => n > 0);
  const customer = inv.customerId != null ? loadCustomers().find((c) => c.id === inv.customerId) : undefined;

  return {
    id: inv.id,
    invoiceDate: inv.invoiceDate.slice(0, 10),
    invoiceNo: inv.invoiceNo,
    partyId: inv.customerId ?? 0,
    partyName: inv.customerName || "—",
    gstin: inv.customerGst || "—",
    state: customerState(inv.customerId, inv.state ?? inv.placeOfSupply),
    branch: inv.branch?.trim() || customer?.branch?.trim() || "Head Office",
    salesperson: inv.salesperson?.trim() || customer?.salesManName?.trim() || "",
    voucherType: "SI",
    productNames: inv.lineItems.map((l) => l.productName).filter(Boolean),
    taxableValue,
    gstAmount,
    invoiceTotal,
    paymentStatus: mapSalesPaymentStatus(inv),
    invoiceStatus: mapSalesInvoiceStatus(inv),
    gstRate: dominantGstRate(taxPcts),
    financialYearId: financialYearIdForDate(inv.invoiceDate),
  };
}

export function purchaseInvoiceToRegisterRow(rec: PurchaseInvoiceRecord): RegisterReportRow {
  const taxableValue = roundMoney(rec.subtotal ?? rec.productAmount ?? 0);
  const gstAmount = roundMoney(rec.taxAmount ?? 0);
  const invoiceTotal = roundMoney(rec.grandTotal);
  const taxPcts = rec.lineItems.map((l) => l.taxPct).filter((n) => n > 0);
  const ws = rec.workflow?.status;
  const posted =
    ws === "draft" || ws === "sent_back"
      ? ("draft" as const)
      : ws === "cancelled"
        ? ("cancelled" as const)
        : ("posted" as const);

  const vendor = loadVendors().find((v) => v.id === rec.vendorId);

  return {
    id: rec.id,
    invoiceDate: rec.invoiceDate.slice(0, 10),
    invoiceNo: rec.invoiceNo,
    partyId: rec.vendorId,
    partyName: rec.vendorName || "—",
    gstin: rec.vendorGst || "—",
    state: vendorState(rec.vendorId, rec.vendorGst),
    branch: vendor?.billingAddress?.city?.trim() || "Head Office",
    voucherType: "PI",
    productNames: rec.lineItems.map((l) => l.productName).filter(Boolean),
    taxableValue,
    gstAmount,
    invoiceTotal,
    paymentStatus: mapPurchasePaymentStatus(rec),
    invoiceStatus: posted,
    gstRate: dominantGstRate(taxPcts),
    financialYearId: financialYearIdForDate(rec.invoiceDate),
  };
}

export function buildSalesRegisterRows(): RegisterReportRow[] {
  return loadInvoices()
    .map(salesInvoiceToRegisterRow)
    .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate) || b.id - a.id);
}

export function buildPurchaseRegisterRows(): RegisterReportRow[] {
  return loadPurchaseInvoices()
    .map(purchaseInvoiceToRegisterRow)
    .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate) || b.id - a.id);
}

export function buildRegisterPartyOptions(rows: RegisterReportRow[]): RegisterPartyOption[] {
  const map = new Map<number, string>();
  for (const row of rows) {
    if (row.partyId > 0 && row.partyName) map.set(row.partyId, row.partyName);
  }
  return Array.from(map.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function findRegisterRow(rows: RegisterReportRow[], id: number): RegisterReportRow | undefined {
  return rows.find((r) => r.id === id);
}
