import { loadInvoices, getInvoiceAmountBreakup } from "@/app/(app)/accounts/invoices/invoices-data";
import {
  loadPurchaseInvoices,
} from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";

export interface SalesRegisterRow {
  docNo: string;
  date: string;
  party: string;
  taxable: number;
  tax: number;
  total: number;
  status: string;
}

export interface PurchaseRegisterRow {
  docNo: string;
  date: string;
  party: string;
  taxable: number;
  tax: number;
  total: number;
  status: string;
}

export function buildSalesRegisterRows(
  dateFrom?: string,
  dateTo?: string,
): SalesRegisterRow[] {
  return loadInvoices()
    .filter((inv) => inv.invoiceStatus !== "cancelled")
    .filter((inv) => {
      if (dateFrom && inv.invoiceDate < dateFrom) return false;
      if (dateTo && inv.invoiceDate > dateTo) return false;
      return true;
    })
    .map((inv) => {
      const { taxableValue, gstAmount, invoiceTotal } = getInvoiceAmountBreakup(inv);
      return {
        docNo: inv.invoiceNo,
        date: inv.invoiceDate,
        party: inv.customerName,
        taxable: taxableValue,
        tax: gstAmount,
        total: invoiceTotal,
        status: inv.paymentStatus === "paid" ? "Paid" : inv.paymentStatus === "partially_paid" ? "Part Paid" : "Posted",
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function buildPurchaseRegisterRows(
  dateFrom?: string,
  dateTo?: string,
): PurchaseRegisterRow[] {
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
      let status = "Posted";
      if (inv.amountPaid >= inv.grandTotal && inv.grandTotal > 0) status = "Paid";
      else if (inv.amountPaid > 0) status = "Part Paid";
      return {
        docNo: inv.invoiceNo,
        date: inv.invoiceDate,
        party: inv.vendorName,
        taxable,
        tax,
        total,
        status,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
