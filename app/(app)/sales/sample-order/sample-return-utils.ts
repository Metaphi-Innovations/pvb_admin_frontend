import type { DispatchRecord } from "@/app/(app)/warehouse/dispatch/types";
import { hydrateOrderLineItems, loadOrders } from "./orders-data";
import { getDispatchRecords } from "@/app/(app)/warehouse/dispatch/mock-data";

export function isSampleOrderDispatch(d: DispatchRecord): boolean {
  const type =
    d.source_type ||
    (d.sourceDocumentType === "Sample Order"
      ? "sample_order"
      : d.sourceDocumentType === "Stock Transfer"
        ? "stock_transfer"
        : "sales_order");
  return type === "sample_order";
}

export function getSampleOrderNo(d: DispatchRecord): string {
  return d.salesOrderNumber || d.source_document_no || "";
}

export function getDeliveredSampleOrderDispatches(): DispatchRecord[] {
  return getDispatchRecords().filter(
    (d) => isSampleOrderDispatch(d) && d.deliveryStatus === "Delivered",
  );
}

export function enrichDispatchForSampleReturn(dispatch: DispatchRecord): DispatchRecord {
  const soNo = dispatch.salesOrderNumber || dispatch.source_document_no || "";
  const order = loadOrders().find((o) => o.soNumber === soNo);
  const lineItems = order ? hydrateOrderLineItems(order).lineItems : [];

  return {
    ...dispatch,
    products: dispatch.products.map((p) => {
      const line = lineItems.find(
        (li) => li.productCode === p.sku || li.productName === p.product,
      );
      return {
        ...p,
        unitRate: p.unitRate ?? line?.unitPrice ?? 0,
        batchNo: p.batchNo,
      };
    }),
  };
}

export function calcReturnLineAmount(returnQtyPieces: number, unitRateCase: number): number {
  const returnQtyCases = returnQtyPieces / 10;
  return Math.round(returnQtyCases * unitRateCase * 100) / 100;
}
