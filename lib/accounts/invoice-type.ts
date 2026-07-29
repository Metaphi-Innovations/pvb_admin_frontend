import type { DispatchRecord } from "@/app/(app)/warehouse/dispatch/types";
import type { InvoiceRecord } from "@/app/(app)/accounts/invoices/invoices-data";

export type InvoiceDocumentType = "sales" | "stock_transfer" | "sample_order";

/** Upstream document that generated the invoice (optional; persists for listing tabs). */
export type SalesInvoiceSourceType =
  | "sales_order"
  | "stock_transfer"
  | "sample_order"
  | "direct"
  | "service";

/** Commercial vs proforma document kind (Sample Order uses proforma). */
export type InvoiceDocumentKind = "tax_invoice" | "proforma_invoice";

export const SALES_INVOICE_SOURCE_LABELS: Record<
  "sales_order" | "stock_transfer" | "sample_order" | "service",
  string
> = {
  sales_order: "Sales Order",
  stock_transfer: "Stock Transfer",
  sample_order: "Sample Order",
  service: "Service",
};

/** Display label for listing Invoice Type column. */
export function salesInvoiceTypeLabel(
  sourceType: SalesInvoiceSourceType | undefined,
  fallback: "sales_order" | "stock_transfer" | "sample_order" | "service" = "sales_order",
): string {
  const key =
    !sourceType || sourceType === "direct" ? fallback : sourceType;
  return SALES_INVOICE_SOURCE_LABELS[key] ?? "Sales Order";
}

/**
 * Service invoice series: SVC/{FY}/{NNNN}.
 */
export function nextServiceInvoiceNo(
  records: InvoiceRecord[],
  invoiceDate: string,
): string {
  const fy = invoiceFinancialYearLabel(invoiceDate);
  const pattern = new RegExp(`^SVC/${fy.replace("-", "\\-")}/(\\d+)$`);
  let max = 0;
  for (const r of records) {
    const match = r.invoiceNo.match(pattern);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `SVC/${fy}/${String(max + 1).padStart(4, "0")}`;
}

export function peekNextServiceInvoiceNo(
  records: InvoiceRecord[],
  invoiceDate: string,
): string {
  return nextServiceInvoiceNo(records, invoiceDate);
}

/**
 * Sample Order Proforma series: PVB/SMP/{FY}/{NNNN}.
 */
export function nextSampleOrderProformaNo(
  records: InvoiceRecord[],
  invoiceDate: string,
): string {
  const fy = invoiceFinancialYearLabel(invoiceDate);
  const pattern = new RegExp(`^PVB/SMP/${fy.replace("-", "\\-")}/(\\d+)$`);
  let max = 0;
  for (const r of records) {
    const match = r.invoiceNo.match(pattern);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `PVB/SMP/${fy}/${String(max + 1).padStart(4, "0")}`;
}

export function peekNextSampleOrderProformaNo(
  records: InvoiceRecord[],
  invoiceDate: string,
): string {
  return nextSampleOrderProformaNo(records, invoiceDate);
}

export const INVOICE_TYPE_LABELS: Record<InvoiceDocumentType, string> = {
  sales: "Sales",
  stock_transfer: "Stock Transfer",
  sample_order: "Sample Order",
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

export function isSampleOrderDispatch(
  dispatch: Pick<DispatchRecord, "source_type" | "sourceDocumentType">,
): boolean {
  return (
    dispatch.source_type === "sample_order" ||
    dispatch.sourceDocumentType === "Sample Order"
  );
}

export function getDispatchInvoiceType(
  dispatch: Pick<DispatchRecord, "source_type" | "sourceDocumentType">,
): InvoiceDocumentType {
  if (isStockTransferDispatch(dispatch)) return "stock_transfer";
  if (isSampleOrderDispatch(dispatch)) return "sample_order";
  return "sales";
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
  invoice: Pick<InvoiceRecord, "invoiceType" | "invoiceNo" | "sourceType">,
): InvoiceDocumentType {
  if (invoice.invoiceType) return invoice.invoiceType;
  if (invoice.sourceType === "sample_order") return "sample_order";
  if (invoice.invoiceNo.startsWith("STI-")) return "stock_transfer";
  if (invoice.invoiceNo.startsWith("PVB/SMP/")) return "sample_order";
  return "sales";
}

export function nextInvoiceDocumentNo(
  records: InvoiceRecord[],
  type: InvoiceDocumentType,
  invoiceDate: string,
): string {
  if (type === "sample_order") {
    return nextSampleOrderProformaNo(records, invoiceDate);
  }
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

export function peekNextStockTransferInvoiceNo(
  records: InvoiceRecord[],
  invoiceDate: string,
): string {
  return nextInvoiceDocumentNo(records, "stock_transfer", invoiceDate);
}
