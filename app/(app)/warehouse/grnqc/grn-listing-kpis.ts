import { loadPurchaseOrders } from "@/app/(app)/procurement/purchase-orders/po-data";
import { getPOQtySummary } from "@/app/(app)/procurement/purchase-orders/po-qty";
import { getGrnRecords } from "./grn/mock-data";
import type { GrnRecord } from "./grn/types";

export interface GrnListingKpis {
  pendingReceipt: number;
  partialReceipt: number;
  completedReceipt: number;
}

export function computeGrnListingKpis(
  grns: GrnRecord[] = getGrnRecords(),
): GrnListingKpis {
  const pos = loadPurchaseOrders().filter((p) =>
    ["approved", "invoice_uploaded"].includes(p.status),
  );

  let pendingReceipt = 0;
  let partialReceipt = 0;
  let completedReceipt = 0;

  for (const po of pos) {
    const summary = getPOQtySummary(po);
    if (summary.receivedQty <= 0) {
      pendingReceipt += 1;
    } else if (summary.pendingQty > 0) {
      partialReceipt += 1;
    } else {
      completedReceipt += 1;
    }
  }

  if (pos.length === 0) {
    return {
      pendingReceipt: grns.filter((g) => g.status !== "qc_completed").length,
      partialReceipt: 0,
      completedReceipt: grns.filter((g) => g.status === "qc_completed").length,
    };
  }

  return { pendingReceipt, partialReceipt, completedReceipt };
}
