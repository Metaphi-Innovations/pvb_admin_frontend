/**

 * Seed sales invoice records for Accounts > Sales Invoices listing.

 */



import {

  recalculateLineItem,

  type InvoiceRecord,

} from "@/app/(app)/accounts/invoices/invoices-data";

import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import type { InvoiceDocumentType } from "@/lib/accounts/invoice-type";
import {
  demoDateAt,
  demoDocNo,
  demoTimestamp,
} from "@/lib/accounts/demo-date-utils";

export const SALES_INVOICE_SEED_VERSION = 4;



function seedLine(

  id: string,

  productName: string,

  taxable: number,

  taxPct: number,

) {

  return recalculateLineItem({

    id,

    productId: null,

    productName,

    description: "",

    qty: 1,

    unit: "Lot",

    unitPrice: taxable,

    discountPct: 0,

    taxPct,

    amount: 0,

  });

}



function buildSeedInvoice(

  id: number,

  invoiceNo: string,

  invoiceType: InvoiceDocumentType,

  invoiceDate: string,

  sourceNo: string,

  dispatchNo: string,

  party: string,

  taxable: number,

  gst: number,

  total: number,

  invoiceStatus: "draft" | "sent",

  productName: string,

  taxPct: number,

  interstate: boolean,

  placeOfSupply: string,

): InvoiceRecord {

  const line = seedLine(`seed-${id}`, productName, taxable, taxPct);

  return {

    id,

    invoiceNo,

    invoiceType,

    invoiceDate,

    dueDate: invoiceDate,

    referenceNo: sourceNo,

    remarks: "",

    customerId: null,

    customerName: party,

    customerMobile: "",

    customerEmail: "",

    customerGst: "",

    billingAddress: party,

    lineItems: [line],

    subtotal: taxable,

    discountTotal: 0,

    taxAmount: gst,

    grandTotal: total,

    amountReceived: 0,

    balanceAmount: total,

    salesOrderNo: sourceNo,

    dispatchNo,

    sourceDispatchId: `seed-inv-${id}`,

    branch: "Head Office",

    warehouse: "Central Warehouse",

    gstTreatment: interstate ? "interstate" : "intrastate",

    placeOfSupply,

    state: "Maharashtra",

    invoiceStatus,

    paymentStatus: "unpaid",

    collections: [],

    attachments: [],

    activity: [
      {
        at: demoTimestamp(invoiceDate),
        action: "created",
        by: ACCOUNTS_CURRENT_USER,
        detail: invoiceStatus === "draft" ? "Invoice saved as draft" : "Invoice created and sent",
      },
    ],
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: demoTimestamp(invoiceDate),
    updatedAt: demoTimestamp(invoiceDate),
  };
}

export function buildSalesInvoiceSeed(): InvoiceRecord[] {
  const y = new Date().getFullYear();
  return [
    buildSeedInvoice(
      101,
      demoDocNo("INV", 1),
      "sales",
      demoDateAt(0),
      `SO-${y}-WE-010`,
      `DSP-${y}-WE-005`,
      "Reliance Agri",
      93000,
      4650,
      97650,
      "sent",
      "Urea 50kg",
      5,
      true,
      "Gujarat",
    ),
    buildSeedInvoice(
      102,
      demoDocNo("INV", 2),
      "sales",
      demoDateAt(1),
      `SO-${y}-SE-018`,
      `DSP-${y}-SE-009`,
      "Mahindra Farms",
      145000,
      17400,
      162400,
      "sent",
      "NPK 10:26:26",
      12,
      false,
      "Maharashtra",
    ),
    buildSeedInvoice(
      103,
      demoDocNo("INV", 3),
      "sales",
      demoDateAt(3),
      `SO-${y}-NE-002`,
      `DSP-${y}-NE-002`,
      "ABC Distributor",
      12600,
      1512,
      14112,
      "sent",
      "Bio Fertilizer A",
      12,
      false,
      "Maharashtra",
    ),
    buildSeedInvoice(
      104,
      demoDocNo("STI", 1),
      "stock_transfer",
      demoDateAt(5),
      `ST-${y}-002`,
      `DSP-ST-${y}-002`,
      "Ahmedabad Warehouse",
      52000,
      2600,
      54600,
      "sent",
      "DAP 50kg",
      5,
      true,
      "Gujarat",
    ),
    buildSeedInvoice(
      105,
      demoDocNo("STI", 2),
      "stock_transfer",
      demoDateAt(7),
      `ST-${y}-005`,
      `DSP-ST-${y}-005`,
      "Pune Warehouse",
      78500,
      9420,
      87920,
      "draft",
      "Urea 50kg",
      12,
      false,
      "Maharashtra",
    ),
  ];
}

/** @deprecated Use buildSalesInvoiceSeed() — kept for static analysis */
export const SALES_INVOICE_SEED: InvoiceRecord[] = buildSalesInvoiceSeed();



export function mergeSalesInvoiceSeed(records: InvoiceRecord[]): InvoiceRecord[] {
  const seed = buildSalesInvoiceSeed();
  const seedIds = new Set(seed.map((r) => r.id));
  const seedNos = new Set(seed.map((r) => r.invoiceNo));
  const rest = records.filter((r) => !seedIds.has(r.id) && !seedNos.has(r.invoiceNo));
  return [...seed, ...rest];
}


