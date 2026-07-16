/**
 * Sales Invoices — tab-scoped data sources.
 * Each tab maps generated invoices from its own source pipeline.
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
import { resolveInvoiceDocumentType } from "@/lib/accounts/invoice-type";
import { resolveWarehouseOrderType } from "@/app/(app)/warehouse/lib/order-document-type";
import type { DispatchRecord } from "@/app/(app)/warehouse/dispatch/types";

export type SalesInvoiceTabId = "sales_order" | "stock_transfer" | "sample_order";

export const SALES_INVOICE_TAB_META: Record<
  SalesInvoiceTabId,
  {
    label: string;
    sourceNoLabel: string;
    exportFileName: string;
    emptyMessage: string;
  }
> = {
  sales_order: {
    label: "Sales Order Invoices",
    sourceNoLabel: "Order No.",
    exportFileName: "sales-order-invoices.xlsx",
    emptyMessage: "No sales order invoices generated yet.",
  },
  stock_transfer: {
    label: "Stock Transfer Invoices",
    sourceNoLabel: "Order No.",
    exportFileName: "stock-transfer-invoices.xlsx",
    emptyMessage: "No stock transfer invoices generated yet.",
  },
  sample_order: {
    label: "Sample Order Invoices",
    sourceNoLabel: "Order No.",
    exportFileName: "sample-order-invoices.xlsx",
    emptyMessage: "No sample order invoices generated yet.",
  },
};

/** Display row for a generated sales invoice, retaining source identity. */
export interface SalesInvoiceListRow {
  id: number;
  sourceType: SalesInvoiceTabId;
  sourceRecordId: number | string | null;
  invoiceId: number;
  invoiceNo: string;
  invoiceDate: string;
  orderNo: string;
  dispatchNo: string;
  customerName: string;
  customerCode: string;
  fromWarehouse: string;
  toWarehouse: string;
  totalAmount: number;
  itemCount: number;
  branch: string;
  invoiceStatus: InvoiceRecord["invoiceStatus"];
  viewHref: string;
  editHref: string | null;
  canCancel: boolean;
  canEdit: boolean;
  canPdf: boolean;
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
 * Resolve which Sales Invoice tab an invoice belongs to.
 * Prefers persisted sourceType; falls back to invoiceType, dispatch, and doc-no patterns.
 */
export function resolveSalesInvoiceSourceType(inv: InvoiceRecord): SalesInvoiceTabId {
  if (inv.sourceType === "sales_order") return "sales_order";
  if (inv.sourceType === "stock_transfer") return "stock_transfer";
  if (inv.sourceType === "sample_order") return "sample_order";
  if (inv.sourceType === "direct") return "sales_order";

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

function resolveSourceRecordId(
  sourceType: SalesInvoiceTabId,
  inv: InvoiceRecord,
): number | string | null {
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
  sourceType: SalesInvoiceTabId,
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

function mapInvoiceToListRow(inv: InvoiceRecord): SalesInvoiceListRow {
  const sourceType = resolveSalesInvoiceSourceType(inv);
  const sourceRecordId = resolveSourceRecordId(sourceType, inv);
  const actions = getInvoiceRowActions(inv);
  const { fromWarehouse, toWarehouse } = resolveWarehouses(inv, sourceType, sourceRecordId);
  const itemCount = inv.lineItems?.length ?? 0;
  const totalAmount =
    sourceType === "sample_order" ? 0 : Math.round((inv.grandTotal ?? 0) * 100) / 100;

  return {
    id: inv.id,
    sourceType,
    sourceRecordId,
    invoiceId: inv.id,
    invoiceNo: inv.invoiceNo,
    invoiceDate: inv.invoiceDate,
    orderNo: inv.salesOrderNo || inv.referenceNo || "—",
    dispatchNo: inv.dispatchNo?.trim() || "—",
    customerName: inv.customerName || "—",
    customerCode: resolveCustomerCode(inv),
    fromWarehouse,
    toWarehouse,
    totalAmount,
    itemCount,
    branch: inv.branch?.trim() || "—",
    invoiceStatus: inv.invoiceStatus,
    viewHref: `${LIST_PATH}/${inv.id}`,
    editHref: actions.includes("edit") ? `${LIST_PATH}/${inv.id}/edit` : null,
    canCancel: actions.includes("cancel"),
    canEdit: actions.includes("edit"),
    canPdf: actions.includes("pdf"),
  };
}

/** Fetch + map generated invoices for one source tab (independent pipeline). */
export function listSalesInvoicesForTab(tab: SalesInvoiceTabId): SalesInvoiceListRow[] {
  return loadInvoices()
    .filter((inv) => resolveSalesInvoiceSourceType(inv) === tab)
    .map(mapInvoiceToListRow)
    .sort((a, b) => {
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
