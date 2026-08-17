/**
 * Sales Invoices — tab meta + API-backed listing helpers.
 * Used only by Transactions → Sales Invoice.
 */

import { salesInvoiceTypeLabel } from "@/lib/accounts/invoice-type";
import {
  SalesInvoiceService,
  mapInvoiceTypeToKind,
  tabToInvoiceType,
  type SalesInvoiceListDto,
} from "@/services/sales-invoice.service";
import {
  buildEInvoiceDetails,
  buildEWayDetails,
  resolveListingEInvoiceStatus,
  resolveListingEWayStatus,
  type ListingEInvoiceStatus,
  type ListingEWayStatus,
  type SalesInvoiceEInvoiceDetails,
  type SalesInvoiceEWayDetails,
} from "./sales-invoice-statutory";
import type { InvoiceRecord } from "@/app/(app)/accounts/invoices/invoices-data";

export type SalesInvoiceKind = "sales_order" | "stock_transfer" | "sample_order" | "service";

export type SalesInvoiceTabId = "all" | SalesInvoiceKind;

export const SALES_INVOICE_TAB_META: Record<
  SalesInvoiceTabId,
  {
    label: string;
    sourceNoLabel: string;
    exportFileName: string;
    emptyMessage: string;
  }
> = {
  all: {
    label: "All Invoices",
    sourceNoLabel: "Reference No.",
    exportFileName: "all-sales-invoices.xlsx",
    emptyMessage: "No sales invoices generated yet.",
  },
  sales_order: {
    label: "Sales Order Invoices",
    sourceNoLabel: "Sales Order No.",
    exportFileName: "sales-order-invoices.xlsx",
    emptyMessage: "No sales order invoices generated yet.",
  },
  stock_transfer: {
    label: "Stock Transfer Invoices",
    sourceNoLabel: "Stock Transfer No.",
    exportFileName: "stock-transfer-invoices.xlsx",
    emptyMessage: "No stock transfer invoices generated yet.",
  },
  sample_order: {
    label: "Sample Order Invoices",
    sourceNoLabel: "Sample Order No.",
    exportFileName: "sample-order-invoices.xlsx",
    emptyMessage: "No sample order invoices generated yet.",
  },
  service: {
    label: "Service Invoices",
    sourceNoLabel: "Manual Reference No.",
    exportFileName: "service-invoices.xlsx",
    emptyMessage: "No service invoices created yet.",
  },
};

/** Display row for a generated sales invoice, retaining source identity. */
export interface SalesInvoiceListRow {
  id: number | string;
  /** Backend sales invoice UUID (preferred for API calls). */
  salesInvoiceId?: string;
  /** Tab membership for source-specific tabs; service only appears in All. */
  sourceType: SalesInvoiceKind;
  sourceRecordId: number | string | null;
  invoiceId: number | string;
  invoiceNo: string;
  invoiceDate: string;
  invoiceTypeLabel: string;
  /** Compact reference lines: order/transfer + dispatch, or manual ref / — */
  referencePrimary: string;
  referenceSecondary: string;
  partyOrTransfer: string;
  orderNo: string;
  dispatchNo: string;
  customerName: string;
  customerCode: string;
  gstin?: string;
  fromWarehouse: string;
  toWarehouse: string;
  totalAmount: number;
  /** Qty sum for goods; line count for service when qty not meaningful */
  qtyOrItemCount: number;
  itemCount: number;
  branch: string;
  invoiceStatus: InvoiceRecord["invoiceStatus"];
  viewHref: string;
  editHref: string | null;
  canCancel: boolean;
  canEdit: boolean;
  canPdf: boolean;
  canDownloadPi: boolean;
  canDownloadTaxInvoice: boolean;
  eInvoiceStatusLabel: ListingEInvoiceStatus;
  ewayBillStatusLabel: ListingEWayStatus;
  eInvoiceDetails: SalesInvoiceEInvoiceDetails;
  ewayBillDetails: SalesInvoiceEWayDetails;
}

const LIST_PATH = "/accounts/transactions/invoices";

function hasPdfValue(value: unknown): boolean {
  const text = String(value ?? "").trim();
  return Boolean(text) && text !== "-" && text !== "—";
}

export function mapApiInvoiceToListRow(
  dto: SalesInvoiceListDto,
): SalesInvoiceListRow {
  const kind = mapInvoiceTypeToKind(dto.invoice_type, dto.dispatch?.source_type);
  const status =
    String(dto.status).toUpperCase() === "CANCELLED" ||
    String(dto.status).toUpperCase() === "REVERSED"
      ? ("cancelled" as const)
      : String(dto.status).toUpperCase() === "POSTED"
        ? ("sent" as const)
        : ("draft" as const);

  const snap = (dto.customer_snapshot || {}) as Record<string, unknown>;
  const whSnap = (dto.warehouse_snapshot || {}) as Record<string, unknown>;
  const destSnap = (dto.destination_warehouse_snapshot || {}) as Record<string, unknown>;

  const customerName =
    dto.customer?.customer_name ||
    String(snap.customer_name || snap.customerName || "").trim() ||
    "—";
  const customerCode =
    dto.customer?.customer_code ||
    String(snap.customer_code || snap.customerCode || "").trim() ||
    "";
  const gstin = String(snap.gstin_no || snap.gstin || "").trim();
  const warehouseName =
    dto.warehouse?.warehouse_name ||
    String(whSnap.warehouse_name || whSnap.warehouseName || "").trim() ||
    "—";
  const destWarehouse =
    String(destSnap.warehouse_name || destSnap.warehouseName || "").trim() || "—";
  const totalAmount =
    Math.round((Number(dto.invoice_amount) || 0) * 100) / 100;
  const id = dto.sales_invoice_id;
  const dispatchNo =
    dto.dispatch?.dispatch_number || dto.dispatch_number || "—";
  const orderNo = dto.sales_order?.so_number || "—";
  const totalQty = Math.round((Number(dto.total_quantity) || 0) * 100) / 100;

  const stubRecord = {
    invoiceNo: dto.invoice_number,
    sourceType:
      kind === "service"
        ? ("service" as const)
        : kind === "stock_transfer"
          ? ("stock_transfer" as const)
          : ("sales_order" as const),
    irn: dto.irn_number || undefined,
    eInvoiceNo: dto.einvoice_status || undefined,
    ewayBillNo: dto.dispatch?.eway_bill_number || undefined,
  };
  const eInvoiceStatusLabel = resolveListingEInvoiceStatus(
    stubRecord as never,
    kind,
  );
  const ewayBillStatusLabel = resolveListingEWayStatus(stubRecord as never, kind);
  const canDownloadPi =
    kind !== "service" && hasPdfValue(dto.dispatch_id);
  const canDownloadTaxInvoice =
    canDownloadPi &&
    hasPdfValue(dto.irn_number) &&
    hasPdfValue(dto.dispatch?.eway_bill_number);

  return {
    id,
    salesInvoiceId: id,
    sourceType: kind,
    sourceRecordId: dto.dispatch_id ?? null,
    invoiceId: id,
    invoiceNo: dto.invoice_number,
    invoiceDate: String(dto.invoice_date || "").slice(0, 10),
    invoiceTypeLabel: salesInvoiceTypeLabel(
      kind === "service"
        ? "service"
        : kind === "stock_transfer"
          ? "stock_transfer"
          : "sales_order",
      kind,
    ),
    referencePrimary: orderNo !== "—" ? orderNo : dispatchNo,
    referenceSecondary: orderNo !== "—" ? dispatchNo : "—",
    partyOrTransfer:
      kind === "stock_transfer"
        ? `${warehouseName} → ${destWarehouse}`
        : customerName,
    orderNo,
    dispatchNo,
    customerName,
    customerCode,
    gstin,
    fromWarehouse: kind === "stock_transfer" ? warehouseName : "",
    toWarehouse: kind === "stock_transfer" ? destWarehouse : "",
    totalAmount: kind === "sample_order" ? 0 : totalAmount,
    qtyOrItemCount: totalQty,
    itemCount: totalQty > 0 ? 1 : 0,
    branch: warehouseName,
    invoiceStatus: status,
    viewHref: `${LIST_PATH}/${id}`,
    editHref: null,
    canCancel: status !== "cancelled",
    canEdit: false,
    canPdf: kind === "service",
    canDownloadPi,
    canDownloadTaxInvoice,
    eInvoiceStatusLabel,
    ewayBillStatusLabel,
    eInvoiceDetails: buildEInvoiceDetails(stubRecord as never, eInvoiceStatusLabel),
    ewayBillDetails: buildEWayDetails(stubRecord as never, ewayBillStatusLabel),
  };
}

export type FetchSalesInvoicesOptions = {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  financialYearId?: string;
  page?: number;
  pageSize?: number;
};

/** Load sales invoices for a tab from the Accounts Sales Invoice API. */
export async function fetchSalesInvoicesByTab(
  tab: SalesInvoiceTabId,
  opts: FetchSalesInvoicesOptions = {},
): Promise<{ rows: SalesInvoiceListRow[]; total: number }> {
  const invoiceType = tabToInvoiceType(tab);
  const result = await SalesInvoiceService.list({
    page: opts.page ?? 1,
    page_size: opts.pageSize ?? 100,
    search: opts.search?.trim() || undefined,
    from_date: opts.dateFrom || undefined,
    to_date: opts.dateTo || undefined,
    financial_year_id:
      opts.financialYearId && opts.financialYearId !== "all"
        ? opts.financialYearId
        : undefined,
    invoice_type: invoiceType,
  });

  let rows = (result.results || []).map(mapApiInvoiceToListRow);
  if (tab === "sample_order") {
    rows = rows.filter((r) => r.sourceType === "sample_order");
  } else if (tab === "sales_order") {
    rows = rows.filter((r) => r.sourceType === "sales_order");
  }

  return { rows, total: result.total ?? rows.length };
}

/** Tabs shown in the Sales Invoice register UI (no dedicated Service tab). */
export const SALES_INVOICE_VISIBLE_TABS: SalesInvoiceTabId[] = [
  "all",
  "sales_order",
  "stock_transfer",
];
