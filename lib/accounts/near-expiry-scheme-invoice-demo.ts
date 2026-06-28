/**
 * Demo Sales Invoice with Near Expiry scheme settlement — for listing/detail testing.
 * Does not use the pending-invoice demo dispatch so Pending Invoices flow stays testable.
 */

import {
  NEAR_EXPIRY_SCHEME_STATUS_ACTIVE,
  NEAR_EXPIRY_SETTLEMENT_METHOD,
  NEAR_EXPIRY_SETTLEMENT_STATUS_PENDING,
} from "@/app/(app)/warehouse/dispatch/near-expiry-constants";
import type {
  InvoiceNearExpirySchemeSettlement,
  InvoiceRecord,
} from "@/app/(app)/accounts/invoices/invoices-data";

export const NEAR_EXPIRY_DEMO_INVOICE_NO = "INV-NE-DEMO";

const NEAR_EXPIRY_DEMO_CUSTOMER = "ABC Distributor";

const DEMO_SETTLEMENT: InvoiceNearExpirySchemeSettlement = {
  schemeId: 9,
  schemeCode: "NE-001",
  schemeName: "Near Expiry 30 Days Offer",
  schemeType: "Near Expiry",
  schemeStatus: NEAR_EXPIRY_SCHEME_STATUS_ACTIVE,
  product: "Bio Fertilizer A",
  productId: "10",
  batchNumber: "B001",
  batchExpiryDate: "2026-07-21",
  remainingExpiryDays: 24,
  benefitType: "Percentage",
  benefitValue: 10,
  estimatedBenefitAmount: 1260,
  settlementMethod: NEAR_EXPIRY_SETTLEMENT_METHOD,
  settlementStatus: NEAR_EXPIRY_SETTLEMENT_STATUS_PENDING,
  invoiceNo: NEAR_EXPIRY_DEMO_INVOICE_NO,
  customerName: NEAR_EXPIRY_DEMO_CUSTOMER,
  salesOrderNo: "SO-2026-NE-SAMPLE",
};

export const NEAR_EXPIRY_DEMO_SALES_INVOICE: InvoiceRecord = {
  id: 9001,
  invoiceNo: NEAR_EXPIRY_DEMO_INVOICE_NO,
  invoiceDate: "2026-06-26",
  dueDate: "2026-07-26",
  referenceNo: "SO-2026-NE-SAMPLE",
  dispatchNo: "DSP-2026-NE-SAMPLE",
  sourceDispatchId: "dp-ne-invoiced-sample",
  salesOrderNo: "SO-2026-NE-SAMPLE",
  remarks: "Demo invoice — Near Expiry scheme settlement pending",
  customerId: null,
  customerName: NEAR_EXPIRY_DEMO_CUSTOMER,
  customerMobile: "9898989898",
  customerEmail: "accounts@abcdistributor.in",
  customerGst: "27AABCA1234B1Z5",
  billingAddress: "Plot 45, MIDC, Pune, Maharashtra 411019",
  shippingAddress: "Plot 45, MIDC, Pune, Maharashtra 411019",
  state: "Maharashtra",
  placeOfSupply: "Maharashtra",
  branch: "Head Office",
  warehouse: "Central Warehouse",
  lineItems: [
    {
      id: "ne-demo-line-1",
      productId: 10,
      productName: "Bio Fertilizer A",
      description: "DSP-2026-NE-SAMPLE · Batch B001",
      hsn: "3101",
      qty: 30,
      unit: "Bottle",
      unitPrice: 420,
      discountPct: 0,
      taxPct: 5,
      amount: 13230,
    },
  ],
  subtotal: 12600,
  discountTotal: 0,
  taxAmount: 630,
  grandTotal: 13230,
  amountReceived: 0,
  balanceAmount: 13230,
  invoiceStatus: "sent",
  paymentStatus: "unpaid",
  collections: [],
  attachments: [],
  activity: [
    {
      at: "2026-06-26T10:00:00.000Z",
      action: "created",
      by: "Admin",
      detail: "Demo invoice with Near Expiry scheme settlement",
    },
  ],
  createdBy: "Admin",
  updatedBy: "Admin",
  createdAt: "2026-06-26T10:00:00.000Z",
  updatedAt: "2026-06-26T10:00:00.000Z",
  nearExpirySchemeSettlements: [DEMO_SETTLEMENT],
};

export function mergeNearExpiryDemoSalesInvoice(list: InvoiceRecord[]): InvoiceRecord[] {
  if (list.some((inv) => inv.invoiceNo === NEAR_EXPIRY_DEMO_INVOICE_NO)) {
    return list;
  }
  return [...list, NEAR_EXPIRY_DEMO_SALES_INVOICE];
}
