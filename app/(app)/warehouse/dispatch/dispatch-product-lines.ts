import { loadProducts } from "@/app/(app)/masters/products/product-data";
import { getPOById } from "@/app/(app)/procurement/purchase-orders/po-data";
import { resolveTaxSupplyForPO } from "@/app/(app)/procurement/purchase-returns/purchase-return-calc";
import { getPurchaseReturnByReturnNumber } from "@/app/(app)/procurement/purchase-returns/purchase-return-packing-sync";
import {
  computeLineTaxBreakdown,
  hydrateOrders,
  loadOrders,
} from "@/app/(app)/sales/orders/orders-data";
import { totalGstPctFromRates } from "@/lib/procurement/gst-master-utils";
import {
  enrichProductForProcurement,
} from "@/lib/procurement/procurement-line-utils";
import { calcLineAmounts, type TaxSupplyType } from "@/lib/procurement/utils";
import { findProductRef } from "@/lib/pricing/resolve-pricing";
import type { PackingRecord } from "../packing/types";

export interface DispatchProductLine {
  key: string;
  orderId: string;
  packingNo: string;
  productName: string;
  productCode: string;
  category: string;
  hsnCode: string;
  packagingUnit: string;
  packingQty: number;
  skuQty: number;
  ratePerSku: number;
  discountType: "percentage" | "flat";
  discountPct: number;
  discountAmount: number;
  gstPct: number;
  cgstPct: number;
  sgstPct: number;
  igstPct: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  netAmount: number;
  remarks: string;
  packedQty: number;
  customerName: string;
  warehouse: string;
  batchAllocations: { batchNumber: string; expiryDate: string; allocatedQty: number }[];
}

function findProductBySkuOrCode(sku: string) {
  const ref = findProductRef(sku);
  if (ref) return enrichProductForProcurement(ref.id);
  const trimmed = sku.trim().toUpperCase();
  const product = loadProducts().find(
    (p) =>
      (p.productCode || "").toUpperCase() === trimmed ||
      (p.sku || "").toUpperCase() === trimmed,
  );
  return product ? enrichProductForProcurement(product.id) : null;
}

function parseGstRate(gstRate?: string): number {
  return parseFloat((gstRate || "0").replace(/%/g, "")) || 0;
}

function derivePackingQty(skuQty: number, conversionQty: number): number {
  const conv = conversionQty > 0 ? conversionQty : 1;
  if (conv <= 1) return skuQty;
  const packs = skuQty / conv;
  return Number.isInteger(packs) ? packs : Math.round(packs * 1000) / 1000;
}

function isPurchaseReturnPacking(order: PackingRecord): boolean {
  return (
    order.sourceDocumentType === "Purchase Return" ||
    order.id.startsWith("pret-pkg-") ||
    order.salesOrderNo.startsWith("PRET-")
  );
}

function getReturnNumber(order: PackingRecord): string {
  return order.sourceDocumentNo ?? order.salesOrderNo;
}

export function resolveDispatchTaxSupplyType(orders: PackingRecord[]): TaxSupplyType {
  const pretOrder = orders.find(isPurchaseReturnPacking);
  if (!pretOrder) return "intra";
  const pret = getPurchaseReturnByReturnNumber(getReturnNumber(pretOrder));
  if (pret?.taxSupplyType) return pret.taxSupplyType;
  const po = pret ? getPOById(pret.poId) : undefined;
  return po ? resolveTaxSupplyForPO(po) : "intra";
}

export function buildDispatchProductLines(
  selectedOrders: PackingRecord[],
  autoWarehouse: string,
): DispatchProductLine[] {
  const rows: DispatchProductLine[] = [];
  const salesOrders = hydrateOrders(loadOrders());

  selectedOrders.forEach((order) => {
    const customerName =
      order.sourceDocumentType === "Stock Transfer"
        ? order.targetWarehouse || order.customer.replace("Transfer to ", "")
        : order.customer;
    const warehouse = order.warehouse || order.sourceWarehouse || autoWarehouse;
    const warehouseName = warehouse === "All" ? "Central Warehouse" : warehouse;
    const isPret = isPurchaseReturnPacking(order);
    const pret = isPret ? getPurchaseReturnByReturnNumber(getReturnNumber(order)) : undefined;
    const po = pret ? getPOById(pret.poId) : undefined;
    const taxSupplyType = pret?.taxSupplyType ?? (po ? resolveTaxSupplyForPO(po) : "intra");
    const salesOrder = !isPret
      ? salesOrders.find((o) => o.soNumber === order.salesOrderNo)
      : undefined;

    order.products.forEach((p) => {
      if (p.packedQty <= 0) return;

      const enriched = findProductBySkuOrCode(p.sku);
      const conversionQty = enriched?.conversionQty ?? 1;
      const skuQty = p.packedQty;
      const packingQty = derivePackingQty(skuQty, conversionQty);
      const key = `${order.id}::${p.lineId ?? p.sku}`;

      if (isPret && pret) {
        const pretItem = pret.items.find(
          (it) => it.id === p.lineId || it.productCode === p.sku,
        );
        const unitPrice = pretItem?.unitPrice ?? enriched?.ratePerSku ?? 0;
        const cgstPct = pretItem?.cgstPct ?? 0;
        const sgstPct = pretItem?.sgstPct ?? 0;
        const igstPct = pretItem?.igstPct ?? 0;
        const calc = calcLineAmounts({
          orderedQty: skuQty,
          unitPrice,
          discountType: "percentage",
          discountPct: 0,
          discountFlatAmount: 0,
          cgstPct,
          sgstPct,
          igstPct,
        });

        rows.push({
          key,
          orderId: order.id,
          packingNo: order.packingNo,
          productName: pretItem?.productName ?? p.product,
          productCode: pretItem?.productCode ?? p.sku,
          category: enriched?.category ?? "",
          hsnCode: enriched?.hsnCode ?? "—",
          packagingUnit: enriched?.packagingUnit ?? "—",
          packingQty,
          skuQty,
          ratePerSku: unitPrice,
          discountType: "percentage",
          discountPct: 0,
          discountAmount: calc.discountAmount,
          gstPct: totalGstPctFromRates(cgstPct, sgstPct, igstPct),
          cgstPct,
          sgstPct,
          igstPct,
          cgstAmount: calc.cgstAmount,
          sgstAmount: calc.sgstAmount,
          igstAmount: calc.igstAmount,
          netAmount: calc.netAmount,
          remarks: pretItem?.lineRemark ?? order.returnRemarks ?? "—",
          packedQty: p.packedQty,
          customerName,
          warehouse: warehouseName,
          batchAllocations: p.batchAllocations ?? [],
        });
        return;
      }

      const soLine = salesOrder?.lineItems.find(
        (l) => l.productCode === p.sku || l.productName === p.product,
      );
      const productRef = enriched?.productId
        ? loadProducts().find((x) => x.id === enriched.productId)
        : findProductRef(p.sku);
      const gstRate = productRef?.gstRate ?? "18%";

      if (soLine) {
        const unitPrice = soLine.finalRate || soLine.unitPrice || soLine.dealerPrice;
        const discountPct = soLine.discount || soLine.schemeDiscountPercent || 0;
        const tax = computeLineTaxBreakdown(
          {
            quantity: skuQty,
            unitPrice: soLine.unitPrice,
            discount: discountPct,
            finalRate: unitPrice,
            schemeApplied: soLine.schemeApplied,
            schemeCode: soLine.schemeCode,
          },
          gstRate,
          taxSupplyType,
        );
        const grossAmount = skuQty * unitPrice;
        const discountAmount =
          soLine.schemeApplied === "Yes"
            ? (soLine.schemeDiscountAmount || 0) * skuQty
            : grossAmount * (discountPct / 100);

        rows.push({
          key,
          orderId: order.id,
          packingNo: order.packingNo,
          productName: soLine.productName || p.product,
          productCode: soLine.productCode || p.sku,
          category: enriched?.category ?? productRef?.category ?? "",
          hsnCode: enriched?.hsnCode ?? productRef?.hsnCode ?? "—",
          packagingUnit: enriched?.packagingUnit ?? productRef?.packagingUnit ?? "—",
          packingQty,
          skuQty,
          ratePerSku: unitPrice,
          discountType: "percentage",
          discountPct,
          discountAmount: Math.round(discountAmount * 100) / 100,
          gstPct: parseGstRate(gstRate),
          cgstPct: taxSupplyType === "intra" ? parseGstRate(gstRate) / 2 : 0,
          sgstPct: taxSupplyType === "intra" ? parseGstRate(gstRate) / 2 : 0,
          igstPct: taxSupplyType === "inter" ? parseGstRate(gstRate) : 0,
          cgstAmount: tax.cgstAmount,
          sgstAmount: tax.sgstAmount,
          igstAmount: tax.igstAmount,
          netAmount: Math.round((grossAmount - discountAmount + tax.gstAmount) * 100) / 100,
          remarks: "—",
          packedQty: p.packedQty,
          customerName,
          warehouse: warehouseName,
          batchAllocations: p.batchAllocations ?? [],
        });
        return;
      }

      const poLine = po?.lines.find(
        (l) => l.productCode === p.sku || l.sku === p.sku || l.productName === p.product,
      );
      const unitPrice = poLine?.unitPrice ?? enriched?.ratePerSku ?? 0;
      const cgstPct = poLine?.cgstPct ?? (taxSupplyType === "intra" ? 9 : 0);
      const sgstPct = poLine?.sgstPct ?? (taxSupplyType === "intra" ? 9 : 0);
      const igstPct = poLine?.igstPct ?? (taxSupplyType === "inter" ? 18 : 0);
      const discountPct = poLine?.discountPct ?? 0;
      const discountType = poLine?.discountType ?? "percentage";
      const calc = calcLineAmounts({
        orderedQty: skuQty,
        unitPrice,
        discountType,
        discountPct,
        discountFlatAmount: poLine?.discountFlatAmount ?? 0,
        cgstPct,
        sgstPct,
        igstPct,
      });

      rows.push({
        key,
        orderId: order.id,
        packingNo: order.packingNo,
        productName: poLine?.productName ?? p.product,
        productCode: poLine?.productCode ?? p.sku,
        category: enriched?.category ?? poLine?.category ?? "",
        hsnCode: enriched?.hsnCode ?? poLine?.hsnCode ?? "—",
        packagingUnit: enriched?.packagingUnit ?? poLine?.packagingUnit ?? "—",
        packingQty,
        skuQty,
        ratePerSku: unitPrice,
        discountType,
        discountPct,
        discountAmount: calc.discountAmount,
        gstPct: totalGstPctFromRates(cgstPct, sgstPct, igstPct),
        cgstPct,
        sgstPct,
        igstPct,
        cgstAmount: calc.cgstAmount,
        sgstAmount: calc.sgstAmount,
        igstAmount: calc.igstAmount,
        netAmount: calc.netAmount,
        remarks: poLine?.remarks ?? "—",
        packedQty: p.packedQty,
        customerName,
        warehouse: warehouseName,
        batchAllocations: p.batchAllocations ?? [],
      });
    });
  });

  return rows;
}

export function sumDispatchProductLines(lines: DispatchProductLine[]) {
  return {
    totalSkuQty: lines.reduce((s, l) => s + l.skuQty, 0),
    totalNet: lines.reduce((s, l) => s + l.netAmount, 0),
  };
}
