import { loadPurchaseOrders } from "@/app/(app)/procurement/purchase-orders/po-data";
import { getPOQtySummary } from "@/app/(app)/procurement/purchase-orders/po-qty";
import { loadPurchaseRequests } from "@/app/(app)/procurement/purchase-requests/pr-data";
import type { PurchaseRequest } from "@/app/(app)/procurement/purchase-requests/pr-data";
import type { PurchaseOrder } from "@/app/(app)/procurement/purchase-orders/po-data";

export interface PRListingKpis {
  total: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
  closed: number;
}

export interface POListingKpis {
  total: number;
  openPo: number;
  partialReceived: number;
  fullyReceived: number;
  closedPo: number;
  totalPoValue: number;
}

export function computePRListingKpis(
  records: PurchaseRequest[] = loadPurchaseRequests(),
): PRListingKpis {
  return {
    total: records.length,
    pendingApproval: records.filter((r) => r.status === "pending_approval").length,
    approved: records.filter(
      (r) =>
        r.status === "approved" ||
        ["partially_converted", "fully_converted"].includes(r.status),
    ).length,
    rejected: records.filter((r) => r.status === "rejected").length,
    closed: records.filter((r) => r.status === "closed").length,
  };
}

export function computePOListingKpis(
  records: PurchaseOrder[] = loadPurchaseOrders(),
): POListingKpis {
  let openPo = 0;
  let partialReceived = 0;
  let fullyReceived = 0;
  let closedPo = 0;

  for (const po of records) {
    if (["closed", "short_closed"].includes(po.status)) {
      closedPo += 1;
      continue;
    }
    if (["cancelled", "rejected", "draft"].includes(po.status)) {
      continue;
    }
    if (po.status === "pending_approval") {
      openPo += 1;
      continue;
    }
    if (["approved", "invoice_uploaded"].includes(po.status)) {
      const summary = getPOQtySummary(po);
      if (summary.receivedQty <= 0) {
        openPo += 1;
      } else if (summary.pendingQty > 0) {
        partialReceived += 1;
      } else {
        fullyReceived += 1;
      }
    }
  }

  const totalPoValue = records.reduce(
    (sum, po) => sum + (po.summary?.grandTotal ?? 0),
    0,
  );

  return {
    total: records.length,
    openPo,
    partialReceived,
    fullyReceived,
    closedPo,
    totalPoValue: Math.round(totalPoValue * 100) / 100,
  };
}

export function formatPoValueKpi(value: number): string {
  if (value >= 10_000_000) {
    return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  }
  if (value >= 100_000) {
    return `₹${(value / 100_000).toFixed(2)} L`;
  }
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
