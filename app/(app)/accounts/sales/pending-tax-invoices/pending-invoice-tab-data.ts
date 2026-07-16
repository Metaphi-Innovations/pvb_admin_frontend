/**
 * Pending Invoices — tab-scoped data sources.
 * Each tab queries its own source pipeline (seed + warehouse) independently.
 * Used only by Transactions → Pending Invoices.
 */

import { loadInvoices } from "@/app/(app)/accounts/invoices/invoices-data";
import { getDispatchRecords } from "@/app/(app)/warehouse/dispatch/mock-data";
import type { DispatchRecord } from "@/app/(app)/warehouse/dispatch/types";
import {
  resolveWarehouseOrderType,
  type WarehouseOrderDocType,
} from "@/app/(app)/warehouse/lib/order-document-type";
import {
  getDispatchSchemeLabels,
  computeDispatchInvoiceTotals,
} from "@/lib/accounts/dispatch-invoice-bridge";
import { getDispatchPartyName } from "@/lib/accounts/invoice-type";
import {
  listPendingInvoiceSeedRows,
  getPendingInvoiceSeedDispatches,
  getPendingInvoiceSeedDispatch,
  PENDING_SEED_DISPATCH_IDS,
} from "@/lib/accounts/pending-invoice-seed";
import type { PendingTaxInvoiceRow } from "@/lib/accounts/sales-workflow-data";
import { loadOrders as loadSalesOrders } from "@/app/(app)/sales/orders/orders-data";
import { loadTransfers } from "@/app/(app)/sales/stock-transfer/stock-transfer-data";
import { loadOrders as loadSampleOrders, type OrderStatus as SampleOrderStatus } from "@/app/(app)/sales/sample-order/orders-data";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";

export type PendingInvoiceTabId = "sales_order" | "stock_transfer" | "sample_order";

export const PENDING_INVOICE_TAB_META: Record<
  PendingInvoiceTabId,
  {
    label: string;
    sourceNoLabel: string;
    partyLabel: string;
    exportFileName: string;
    emptyMessage: string;
  }
> = {
  sales_order: {
    label: "Sales Order Invoices",
    sourceNoLabel: "Order Number",
    partyLabel: "Customer",
    exportFileName: "sales-order-pending-invoices.xlsx",
    emptyMessage: "No sales order dispatches pending invoice generation.",
  },
  stock_transfer: {
    label: "Stock Transfer Invoices",
    sourceNoLabel: "Transfer Number",
    partyLabel: "Destination Warehouse",
    exportFileName: "stock-transfer-pending-invoices.xlsx",
    emptyMessage: "No stock transfer dispatches pending invoice generation.",
  },
  sample_order: {
    label: "Sample Order Invoices",
    sourceNoLabel: "Sample Order Number",
    partyLabel: "Recipient",
    exportFileName: "sample-order-pending-invoices.xlsx",
    emptyMessage: "No sample order dispatches pending invoice generation.",
  },
};

/** Common display row — retains source identity and correct action routes. */
export interface PendingInvoiceListRow {
  /** Stable React / table key */
  id: string;
  sourceType: PendingInvoiceTabId;
  /** Source document id (SO / ST / Sample), when known */
  sourceRecordId: number | string | null;
  /** Invoice id once generated — null while pending */
  invoiceId: string | null;
  dispatchId: string;
  dispatchNo: string;
  sourceNo: string;
  partyName: string;
  dispatchDate: string;
  branch: string;
  taxableValue: number;
  gstAmount: number;
  invoiceValue: number;
  interstate?: boolean;
  status: string;
  generatedBy: string | null;
  schemeLabel: string | null;
  settlementLabel: string | null;
  /** Sales Order tab: order date from the linked Sales Order */
  orderDate: string;
  /** Sales Order tab: customer code from the Sales Order / customer master */
  customerCode: string;
  /** Sales Order tab: salesperson from the Sales Order mapping */
  salesperson: string;
  /** Distinct order line items count */
  itemCount: number;
  /** Stock Transfer tab: source warehouse */
  fromWarehouse: string;
  /** Stock Transfer tab: destination warehouse */
  toWarehouse: string;
  /** Stock Transfer tab: final transfer value */
  totalAmount: number;
  /** Generate tax invoice */
  generateHref: string;
  /** Source document detail route */
  detailHref: string | null;
  /** Invoice print route — null until invoice exists */
  printHref: string | null;
}

const INVOICE_READY_STATUSES = new Set<DispatchRecord["deliveryStatus"]>([
  "Delivered",
  "In Transit",
  "Partially Delivered",
]);

const TAB_TO_WAREHOUSE_TYPE: Record<PendingInvoiceTabId, WarehouseOrderDocType> = {
  sales_order: "sales_order",
  stock_transfer: "stock_transfer",
  sample_order: "sample_order",
};

function isDispatchInvoiced(dispatchNo: string): boolean {
  return loadInvoices().some(
    (inv) => inv.dispatchNo?.trim() === dispatchNo.trim() && inv.invoiceStatus !== "cancelled",
  );
}

function resolveSourceTypeFromDispatch(d: Pick<DispatchRecord, "sourceDocumentType" | "source_type" | "salesOrderNumber" | "source_document_no">): PendingInvoiceTabId | null {
  const type = resolveWarehouseOrderType(d);
  if (type === "sales_order") return "sales_order";
  if (type === "stock_transfer") return "stock_transfer";
  if (type === "sample_order") return "sample_order";
  return null;
}

function resolveSourceTypeFromSeedRow(row: PendingTaxInvoiceRow): PendingInvoiceTabId {
  const seedDispatch = getPendingInvoiceSeedDispatches().find((d) => d.id === row.dispatchId);
  if (seedDispatch) {
    const fromDispatch = resolveSourceTypeFromDispatch(seedDispatch);
    if (fromDispatch) return fromDispatch;
  }
  if (row.invoiceType === "stock_transfer") return "stock_transfer";
  if (
    row.dispatchId === PENDING_SEED_DISPATCH_IDS.sm003 ||
    row.soNumber.startsWith("SM-") ||
    row.soNumber.startsWith("SMP-")
  ) {
    return "sample_order";
  }
  return "sales_order";
}

function findSourceRecordId(
  sourceType: PendingInvoiceTabId,
  sourceNo: string,
  salesOrderId: number | null,
): number | string | null {
  if (sourceType === "sales_order") {
    if (salesOrderId != null) return salesOrderId;
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

function buildGenerateHref(row: {
  dispatchId: string;
  dispatchNo: string;
  sourceRecordId: number | string | null;
  sourceType: PendingInvoiceTabId;
}): string {
  const params = new URLSearchParams();
  params.set("dispatchId", row.dispatchId);
  params.set("dispatch", row.dispatchNo);
  if (row.sourceType === "sales_order") {
    params.set("sourceType", "sales_order");
    if (row.sourceRecordId != null) params.set("so", String(row.sourceRecordId));
  }
  if (row.sourceType === "stock_transfer") {
    params.set("sourceType", "stock_transfer");
  }
  if (row.sourceType === "sample_order") {
    params.set("sourceType", "sample_order");
    if (row.sourceRecordId != null) params.set("sampleOrderId", String(row.sourceRecordId));
  }
  return `/accounts/transactions/invoices/new?${params.toString()}`;
}

function buildDetailHref(
  sourceType: PendingInvoiceTabId,
  sourceRecordId: number | string | null,
): string | null {
  if (sourceRecordId == null) return null;
  if (sourceType === "sales_order") return `/sales/orders/${sourceRecordId}`;
  if (sourceType === "stock_transfer") return `/sales/stock-transfer/${sourceRecordId}`;
  return `/sales/sample-order/${sourceRecordId}`;
}

interface SalesOrderMeta {
  orderDate: string;
  customerName: string;
  customerCode: string;
  salesperson: string;
  itemCount: number;
  totalAmount: number;
  /** When true, the linked order is cancelled/closed and should not appear as pending */
  inactive: boolean;
}

const INACTIVE_SALES_ORDER_STATUSES = new Set(["cancelled", "closed"]);

/**
 * Sales Order tab enrichment — pulls order date, customer mapping, salesperson,
 * line-item count and amount from the linked Sales Order (falls back to the
 * customer master for the code when the order is not resolvable).
 */
function resolveSalesOrderMeta(
  sourceNo: string,
  salesOrderId: number | null,
  fallbackCustomerName: string,
  fallbackItemCount: number,
  fallbackAmount: number,
  fallbackOrderDate: string,
): SalesOrderMeta {
  const order =
    (salesOrderId != null ? loadSalesOrders().find((o) => o.id === salesOrderId) : undefined) ??
    loadSalesOrders().find((o) => o.soNumber === sourceNo);

  if (order) {
    const distinctItems = order.lineItems.length > 0 ? order.lineItems.length : order.items;
    return {
      orderDate: order.orderDate || fallbackOrderDate,
      customerName: order.customerName || fallbackCustomerName,
      customerCode: order.customerCode || "",
      salesperson: order.salesManName || "—",
      itemCount: distinctItems > 0 ? distinctItems : fallbackItemCount,
      totalAmount: order.totalAmount > 0 ? order.totalAmount : fallbackAmount,
      inactive: INACTIVE_SALES_ORDER_STATUSES.has(order.status),
    };
  }

  const customer = loadCustomers().find(
    (c) => c.customerName.trim().toLowerCase() === fallbackCustomerName.trim().toLowerCase(),
  );
  /** Demo pending-invoice parties when no Sales Order master row exists yet */
  const DEMO_CUSTOMER_CODES: Record<string, string> = {
    "reliance agri": "CUST-REL-001",
    "mahindra farms": "CUST-MH-021",
    "abc distributor": "CUST-ABC-001",
  };
  const demoCode =
    DEMO_CUSTOMER_CODES[fallbackCustomerName.trim().toLowerCase()] ?? "";
  return {
    orderDate: fallbackOrderDate,
    customerName: fallbackCustomerName,
    customerCode: customer?.customerCode || demoCode,
    salesperson: "—",
    itemCount: fallbackItemCount,
    totalAmount: fallbackAmount,
    inactive: false,
  };
}

interface StockTransferMeta {
  orderDate: string;
  transferNo: string;
  fromWarehouse: string;
  toWarehouse: string;
  itemCount: number;
  totalAmount: number;
}

/**
 * Stock Transfer tab enrichment — order date, warehouses, line count and value
 * from the linked Stock Transfer order (falls back to dispatch fields).
 */
function resolveStockTransferMeta(
  sourceNo: string,
  sourceRecordId: number | string | null,
  dispatch: Pick<
    DispatchRecord,
    | "source_warehouse_name"
    | "sourceWarehouse"
    | "target_warehouse_name"
    | "targetWarehouse"
    | "dispatchDate"
    | "products"
  >,
  fallbackInvoiceValue: number,
): StockTransferMeta {
  const transfer =
    (typeof sourceRecordId === "number"
      ? loadTransfers().find((t) => t.id === sourceRecordId)
      : undefined) ?? loadTransfers().find((t) => t.transferNumber === sourceNo);

  const dispatchItemCount = dispatch.products.filter((p) => p.dispatchQty > 0).length;
  const fromWh =
    transfer?.sourceWarehouseName?.trim() ||
    dispatch.source_warehouse_name?.trim() ||
    dispatch.sourceWarehouse?.trim() ||
    "—";
  const toWh =
    transfer?.targetWarehouseName?.trim() ||
    dispatch.target_warehouse_name?.trim() ||
    dispatch.targetWarehouse?.trim() ||
    "—";

  if (transfer) {
    const distinctItems =
      transfer.lineItems.length > 0 ? transfer.lineItems.length : transfer.totalItems;
    return {
      orderDate: transfer.transferDate || "",
      transferNo: transfer.transferNumber || sourceNo,
      fromWarehouse: fromWh,
      toWarehouse: toWh,
      itemCount: distinctItems,
      totalAmount: transfer.totalAmount ?? fallbackInvoiceValue,
    };
  }

  return {
    orderDate: dispatch.dispatchDate || "",
    transferNo: sourceNo,
    fromWarehouse: fromWh,
    toWarehouse: toWh,
    itemCount: dispatchItemCount,
    totalAmount: fallbackInvoiceValue,
  };
}

interface SampleOrderMeta {
  orderDate: string;
  sampleNo: string;
  customerName: string;
  customerCode: string;
  itemCount: number;
  totalAmount: number;
  inactive: boolean;
}

const INACTIVE_SAMPLE_ORDER_STATUSES = new Set<SampleOrderStatus>(["cancelled", "rejected"]);

/**
 * Sample Order tab enrichment — recipient/customer, line count; amount is always zero.
 */
function resolveSampleOrderMeta(
  sourceNo: string,
  sourceRecordId: number | string | null,
  fallbackCustomerName: string,
  fallbackItemCount: number,
  fallbackOrderDate: string,
): SampleOrderMeta {
  const order =
    (typeof sourceRecordId === "number"
      ? loadSampleOrders().find((o) => o.id === sourceRecordId)
      : undefined) ?? loadSampleOrders().find((o) => o.soNumber === sourceNo);

  if (order) {
    const distinctItems = order.lineItems.length > 0 ? order.lineItems.length : order.items;
    const displayName =
      order.recipientName?.trim() ||
      order.customerName?.trim() ||
      fallbackCustomerName;
    return {
      orderDate: order.orderDate || fallbackOrderDate,
      sampleNo: order.soNumber || sourceNo,
      customerName: displayName,
      customerCode: order.customerCode || "",
      itemCount: distinctItems > 0 ? distinctItems : fallbackItemCount,
      totalAmount: 0,
      inactive: INACTIVE_SAMPLE_ORDER_STATUSES.has(order.status),
    };
  }

  const DEMO_SAMPLE_CODES: Record<string, string> = {
    "krishi seva kendra": "CUST-KSK-003",
    "field demo — nashik cluster": "CUST-FD-NK-006",
    "reliance agri": "CUST-REL-103",
    "green valley agro": "CUST-GV-009",
  };
  const demoCode =
    DEMO_SAMPLE_CODES[fallbackCustomerName.trim().toLowerCase()] ?? "";
  return {
    orderDate: fallbackOrderDate,
    sampleNo: sourceNo,
    customerName: fallbackCustomerName,
    customerCode: demoCode,
    itemCount: fallbackItemCount,
    totalAmount: 0,
    inactive: false,
  };
}

function mapSeedToListRow(row: PendingTaxInvoiceRow, sourceType: PendingInvoiceTabId): PendingInvoiceListRow | null {
  const sourceRecordId = findSourceRecordId(sourceType, row.soNumber, row.salesOrderId);
  const generateHref = buildGenerateHref({
    dispatchId: row.dispatchId,
    dispatchNo: row.dispatchNo,
    sourceRecordId,
    sourceType,
  });
  const seedDispatch =
    getPendingInvoiceSeedDispatch(row.dispatchId) ??
    getPendingInvoiceSeedDispatches().find((d) => d.id === row.dispatchId);
  const seedItemCount = seedDispatch?.products.filter((p) => p.dispatchQty > 0).length ?? 0;
  const salesMeta =
    sourceType === "sales_order"
      ? resolveSalesOrderMeta(
          row.soNumber,
          row.salesOrderId,
          row.customerName,
          seedItemCount,
          row.invoiceValue,
          row.dispatchDate,
        )
      : null;
  if (salesMeta?.inactive) return null;

  const sampleMeta =
    sourceType === "sample_order"
      ? resolveSampleOrderMeta(
          row.soNumber,
          sourceRecordId,
          row.customerName,
          seedItemCount,
          row.dispatchDate,
        )
      : null;
  if (sampleMeta?.inactive) return null;

  const stockMeta =
    sourceType === "stock_transfer" && seedDispatch
      ? resolveStockTransferMeta(
          row.soNumber,
          sourceRecordId,
          seedDispatch,
          row.invoiceValue,
        )
      : null;
  return {
    id: `seed:${row.dispatchId}`,
    sourceType,
    sourceRecordId,
    invoiceId: null,
    dispatchId: row.dispatchId,
    dispatchNo: row.dispatchNo,
    sourceNo: stockMeta?.transferNo ?? sampleMeta?.sampleNo ?? row.soNumber,
    partyName: salesMeta?.customerName ?? sampleMeta?.customerName ?? row.customerName,
    dispatchDate: row.dispatchDate,
    branch: row.branch,
    taxableValue: sourceType === "sample_order" ? 0 : row.taxableValue,
    gstAmount: sourceType === "sample_order" ? 0 : row.gstAmount,
    invoiceValue: sourceType === "sample_order" ? 0 : row.invoiceValue,
    interstate: row.interstate,
    status: row.status,
    generatedBy: null,
    schemeLabel: row.schemeLabel,
    settlementLabel: row.settlementLabel,
    orderDate:
      salesMeta?.orderDate || sampleMeta?.orderDate || stockMeta?.orderDate || row.dispatchDate,
    customerCode: salesMeta?.customerCode ?? sampleMeta?.customerCode ?? "",
    salesperson: salesMeta?.salesperson ?? "—",
    itemCount: salesMeta?.itemCount ?? sampleMeta?.itemCount ?? stockMeta?.itemCount ?? seedItemCount,
    fromWarehouse: stockMeta?.fromWarehouse ?? "",
    toWarehouse: stockMeta?.toWarehouse ?? "",
    totalAmount:
      sourceType === "sample_order"
        ? 0
        : sourceType === "sales_order"
          ? (salesMeta?.totalAmount ?? row.invoiceValue)
          : (stockMeta?.totalAmount ?? row.invoiceValue),
    generateHref,
    detailHref: buildDetailHref(sourceType, sourceRecordId),
    printHref: null,
  };
}

function mapWarehouseToListRow(d: DispatchRecord, sourceType: PendingInvoiceTabId): PendingInvoiceListRow | null {
  const labels = getDispatchSchemeLabels(d);
  const totals = computeDispatchInvoiceTotals(d);
  const sourceNo = d.source_document_no || d.salesOrderNumber;
  const sourceRecordId = findSourceRecordId(sourceType, sourceNo, null);
  const partyName =
    sourceType === "stock_transfer"
      ? d.target_warehouse_name?.trim() ||
        d.targetWarehouse?.trim() ||
        getDispatchPartyName(d)
      : d.customer_name?.trim() || d.customer?.trim() || getDispatchPartyName(d);

  const generateHref = buildGenerateHref({
    dispatchId: d.id,
    dispatchNo: d.dispatchNumber,
    sourceRecordId,
    sourceType,
  });

  const dispatchItemCount = d.products.filter((p) => p.dispatchQty > 0).length;
  const salesMeta =
    sourceType === "sales_order"
      ? resolveSalesOrderMeta(
          sourceNo,
          typeof sourceRecordId === "number" ? sourceRecordId : null,
          partyName,
          dispatchItemCount,
          totals.invoiceValue,
          d.dispatchDate,
        )
      : null;
  if (salesMeta?.inactive) return null;

  const sampleMeta =
    sourceType === "sample_order"
      ? resolveSampleOrderMeta(
          sourceNo,
          sourceRecordId,
          partyName,
          dispatchItemCount,
          d.dispatchDate,
        )
      : null;
  if (sampleMeta?.inactive) return null;

  const stockMeta =
    sourceType === "stock_transfer"
      ? resolveStockTransferMeta(
          sourceNo,
          sourceRecordId,
          d,
          totals.invoiceValue,
        )
      : null;

  return {
    id: `wh:${d.id}`,
    sourceType,
    sourceRecordId,
    invoiceId: null,
    dispatchId: d.id,
    dispatchNo: d.dispatchNumber,
    sourceNo: stockMeta?.transferNo ?? sampleMeta?.sampleNo ?? sourceNo,
    partyName: salesMeta?.customerName ?? sampleMeta?.customerName ?? partyName,
    dispatchDate: d.dispatchDate,
    branch: d.warehouse || d.source_warehouse_name || "—",
    taxableValue: sourceType === "sample_order" ? 0 : totals.taxableValue,
    gstAmount: sourceType === "sample_order" ? 0 : totals.gstAmount,
    invoiceValue: sourceType === "sample_order" ? 0 : totals.invoiceValue,
    interstate: false,
    status: d.deliveryStatus,
    generatedBy: null,
    schemeLabel: labels.schemeLabel,
    settlementLabel: labels.settlementLabel,
    orderDate:
      salesMeta?.orderDate || sampleMeta?.orderDate || stockMeta?.orderDate || d.dispatchDate,
    customerCode: salesMeta?.customerCode ?? sampleMeta?.customerCode ?? "",
    salesperson: salesMeta?.salesperson ?? "—",
    itemCount:
      salesMeta?.itemCount ?? sampleMeta?.itemCount ?? stockMeta?.itemCount ?? dispatchItemCount,
    fromWarehouse: stockMeta?.fromWarehouse ?? "",
    toWarehouse: stockMeta?.toWarehouse ?? "",
    totalAmount:
      sourceType === "sample_order"
        ? 0
        : sourceType === "sales_order"
          ? (salesMeta?.totalAmount ?? totals.invoiceValue)
          : (stockMeta?.totalAmount ?? totals.invoiceValue),
    generateHref,
    detailHref: buildDetailHref(sourceType, sourceRecordId),
    printHref: null,
  };
}

/**
 * Independent pipeline for one pending-invoice tab.
 * Does not reuse a combined list + client-side type filter as the sole source.
 */
function listPendingInvoicesForTab(tab: PendingInvoiceTabId): PendingInvoiceListRow[] {
  const warehouseType = TAB_TO_WAREHOUSE_TYPE[tab];

  const seedRows = listPendingInvoiceSeedRows()
    .filter((row) => resolveSourceTypeFromSeedRow(row) === tab)
    .map((row) => mapSeedToListRow(row, tab))
    .filter((row): row is PendingInvoiceListRow => row != null);

  const seedIds = new Set(seedRows.map((r) => r.dispatchId));

  const warehouseRows = getDispatchRecords()
    .filter((d) => INVOICE_READY_STATUSES.has(d.deliveryStatus))
    .filter((d) => !isDispatchInvoiced(d.dispatchNumber))
    .filter((d) => d.products.some((p) => p.dispatchQty > 0))
    .filter((d) => !seedIds.has(d.id))
    .filter((d) => resolveWarehouseOrderType(d) === warehouseType)
    .map((d) => mapWarehouseToListRow(d, tab))
    .filter((row): row is PendingInvoiceListRow => row != null);

  return [...seedRows, ...warehouseRows].sort((a, b) => b.dispatchDate.localeCompare(a.dispatchDate));
}

export function listPendingSalesOrderInvoices(): PendingInvoiceListRow[] {
  return listPendingInvoicesForTab("sales_order");
}

export function listPendingStockTransferInvoices(): PendingInvoiceListRow[] {
  return listPendingInvoicesForTab("stock_transfer");
}

export function listPendingSampleOrderInvoices(): PendingInvoiceListRow[] {
  return listPendingInvoicesForTab("sample_order");
}

export function listPendingInvoicesByTab(tab: PendingInvoiceTabId): PendingInvoiceListRow[] {
  if (tab === "sales_order") return listPendingSalesOrderInvoices();
  if (tab === "stock_transfer") return listPendingStockTransferInvoices();
  return listPendingSampleOrderInvoices();
}

export function getPendingInvoiceBranchOptions(tab: PendingInvoiceTabId): string[] {
  const set = new Set<string>();
  for (const r of listPendingInvoicesByTab(tab)) {
    if (r.branch) set.add(r.branch);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
