import { DispatchRecord, DeliveryDetails } from "../types";
import { getDispatchRecords, saveDispatchRecords } from "../mock-data";
import { PackingRecord } from "../../packing/types";
import {
  getStockTransferByDocumentNo,
  loadTransfers,
  saveTransfers,
} from "@/app/(app)/sales/stock-transfer/stock-transfer-data";
import { markStockTransferDispatched } from "@/app/(app)/sales/stock-transfer/stock-movement-sync";
import { downloadStockTransferChallan } from "@/app/(app)/sales/stock-transfer/transfer-challan-document";
import {
  getSampleOrderByDocumentNo,
} from "@/app/(app)/sales/sample-order/packing-sync";
import { markSampleOrderDispatched } from "@/app/(app)/sales/sample-order/stock-movement-sync";
import { downloadProformaInvoice } from "@/app/(app)/sales/sample-order/pi-document";
import { markPurchaseReturnReturned } from "@/app/(app)/procurement/purchase-returns/purchase-return-data";
import { getPurchaseReturnByReturnNumber } from "@/app/(app)/procurement/purchase-returns/purchase-return-packing-sync";

export function getDispatchesByWarehouse(warehouse: string = "All"): DispatchRecord[] {
  const dispatches = getDispatchRecords();
  if (warehouse === "All") return dispatches;
  return dispatches.filter(d => d.warehouse === warehouse);
}

export function getDispatchById(id: string): DispatchRecord | undefined {
  return getDispatchRecords().find(d => d.id === id);
}

export function getPackedOrdersByWarehouse(warehouse: string = "All"): PackingRecord[] {
  return []; // Mock data removed, API integration pending
}

export function saveDispatch(record: DispatchRecord): void {
  const dispatches = getDispatchRecords();
  const idx = dispatches.findIndex(d => d.id === record.id);
  const isNew = idx === -1;
  if (isNew) {
    dispatches.push(record);

    // Mark packing record(s) as Dispatched
    if (record.packingNumbers && record.packingNumbers.length > 0) {
      const transfers = loadTransfers();
      let transfersUpdated = false;

      record.packingNumbers.forEach(pNo => {
        // Check stock transfers
        const tIdx = transfers.findIndex(t => t.packingListNumber === pNo);
        if (tIdx !== -1) {
          transfers[tIdx].packingStatus = "Dispatched";
          transfersUpdated = true;
        }
      });

      if (transfersUpdated) saveTransfers(transfers);
    }

    const isSampleDispatch =
      record.source_type === "sample_order" ||
      record.sourceDocumentType === "Sample Order";
    const isFinalDispatch =
      record.dispatch_status !== "Pending Dispatch" &&
      record.deliveryStatus !== "Pending Dispatch";

    if (isSampleDispatch && isFinalDispatch) {
      const docNos = (record.source_document_no || record.salesOrderNumber || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const docNo of docNos) {
        const order = getSampleOrderByDocumentNo(docNo);
        if (order) {
          const dispatched = markSampleOrderDispatched(order.id);
          if (!("error" in dispatched)) {
            downloadProformaInvoice(dispatched);
          }
        }
      }
    }

    const isStockTransferDispatch =
      record.source_type === "stock_transfer" ||
      record.sourceDocumentType === "Stock Transfer";
    if (isStockTransferDispatch && isFinalDispatch) {
      const docNo = (record.source_document_no || record.salesOrderNumber || "")
        .split(",")[0]
        ?.trim();
      if (docNo) {
        const transfer = getStockTransferByDocumentNo(docNo);
        if (transfer) {
          markStockTransferDispatched(transfer.id, record.dispatchNumber);
          downloadStockTransferChallan(transfer, record.dispatchNumber);
        }
      }
    }

    const isPurchaseReturnDispatch =
      record.source_type === "purchase_return" ||
      record.sourceDocumentType === "Purchase Return";
    if (isPurchaseReturnDispatch && isFinalDispatch) {
      const docNos = (record.source_document_no || record.salesOrderNumber || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const docNo of docNos) {
        const pret = getPurchaseReturnByReturnNumber(docNo);
        if (pret && pret.status === "issued_for_packing") {
          markPurchaseReturnReturned(pret);
        }
      }
    }
  } else {
    dispatches[idx] = record;
  }
  saveDispatchRecords(dispatches);
}

export function revertDispatch(id: string): boolean {
  const dispatches = getDispatchRecords();
  const idx = dispatches.findIndex(d => d.id === id);
  if (idx === -1) return false;

  if (dispatches[idx].deliveryStatus === "Delivered") return false;

  dispatches.splice(idx, 1);
  saveDispatchRecords(dispatches);
  return true;
}

export function markAsDelivered(id: string, deliveryDetails: DeliveryDetails): boolean {
  const dispatches = getDispatchRecords();
  const idx = dispatches.findIndex(d => d.id === id);
  if (idx === -1) return false;

  dispatches[idx] = {
    ...dispatches[idx],
    deliveryStatus: "Delivered",
    deliveryDetails,
  };
  saveDispatchRecords(dispatches);
  return true;
}

export function generateDispatchNumber(): string {
  const dispatches = getDispatchRecords();
  return `DSP-2026-${String(dispatches.length + 1).padStart(3, "0")}`;
}