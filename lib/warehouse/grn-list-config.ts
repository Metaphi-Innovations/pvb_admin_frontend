import type { BackendGrnSourceType } from "@/lib/warehouse/grn-status";

export type GrnListingTab =
  | "purchase"
  | "sales_return"
  | "sample_return"
  | "stock_transfer"
  | "stock_transfer_pending"
  | "stock_transfer_completed";

export interface GrnTabApiContext {
  sourceType: BackendGrnSourceType;
  status?: "QC_PENDING" | "QC_COMPLETED";
}

export function getGrnTabApiContext(tab: GrnListingTab): GrnTabApiContext {
  switch (tab) {
    case "purchase":
      return { sourceType: "PURCHASE_ORDER" };
    case "sales_return":
      return { sourceType: "SALES_RETURN" };
    case "sample_return":
      return { sourceType: "SAMPLE_RETURN" };
    case "stock_transfer":
      return { sourceType: "STOCK_TRANSFER" };
    case "stock_transfer_pending":
      return { sourceType: "STOCK_TRANSFER", status: "QC_PENDING" };
    case "stock_transfer_completed":
      return { sourceType: "STOCK_TRANSFER", status: "QC_COMPLETED" };
  }
}

/** Received tab lists all Stock Transfer GRNs (any QC status). */
export function getStockTransferReceivedApiContext(): GrnTabApiContext {
  return getGrnTabApiContext("stock_transfer");
}
