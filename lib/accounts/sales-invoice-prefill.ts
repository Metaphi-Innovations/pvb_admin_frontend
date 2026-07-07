/**
 * Build sales invoice form prefill from warehouse dispatch and/or sales order.
 */

import type { InvoiceLineItem } from "@/app/(app)/accounts/invoices/invoices-data";
import {
  customerToInvoiceFields,
  recalculateLineItem,
} from "@/app/(app)/accounts/invoices/invoices-data";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import { findActivePricingForStock } from "@/app/(app)/masters/pricing/pricing-data";
import { parseTaxPct } from "@/app/(app)/accounts/invoices/invoices-data";
import { getOrderById, type SalesOrder } from "@/app/(app)/sales/orders/orders-data";
import { ensureCustomerLedgerFromMaster } from "@/lib/accounts/party-ledger-sync";
import {
  buildSalesInvoicePrefillFromDispatch,
  findPendingDispatchForCustomer,
  type DispatchSalesInvoicePrefill,
} from "@/lib/accounts/dispatch-invoice-bridge";

export type SalesInvoicePrefill = DispatchSalesInvoicePrefill;

function dueDateFromTerms(orderDate: string, creditDays: number): string {
  const d = new Date(orderDate);
  d.setDate(d.getDate() + creditDays);
  return d.toISOString().slice(0, 10);
}

function resolveProductMasterId(productId: number | null, productName: string, productCode: string): number | null {
  const products = loadProducts().filter((p) => p.status === "active");
  const byId = productId ? products.find((p) => p.id === productId) : undefined;
  if (byId) return byId.id;

  const code = productCode.trim().toLowerCase();
  const name = productName.trim().toLowerCase();
  const match =
    products.find((p) => p.sku.toLowerCase() === code) ??
    products.find((p) => p.productName.toLowerCase() === name);
  return match?.id ?? null;
}

function linesFromOrder(order: SalesOrder): { lines: InvoiceLineItem[]; errors: string[] } {
  const errors: string[] = [];
  const lines = (order.lineItems ?? []).map((l, i) => {
    const masterId = resolveProductMasterId(l.productId, l.productName, l.productCode);
    if (!masterId) {
      errors.push(
        `Product mapping missing for Dispatch Line ${i + 1} (${l.productName}). Please check Product Master.`,
      );
    }
    const master = masterId ? loadProducts().find((p) => p.id === masterId) : undefined;
    const pricing = master ? findActivePricingForStock(master.sku, master.productName) : undefined;
    const taxPct =
      pricing?.gstPct ? parseTaxPct(pricing.gstPct) :
      (() => {
        const taxable = Math.max(0, (l.lineTotal ?? 0) - (l.gstAmount ?? 0));
        if (taxable > 0 && l.gstAmount) {
          return Math.round((l.gstAmount / taxable) * 10000) / 100;
        }
        return master ? parseTaxPct(master.gstRate) : 18;
      })();

    return recalculateLineItem({
      id: `so-${l.id}`,
      productId: masterId,
      productName: master?.productName ?? l.productName,
      description: l.productCode ? `SO ${order.soNumber}` : "",
      hsn: master?.hsnCode ?? "",
      qty: l.quantity,
      unit: pricing?.uom ?? master?.packagingUnit ?? master?.baseUnit ?? "PCS",
      unitPrice: l.unitPrice,
      discountPct: l.discount ?? 0,
      taxPct,
      amount: l.lineTotal ?? 0,
    });
  });
  return { lines, errors };
}

function prefillFromOrderOnly(order: SalesOrder): SalesInvoicePrefill {
  const customer = order.customerId
    ? loadCustomers().find((c) => c.id === order.customerId)
    : undefined;
  const custFields = customer
    ? customerToInvoiceFields(customer)
    : {
        customerId: null as number | null,
        customerCode: "",
        customerName: order.customerName,
        customerMobile: "",
        customerEmail: "",
        customerGst: "",
        customerGstCategory: undefined,
        billingAddress: "",
        shippingAddress: "",
        pan: "",
        contactPerson: "",
        paymentTerms: "Net 30",
        creditDays: 30,
        placeOfSupply: "",
        state: "",
        gstTreatment: "registered",
        receivableLedger: order.customerName,
      };

  const creditDays = custFields.creditDays ?? 30;
  const ledger = customer ? ensureCustomerLedgerFromMaster(customer) : null;
  const { lines, errors } = linesFromOrder(order);

  return {
    invoiceType: "sales",
    salesOrderId: order.id,
    salesOrderNo: order.soNumber,
    sourceDispatchId: "",
    dispatchNo: "",
    branch: "Head Office",
    warehouse: "Central Warehouse",
    salesperson: order.salesManName ?? "",
    referenceNo: order.soNumber,
    paymentTerms: custFields.paymentTerms ?? "Net 30",
    creditDays,
    dueDate: dueDateFromTerms(order.orderDate, creditDays),
    invoiceDate: order.orderDate,
    customerId: custFields.customerId,
    customerLedgerId: ledger?.id ?? null,
    customerCode: custFields.customerCode ?? "",
    customerName: custFields.customerName,
    customerMobile: custFields.customerMobile,
    customerEmail: custFields.customerEmail,
    customerGst: custFields.customerGst,
    customerGstCategory: custFields.customerGstCategory,
    billingAddress: custFields.billingAddress,
    shippingAddress: custFields.shippingAddress || custFields.billingAddress,
    pan: custFields.pan ?? "",
    contactPerson: custFields.contactPerson ?? "",
    placeOfSupply: custFields.placeOfSupply ?? "",
    state: custFields.state ?? "",
    gstTreatment: custFields.gstTreatment ?? "registered",
    receivableLedger: ledger?.accountName ?? custFields.receivableLedger,
    lineItems: lines,
    lineErrors: errors,
    nearExpirySchemes: [],
  };
}

/** Prefill from the latest pending warehouse dispatch for this customer (Create Invoice flow). */
export function buildSalesInvoicePrefillForCustomer(
  customerId: number,
): SalesInvoicePrefill | null {
  const pending = findPendingDispatchForCustomer(customerId);
  if (!pending) return null;

  return buildSalesInvoicePrefillFromDispatch(
    pending.dispatchId,
    pending.dispatchNo,
    pending.salesOrderId ?? undefined,
  );
}

export function buildSalesInvoicePrefill(
  orderId?: number | null,
  dispatchNo?: string | null,
  dispatchId?: string | null,
): SalesInvoicePrefill | null {
  if (dispatchId || dispatchNo) {
    const fromDispatch = buildSalesInvoicePrefillFromDispatch(dispatchId, dispatchNo, orderId ?? undefined);
    if (fromDispatch) return fromDispatch;
  }

  if (orderId) {
    const order = getOrderById(orderId);
    if (!order) return null;
    return prefillFromOrderOnly(order);
  }

  return null;
}
