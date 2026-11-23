import type { DispatchProduct, DispatchRecord } from "@/app/(app)/warehouse/dispatch/types";
import { hydrateOrderLineItems, loadOrders } from "./orders-data";
const getDispatchRecords = (): any[] => [];

/**
 * Unique product identity for sales/sample returns.
 * Master `sku` is often pack size (e.g. "500ml"); prefer `product_code`.
 */
export function resolveReturnProductCode(source: {
  sku?: string | null;
  product_code?: string | null;
  product?: {
    sku?: string | null;
    product_code?: string | null;
  } | null;
  product_snapshot?: {
    sku?: string | null;
    product_code?: string | null;
  } | null;
  productSnapshot?: Record<string, unknown> | null;
}): string {
  const snap = (source.productSnapshot || source.product_snapshot || {}) as Record<
    string,
    unknown
  >;
  const snapCode =
    typeof snap.product_code === "string" ? snap.product_code.trim() : "";
  return (
    String(source.product?.product_code || "").trim() ||
    String(source.product_code || "").trim() ||
    snapCode ||
    String(source.product?.sku || "").trim() ||
    String(source.sku || "").trim() ||
    ""
  );
}

/** Pack-size label for display (master sku / pack_size), not used for identity. */
export function resolveReturnPackLabel(source: {
  sku?: string | null;
  product?: { sku?: string | null; pack_size?: string | number | null } | null;
  product_snapshot?: {
    sku?: string | null;
    pack_size?: string | number | null;
  } | null;
  productSnapshot?: Record<string, unknown> | null;
}): string {
  const snap = (source.productSnapshot || source.product_snapshot || {}) as Record<
    string,
    unknown
  >;
  const packSku =
    String(source.product?.sku || "").trim() ||
    (typeof snap.sku === "string" ? snap.sku.trim() : "") ||
    String(source.sku || "").trim();
  const packSize =
    source.product?.pack_size != null
      ? String(source.product.pack_size).trim()
      : typeof snap.pack_size === "string" || typeof snap.pack_size === "number"
        ? String(snap.pack_size).trim()
        : "";
  // Avoid duplicating product_code when sku was already remapped to code.
  if (packSku && packSku !== resolveReturnProductCode(source)) return packSku;
  return packSize;
}

export function resolveReturnProductCodeFromDispatchProduct(
  product: DispatchProduct & { productSnapshot?: Record<string, unknown> },
): string {
  return (
    resolveReturnProductCode({
      sku: product.sku,
      productSnapshot: product.productSnapshot,
    }) || product.product
  );
}

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
