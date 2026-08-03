import type { GrnRecord, GrnStatus } from "@/app/(app)/warehouse/grn/types";
import type { QcRecord } from "@/app/(app)/warehouse/qc/types";

export type GrnSourceFilter = "purchase" | "stock_transfer" | "sales_return" | "sample_return";

export function getGrnSourceType(grn: GrnRecord): GrnSourceFilter {
  if (grn.sourceType === "stock_transfer") return "stock_transfer";
  if (grn.sourceType === "sales_return") return "sales_return";
  if (grn.sourceType === "sample_return") return "sample_return";
  return "purchase";
}

export function getQcSourceType(qc: QcRecord): GrnSourceFilter {
  if (qc.sourceType) return qc.sourceType as GrnSourceFilter;
  if (qc.stockTransferNo?.startsWith("ST-")) return "stock_transfer";
  if (qc.grnNo?.startsWith("GRN-SR-")) return "sales_return";
  if (qc.grnNo?.startsWith("GRN-SMP-")) return "sample_return";
  return "purchase";
}

export type StockTransferGrnDisplayStatus =
  | "Pending Receipt"
  | "Partially Received"
  | "Received"
  | "QC Pending"
  | "QC Completed";

export function getStockTransferGrnDisplayStatus(input: {
  isPendingTransfer: boolean;
  receiptStatus?: GrnRecord["receiptStatus"];
  grnStatus?: GrnStatus;
}): StockTransferGrnDisplayStatus {
  if (input.isPendingTransfer) return "Pending Receipt";
  if (input.grnStatus === "qc_completed") return "QC Completed";
  if (input.receiptStatus === "partially_received") return "Partially Received";
  if (input.grnStatus === "pending_qc" || input.grnStatus === "qc_in_progress") {
    return "QC Pending";
  }
  if (input.receiptStatus === "received") return "Received";
  return "Pending Receipt";
}

export const ST_GRN_STATUS_BADGE: Record<
  StockTransferGrnDisplayStatus,
  { bg: string; label: string }
> = {
  "Pending Receipt": { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending Receipt" },
  "Partially Received": { bg: "bg-orange-50 text-orange-700 border-orange-200", label: "Partially Received" },
  Received: { bg: "bg-sky-50 text-sky-700 border-sky-200", label: "Received" },
  "QC Pending": { bg: "bg-navy-50 text-navy-700 border-navy-200", label: "QC Pending" },
  "QC Completed": { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "QC Completed" },
};

/** Default destination warehouse filter value for GRN listing tabs. */
export const DEFAULT_DESTINATION_WAREHOUSE = "All";
