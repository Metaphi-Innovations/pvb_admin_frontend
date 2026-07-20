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
import { getCostPriceBySku, resolveSku } from "@/lib/accounts/inventory-accounting-data";

export const SALES_INVOICE_SEED_VERSION = 10;



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
    (() => {
      const invoiceDate = demoDateAt(2);
      const nilLine = recalculateLineItem({
        id: "seed-nil-1",
        productId: 1,
        productName: "Dharitri Hybrid Corn Gold",
        description: "Vegetable seeds for sowing",
        hsn: "12099990",
        qty: 25,
        unit: "KG",
        unitPrice: 1200,
        discountPct: 0,
        taxPct: 0,
        amount: 0,
      });
      return {
        id: 106,
        invoiceNo: demoDocNo("INV", 6),
        invoiceType: "sales" as InvoiceDocumentType,
        invoiceDate,
        dueDate: invoiceDate,
        referenceNo: `SO-${y}-NIL-001`,
        remarks: "Nil-rated seed supply",
        customerId: 1,
        customerName: "ABC Agro Distributor",
        customerMobile: "",
        customerEmail: "",
        customerGst: "",
        customerGstCategory: "regular",
        billingAddress: "ABC Agro Distributor",
        lineItems: [nilLine],
        subtotal: nilLine.amount,
        discountTotal: 0,
        taxAmount: 0,
        grandTotal: nilLine.amount,
        amountReceived: 0,
        balanceAmount: nilLine.amount,
        salesOrderNo: `SO-${y}-NIL-001`,
        dispatchNo: `DSP-${y}-NIL-001`,
        sourceDispatchId: "seed-inv-106",
        branch: "Head Office",
        warehouse: "Central Warehouse",
        gstTreatment: "intrastate",
        placeOfSupply: "Maharashtra",
        state: "Maharashtra",
        invoiceStatus: "sent" as const,
        paymentStatus: "unpaid" as const,
        collections: [],
        attachments: [],
        activity: [
          {
            at: demoTimestamp(invoiceDate),
            action: "created",
            by: ACCOUNTS_CURRENT_USER,
            detail: "Nil-rated sales invoice created",
          },
        ],
        createdBy: ACCOUNTS_CURRENT_USER,
        updatedBy: ACCOUNTS_CURRENT_USER,
        createdAt: demoTimestamp(invoiceDate),
        updatedAt: demoTimestamp(invoiceDate),
      } satisfies InvoiceRecord;
    })(),
    (() => {
      const invoiceDate = demoDateAt(4);
      const taxableLine = recalculateLineItem({
        id: "seed-mix-tax",
        productId: null,
        productName: "Urea 50kg",
        description: "",
        hsn: "31021010",
        qty: 10,
        unit: "BAG",
        unitPrice: 1400,
        discountPct: 0,
        taxPct: 5,
        amount: 0,
      });
      const nilLine = recalculateLineItem({
        id: "seed-mix-nil",
        productId: 1,
        productName: "Dharitri Hybrid Corn Gold",
        description: "Nil-rated line on mixed invoice",
        hsn: "12099990",
        qty: 5,
        unit: "KG",
        unitPrice: 1000,
        discountPct: 0,
        taxPct: 0,
        amount: 0,
      });
      const ureaTaxable = Math.round(taxableLine.qty * taxableLine.unitPrice * 100) / 100;
      const ureaTax = Math.round(ureaTaxable * 0.05 * 100) / 100;
      return {
        id: 107,
        invoiceNo: demoDocNo("INV", 7),
        invoiceType: "sales" as InvoiceDocumentType,
        invoiceDate,
        dueDate: invoiceDate,
        referenceNo: `SO-${y}-MIX-001`,
        remarks: "Mixed taxable + nil-rated lines",
        customerId: 1,
        customerName: "ABC Agro Distributor",
        customerMobile: "",
        customerEmail: "",
        customerGst: "",
        customerGstCategory: "regular",
        billingAddress: "ABC Agro Distributor",
        lineItems: [taxableLine, nilLine],
        subtotal: ureaTaxable + nilLine.amount,
        discountTotal: 0,
        taxAmount: ureaTax,
        grandTotal: ureaTaxable + nilLine.amount + ureaTax,
        amountReceived: 0,
        balanceAmount: ureaTaxable + nilLine.amount + ureaTax,
        salesOrderNo: `SO-${y}-MIX-001`,
        dispatchNo: `DSP-${y}-MIX-001`,
        sourceDispatchId: "seed-inv-107",
        branch: "Head Office",
        warehouse: "Central Warehouse",
        gstTreatment: "intrastate",
        placeOfSupply: "Maharashtra",
        state: "Maharashtra",
        invoiceStatus: "sent" as const,
        paymentStatus: "unpaid" as const,
        collections: [],
        attachments: [],
        activity: [
          {
            at: demoTimestamp(invoiceDate),
            action: "created",
            by: ACCOUNTS_CURRENT_USER,
            detail: "Mixed invoice with nil-rated line",
          },
        ],
        createdBy: ACCOUNTS_CURRENT_USER,
        updatedBy: ACCOUNTS_CURRENT_USER,
        createdAt: demoTimestamp(invoiceDate),
        updatedAt: demoTimestamp(invoiceDate),
      } satisfies InvoiceRecord;
    })(),
    (() => {
      const invoiceDate = demoDateAt(6);
      const exemptLine = recalculateLineItem({
        id: "seed-exempt-1",
        productId: null,
        productName: "Farm Advisory Service",
        description: "Exempt agricultural extension service",
        hsn: "998611",
        qty: 1,
        unit: "Lot",
        unitPrice: 15000,
        discountPct: 0,
        taxPct: 0,
        amount: 0,
      });
      return {
        id: 108,
        invoiceNo: demoDocNo("INV", 8),
        invoiceType: "sales" as InvoiceDocumentType,
        invoiceDate,
        dueDate: invoiceDate,
        referenceNo: `SO-${y}-EX-001`,
        remarks: "Exempt supply",
        customerId: 4,
        customerName: "Green Harvest Agro",
        customerMobile: "",
        customerEmail: "",
        customerGst: "",
        customerGstCategory: "regular",
        billingAddress: "Green Harvest Agro",
        lineItems: [exemptLine],
        subtotal: exemptLine.amount,
        discountTotal: 0,
        taxAmount: 0,
        grandTotal: exemptLine.amount,
        amountReceived: 0,
        balanceAmount: exemptLine.amount,
        salesOrderNo: `SO-${y}-EX-001`,
        dispatchNo: `DSP-${y}-EX-001`,
        sourceDispatchId: "seed-inv-108",
        branch: "Head Office",
        warehouse: "Central Warehouse",
        gstTreatment: "exempt",
        placeOfSupply: "Maharashtra",
        state: "Maharashtra",
        invoiceStatus: "sent" as const,
        paymentStatus: "unpaid" as const,
        collections: [],
        attachments: [],
        activity: [
          {
            at: demoTimestamp(invoiceDate),
            action: "created",
            by: ACCOUNTS_CURRENT_USER,
            detail: "Exempt sales invoice created",
          },
        ],
        createdBy: ACCOUNTS_CURRENT_USER,
        updatedBy: ACCOUNTS_CURRENT_USER,
        createdAt: demoTimestamp(invoiceDate),
        updatedAt: demoTimestamp(invoiceDate),
      } satisfies InvoiceRecord;
    })(),
    (() => {
      const invoiceDate = demoDateAt(9);
      const nonGstLine = recalculateLineItem({
        id: "seed-nongst-1",
        productId: null,
        productName: "Petrol reimbursement",
        description: "Non-GST supply — petroleum",
        hsn: "271012",
        qty: 100,
        unit: "LTR",
        unitPrice: 100,
        discountPct: 0,
        taxPct: 0,
        amount: 0,
      });
      return {
        id: 109,
        invoiceNo: demoDocNo("INV", 9),
        invoiceType: "sales" as InvoiceDocumentType,
        invoiceDate,
        dueDate: invoiceDate,
        referenceNo: `SO-${y}-NG-001`,
        remarks: "Non-GST supply",
        customerId: 1,
        customerName: "ABC Agro Distributor",
        customerMobile: "",
        customerEmail: "",
        customerGst: "",
        customerGstCategory: "regular",
        billingAddress: "ABC Agro Distributor",
        lineItems: [nonGstLine],
        subtotal: nonGstLine.amount,
        discountTotal: 0,
        taxAmount: 0,
        grandTotal: nonGstLine.amount,
        amountReceived: 0,
        balanceAmount: nonGstLine.amount,
        salesOrderNo: `SO-${y}-NG-001`,
        dispatchNo: `DSP-${y}-NG-001`,
        sourceDispatchId: "seed-inv-109",
        branch: "Head Office",
        warehouse: "Central Warehouse",
        gstTreatment: "non-gst",
        placeOfSupply: "Maharashtra",
        state: "Maharashtra",
        invoiceStatus: "sent" as const,
        paymentStatus: "unpaid" as const,
        collections: [],
        attachments: [],
        activity: [
          {
            at: demoTimestamp(invoiceDate),
            action: "created",
            by: ACCOUNTS_CURRENT_USER,
            detail: "Non-GST sales invoice created",
          },
        ],
        createdBy: ACCOUNTS_CURRENT_USER,
        updatedBy: ACCOUNTS_CURRENT_USER,
        createdAt: demoTimestamp(invoiceDate),
        updatedAt: demoTimestamp(invoiceDate),
      } satisfies InvoiceRecord;
    })(),
    // Sample order invoices — distinct dispatch nos so Pending Invoices is unchanged
    buildSeedInvoice(
      110,
      demoDocNo("INV", 10),
      "sales",
      demoDateAt(2),
      "SM-2024-001",
      `DSP-SM-GEN-${y}-001`,
      "Rajesh Kumar (TM)",
      0,
      0,
      0,
      "sent",
      "Demo Sample Kit A",
      0,
      false,
      "Maharashtra",
    ),
    buildSeedInvoice(
      111,
      demoDocNo("INV", 11),
      "sales",
      demoDateAt(4),
      "SMP-2024-003",
      `DSP-SM-GEN-${y}-002`,
      "Vikram Das (Intern)",
      0,
      0,
      0,
      "sent",
      "Training Sample Pack",
      0,
      false,
      "Maharashtra",
    ),
    buildSeedInvoice(
      112,
      demoDocNo("INV", 12),
      "sales",
      demoDateAt(6),
      "SM-2024-004",
      `DSP-SM-GEN-${y}-003`,
      "Priya Singh (ASM)",
      0,
      0,
      0,
      "sent",
      "Event Display Samples",
      0,
      false,
      "Maharashtra",
    ),
    (() => {
      const invoiceDate = demoDateAt(1);
      const svcLine = recalculateLineItem({
        id: "seed-svc-1",
        productId: null,
        productName: "Field Advisory Service",
        description: "Monthly agri advisory retainer",
        hsn: "998314",
        qty: 1,
        unit: "Job",
        unitPrice: 15000,
        discountPct: 0,
        taxPct: 18,
        amount: 0,
      });
      return {
        id: 113,
        invoiceNo: `SVC/${y}-${String(1).padStart(4, "0")}`,
        invoiceType: "sales" as InvoiceDocumentType,
        invoiceDate,
        dueDate: invoiceDate,
        referenceNo: `SVC-REF-${y}-001`,
        remarks: "Service invoice demo",
        customerId: 1,
        customerName: "ABC Agro Distributor",
        customerMobile: "",
        customerEmail: "",
        customerGst: "27AABCT1234F1ZA",
        customerGstCategory: "regular",
        billingAddress: "ABC Agro Distributor",
        lineItems: [svcLine],
        subtotal: 15000,
        discountTotal: 0,
        taxAmount: 2700,
        grandTotal: 17700,
        amountReceived: 0,
        balanceAmount: 17700,
        salesOrderNo: "",
        dispatchNo: "",
        sourceType: "service" as const,
        branch: "Head Office",
        warehouse: "",
        gstTreatment: "intrastate",
        placeOfSupply: "Maharashtra",
        state: "Maharashtra",
        invoiceStatus: "sent" as const,
        paymentStatus: "unpaid" as const,
        collections: [],
        attachments: [],
        activity: [
          {
            at: demoTimestamp(invoiceDate),
            action: "created",
            by: ACCOUNTS_CURRENT_USER,
            detail: "Service invoice created",
          },
        ],
        createdBy: ACCOUNTS_CURRENT_USER,
        updatedBy: ACCOUNTS_CURRENT_USER,
        createdAt: demoTimestamp(invoiceDate),
        updatedAt: demoTimestamp(invoiceDate),
        eInvoiceStatus: "generated" as const,
        eInvoiceNo: `EINV-SVC-${y}-0001`,
        irn: `IRN-SVC-${y}-DEMO-0001`,
        acknowledgementNo: `ACK-SVC-${y}-01`,
        acknowledgementDate: invoiceDate,
        eInvoiceGeneratedAt: demoTimestamp(invoiceDate),
        qrCodeAvailable: true,
        ewayBillStatus: "not_applicable" as const,
      } satisfies InvoiceRecord;
    })(),
  ].map(applyStatutoryDemoFields);
}

function applyStatutoryDemoFields(inv: InvoiceRecord): InvoiceRecord {
  const ts = inv.createdAt || demoTimestamp(inv.invoiceDate);
  const byId: Record<number, Partial<InvoiceRecord>> = {
    101: {
      sourceType: "sales_order",
      customerGst: "27AABCU9603R1ZX",
      billingAddress: "Reliance Agri, Plot 12, MIDC, Pune, Maharashtra 411019",
      shippingAddress: "Reliance Agri Warehouse, Pune, Maharashtra 411019",
      eInvoiceStatus: "generated",
      eInvoiceNo: "EINV-2026-000101",
      irn: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
      acknowledgementNo: "ACK-101-2026",
      acknowledgementDate: inv.invoiceDate,
      eInvoiceGeneratedAt: ts,
      qrCodeAvailable: true,
      ewayBillStatus: "generated",
      ewayBillNo: "EWB381234567890",
      ewayBillGeneratedAt: ts,
      ewayBillExpiryDate: inv.invoiceDate,
      vehicleNo: "MH-12-AB-1234",
      transporterName: "Blue Dart Logistics",
      transportMode: "Road",
      productDiscountTurnoverEligible: false,
      productDiscountExclusionReason:
        "Transactions under Monsoon Offer are excluded from Annual Turnover Scheme",
    },
    102: {
      sourceType: "sales_order",
      eInvoiceStatus: "generated",
      eInvoiceNo: "EINV-2026-000102",
      irn: "b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567a",
      acknowledgementNo: "ACK-102-2026",
      acknowledgementDate: inv.invoiceDate,
      eInvoiceGeneratedAt: ts,
      qrCodeAvailable: true,
      ewayBillStatus: "not_generated",
    },
    103: {
      sourceType: "sales_order",
      eInvoiceStatus: "failed",
      eInvoiceGeneratedAt: ts,
      ewayBillStatus: "not_generated",
    },
    104: {
      sourceType: "stock_transfer",
      eInvoiceStatus: "cancelled",
      eInvoiceNo: "EINV-STI-000104",
      irn: "cancelled-irn-104",
      acknowledgementNo: "ACK-104",
      acknowledgementDate: inv.invoiceDate,
      eInvoiceGeneratedAt: ts,
      eInvoiceCancelledAt: ts,
      eInvoiceCancelledReason: "Incorrect destination GSTIN",
      qrCodeAvailable: false,
      ewayBillStatus: "cancelled",
      ewayBillNo: "EWB381111111111",
      ewayBillGeneratedAt: ts,
      ewayBillExpiryDate: inv.invoiceDate,
      ewayBillCancelledAt: ts,
      ewayBillCancelledReason: "Vehicle changed — regenerate required",
      vehicleNo: "GJ-01-ST-4401",
      transporterName: "Gati Express",
      transportMode: "Road",
    },
    105: {
      sourceType: "stock_transfer",
      eInvoiceStatus: "not_generated",
      ewayBillStatus: "expired",
      ewayBillNo: "EWB389999999999",
      ewayBillGeneratedAt: ts,
      ewayBillExpiryDate: demoDateAt(30),
      vehicleNo: "MH-14-ST-7707",
      transporterName: "VRL Logistics",
      transportMode: "Road",
    },
    106: {
      sourceType: "sales_order",
      eInvoiceStatus: "not_generated",
      ewayBillStatus: "failed",
    },
    110: {
      sourceType: "sample_order",
      eInvoiceStatus: "not_applicable",
      ewayBillStatus: "not_applicable",
      documentType: "proforma_invoice",
      invoiceType: "sample_order",
    },
    111: {
      sourceType: "sample_order",
      eInvoiceStatus: "not_applicable",
      ewayBillStatus: "not_applicable",
      documentType: "proforma_invoice",
      invoiceType: "sample_order",
    },
    112: {
      sourceType: "sample_order",
      eInvoiceStatus: "not_applicable",
      ewayBillStatus: "not_applicable",
      documentType: "proforma_invoice",
      invoiceType: "sample_order",
    },
  };

  const patch = byId[inv.id];
  if (!patch) {
    return {
      ...inv,
      eInvoiceStatus: inv.eInvoiceStatus ?? "not_generated",
      ewayBillStatus: inv.ewayBillStatus ?? "not_generated",
    };
  }
  const merged: InvoiceRecord = { ...inv, ...patch };
  if (merged.id === 101) {
    return {
      ...merged,
      customerGst: merged.customerGst?.trim() || "27AABCU9603R1ZX",
      lineItems: merged.lineItems.map((l) => ({
        ...l,
        productId: l.productId ?? 5,
        productCode: l.productCode?.trim() || "FERT-000002",
        hsn: l.hsn?.trim() || "3102",
        batchNo: l.batchNo?.trim() || "UREA-B-2026-01",
        manufacturingDate: l.manufacturingDate || "2025-11-01",
        expiryDate: l.expiryDate || "2027-10-31",
        qtyInCase: l.qtyInCase ?? 50,
        unit: l.unit || "Bag",
        salesperson: l.salesperson?.trim() || "Rajesh Kumar",
        schemeApplied: "Yes" as const,
        schemeCode: "SCH-MON-001",
        schemeName: "Monsoon Product Offer",
        schemeDiscountType: "Percentage" as const,
        schemeDiscountPercent:
          l.schemeDiscountPercent != null && l.schemeDiscountPercent > 0
            ? l.schemeDiscountPercent
            : l.discountPct > 0
              ? l.discountPct
              : 5,
        /** Keep stored discountPct / totals unchanged; view derives display amount from scheme %. */
      })),
    };
  }
  if (
    merged.sourceType === "sample_order" ||
    merged.invoiceType === "sample_order"
  ) {
    return {
      ...merged,
      paymentStatus: "paid",
      grandTotal: 0,
      balanceAmount: 0,
      taxAmount: 0,
      subtotal: 0,
      lineItems: merged.lineItems.map((l) => {
        const sku = resolveSku(l.productName, l.productCode);
        const costPrice =
          typeof l.costPrice === "number" && l.costPrice > 0
            ? l.costPrice
            : getCostPriceBySku(sku, l.productName);
        return {
          ...l,
          unitPrice: 0,
          amount: 0,
          discountPct: l.discountPct > 0 ? l.discountPct : 100,
          costPrice,
          cpMissing: !(costPrice > 0),
          costPriceSource: costPrice > 0 ? `Pricing Master · ${sku} · CP` : "Pricing Master (not found)",
        };
      }),
    };
  }
  return merged;
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


