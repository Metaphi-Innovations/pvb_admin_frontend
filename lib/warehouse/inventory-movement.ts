/**
 * Warehouse inventory movement — physical stock only.
 * GRN Created → Pending QC Stock
 * QC Accepted → Available Stock | Rejected → Rejected Stock | Hold → Hold Stock
 */
import type { GrnRecord } from "@/app/(app)/warehouse/grn/types";
import type { QcRecord } from "@/app/(app)/warehouse/qc/types";
import type { GrnPendingStockRecord } from "@/app/(app)/warehouse/stockoverview/types";
import type { QcPassedStockRecord } from "@/app/(app)/warehouse/stockoverview/types";
import type { RejectedStockRecord } from "@/app/(app)/warehouse/stockoverview/types";
import type { HoldStockRecord } from "@/app/(app)/warehouse/stockoverview/types";
import {
  getGrnPendingStockRecords,
  saveGrnPendingStockRecords,
  getQcPassedStockRecords,
  saveQcPassedStockRecords,
  getRejectedStockRecords,
  saveRejectedStockRecords,
  getHoldStockRecords,
  saveHoldStockRecords,
} from "@/app/(app)/warehouse/stockoverview/mock-data";

function pendingId(grnId: string, batchNumber: string) {
  return `pending-${grnId}-${batchNumber}`;
}

function passedId(grnId: string, batchNumber: string) {
  return `passed-${grnId}-${batchNumber}`;
}

function rejectedId(qcId: string, batchNumber: string) {
  return `rejected-${qcId}-${batchNumber}`;
}

function holdId(qcId: string, batchNumber: string) {
  return `hold-${qcId}-${batchNumber}`;
}

import { createQcFromGrn } from "@/app/(app)/warehouse/qc/mock-data";

/** Move received batch qty into Pending QC stock when GRN is saved */
export function onGrnCreated(grn: GrnRecord): void {
  if (typeof window === "undefined") return;

  createQcFromGrn(grn);

  const existing = getGrnPendingStockRecords();
  const withoutThisGrn = existing.filter((r) => !r.grnNo.startsWith(grn.grnNo));
  const newRows: GrnPendingStockRecord[] = grn.batches.map((batch) => ({
    id: pendingId(grn.id, batch.batchNumber),
    grnNo: grn.grnNo,
    product: batch.productName,
    warehouse: grn.warehouse,
    batchNumber: batch.batchNumber,
    receivedQuantity: batch.quantity,
    grnDate: grn.grnDate,
    vendor: grn.vendorName,
    status: grn.status === "qc_completed" ? "QC Completed" : "Pending QC",
    assignedInspector: "—",
    inspectionDueDate: grn.grnDate,
  }));

  saveGrnPendingStockRecords([...withoutThisGrn, ...newRows]);
}

/** Remove pending QC stock when QC starts */
export function onQcStarted(grn: GrnRecord): void {
  if (typeof window === "undefined") return;
  const existing = getGrnPendingStockRecords();
  saveGrnPendingStockRecords(
    existing.map((r) =>
      r.grnNo === grn.grnNo ? { ...r, status: "QC In Progress" } : r,
    ),
  );
}

/** Distribute QC outcomes to Available / Rejected / Hold stock buckets */
export function onQcCompleted(grn: GrnRecord, qc: QcRecord): void {
  if (typeof window === "undefined") return;

  const pending = getGrnPendingStockRecords().filter((r) => r.grnNo !== grn.grnNo);
  saveGrnPendingStockRecords(pending);

  const passedExisting = getQcPassedStockRecords();
  const rejectedExisting = getRejectedStockRecords();
  const holdExisting = getHoldStockRecords();

  const newPassed: QcPassedStockRecord[] = [];
  const newRejected: RejectedStockRecord[] = [];
  const newHold: HoldStockRecord[] = [];

  for (const item of qc.items) {
    const batch = grn.batches.find(
      (b) => b.batchNumber === item.batchNumber && b.productId === item.productId,
    );

    if (item.acceptedQty > 0) {
      newPassed.push({
        id: passedId(grn.id, item.batchNumber),
        product: item.productName,
        warehouse: grn.warehouse,
        batchNumber: item.batchNumber,
        availableQuantity: item.acceptedQty,
        reservedQuantity: 0,
        manufacturingDate: batch?.mfgDate ?? "",
        expiryDate: batch?.expDate ?? "",
        status: "Active",
        threshold: 10,
      });
    }

    if (item.rejectedQty > 0) {
      newRejected.push({
        id: rejectedId(qc.id, item.batchNumber),
        product: item.productName,
        warehouse: grn.warehouse,
        batchNumber: item.batchNumber,
        rejectedQuantity: item.rejectedQty,
        rejectionReason: item.rejectionReason ?? "QC rejection",
        qcNumber: qc.qcNo,
        inspectionDate: qc.inspectionDate,
        inspector: "QC Inspector",
        status: "Rejected",
      });
    }

    if (item.holdQty > 0) {
      newHold.push({
        id: holdId(qc.id, item.batchNumber),
        product: item.productName,
        warehouse: grn.warehouse,
        batchNumber: item.batchNumber,
        holdQuantity: item.holdQty,
        qcNumber: qc.qcNo,
        grnNo: grn.grnNo,
        inspectionDate: qc.inspectionDate,
        status: "On Hold",
        remarks: item.rejectionReason,
      });
    }
  }

  const passedIds = new Set(newPassed.map((r) => r.id));
  const rejectedIds = new Set(newRejected.map((r) => r.id));
  const holdIds = new Set(newHold.map((r) => r.id));

  saveQcPassedStockRecords([
    ...passedExisting.filter((r) => !passedIds.has(r.id)),
    ...newPassed,
  ]);
  saveRejectedStockRecords([
    ...rejectedExisting.filter((r) => !rejectedIds.has(r.id)),
    ...newRejected,
  ]);
  saveHoldStockRecords([
    ...holdExisting.filter((r) => !holdIds.has(r.id)),
    ...newHold,
  ]);
}
