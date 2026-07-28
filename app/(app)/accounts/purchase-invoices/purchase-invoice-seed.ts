import { demoDateAt } from "@/lib/accounts/demo-date-utils";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { getActiveVendors } from "@/app/(app)/masters/vendors/vendor-data";
import type {
  PurchaseInvoiceLine,
  PurchaseInvoiceLineQtyComparison,
  PurchaseInvoiceMatchStatus,
  PurchaseInvoiceOcrPayload,
  PurchaseInvoiceRecord,
} from "./purchase-invoices-data";
import {
  ensurePurchaseInvoiceDemoCompanionData,
  ensurePurchaseInvoiceDemoDebitNotes,
} from "./purchase-invoice-demo-companion";
import { mergeDirectPurchaseDemoScenarios } from "./purchase-invoice-direct-seed";
import { pruneStalePurchaseInvoiceDemos } from "./purchase-invoice-demo-constants";

type DemoLineSpec = {
  name: string;
  batchNumber: string;
  unit: string;
  rate: number;
  taxPct: number;
  /** Supplier invoice qty (OCR) */
  invoiceQty: number;
  comparison: PurchaseInvoiceLineQtyComparison;
};

type DemoScenarioSpec = {
  id: number;
  invoiceNo: string;
  scenarioLabel: string;
  vendorId: number;
  invoiceDate: string;
  grnId: string;
  grnNo: string;
  poId: number;
  poNumber: string;
  poDate: string;
  qcId: string;
  qcNo: string;
  vendorInvoiceNo: string;
  supplierInvoiceId?: string | null;
  ocrPayload?: PurchaseInvoiceOcrPayload | null;
  invoiceMatchStatus: PurchaseInvoiceMatchStatus;
  hasQuantityMismatch: boolean;
  pendingDebitNoteId?: number | null;
  pendingDebitNoteNo?: string;
  amountPaid: number;
  lines: DemoLineSpec[];
};

const DEMO_SCENARIOS: DemoScenarioSpec[] = [
  {
    id: 1,
    invoiceNo: "PUR-DEMO-001",
    scenarioLabel: "Fully Matched",
    vendorId: 1,
    invoiceDate: demoDateAt(0),
    grnId: "demo-pi-grn-1",
    grnNo: "GRN-DEMO-001",
    poId: 9001,
    poNumber: "PO-DEMO-001",
    poDate: demoDateAt(-5),
    qcId: "demo-qc-pi-1",
    qcNo: "QC-DEMO-001",
    vendorInvoiceNo: "AC/DEMO/MATCH-001",
    invoiceMatchStatus: "matched",
    hasQuantityMismatch: false,
    amountPaid: 94400,
    lines: [
      {
        name: "Urea 50kg",
        batchNumber: "BURA-D01",
        unit: "BAG",
        rate: 1400,
        taxPct: 18,
        invoiceQty: 400,
        comparison: { supplierInvoiceQty: 400, grnReceivedQty: 400, qcAcceptedQty: 400, qcRejectedQty: 0, shortQty: 0 },
      },
      {
        name: "DAP 50kg",
        batchNumber: "BDAP-D01",
        unit: "BAG",
        rate: 1850,
        taxPct: 18,
        invoiceQty: 200,
        comparison: { supplierInvoiceQty: 200, grnReceivedQty: 200, qcAcceptedQty: 200, qcRejectedQty: 0, shortQty: 0 },
      },
    ],
  },
  {
    id: 2,
    invoiceNo: "PUR-DEMO-002",
    scenarioLabel: "Quantity Mismatch",
    vendorId: 2,
    invoiceDate: demoDateAt(1),
    grnId: "demo-pi-grn-2",
    grnNo: "GRN-DEMO-002",
    poId: 9002,
    poNumber: "PO-DEMO-002",
    poDate: demoDateAt(-4),
    qcId: "demo-qc-pi-2",
    qcNo: "QC-DEMO-002",
    vendorInvoiceNo: "GF/DEMO/SHORT-002",
    invoiceMatchStatus: "debit_note_pending",
    hasQuantityMismatch: true,
    pendingDebitNoteId: 901,
    pendingDebitNoteNo: "DN-DEMO-PEND-001",
    amountPaid: 0,
    lines: [
      {
        name: "NPK 10:26:26",
        batchNumber: "BNPK-D02",
        unit: "BAG",
        rate: 1600,
        taxPct: 18,
        invoiceQty: 250,
        comparison: { supplierInvoiceQty: 250, grnReceivedQty: 230, qcAcceptedQty: 230, qcRejectedQty: 0, shortQty: 20 },
      },
    ],
  },
];

function buildLineItems(spec: DemoScenarioSpec): PurchaseInvoiceLine[] {
  return spec.lines.map((l, i) => {
    const lineAmount = Math.round(l.invoiceQty * l.rate * 100) / 100;
    const taxAmount = Math.round(lineAmount * l.taxPct) / 100;
    return {
      id: `pur-demo-line-${spec.id}-${i}`,
      productId: null,
      productName: l.name,
      description: `Batch: ${l.batchNumber}`,
      batchNumber: l.batchNumber,
      invoiceQty: l.invoiceQty,
      unit: l.unit,
      unitPrice: l.rate,
      taxPct: l.taxPct,
      lineAmount,
      taxAmount,
      debitedQty: 0,
      debitedAmount: 0,
      qtyComparison: l.comparison,
    };
  });
}

function buildScenarioRecord(spec: DemoScenarioSpec, vendorName: string, vendorGst: string): PurchaseInvoiceRecord {
  const lineItems = buildLineItems(spec);
  const productAmount = lineItems.reduce((s, l) => s + l.lineAmount, 0);
  const taxAmount = lineItems.reduce((s, l) => s + l.taxAmount, 0);
  const grandTotal = productAmount + taxAmount;

  const mismatchNote = spec.hasQuantityMismatch
    ? `${spec.scenarioLabel} — supplier invoice retained; pending debit note ${spec.pendingDebitNoteNo ?? ""}`
    : undefined;

  return {
    id: spec.id,
    invoiceNo: spec.invoiceNo,
    invoiceDate: spec.invoiceDate,
    vendorInvoiceNo: spec.vendorInvoiceNo,
    vendorId: spec.vendorId,
    vendorName,
    vendorGst,
    poId: spec.poId,
    poNumber: spec.poNumber,
    poDate: spec.poDate,
    grnId: spec.grnId,
    grnNo: spec.grnNo,
    qcId: spec.qcId,
    qcNo: spec.qcNo,
    supplierInvoiceId: spec.supplierInvoiceId ?? null,
    ocrPayload: spec.ocrPayload ?? null,
    warehouse: spec.id === 2 ? "North Zone Hub" : "Central Warehouse",
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
    invoiceMatchStatus: spec.invoiceMatchStatus,
    hasQuantityMismatch: spec.hasQuantityMismatch,
    pendingDebitNoteId: spec.pendingDebitNoteId ?? null,
    pendingDebitNoteNo: spec.pendingDebitNoteNo ?? "",
    remarks: `[Demo] ${spec.scenarioLabel} — PO ${spec.poNumber} · GRN ${spec.grnNo} · QC ${spec.qcNo}`,
    attachment: null,
    activity: [
      {
        date: spec.invoiceDate,
        action: "Demo Invoice Seeded",
        by: ACCOUNTS_CURRENT_USER,
        remarks: spec.scenarioLabel,
      },
      ...(spec.pendingDebitNoteNo
        ? [
            {
              date: spec.invoiceDate,
              action: "Pending Debit Note Created",
              by: ACCOUNTS_CURRENT_USER,
              remarks: `${spec.pendingDebitNoteNo} — Pending Confirmation`,
            },
          ]
        : []),
      ...(mismatchNote
        ? [
            {
              date: spec.invoiceDate,
              action: "Quantity Mismatch Detected",
              by: "System",
              remarks: mismatchNote,
            },
          ]
        : []),
    ],
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: `${spec.invoiceDate}T09:00:00.000Z`,
    updatedAt: `${spec.invoiceDate}T09:00:00.000Z`,
  };
}

/**
 * Merge demo scenarios into existing storage (dev/test).
 * Adds any missing PUR-DEMO-* GRN invoices so listing is never empty in dev.
 */
export function mergePurchaseInvoiceDemoScenarios(
  existing: PurchaseInvoiceRecord[],
): PurchaseInvoiceRecord[] {
  const pruned = pruneStalePurchaseInvoiceDemos(existing);

  if (typeof window !== "undefined") {
    ensurePurchaseInvoiceDemoCompanionData();
  }

  const vendors = getActiveVendors();
  const demos = DEMO_SCENARIOS.map((spec) => {
    const vendor = vendors.find((v) => v.id === spec.vendorId);
    return buildScenarioRecord(
      spec,
      vendor?.vendorName ?? `Supplier ${spec.vendorId}`,
      vendor?.gstNumber ?? "",
    );
  });

  const existingNos = new Set(pruned.map((i) => i.invoiceNo));
  const missing = demos.filter((d) => !existingNos.has(d.invoiceNo));

  if (missing.length === 0) {
    return mergeDirectPurchaseDemoScenarios(pruned);
  }

  if (typeof window !== "undefined") {
    ensurePurchaseInvoiceDemoDebitNotes(demos);
  }

  const legacySeedNos = new Set(["PUR-2026-001", "PUR-2026-002", "PUR-2026-003", "PUR-2026-004", "PUR-2026-005"]);
  const missingIds = new Set(missing.map((d) => d.id));
  const kept = pruned.filter(
    (i) => !legacySeedNos.has(i.invoiceNo) && !missingIds.has(i.id),
  );
  return mergeDirectPurchaseDemoScenarios([...kept, ...missing]);
}

/** Labels for dev reference — exported for optional UI hints. */
export const PURCHASE_INVOICE_DEMO_SCENARIO_LABELS: Record<number, string> = Object.fromEntries(
  DEMO_SCENARIOS.map((s) => [s.id, s.scenarioLabel]),
);

/**
 * Bootstrap slim demo purchase invoices for dev/UI testing (2 GRN + 1 direct).
 */
export function buildPurchaseInvoiceSeedRecords(): PurchaseInvoiceRecord[] {
  return mergePurchaseInvoiceDemoScenarios([]);
}
