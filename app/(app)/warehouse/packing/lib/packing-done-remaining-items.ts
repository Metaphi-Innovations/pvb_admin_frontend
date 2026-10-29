import { SalesOrderService } from "@/services/sales-order.service";
import { SampleOrderService } from "@/services/sample-order.service";
import { StockTransferService } from "@/services/stock-transfer.service";
import type { PackingDoneRemainingItem, PackingRecord } from "../types";

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function packSizeFromSnapshot(snapshot: Record<string, unknown> | undefined, fallback = 1): number {
  const n = Number(
    snapshot?.unit_per_packing ??
      snapshot?.conversion_qty ??
      snapshot?.conversion_rate ??
      snapshot?.conversion_factor ??
      fallback,
  );
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * Loads all SO / Sample / ST lines with order + remaining qty.
 * Remaining excludes qty already generated into packing lists (other/this).
 * Used by Update (order/remaining display + max qty) and Add (remaining > 0).
 */
export async function loadPackingDoneSourceItems(
  packing: PackingRecord,
  signal?: AbortSignal,
): Promise<PackingDoneRemainingItem[]> {
  const sourceId = packing.sourceId;
  const sourceType = packing.sourceTypeRaw;
  if (!sourceId || !sourceType) return [];

  if (sourceType === "normal_sales") {
    const order = await SalesOrderService.getById(sourceId, signal);
    return (order.lineItems || []).flatMap((line): PackingDoneRemainingItem[] => {
      if (!line.id || !line.productId) return [];
      const ordered = Number(line.quantity || 0);
      const remaining = Math.max(
        0,
        ordered -
          Number(line.generatedBaseQty || 0) -
          Number(line.shortClosedBaseQty || 0),
      );
      const packSize = Number(line.packSize || 1) || 1;
      return [
        {
          sourceItemId: String(line.id),
          productId: String(line.productId),
          productName: line.productName || "Unknown",
          sku: line.productCode || "",
          productCode: line.productCode || "",
          orderBaseQty: ordered,
          remainingBaseQty: remaining,
          packSize,
          quantityType: line.quantityType,
        },
      ];
    });
  }

  if (sourceType === "sample") {
    const order = await SampleOrderService.getById(sourceId, signal);
    return (order.lineItems || []).flatMap((line): PackingDoneRemainingItem[] => {
      if (!line.id || !line.productId) return [];
      const ordered = Number(line.quantity || 0);
      const remaining = Math.max(0, ordered - Number(line.generatedBaseQty || 0));
      const packSize = Number(line.packSize || 1) || 1;
      return [
        {
          sourceItemId: String(line.id),
          productId: String(line.productId),
          productName: line.productName || "Unknown",
          sku: line.productCode || "",
          productCode: line.productCode || "",
          orderBaseQty: ordered,
          remainingBaseQty: remaining,
          packSize,
          quantityType: line.quantityType,
        },
      ];
    });
  }

  if (sourceType === "stock_transfer") {
    const transfer = await StockTransferService.getById(sourceId, signal);
    const lines = (transfer as { lineItems?: unknown[] }).lineItems || [];
    return lines.flatMap((raw): PackingDoneRemainingItem[] => {
      const line = raw as Record<string, unknown>;
      const id = asString(line.id);
      const productId = asString(line.productId);
      if (!id || !productId) return [];
      const ordered = Number(line.quantity || 0);
      const generated = Number(line.generatedBaseQty || 0);
      const remaining = Math.max(0, ordered - generated);
      const packSize =
        Number(line.packSize || 1) ||
        packSizeFromSnapshot(line.productSnapshot as Record<string, unknown> | undefined);
      return [
        {
          sourceItemId: id,
          productId,
          productName: asString(line.productName) || "Unknown",
          sku: asString(line.productCode || line.sku),
          productCode: asString(line.productCode),
          orderBaseQty: ordered,
          remainingBaseQty: remaining,
          packSize,
          quantityType: asString(line.quantityType) || undefined,
        },
      ];
    });
  }

  return [];
}

/** Lines with remaining > 0 (for Add dropdown). */
export async function loadPackingDoneRemainingItems(
  packing: PackingRecord,
  signal?: AbortSignal,
): Promise<PackingDoneRemainingItem[]> {
  const all = await loadPackingDoneSourceItems(packing, signal);
  return all.filter((row) => row.remainingBaseQty > 1e-9);
}
