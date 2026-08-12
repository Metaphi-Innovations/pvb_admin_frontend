import type { PackingRecord, SalesOrderRecord } from "../types";

type PackingDocRecord = Pick<
  SalesOrderRecord,
  | "sourceDocumentType"
  | "salesOrderNo"
  | "sourceDocumentNo"
  | "customer"
  | "targetWarehouse"
  | "sourceWarehouse"
  | "warehouse"
  | "orderDate"
  | "deliveryDate"
>;

export function isPurchaseReturnDoc(
  record: Pick<SalesOrderRecord | PackingRecord, "sourceDocumentType">,
): boolean {
  return record.sourceDocumentType === "Purchase Return";
}

export function isStockTransferDoc(
  record: Pick<SalesOrderRecord | PackingRecord, "sourceDocumentType">,
): boolean {
  return record.sourceDocumentType === "Stock Transfer";
}

export function isSampleOrderDoc(
  record: Pick<SalesOrderRecord | PackingRecord, "sourceDocumentType">,
): boolean {
  return record.sourceDocumentType === "Sample Order";
}

export function getPackingSectionTitle(sourceDocumentType?: SalesOrderRecord["sourceDocumentType"]): string {
  if (isPurchaseReturnDoc({ sourceDocumentType })) return "Purchase Return Information";
  if (isStockTransferDoc({ sourceDocumentType })) return "Stock Transfer Information";
  if (isSampleOrderDoc({ sourceDocumentType })) return "Sample Order Information";
  return "Sales Order Information";
}

export function getPackingDocumentNoLabel(sourceDocumentType?: SalesOrderRecord["sourceDocumentType"]): string {
  if (isPurchaseReturnDoc({ sourceDocumentType })) return "Purchase Return Number";
  if (isStockTransferDoc({ sourceDocumentType })) return "Stock Transfer Number";
  if (isSampleOrderDoc({ sourceDocumentType })) return "Sample Order No";
  return "Sales Order No";
}

export function getPackingDocumentNo(record: PackingDocRecord): string {
  if (isStockTransferDoc(record) || isPurchaseReturnDoc(record)) {
    return record.sourceDocumentNo ?? record.salesOrderNo;
  }
  return record.salesOrderNo;
}

export function getPackingPartyLabel(sourceDocumentType?: SalesOrderRecord["sourceDocumentType"]): string {
  if (isPurchaseReturnDoc({ sourceDocumentType })) return "Supplier Name";
  if (isStockTransferDoc({ sourceDocumentType })) return "Target Warehouse";
  if (isSampleOrderDoc({ sourceDocumentType })) return "Issued To Employee";
  return "Customer";
}

export function getPackingPartyValue(record: PackingDocRecord): string {
  if (isStockTransferDoc(record)) return record.targetWarehouse ?? record.customer;
  return record.customer;
}

export function getPackingWarehouseLabel(sourceDocumentType?: SalesOrderRecord["sourceDocumentType"]): string {
  if (
    isStockTransferDoc({ sourceDocumentType }) ||
    isSampleOrderDoc({ sourceDocumentType }) ||
    isPurchaseReturnDoc({ sourceDocumentType })
  ) {
    return "Source Warehouse";
  }
  return "Warehouse";
}

export function getPackingWarehouseValue(record: PackingDocRecord): string {
  if (isStockTransferDoc(record) || isPurchaseReturnDoc(record)) {
    return record.sourceWarehouse ?? record.warehouse;
  }
  return record.sourceWarehouse || record.warehouse;
}

export function getPackingQtyLabel(sourceDocumentType?: SalesOrderRecord["sourceDocumentType"]): string {
  if (isPurchaseReturnDoc({ sourceDocumentType })) return "Return Qty";
  return "Order Qty";
}

export function getPackingDateLabel(sourceDocumentType?: SalesOrderRecord["sourceDocumentType"]): string {
  if (isPurchaseReturnDoc({ sourceDocumentType })) return "Return Date";
  return "Document Date";
}

export function getPackingListOrderNoHeader(sourceFilter?: string): string {
  if (sourceFilter === "purchase_return") return "Return No";
  return "Order No";
}
