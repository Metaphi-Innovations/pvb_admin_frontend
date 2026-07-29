/**
 * Dev/test companion data for Purchase Invoice demo scenarios.
 * Merges linked GRN, QC and draft debit-note records into localStorage
 * so scenarios can be tested without running PO → GRN → QC flow.
 */
import type { GrnRecord } from "@/app/(app)/warehouse/grn/types";
import type { QcRecord } from "@/app/(app)/warehouse/qc/types";
import type { DebitNoteRecord } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { demoDateAt, demoTimestamp } from "@/lib/accounts/demo-date-utils";
import type { PurchaseInvoiceRecord } from "./purchase-invoices-data";

const GRN_STORAGE_KEY = "ds_grn_records_v3";
const QC_STORAGE_KEY = "ds_qc_records_v4";
const DEBIT_STORAGE_KEY = "ds_accounts_debit_notes_v3";
const COMPANION_FLAG = "ds_pi_demo_companion_v2";

const REMOVED_PI_DEMO_GRN_IDS = new Set([
  "demo-pi-grn-3",
  "demo-pi-grn-4",
  "demo-pi-grn-5",
]);

const REMOVED_PI_DEMO_QC_IDS = new Set([
  "demo-qc-pi-3",
  "demo-qc-pi-4",
  "demo-qc-pi-5",
]);

export const PI_DEMO_GRN_IDS = ["demo-pi-grn-1", "demo-pi-grn-2"] as const;

/** GRN records aligned to the 2 PI demo scenarios. */
export function buildPiDemoGrnRecords(): GrnRecord[] {
  return [
    {
      id: "demo-pi-grn-1",
      grnNo: "GRN-DEMO-001",
      poNumber: "PO-DEMO-001",
      poId: 9001,
      vendorName: "AgroChem Traders",
      warehouse: "Central Warehouse",
      grnDate: demoDateAt(0),
      totalProducts: 2,
      totalQty: 600,
      status: "qc_completed",
      supplierInvoices: [{ id: "si-d1", fileName: "AC_MATCH_001.pdf", uploadedAt: demoDateAt(0) }],
      ocrExtractedInvoices: [],
      ocrExtractionCompleted: false,
      items: [
        { productId: "10", productName: "Urea 50kg", productCode: "FER-UR-001", orderedQty: 400, receivedQty: 400, unit: "BAG", batchNumber: "BURA-D01" },
        { productId: "11", productName: "DAP 50kg", productCode: "FER-DAP-004", orderedQty: 200, receivedQty: 200, unit: "BAG", batchNumber: "BDAP-D01" },
      ],
      batches: [
        { productId: "10", productName: "Urea 50kg", productCode: "FER-UR-001", batchNumber: "BURA-D01", mfgDate: "2026-02-01", expDate: "2028-02-01", quantity: 400, invoiceQty: 400, unitPrice: 1400, gstPct: 18 },
        { productId: "11", productName: "DAP 50kg", productCode: "FER-DAP-004", batchNumber: "BDAP-D01", mfgDate: "2026-02-15", expDate: "2028-02-15", quantity: 200, invoiceQty: 200, unitPrice: 1850, gstPct: 18 },
      ],
      createdBy: "Admin",
    },
    {
      id: "demo-pi-grn-2",
      grnNo: "GRN-DEMO-002",
      poNumber: "PO-DEMO-002",
      poId: 9002,
      vendorName: "GreenField Suppliers",
      warehouse: "North Zone Hub",
      grnDate: demoDateAt(1),
      totalProducts: 1,
      totalQty: 230,
      status: "qc_completed",
      supplierInvoices: [{ id: "si-d2", fileName: "GF_SHORT_002.pdf", uploadedAt: demoDateAt(1) }],
      ocrExtractedInvoices: [],
      ocrExtractionCompleted: false,
      items: [
        { productId: "12", productName: "NPK 10:26:26", productCode: "FER-NPK-002", orderedQty: 250, receivedQty: 230, unit: "BAG", batchNumber: "BNPK-D02" },
      ],
      batches: [
        { productId: "12", productName: "NPK 10:26:26", productCode: "FER-NPK-002", batchNumber: "BNPK-D02", mfgDate: "2026-03-01", expDate: "2028-03-01", quantity: 230, invoiceQty: 250, unitPrice: 1600, gstPct: 18 },
      ],
      createdBy: "Admin",
    },
  ];
}

export function buildPiDemoQcRecords(): QcRecord[] {
  return [
    {
      id: "demo-qc-pi-1",
      qcNo: "QC-DEMO-001",
      grnId: "demo-pi-grn-1",
      grnNo: "GRN-DEMO-001",
      poNumber: "PO-DEMO-001",
      vendorName: "AgroChem Traders",
      warehouse: "Central Warehouse",
      inspectionDate: demoDateAt(0),
      totalReceivedQty: 600,
      totalAcceptedQty: 600,
      totalRejectedQty: 0,
      totalHoldQty: 0,
      status: "completed",
      qcResult: "passed",
      items: [
        { productId: "10", productName: "Urea 50kg", productCode: "FER-UR-001", batchNumber: "BURA-D01", receivedQty: 400, acceptedQty: 400, rejectedQty: 0, holdQty: 0, qcResult: "passed" },
        { productId: "11", productName: "DAP 50kg", productCode: "FER-DAP-004", batchNumber: "BDAP-D01", receivedQty: 200, acceptedQty: 200, rejectedQty: 0, holdQty: 0, qcResult: "passed" },
      ],
    },
    {
      id: "demo-qc-pi-2",
      qcNo: "QC-DEMO-002",
      grnId: "demo-pi-grn-2",
      grnNo: "GRN-DEMO-002",
      poNumber: "PO-DEMO-002",
      vendorName: "GreenField Suppliers",
      warehouse: "North Zone Hub",
      inspectionDate: demoDateAt(1),
      totalReceivedQty: 230,
      totalAcceptedQty: 230,
      totalRejectedQty: 0,
      totalHoldQty: 0,
      status: "completed",
      qcResult: "passed",
      items: [
        { productId: "12", productName: "NPK 10:26:26", productCode: "FER-NPK-002", batchNumber: "BNPK-D02", receivedQty: 230, acceptedQty: 230, rejectedQty: 0, holdQty: 0, qcResult: "passed" },
      ],
    },
  ];
}

function mergeById<T extends { id: string }>(stored: T[], incoming: T[]): T[] {
  const map = new Map(stored.map((r) => [r.id, r]));
  for (const row of incoming) map.set(row.id, row);
  return Array.from(map.values());
}

/** Merge demo GRN + QC records into warehouse localStorage (idempotent). */
export function ensurePurchaseInvoiceDemoCompanionData(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(COMPANION_FLAG) === "2") return;

  try {
    const grns = buildPiDemoGrnRecords();
    const qcs = buildPiDemoQcRecords();

    const grnRaw = localStorage.getItem(GRN_STORAGE_KEY);
    const grnStored: GrnRecord[] = grnRaw ? JSON.parse(grnRaw) : [];
    const grnPruned = grnStored.filter((g) => !REMOVED_PI_DEMO_GRN_IDS.has(g.id));
    localStorage.setItem(GRN_STORAGE_KEY, JSON.stringify(mergeById(grnPruned, grns)));

    const qcRaw = localStorage.getItem(QC_STORAGE_KEY);
    const qcStored: QcRecord[] = qcRaw ? JSON.parse(qcRaw) : [];
    const qcPruned = qcStored.filter((q) => !REMOVED_PI_DEMO_QC_IDS.has(q.id));
    localStorage.setItem(QC_STORAGE_KEY, JSON.stringify(mergeById(qcPruned, qcs)));

    localStorage.removeItem("ds_pi_demo_companion_v1");
    localStorage.setItem(COMPANION_FLAG, "2");
  } catch {
    /* demo bootstrap — non-fatal */
  }
}

/** Draft debit note for the quantity-mismatch scenario (id 901). */
export function buildPiDemoPendingDebitNotes(
  invoices: PurchaseInvoiceRecord[],
): DebitNoteRecord[] {
  const inv2 = invoices.find((i) => i.id === 2);
  if (!inv2) return [];

  const d2 = demoDateAt(1);

  return [
    {
      id: 901,
      debitNoteNo: "DN-DEMO-PEND-001",
      debitNoteDate: d2,
      againstType: "purchase_invoice",
      source: "manual",
      sourceInvoiceId: 2,
      sourceInvoiceNo: inv2.invoiceNo,
      sourcePoId: 9002,
      sourcePoNo: "PO-DEMO-002",
      sourceGrnNo: "GRN-DEMO-002",
      sourceQcNo: "QC-DEMO-002",
      vendorId: inv2.vendorId,
      vendorName: inv2.vendorName,
      originalAmount: inv2.grandTotal,
      alreadyAdjustedAmount: 0,
      taxableAmount: 27119,
      gstAmount: 4881,
      cgstAmount: 2440.5,
      sgstAmount: 2440.5,
      igstAmount: 0,
      currentDebitAmount: 32000,
      balanceAfterAdjustment: inv2.grandTotal - 32000,
      standaloneDebitAmount: 0,
      lineItems: [
        {
          id: "dnl-demo-2-1",
          sourceLineId: inv2.lineItems[0]?.id ?? "pur-demo-line-2-0",
          productName: "NPK 10:26:26",
          batchNo: "BNPK-D02",
          invoiceQty: 250,
          eligibleReturnQty: 20,
          uom: "BAG",
          unitPrice: 1600,
          discountPct: 0,
          taxPct: 18,
          gstAmount: 5760,
          lineAmount: 32000,
          returnQty: 20,
          debitAmount: 32000,
          lineRemarks: "Short: 20, QC Rejected: 0",
        },
      ],
      reason: "Purchase Return Adjustment",
      remarks: "Pending Confirmation — demo short receipt scenario. Review and Post or Cancel.",
      attachments: [],
      status: "draft",
      warehouse: inv2.warehouse,
      activity: [
        { at: demoTimestamp(d2, "10:00:00"), action: "created", by: ACCOUNTS_CURRENT_USER, detail: "Demo pending debit note — short receipt" },
      ],
      createdBy: ACCOUNTS_CURRENT_USER,
      updatedBy: ACCOUNTS_CURRENT_USER,
      createdAt: demoTimestamp(d2, "10:00:00"),
      updatedAt: demoTimestamp(d2, "10:00:00"),
    },
  ];
}

export function ensurePurchaseInvoiceDemoDebitNotes(invoices: PurchaseInvoiceRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    const pending = buildPiDemoPendingDebitNotes(invoices);
    const raw = localStorage.getItem(DEBIT_STORAGE_KEY);
    const stored: DebitNoteRecord[] = raw ? JSON.parse(raw) : [];
    const pruned = stored.filter((r) => r.id !== 902 && r.id !== 903);
    if (!pending.length) {
      localStorage.setItem(DEBIT_STORAGE_KEY, JSON.stringify(pruned));
      return;
    }
    const ids = new Set(pending.map((p) => p.id));
    const merged = [...pruned.filter((r) => !ids.has(r.id)), ...pending];
    localStorage.setItem(DEBIT_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    /* demo bootstrap — non-fatal */
  }
}

/** Reset companion flag — for dev re-seed (call from console). */
export function resetPurchaseInvoiceDemoCompanionFlag(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(COMPANION_FLAG);
  }
}
