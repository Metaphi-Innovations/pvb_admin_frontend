export type WarehouseOrderDocType =
  | "sales_order"
  | "sample_order"
  | "stock_transfer"
  | "purchase_return";

export type OrderTypeFilterTab =
  | "all"
  | "sales"
  | "sample"
  | "stock_transfer"
  | "purchase_return";

export function resolveWarehouseOrderType(record: {
  sourceDocumentType?: string;
  source_type?: string;
  salesOrderNo?: string;
  source_document_no?: string;
}): WarehouseOrderDocType {
  const docType = record.sourceDocumentType || record.source_type || "";
  const docNo = record.salesOrderNo || record.source_document_no || "";

  if (docType === "Stock Transfer" || docType === "stock_transfer") {
    return "stock_transfer";
  }
  if (
    docType === "Purchase Return" ||
    docType === "purchase_return" ||
    docNo.startsWith("PRET-")
  ) {
    return "purchase_return";
  }
  if (
    docType === "Sample Order" ||
    docType === "sample_order" ||
    docNo.startsWith("SM-") ||
    docNo.startsWith("SMP-")
  ) {
    return "sample_order";
  }
  return "sales_order";
}

export function matchesOrderTypeFilter(
  type: WarehouseOrderDocType,
  tab: OrderTypeFilterTab,
): boolean {
  if (tab === "all") return true;
  if (tab === "sales") return type === "sales_order";
  if (tab === "sample") return type === "sample_order";
  if (tab === "stock_transfer") return type === "stock_transfer";
  if (tab === "purchase_return") return type === "purchase_return";
  return true;
}

export const ORDER_TYPE_BADGE_CONFIG: Record<
  WarehouseOrderDocType,
  { bg: string; label: string }
> = {
  sales_order: {
    bg: "bg-navy-50 text-navy-700 border-navy-200",
    label: "Sales",
  },
  sample_order: {
    bg: "bg-purple-50 text-purple-700 border-purple-200",
    label: "Sample",
  },
  stock_transfer: {
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    label: "Transfer",
  },
  purchase_return: {
    bg: "bg-rose-50 text-rose-700 border-rose-200",
    label: "P. Return",
  },
};

export function formatWarehouseOrderAmount(
  type: WarehouseOrderDocType,
  amount: number | undefined,
): string {
  if (type === "sample_order") return "₹0.00";
  return `₹${(amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Sample dispatch listing uses Ready to Dispatch / Dispatched labels. */
export function formatDispatchStatusLabel(
  type: WarehouseOrderDocType,
  status: string,
): string {
  if (type !== "sample_order") return status;
  if (status === "Pending Dispatch") return "Ready to Dispatch";
  if (
    status === "In Transit" ||
    status === "Delivered" ||
    status === "Partially Delivered"
  ) {
    return "Dispatched";
  }
  return status;
}
