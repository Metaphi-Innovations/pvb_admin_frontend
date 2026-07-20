/**
 * Sales Invoices — tab-scoped data sources.
 * Each source tab maps generated invoices from its own pipeline.
 * "All Invoices" combines goods + service invoices.
 * Used only by Transactions → Sales Invoice.
 */

import {
  getInvoiceRowActions,
  loadInvoices,
  type InvoiceRecord,
} from "@/app/(app)/accounts/invoices/invoices-data";
import { loadOrders as loadSalesOrders } from "@/app/(app)/sales/orders/orders-data";
import { loadTransfers } from "@/app/(app)/sales/stock-transfer/stock-transfer-data";
import { loadOrders as loadSampleOrders } from "@/app/(app)/sales/sample-order/orders-data";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import {
  getDispatchById,
  getDispatchByNumber,
} from "@/lib/accounts/dispatch-invoice-bridge";
import { getPendingInvoiceSeedDispatch } from "@/lib/accounts/pending-invoice-seed";
import {
  resolveInvoiceDocumentType,
  salesInvoiceTypeLabel,
  type SalesInvoiceSourceType,
} from "@/lib/accounts/invoice-type";
import { resolveWarehouseOrderType } from "@/app/(app)/warehouse/lib/order-document-type";
import type { DispatchRecord } from "@/app/(app)/warehouse/dispatch/types";
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
  id: number;
  /** Tab membership for source-specific tabs; service only appears in All. */
  sourceType: SalesInvoiceKind;
  sourceRecordId: number | string | null;
  invoiceId: number;
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
  eInvoiceStatusLabel: ListingEInvoiceStatus;
  ewayBillStatusLabel: ListingEWayStatus;
  eInvoiceDetails: SalesInvoiceEInvoiceDetails;
  ewayBillDetails: SalesInvoiceEWayDetails;
}

const LIST_PATH = "/accounts/transactions/invoices";

const DEMO_CUSTOMER_CODES: Record<string, string> = {
  "reliance agri": "CUST-REL-001",
  "mahindra farms": "CUST-MH-021",
  "abc distributor": "CUST-ABC-001",
  "abc agro distributor": "CUST-ABC-001",
};

function findDispatchForInvoice(inv: InvoiceRecord): DispatchRecord | undefined {
  if (inv.sourceDispatchId) {
    const byId =
      getDispatchById(inv.sourceDispatchId) ??
      getPendingInvoiceSeedDispatch(inv.sourceDispatchId);
    if (byId) return byId;
  }
  if (inv.dispatchNo?.trim()) {
    return getDispatchByNumber(inv.dispatchNo.trim());
  }
  return undefined;
}

/**
 * Resolve listing invoice kind.
 * Prefers persisted sourceType; falls back to invoiceType, dispatch, and doc-no patterns.
 */
export function resolveSalesInvoiceKind(inv: InvoiceRecord): SalesInvoiceKind {
  if (inv.sourceType === "service") return "service";
  if (inv.sourceType === "sales_order") return "sales_order";
  if (inv.sourceType === "stock_transfer") return "stock_transfer";
  if (inv.sourceType === "sample_order") return "sample_order";
  if (inv.sourceType === "direct") return "sales_order";

  if (inv.invoiceNo.startsWith("SVC/")) return "service";
  if (inv.invoiceNo.startsWith("PVB/SMP/")) return "sample_order";
  if (inv.invoiceType === "sample_order" || inv.documentType === "proforma_invoice") {
    return "sample_order";
  }

  if (resolveInvoiceDocumentType(inv) === "stock_transfer") {
    return "stock_transfer";
  }

  const dispatch = findDispatchForInvoice(inv);
  if (dispatch) {
    const whType = resolveWarehouseOrderType(dispatch);
    if (whType === "stock_transfer") return "stock_transfer";
    if (whType === "sample_order") return "sample_order";
    if (whType === "sales_order") return "sales_order";
  }

  const sourceNo = (inv.salesOrderNo || inv.referenceNo || "").trim();
  if (sourceNo.startsWith("SM-") || sourceNo.startsWith("SMP-")) {
    return "sample_order";
  }
  if (sourceNo.startsWith("ST-") || inv.invoiceNo.startsWith("STI-")) {
    return "stock_transfer";
  }

  if (sourceNo && loadSampleOrders().some((o) => o.soNumber === sourceNo)) {
    return "sample_order";
  }
  if (
    sourceNo &&
    loadTransfers().some((t) => t.transferNumber === sourceNo || String(t.id) === sourceNo)
  ) {
    return "stock_transfer";
  }

  return "sales_order";
}

/** @deprecated Use resolveSalesInvoiceKind — kept for callers expecting tab ids without "all"/"service". */
export function resolveSalesInvoiceSourceType(
  inv: InvoiceRecord,
): Exclude<SalesInvoiceKind, "service"> {
  const kind = resolveSalesInvoiceKind(inv);
  if (kind === "service") return "sales_order";
  return kind;
}

function resolveSourceRecordId(
  sourceType: SalesInvoiceKind,
  inv: InvoiceRecord,
): number | string | null {
  if (sourceType === "service") return null;
  const sourceNo = (inv.salesOrderNo || inv.referenceNo || "").trim();

  if (sourceType === "sales_order") {
    if (inv.salesOrderId != null) return inv.salesOrderId;
    const order = loadSalesOrders().find((o) => o.soNumber === sourceNo);
    return order?.id ?? null;
  }
  if (sourceType === "stock_transfer") {
    const transfer = loadTransfers().find(
      (t) => t.transferNumber === sourceNo || String(t.id) === sourceNo,
    );
    return transfer?.id ?? null;
  }
  const sample = loadSampleOrders().find((o) => o.soNumber === sourceNo);
  return sample?.id ?? null;
}

function resolveCustomerCode(inv: InvoiceRecord): string {
  if (inv.customerId != null) {
    const c = loadCustomers().find((x) => x.id === inv.customerId);
    if (c?.customerCode) return c.customerCode;
  }
  const order = inv.salesOrderId
    ? loadSalesOrders().find((o) => o.id === inv.salesOrderId)
    : loadSalesOrders().find((o) => o.soNumber === (inv.salesOrderNo || "").trim());
  if (order?.customerCode) return order.customerCode;

  const sample = loadSampleOrders().find(
    (o) => o.soNumber === (inv.salesOrderNo || inv.referenceNo || "").trim(),
  );
  if (sample?.customerCode) return sample.customerCode;

  return DEMO_CUSTOMER_CODES[inv.customerName.trim().toLowerCase()] ?? "";
}

function resolveWarehouses(
  inv: InvoiceRecord,
  sourceType: SalesInvoiceKind,
  sourceRecordId: number | string | null,
): { fromWarehouse: string; toWarehouse: string } {
  if (sourceType !== "stock_transfer") {
    return { fromWarehouse: "", toWarehouse: "" };
  }

  const transfer =
    (typeof sourceRecordId === "number"
      ? loadTransfers().find((t) => t.id === sourceRecordId)
      : undefined) ??
    loadTransfers().find(
      (t) => t.transferNumber === (inv.salesOrderNo || inv.referenceNo || "").trim(),
    );

  const dispatch = findDispatchForInvoice(inv);

  const fromWarehouse =
    transfer?.sourceWarehouseName?.trim() ||
    dispatch?.source_warehouse_name?.trim() ||
    dispatch?.sourceWarehouse?.trim() ||
    inv.warehouse?.trim() ||
    "—";

  const toWarehouse =
    transfer?.targetWarehouseName?.trim() ||
    dispatch?.target_warehouse_name?.trim() ||
    dispatch?.targetWarehouse?.trim() ||
    inv.customerName?.trim() ||
    "—";

  return { fromWarehouse, toWarehouse };
}

function sumLineQty(inv: InvoiceRecord): number {
  const lines = inv.lineItems ?? [];
  if (!lines.length) return 0;
  return lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
}

function buildReference(
  kind: SalesInvoiceKind,
  inv: InvoiceRecord,
): { primary: string; secondary: string } {
  const orderNo = (inv.salesOrderNo || "").trim();
  const dispatchNo = (inv.dispatchNo || "").trim();
  const manualRef = (inv.referenceNo || "").trim();

  if (kind === "service") {
    return {
      primary: manualRef || "—",
      secondary: "",
    };
  }

  return {
    primary: orderNo || "—",
    secondary: dispatchNo || "—",
  };
}

function buildPartyOrTransfer(
  kind: SalesInvoiceKind,
  inv: InvoiceRecord,
  fromWarehouse: string,
  toWarehouse: string,
): string {
  if (kind === "stock_transfer") {
    return `${fromWarehouse || "—"} → ${toWarehouse || "—"}`;
  }
  return inv.customerName?.trim() || "—";
}

function mapInvoiceToListRow(inv: InvoiceRecord): SalesInvoiceListRow {
  const sourceType = resolveSalesInvoiceKind(inv);
  const sourceRecordId = resolveSourceRecordId(sourceType, inv);
  const actions = getInvoiceRowActions(inv);
  const { fromWarehouse, toWarehouse } = resolveWarehouses(inv, sourceType, sourceRecordId);
  const itemCount = inv.lineItems?.length ?? 0;
  const qtySum = sumLineQty(inv);
  const totalAmount =
    sourceType === "sample_order" ? 0 : Math.round((inv.grandTotal ?? 0) * 100) / 100;
  const ref = buildReference(sourceType, inv);
  const eInvoiceStatusLabel = resolveListingEInvoiceStatus(inv, sourceType);
  const ewayBillStatusLabel = resolveListingEWayStatus(inv, sourceType);

  return {
    id: inv.id,
    sourceType,
    sourceRecordId,
    invoiceId: inv.id,
    invoiceNo: inv.invoiceNo,
    invoiceDate: inv.invoiceDate,
    invoiceTypeLabel: salesInvoiceTypeLabel(inv.sourceType as SalesInvoiceSourceType | undefined, sourceType),
    referencePrimary: ref.primary,
    referenceSecondary: ref.secondary,
    partyOrTransfer: buildPartyOrTransfer(sourceType, inv, fromWarehouse, toWarehouse),
    orderNo: inv.salesOrderNo || inv.referenceNo || "—",
    dispatchNo: inv.dispatchNo?.trim() || "—",
    customerName: inv.customerName || "—",
    customerCode: resolveCustomerCode(inv),
    fromWarehouse,
    toWarehouse,
    totalAmount,
    qtyOrItemCount: qtySum > 0 ? qtySum : itemCount,
    itemCount,
    branch: inv.branch?.trim() || "—",
    invoiceStatus: inv.invoiceStatus,
    viewHref: `${LIST_PATH}/${inv.id}`,
    editHref: actions.includes("edit") ? `${LIST_PATH}/${inv.id}/edit` : null,
    canCancel: actions.includes("cancel"),
    canEdit: actions.includes("edit"),
    canPdf: actions.includes("pdf"),
    eInvoiceStatusLabel,
    ewayBillStatusLabel,
    eInvoiceDetails: buildEInvoiceDetails(inv, eInvoiceStatusLabel),
    ewayBillDetails: buildEWayDetails(inv, ewayBillStatusLabel),
  };
}

/** Fetch + map generated invoices for one listing tab. */
export function listSalesInvoicesForTab(tab: SalesInvoiceTabId): SalesInvoiceListRow[] {
  const all = loadInvoices().map(mapInvoiceToListRow);
  const filtered =
    tab === "all"
      ? all
      : tab === "service"
        ? all.filter((r) => r.sourceType === "service")
        : all.filter((r) => r.sourceType === tab);

  return filtered.sort((a, b) => {
    const d = b.invoiceDate.localeCompare(a.invoiceDate);
    if (d !== 0) return d;
    return b.invoiceNo.localeCompare(a.invoiceNo);
  });
}

export function listSalesInvoicesByTab(tab: SalesInvoiceTabId): SalesInvoiceListRow[] {
  return listSalesInvoicesForTab(tab);
}

export function getSalesInvoiceBranchOptions(tab: SalesInvoiceTabId): string[] {
  const set = new Set<string>();
  for (const r of listSalesInvoicesForTab(tab)) {
    if (r.branch && r.branch !== "—") set.add(r.branch);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/** Tabs shown in the Sales Invoice register UI (no dedicated Service tab). */
export const SALES_INVOICE_VISIBLE_TABS: SalesInvoiceTabId[] = [
  "all",
  "sales_order",
  "stock_transfer",
  "sample_order",
];
