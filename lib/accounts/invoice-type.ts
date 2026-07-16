import type { DispatchRecord } from "@/app/(app)/warehouse/dispatch/types";
import type { InvoiceRecord } from "@/app/(app)/accounts/invoices/invoices-data";

export type InvoiceDocumentType = "sales" | "stock_transfer";

/** Upstream document that generated the invoice (optional; persists for listing tabs). */
export type SalesInvoiceSourceType =
  | "sales_order"
  | "stock_transfer"
  | "sample_order"
  | "direct";

export const INVOICE_TYPE_LABELS: Record<InvoiceDocumentType, string> = {
  sales: "Sales",
  stock_transfer: "Stock Transfer",
};

/** Indian FY label from invoice date, e.g. 2026-07-15 → "2026-27". */
export function invoiceFinancialYearLabel(invoiceDate: string): string {
  const raw = (invoiceDate || "").trim();
  const d = new Date(`${raw || new Date().toISOString().slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    const y = new Date().getFullYear();
    return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
  }
  const month = d.getMonth();
  const year = d.getFullYear();
  const startYear = month >= 3 ? year : year - 1;
  const endYY = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endYY}`;
}

/**
 * Sales Order invoice series: PVB/{FY}/{NNNN}.
 * Demo baseline for the FY starts at 0219 (first generated number).
 */
export function nextPvbSalesOrderInvoiceNo(
  records: InvoiceRecord[],
  invoiceDate: string,
): string {
  const fy = invoiceFinancialYearLabel(invoiceDate);
  const pattern = new RegExp(`^PVB/${fy.replace("-", "\\-")}/(\\d+)$`);
  /** First issued number for a new FY when no PVB invoices exist yet. */
  const DEMO_BASELINE = 218;
  let max = DEMO_BASELINE;
  for (const r of records) {
    const match = r.invoiceNo.match(pattern);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `PVB/${fy}/${String(max + 1).padStart(4, "0")}`;
}

export function peekNextPvbSalesOrderInvoiceNo(
  records: InvoiceRecord[],
  invoiceDate: string,
): string {
  return nextPvbSalesOrderInvoiceNo(records, invoiceDate);
}

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
