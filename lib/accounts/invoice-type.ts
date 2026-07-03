import type { DispatchRecord } from "@/app/(app)/warehouse/dispatch/types";
import type { InvoiceRecord } from "@/app/(app)/accounts/invoices/invoices-data";

export type InvoiceDocumentType = "sales" | "stock_transfer";

export const INVOICE_TYPE_LABELS: Record<InvoiceDocumentType, string> = {
  sales: "Sales",
  stock_transfer: "Stock Transfer",
};

export function isStockTransferDispatch(
  dispatch: Pick<DispatchRecord, "source_type" | "sourceDocumentType">,
): boolean {
  return (
    dispatch.source_type === "stock_transfer" ||
    dispatch.sourceDocumentType === "Stock Transfer"
  );
}

export function getDispatchInvoiceType(
  dispatch: Pick<DispatchRecord, "source_type" | "sourceDocumentType">,
): InvoiceDocumentType {
  return isStockTransferDispatch(dispatch) ? "stock_transfer" : "sales";
}

export function getDispatchPartyName(dispatch: DispatchRecord): string {
  if (isStockTransferDispatch(dispatch)) {
    return (
      dispatch.target_warehouse_name?.trim() ||
      dispatch.targetWarehouse?.trim() ||
      dispatch.customer?.trim() ||
      "—"
    );
  }
  return dispatch.customer_name?.trim() || dispatch.customer?.trim() || "—";
}

export function resolveInvoiceDocumentType(
  invoice: Pick<InvoiceRecord, "invoiceType" | "invoiceNo">,
): InvoiceDocumentType {
  if (invoice.invoiceType) return invoice.invoiceType;
  if (invoice.invoiceNo.startsWith("STI-")) return "stock_transfer";
  return "sales";
}

export function nextInvoiceDocumentNo(
  records: InvoiceRecord[],
  type: InvoiceDocumentType,
  invoiceDate: string,
): string {
  const year = invoiceDate.slice(0, 4) || String(new Date().getFullYear());
  const prefix = type === "stock_transfer" ? "STI" : "INV";
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  const max = records.reduce((m, r) => {
    if (resolveInvoiceDocumentType(r) !== type) return m;
    const match = r.invoiceNo.match(pattern);
    return match ? Math.max(m, parseInt(match[1], 10)) : m;
  }, 0);
  return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
}
