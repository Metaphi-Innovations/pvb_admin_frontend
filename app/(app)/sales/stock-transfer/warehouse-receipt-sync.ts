import type { GrnRecord } from "@/app/(app)/warehouse/grn/types";
import type { QcRecord } from "@/app/(app)/warehouse/qc/types";
import type { DispatchRecord } from "@/app/(app)/warehouse/dispatch/types";
import { getGrnRecords, saveGrnRecord } from "@/app/(app)/warehouse/grn/mock-data";
import { onGrnCreated, onQcCompleted } from "@/lib/warehouse/inventory-movement";
import {
  getStockTransferByDocumentNo,
  hydrateTransferLineItems,
  loadTransfers,
  saveTransfers,
  todayStr,
  type StockTransfer,
} from "./stock-transfer-data";
import {
  recordStockTransferInLedgerOnly,
  updateStockTransferStatus,
} from "./stock-movement-sync";
import { DEFAULT_DESTINATION_WAREHOUSE } from "@/lib/warehouse/grn-source";

const ST_GRN_KEY = "ds_stock_transfer_grn_links";

function loadStGrnLinks(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ST_GRN_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveStGrnLink(transferNumber: string, grnNo: string): void {
  if (typeof window === "undefined") return;
  const links = loadStGrnLinks();
  links[transferNumber] = grnNo;
  localStorage.setItem(ST_GRN_KEY, JSON.stringify(links));
}

export function getDispatchedStockTransfersForGrn(
  destinationWarehouse: string = DEFAULT_DESTINATION_WAREHOUSE,
): StockTransfer[] {
  const links = loadStGrnLinks();
  return loadTransfers()
    .map(hydrateTransferLineItems)
    .filter((t) => {
      if (!["in_transit", "grn_pending"].includes(t.status)) return false;
      if (t.grnNumber || links[t.transferNumber]) return false;
      if (
        destinationWarehouse !== "All" &&
        t.targetWarehouseName !== destinationWarehouse
      ) {
        return false;
      }
      return true;
    });
}

export function getStockTransferGrnRecords(): GrnRecord[] {
  return getGrnRecords().filter((g) => g.sourceType === "stock_transfer");
}

export function createStockTransferGrn(
  transfer: StockTransfer,
  receivedLines: Array<{
    productId: string;
    productName: string;
    productCode: string;
    batchNumber: string;
    mfgDate: string;
    expDate: string;
    dispatchedQty: number;
    receivedQty: number;
    remarks?: string;
  }>,
  remarks?: string,
): GrnRecord | { error: string } {
  const hydrated = hydrateTransferLineItems(transfer);
  const links = loadStGrnLinks();
  if (hydrated.grnNumber || links[hydrated.transferNumber]) {
    return { error: `GRN already exists for ${hydrated.transferNumber}.` };
  }

  const totalReceived = receivedLines.reduce((sum, l) => sum + l.receivedQty, 0);
  if (totalReceived <= 0) return { error: "Enter received quantity for at least one line." };

  const totalDispatched = receivedLines.reduce((sum, l) => sum + l.dispatchedQty, 0);
  const allReceived = receivedLines.every((l) => l.receivedQty >= l.dispatchedQty);
  const anyPartial = receivedLines.some(
    (l) => l.receivedQty > 0 && l.receivedQty < l.dispatchedQty,
  );

  const grnList = getGrnRecords();
  const grnNo = `ST-GRN-${hydrated.transferNumber.replace("ST-", "")}-${grnList.length + 1}`;

  const grn: GrnRecord = {
    id: `st-grn-${hydrated.id}-${Date.now()}`,
    grnNo,
    poNumber: hydrated.transferNumber,
    vendorName: hydrated.sourceWarehouseName,
    vendorReference: hydrated.dispatchNumber,
    warehouse: hydrated.targetWarehouseName,
    grnDate: todayStr(),
    deliveryChallan: hydrated.dispatchNumber,
    totalProducts: receivedLines.filter((l) => l.receivedQty > 0).length,
    totalQty: totalReceived,
    status: "pending_qc",
    sourceType: "stock_transfer",
    stockTransferNo: hydrated.transferNumber,
    fromWarehouse: hydrated.sourceWarehouseName,
    toWarehouse: hydrated.targetWarehouseName,
    dispatchNumber: hydrated.dispatchNumber,
    dispatchDate: hydrated.updatedDate || hydrated.transferDate,
    receiptStatus: allReceived ? "received" : anyPartial ? "partially_received" : "pending_receipt",
    receiptRemarks: remarks,
    items: receivedLines.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      productCode: line.productCode,
      orderedQty: line.dispatchedQty,
      alreadyReceivedQty: 0,
      pendingQty: line.dispatchedQty,
      receivedQty: line.receivedQty,
      batchNumber: line.batchNumber,
      mfgDate: line.mfgDate,
      expDate: line.expDate,
      remarks: line.remarks,
      poNumber: hydrated.transferNumber,
      inventoryTracked: true,
    })),
    batches: receivedLines
      .filter((l) => l.receivedQty > 0)
      .map((line) => ({
        productId: line.productId,
        productName: line.productName,
        productCode: line.productCode,
        batchNumber: line.batchNumber,
        mfgDate: line.mfgDate,
        expDate: line.expDate,
        quantity: line.receivedQty,
        poNumber: hydrated.transferNumber,
      })),
    supplierInvoices: [],
    ocrExtractedInvoices: [],
    ocrExtractionCompleted: false,
    activity: [
      {
        date: todayStr(),
        action: "Stock Transfer GRN Created",
        by: "Warehouse User",
        remarks,
      },
    ],
    createdBy: "Warehouse User",
    updatedBy: "Warehouse User",
  };

  saveGrnRecord(grn);
  saveStGrnLink(hydrated.transferNumber, grnNo);
  onGrnCreated(grn);

  const transfers = loadTransfers();
  saveTransfers(
    transfers.map((t) =>
      t.id === hydrated.id
        ? {
            ...hydrateTransferLineItems(t),
            status: allReceived ? "qc_pending" : "partially_received",
            grnNumber: grnNo,
            receiptStatus: grn.receiptStatus,
            updatedBy: "Admin",
            updatedDate: todayStr(),
          }
        : t,
    ),
  );

  return grn;
}

export function completeStockTransferQc(
  grn: GrnRecord,
  qc: QcRecord,
): StockTransfer | { error: string } {
  if (grn.sourceType !== "stock_transfer" || !grn.stockTransferNo) {
    return { error: "Not a stock transfer GRN" };
  }

  const transfer = getStockTransferByDocumentNo(grn.stockTransferNo);
  if (!transfer) return { error: "Stock transfer not found" };

  onQcCompleted(grn, qc);

  const acceptedLines = qc.items
    .filter((item) => item.acceptedQty > 0)
    .map((item) => ({
      productName: item.productName,
      productCode: item.productCode ?? item.productId,
      batchNumber: item.batchNumber,
      acceptedQty: item.acceptedQty,
    }));

  recordStockTransferInLedgerOnly(transfer, grn.grnNo, acceptedLines);

  const finalStatus =
    qc.totalAcceptedQty > 0 && qc.totalRejectedQty > 0
      ? "qc_passed"
      : qc.totalAcceptedQty > 0
        ? "completed"
        : "qc_passed";

  return updateStockTransferStatus(transfer.id, finalStatus, { qcNumber: qc.qcNo });
}

export function linkDispatchToStockTransfer(dispatch: DispatchRecord): void {
  if (
    dispatch.source_type !== "stock_transfer" &&
    dispatch.sourceDocumentType !== "Stock Transfer"
  ) {
    return;
  }

  const docNo =
    dispatch.source_document_no ||
    dispatch.salesOrderNumber ||
    "";
  const transfer = getStockTransferByDocumentNo(docNo.split(",")[0]?.trim() ?? "");
  if (!transfer) return;

  const transfers = loadTransfers();
  saveTransfers(
    transfers.map((t) =>
      t.id === transfer.id
        ? {
            ...hydrateTransferLineItems(t),
            dispatchNumber: dispatch.dispatchNumber,
            dispatchId: dispatch.id,
            status: "grn_pending",
            updatedBy: "Admin",
            updatedDate: todayStr(),
          }
        : t,
    ),
  );
}

export function getStockTransferDispatchLines(transfer: StockTransfer) {
  const hydrated = hydrateTransferLineItems(transfer);
  const lines: Array<{
    productId: string;
    productName: string;
    productCode: string;
    batchNumber: string;
    mfgDate: string;
    expDate: string;
    dispatchedQty: number;
  }> = [];

  for (const item of hydrated.lineItems) {
    if (item.batchAllocations?.length) {
      for (const alloc of item.batchAllocations) {
        lines.push({
          productId: String(item.productId ?? item.productCode),
          productName: item.productName,
          productCode: item.productCode,
          batchNumber: alloc.batchNumber,
          mfgDate: item.mfgDate ?? "",
          expDate: alloc.expiryDate,
          dispatchedQty: alloc.allocatedQty,
        });
      }
    } else {
      lines.push({
        productId: String(item.productId ?? item.productCode),
        productName: item.productName,
        productCode: item.productCode,
        batchNumber: item.batchNumber ?? "—",
        mfgDate: item.mfgDate ?? "",
        expDate: item.expiryDate ?? "",
        dispatchedQty: item.packedQty ?? item.quantity,
      });
    }
  }

  return lines;
}
