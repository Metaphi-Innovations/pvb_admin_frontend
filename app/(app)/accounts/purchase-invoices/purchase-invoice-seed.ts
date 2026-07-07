import { demoAddDays, demoDateAt, demoFinancialYearStart, demoToday, demoTimestamp } from "@/lib/accounts/demo-date-utils";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { getActiveVendors } from "@/app/(app)/masters/vendors/vendor-data";
import type { PurchaseInvoiceRecord } from "./purchase-invoices-data";

const SEED_SPECS: Array<{
  id: number;
  invoiceNo: string;
  vendorId: number;
  invoiceDate: string;
  grnId: string;
  grnNo: string;
  vendorInvoiceNo: string;
  amountPaid: number;
  lines: Array<{ name: string; qty: number; unit: string; rate: number; taxPct: number }>;
}> = [
  {
    id: 1,
    invoiceNo: "PUR-2026-001",
    vendorId: 1,
    invoiceDate: demoDateAt(0),
    grnId: "demo-grn-1",
    grnNo: "GRN-001",
    vendorInvoiceNo: "AC/26/INV-101",
    amountPaid: 94400,
    lines: [
      { name: "Urea 50kg", qty: 400, unit: "BAG", rate: 1400, taxPct: 18 },
      { name: "DAP 50kg", qty: 200, unit: "BAG", rate: 1850, taxPct: 18 },
    ],
  },
  {
    id: 2,
    invoiceNo: "PUR-2026-002",
    vendorId: 2,
    invoiceDate: demoDateAt(1),
    grnId: "demo-grn-2",
    grnNo: "GRN-002",
    vendorInvoiceNo: "GF/INV/2026/055",
    amountPaid: 0,
    lines: [
      { name: "NPK 10:26:26", qty: 250, unit: "BAG", rate: 1600, taxPct: 18 },
      { name: "Pesticide - Chlorpyrifos 20EC", qty: 100, unit: "LTR", rate: 850, taxPct: 18 },
    ],
  },
  {
    id: 3,
    invoiceNo: "PUR-2026-003",
    vendorId: 3,
    invoiceDate: demoDateAt(2),
    grnId: "demo-grn-3",
    grnNo: "GRN-003",
    vendorInvoiceNo: "BF/2026/77A",
    amountPaid: 70000,
    lines: [
      { name: "Zinc Sulphate 21%", qty: 200, unit: "KG", rate: 250, taxPct: 18 },
      { name: "Hybrid Maize Seed 1kg", qty: 300, unit: "PKT", rate: 220, taxPct: 12 },
    ],
  },
  {
    id: 4,
    invoiceNo: "PUR-2026-004",
    vendorId: 4,
    invoiceDate: demoDateAt(3),
    grnId: "demo-grn-4",
    grnNo: "GRN-004",
    vendorInvoiceNo: "KIP/26/INV-033",
    amountPaid: 0,
    lines: [
      { name: "Bio Stimulant - Humic Acid", qty: 150, unit: "LTR", rate: 900, taxPct: 18 },
      { name: "Micronutrient Mix Powder", qty: 250, unit: "KG", rate: 320, taxPct: 18 },
    ],
  },
  {
    id: 5,
    invoiceNo: "PUR-2026-005",
    vendorId: 5,
    invoiceDate: demoDateAt(4),
    grnId: "demo-grn-5",
    grnNo: "GRN-005",
    vendorInvoiceNo: "CCI/26/19B",
    amountPaid: 35000,
    lines: [
      { name: "Imidacloprid 17.8% SL", qty: 120, unit: "LTR", rate: 1100, taxPct: 18 },
      { name: "Mancozeb 75% WP", qty: 180, unit: "KG", rate: 450, taxPct: 18 },
    ],
  },
];

function buildSeedRecord(
  spec: (typeof SEED_SPECS)[number],
  vendorName: string,
  vendorGst: string,
): PurchaseInvoiceRecord {
  const lineItems = spec.lines.map((l, i) => {
    const lineAmount = Math.round(l.qty * l.rate * 100) / 100;
    const taxAmount = Math.round(lineAmount * l.taxPct) / 100;
    return {
      id: `pur-seed-line-${spec.id}-${i}`,
      productId: null,
      productName: l.name,
      description: `GRN: ${spec.grnNo}`,
      invoiceQty: l.qty,
      unit: l.unit,
      unitPrice: l.rate,
      taxPct: l.taxPct,
      lineAmount,
      taxAmount,
      debitedQty: 0,
      debitedAmount: 0,
    };
  });
  const productAmount = lineItems.reduce((s, l) => s + l.lineAmount, 0);
  const taxAmount = lineItems.reduce((s, l) => s + l.taxAmount, 0);
  const grandTotal = productAmount + taxAmount;

  return {
    id: spec.id,
    invoiceNo: spec.invoiceNo,
    invoiceDate: spec.invoiceDate,
    vendorInvoiceNo: spec.vendorInvoiceNo,
    vendorId: spec.vendorId,
    vendorName,
    vendorGst,
    poId: null,
    poNumber: "",
    poDate: "",
    grnId: spec.grnId,
    grnNo: spec.grnNo,
    source: "po_invoice",
    lineItems,
    additionalCharges: [],
    productAmount,
    subtotal: productAmount,
    taxAmount,
    grandTotal,
    amountPaid: spec.amountPaid,
    amountDebited: 0,
    balanceDebitAllowed: grandTotal,
    debitStatus: "no_debit",
    poAdjustmentStatus: "open",
    remarks: `GRN-linked purchase invoice — ${spec.grnNo}`,
    attachment: null,
    activity: [
      {
        date: spec.invoiceDate,
        action: "Invoice Created from GRN",
        by: ACCOUNTS_CURRENT_USER,
        remarks: spec.grnNo,
      },
    ],
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: `${spec.invoiceDate}T09:00:00.000Z`,
    updatedAt: `${spec.invoiceDate}T09:00:00.000Z`,
  };
}

/** Bootstrap GRN-linked purchase invoices when storage is empty. */
export function buildPurchaseInvoiceSeedRecords(): PurchaseInvoiceRecord[] {
  const vendors = getActiveVendors();
  return SEED_SPECS.map((spec) => {
    const vendor = vendors.find((v) => v.id === spec.vendorId);
    return buildSeedRecord(
      spec,
      vendor?.vendorName ?? `Supplier ${spec.vendorId}`,
      vendor?.gstNumber ?? "",
    );
  });
}
