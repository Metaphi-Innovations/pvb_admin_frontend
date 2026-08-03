import type { GrnBatch } from "@/app/(app)/warehouse/grn/types";
import {
  applyTaxSupplyToRates,
  calcLineAmounts,
  amountInWords,
  resolveTaxSupplyType,
  round2,
  type TaxSupplyType,
} from "@/lib/procurement/utils";
import {
  sumAdditionalCharges,
  sumAdditionalChargeTaxes,
  type ProcurementAdditionalCharge,
} from "@/lib/procurement/procurement-line-utils";
import type { POSummary, PurchaseOrder } from "../purchase-orders/po-data";
import {
  findPOAddressById,
  getPOBillToAddresses,
} from "../purchase-orders/po-address-utils";
import type { PurchaseReturn, PurchaseReturnItem } from "./purchase-return-data";

export function resolveTaxSupplyForPO(po: PurchaseOrder): TaxSupplyType {
  const billToAddresses = getPOBillToAddresses();
  const billToAddress = findPOAddressById(billToAddresses, po.billToAddressId ?? "");
  const warehouseState = po.state ?? po.shipping?.shipToLocation ?? "";
  const billToState = billToAddress?.state ?? po.billing?.state ?? "";
  return resolveTaxSupplyType(warehouseState, billToState);
}

export function resolveBatchPricing(
  batch: GrnBatch,
  po: PurchaseOrder,
  taxSupplyType: TaxSupplyType,
): Pick<
  PurchaseReturnItem,
  "unitPrice" | "cgstPct" | "sgstPct" | "igstPct"
> {
  const poLine = po.lines.find(
    (l) =>
      l.productCode === batch.productCode ||
      String(l.productId) === batch.productId,
  );

  const unitPrice = batch.unitPrice ?? poLine?.unitPrice ?? 0;

  if (poLine) {
    return {
      unitPrice,
      cgstPct: poLine.cgstPct,
      sgstPct: poLine.sgstPct,
      igstPct: poLine.igstPct,
    };
  }

  const totalGst = batch.gstPct ?? 18;
  const rates = applyTaxSupplyToRates(totalGst, taxSupplyType);
  return { unitPrice, ...rates };
}

export function recalcReturnItem(item: PurchaseReturnItem): PurchaseReturnItem {
  const qty = item.selected && item.returnQty > 0 ? item.returnQty : 0;
  const calc = calcLineAmounts({
    orderedQty: qty,
    unitPrice: item.unitPrice,
    discountType: "percentage",
    discountPct: 0,
    discountFlatAmount: 0,
    cgstPct: item.cgstPct,
    sgstPct: item.sgstPct,
    igstPct: item.igstPct,
  });

  return {
    ...item,
    grossAmount: calc.grossAmount,
    taxableValue: calc.taxableValue,
    cgstAmount: calc.cgstAmount,
    sgstAmount: calc.sgstAmount,
    igstAmount: calc.igstAmount,
    taxAmount: calc.taxAmount,
    netAmount: calc.netAmount,
  };
}

export function buildReturnSummary(
  items: PurchaseReturnItem[],
  additionalCharges: ProcurementAdditionalCharge[] = [],
): POSummary {
  let grossAmount = 0;
  let totalDiscount = 0;
  let taxableValue = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  items
    .filter((it) => it.selected && it.returnQty > 0)
    .forEach((it) => {
      const line = recalcReturnItem(it);
      grossAmount += line.grossAmount;
      totalDiscount += 0;
      taxableValue += line.taxableValue;
      totalCgst += line.cgstAmount;
      totalSgst += line.sgstAmount;
      totalIgst += line.igstAmount;
    });

  grossAmount = round2(grossAmount);
  const productTotal = round2(taxableValue);
  const additionalChargesTotal = round2(sumAdditionalCharges(additionalCharges));
  const chargeTaxes = sumAdditionalChargeTaxes(additionalCharges);
  taxableValue = round2(productTotal + additionalChargesTotal);
  totalCgst = round2(totalCgst + chargeTaxes.totalCgst);
  totalSgst = round2(totalSgst + chargeTaxes.totalSgst);
  totalIgst = round2(totalIgst + chargeTaxes.totalIgst);
  const grandTotal = round2(taxableValue + totalCgst + totalSgst + totalIgst);

  return {
    grossAmount,
    totalDiscount,
    productTotal,
    additionalChargesTotal,
    taxableValue,
    totalCgst,
    totalSgst,
    totalIgst,
    otherCharges: additionalChargesTotal,
    grandTotal,
    amountInWords: amountInWords(grandTotal),
  };
}

export function recalcPurchaseReturn(
  record: PurchaseReturn,
  po?: PurchaseOrder,
): PurchaseReturn {
  const taxSupplyType =
    record.taxSupplyType ?? (po ? resolveTaxSupplyForPO(po) : "intra");
  const additionalCharges = record.additionalCharges ?? [];

  const items = record.items.map((it) => {
    let next = { ...it };
    if (po && (!it.unitPrice || it.unitPrice === 0)) {
      // rates already set at line build; recalc only
    }
    next = recalcReturnItem(next);
    return next;
  });

  const summary = buildReturnSummary(items, additionalCharges);
  const active = items.filter((it) => it.selected && it.returnQty > 0);

  return {
    ...record,
    additionalCharges,
    items,
    summary,
    taxSupplyType,
    totalItems: active.length,
    totalReturnQty: active.reduce((s, it) => s + it.returnQty, 0),
  };
}

export function emptyReturnSummary(): POSummary {
  return {
    grossAmount: 0,
    totalDiscount: 0,
    productTotal: 0,
    additionalChargesTotal: 0,
    taxableValue: 0,
    totalCgst: 0,
    totalSgst: 0,
    totalIgst: 0,
    otherCharges: 0,
    grandTotal: 0,
    amountInWords: "",
  };
}
