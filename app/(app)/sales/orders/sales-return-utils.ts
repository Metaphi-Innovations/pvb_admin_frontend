import type { DispatchRecord } from "@/app/(app)/warehouse/dispatch/types";
import { hydrateOrderLineItems, loadOrders } from "./orders-data";
const getDispatchRecords = (): any[] => [];


export function isSalesOrderDispatch(d: DispatchRecord): boolean {
  const type =
    d.source_type ||
    (d.sourceDocumentType === "Sample Order"
      ? "sample_order"
      : d.sourceDocumentType === "Stock Transfer"
        ? "stock_transfer"
        : "sales_order");
  return type === "sales_order";
}

export function getSalesOrderNo(d: DispatchRecord): string {
  return d.salesOrderNumber || d.source_document_no || "";
}

export function getDeliveredSalesOrderDispatches(): DispatchRecord[] {
  return getDispatchRecords().filter(
    (d) => isSalesOrderDispatch(d) && d.deliveryStatus === "Delivered",
  );
}

export function enrichDispatchForReturn(dispatch: DispatchRecord): DispatchRecord {
  const soNo = dispatch.salesOrderNumber || dispatch.source_document_no || "";
  const order = loadOrders().find((o) => o.soNumber === soNo);
  const lineItems = order ? hydrateOrderLineItems(order).lineItems : [];

  return {
    ...dispatch,
    products: dispatch.products.map((p) => {
      const line = lineItems.find(
        (li) => li.productCode === p.sku || li.productName === p.product,
      );
      const soUnitRate =
        line && line.quantity > 0 && line.lineTotal != null
          ? line.lineTotal / line.quantity
          : line?.finalRate ?? line?.unitPrice ?? 0;
      return {
        ...p,
        unitRate: p.unitRate ?? soUnitRate,
        batchNo: p.batchNo,
      };
    }),
  };
}

export function calcReturnLineAmount(returnQtyPieces: number, unitRatePiece: number): number {
  return Math.round(Math.max(0, returnQtyPieces) * Math.max(0, unitRatePiece) * 100) / 100;
}

/**
 * Per-piece rate for sales return amounts.
 * Dispatch getById prefers Sales Invoice line_total/qty when an invoice exists
 * (includes invoice-time manual discount + scheme + GST); otherwise SO item_total.
 * Never use raw unit_price alone (that is taxable list rate only).
 */
export function resolveReturnUnitRateFromDispatchItem(item: {
  order_qty?: number | string | null;
  item_total?: number | string | null;
  unit_rate?: number | string | null;
  unit_price?: number | string | null;
  discount_amount?: number | string | null;
  manual_discount_amount?: number | string | null;
  gst_amount?: number | string | null;
  product_snapshot?: { unit_price?: number | string | null } | null;
  product?: { unit_price?: number | string | null } | null;
}): number {
  const orderQty = Number(item.order_qty || 0);
  const itemTotal = Number(item.item_total || 0);
  if (orderQty > 0 && itemTotal >= 0) {
    return itemTotal / orderQty;
  }

  // Reconstruct from components when item_total is missing but order qty exists.
  const listRate = Number(
    item.unit_rate ??
      item.unit_price ??
      item.product_snapshot?.unit_price ??
      item.product?.unit_price ??
      0,
  );
  if (orderQty > 0 && listRate > 0) {
    const discount =
      Number(item.discount_amount || 0) ||
      Number(item.manual_discount_amount || 0);
    const gst = Number(item.gst_amount || 0);
    const taxable = Math.max(0, listRate * orderQty - discount);
    return (taxable + gst) / orderQty;
  }

  return Math.max(0, listRate);
}
