/**
 * Read-only data exposure for Procurement / Accounts modules.
 * Warehouse does NOT perform matching — only exposes facts for downstream consumption.
 */
import { getGrnRecords } from "@/app/(app)/warehouse/grn/mock-data";
import type { GrnRecord } from "@/app/(app)/warehouse/grn/types";
import { getQcRecords } from "@/app/(app)/warehouse/qc/mock-data";
import type { QcRecord } from "@/app/(app)/warehouse/qc/types";

export interface WarehousePoExposure {
  poId: number;
  poLineId: number;
}

export interface WarehouseGrnExposure {
  grnId: string;
  poId?: number;
  poLineId?: number;
  product: string;
  sku: string;
  receivedQty: number;
  warehouse: string;
  batchNo: string;
  mfgDate: string;
  expiryDate: string;
}

export interface WarehouseQcExposure {
  qcId: string;
  grnId?: string;
  acceptedQty: number;
  rejectedQty: number;
  holdQty: number;
}

export interface WarehouseInvoiceExposure {
  invoiceId: string;
  grnId: string;
  invoiceNo: string;
  invoiceDate: string;
  sku: string;
  invoiceQty: number;
  unitPrice: number;
  gst: number;
  totalAmount: number;
  ocrConfidence: number;
}

export function exposePoReferences(grn: GrnRecord): WarehousePoExposure[] {
  const refs: WarehousePoExposure[] = [];
  if (grn.poId) {
    for (const item of grn.items) {
      if (item.poLineId) {
        refs.push({ poId: grn.poId, poLineId: item.poLineId });
      }
    }
  }
  return refs;
}

export function exposeGrnData(grn?: GrnRecord): WarehouseGrnExposure[] {
  if (!grn) return [];
  return grn.batches.map((batch) => ({
    grnId: grn.id,
    poId: grn.poId,
    poLineId: batch.poLineId,
    product: batch.productName,
    sku: batch.productCode ?? "",
    receivedQty: batch.quantity,
    warehouse: grn.warehouse,
    batchNo: batch.batchNumber,
    mfgDate: batch.mfgDate,
    expiryDate: batch.expDate,
  }));
}

export function exposeQcData(qc: QcRecord): WarehouseQcExposure {
  return {
    qcId: qc.id,
    grnId: qc.grnId,
    acceptedQty: qc.totalAcceptedQty,
    rejectedQty: qc.totalRejectedQty,
    holdQty: qc.totalHoldQty,
  };
}

export function exposeInvoiceData(grn: GrnRecord): WarehouseInvoiceExposure[] {
  const rows: WarehouseInvoiceExposure[] = [];
  for (const inv of grn.ocrExtractedInvoices) {
    for (const line of inv.lineItems) {
      rows.push({
        invoiceId: inv.invoiceId,
        grnId: grn.id,
        invoiceNo: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        sku: line.sku,
        invoiceQty: line.invoiceQty,
        unitPrice: line.unitPrice,
        gst: line.gst,
        totalAmount: line.totalAmount,
        ocrConfidence: inv.confidenceScore,
      });
    }
  }
  return rows;
}

/** Aggregate all warehouse facts for a PO number (for Procurement API layer) */
export function exposeWarehouseFactsForPO(poNumber: string) {
  const grns = getGrnRecords().filter((g) =>
    g.poNumber.split(",").map((s) => s.trim()).includes(poNumber),
  );
  const grnNos = grns.map((g) => g.grnNo);
  const qcs = getQcRecords().filter((q) => grnNos.includes(q.grnNo));

  return {
    poReferences: grns.flatMap(exposePoReferences),
    grns: grns.flatMap(exposeGrnData),
    qcs: qcs.map(exposeQcData),
    invoices: grns.flatMap(exposeInvoiceData),
  };
}
