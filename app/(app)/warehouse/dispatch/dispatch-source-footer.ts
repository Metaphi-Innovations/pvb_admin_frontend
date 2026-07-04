import { getPOById, loadPurchaseOrders } from "@/app/(app)/procurement/purchase-orders/po-data";
import { getPurchaseReturnByReturnNumber } from "@/app/(app)/procurement/purchase-returns/purchase-return-packing-sync";
import { hydrateOrders, loadOrders } from "@/app/(app)/sales/orders/orders-data";
import {
  sumAdditionalChargeTaxes,
  sumAdditionalCharges,
  type ProcurementAdditionalCharge,
} from "@/lib/procurement/procurement-line-utils";
import { amountInWords, round2, type TaxSupplyType } from "@/lib/procurement/utils";
import type { PackingRecord } from "../packing/types";
import type { DispatchProductLine } from "./dispatch-product-lines";

export interface DispatchSourceAttachment {
  uid: string;
  name: string;
}

export interface DispatchSourceFooterData {
  additionalCharges: ProcurementAdditionalCharge[];
  remarks: string;
  attachments: DispatchSourceAttachment[];
  taxSupplyType: TaxSupplyType;
  productTotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  taxTotal: number;
  amountInWords: string;
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

function resolveSourceMeta(selectedOrders: PackingRecord[]) {
  const firstOrder = selectedOrders[0];
  if (!firstOrder) {
    return { additionalCharges: [], remarks: "", attachments: [] as DispatchSourceAttachment[] };
  }

  if (isPurchaseReturnPacking(firstOrder)) {
    const pret = getPurchaseReturnByReturnNumber(getReturnNumber(firstOrder));
    const po = pret ? getPOById(pret.poId) : undefined;
    return {
      additionalCharges: pret?.additionalCharges ?? [],
      remarks: pret?.overallRemarks || po?.notes || "",
      attachments: (po?.attachments ?? []).map((a) => ({ uid: a.uid, name: a.name })),
    };
  }

  const salesOrder = hydrateOrders(loadOrders()).find(
    (o) => o.soNumber === firstOrder.salesOrderNo,
  );
  if (salesOrder) {
    const soCharges: ProcurementAdditionalCharge[] = (salesOrder.additionalExpenses ?? []).map(
      (exp) => ({
        uid: exp.id,
        chargeName: exp.expenseName,
        amount: exp.netAmount || exp.amount,
        cgstPct: 0,
        sgstPct: 0,
        igstPct: 0,
        remarks: "",
      }),
    );
    return {
      additionalCharges: soCharges,
      remarks: "",
      attachments: [],
    };
  }

  if (firstOrder.poNumber) {
    const linkedPo = loadPurchaseOrders().find((p) => p.poNumber === firstOrder.poNumber);
    if (linkedPo) {
      return {
        additionalCharges: linkedPo.additionalCharges ?? [],
        remarks: linkedPo.notes ?? "",
        attachments: (linkedPo.attachments ?? []).map((a) => ({ uid: a.uid, name: a.name })),
      };
    }
  }

  return {
    additionalCharges: [],
    remarks: firstOrder.returnRemarks ?? "",
    attachments: [],
  };
}

export function buildDispatchSourceFooterData(
  selectedOrders: PackingRecord[],
  dispatchProductLines: DispatchProductLine[],
  taxSupplyType: TaxSupplyType,
): DispatchSourceFooterData | null {
  if (selectedOrders.length === 0 || dispatchProductLines.length === 0) return null;

  const { additionalCharges, remarks, attachments } = resolveSourceMeta(selectedOrders);

  const productTotal = round2(
    dispatchProductLines.reduce(
      (sum, line) => sum + Math.max(0, line.skuQty * line.ratePerSku - line.discountAmount),
      0,
    ),
  );

  const lineCgst = dispatchProductLines.reduce((sum, line) => sum + line.cgstAmount, 0);
  const lineSgst = dispatchProductLines.reduce((sum, line) => sum + line.sgstAmount, 0);
  const lineIgst = dispatchProductLines.reduce((sum, line) => sum + line.igstAmount, 0);
  const chargeTaxes = sumAdditionalChargeTaxes(additionalCharges);

  const totalCgst = round2(lineCgst + chargeTaxes.totalCgst);
  const totalSgst = round2(lineSgst + chargeTaxes.totalSgst);
  const totalIgst = round2(lineIgst + chargeTaxes.totalIgst);
  const taxTotal = round2(totalCgst + totalSgst + totalIgst);

  const additionalTotal = round2(sumAdditionalCharges(additionalCharges));
  const grandTotal = round2(productTotal + additionalTotal + taxTotal);

  return {
    additionalCharges,
    remarks,
    attachments,
    taxSupplyType,
    productTotal,
    totalCgst,
    totalSgst,
    totalIgst,
    taxTotal,
    amountInWords: amountInWords(grandTotal),
  };
}
