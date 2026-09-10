/**
 * Pending Invoices — tab meta + list row types for Transactions → Pending Invoices.
 * Listing data comes from pendingInvoicesService (API); this file is UI contracts only.
 */

export type PendingInvoiceTabId = "sales_order" | "stock_transfer";

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
    sourceNoLabel: "Sales Order No.",
    partyLabel: "Customer",
    exportFileName: "sales-order-pending-invoices.xlsx",
    emptyMessage: "No sales order dispatches pending invoice generation.",
  },
  stock_transfer: {
    label: "Stock Transfer Invoices",
    sourceNoLabel: "Stock Transfer No.",
    partyLabel: "Destination Warehouse",
    exportFileName: "stock-transfer-pending-invoices.xlsx",
    emptyMessage: "No stock transfer dispatches pending invoice generation.",
  },
};

/** Common display row — retains source identity and correct action routes. */
export interface PendingInvoiceListRow {
  /** Stable React / table key */
  id: string;
  sourceType: PendingInvoiceTabId;
  /** Source document id (SO / ST), when known */
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
  orderDate: string;
  customerCode: string;
  gstin?: string;
  customerId?: string;
  salesperson: string;
  itemCount: number;
  qty: number;
  fromWarehouse: string;
  toWarehouse: string;
  totalAmount: number;
  generateHref: string;
  detailHref: string | null;
  printHref: string | null;
}
