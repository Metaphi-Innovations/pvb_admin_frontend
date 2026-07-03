/**
 * Bridge Warehouse dispatch records → Pending Invoices → Sales Invoice prefill.
 */

import type { InvoiceLineItem } from "@/app/(app)/accounts/invoices/invoices-data";
import {
  calcLineAmounts,
  createEmptyLine,
  recalculateLineItem,
  parseTaxPct,
  loadInvoices,
} from "@/app/(app)/accounts/invoices/invoices-data";
import { loadCustomers, type Customer } from "@/app/(app)/masters/customers/customer-data";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import { findActivePricingForStock } from "@/app/(app)/masters/pricing/pricing-data";
import { resolveSalesUnitPrice } from "@/lib/pricing/resolve-pricing";
import {
  getDispatchRecords,
} from "@/app/(app)/warehouse/dispatch/mock-data";
import type { DispatchRecord, DispatchProduct, DispatchNearExpirySchemeEntry } from "@/app/(app)/warehouse/dispatch/types";
import {
  filterActiveNearExpirySchemeEntries,
  NEAR_EXPIRY_SCHEME_TYPE_LABEL,
  NEAR_EXPIRY_SETTLEMENT_REQUIRED_LABEL,
  NEAR_EXPIRY_SCHEME_STATUS_ACTIVE,
  NEAR_EXPIRY_SETTLEMENT_METHOD,
  NEAR_EXPIRY_SETTLEMENT_STATUS_PENDING,
} from "@/app/(app)/warehouse/dispatch/near-expiry-dispatch";
import { getOrderById, loadOrders, hydrateOrders, type SalesOrder } from "@/app/(app)/sales/orders/orders-data";
import { ensureCustomerLedgerFromMaster } from "@/lib/accounts/party-ledger-sync";
import { customerMasterToTransactionFields } from "@/lib/accounts/transaction-master-fetch";
import type { InvoiceNearExpirySchemeSettlement } from "@/app/(app)/accounts/invoices/invoices-data";
import {
  getPendingInvoiceSeedDispatch,
  listPendingInvoiceSeedRows,
} from "@/lib/accounts/pending-invoice-seed";
import {
  getNearExpiryPendingDemoDispatch,
  isNearExpiryPendingDemoDispatch,
} from "@/lib/accounts/pending-invoice-near-expiry-demo";
import {
  getDispatchInvoiceType,
  getDispatchPartyName,
  type InvoiceDocumentType,
} from "@/lib/accounts/invoice-type";

const INVOICE_READY_STATUSES = new Set<DispatchRecord["deliveryStatus"]>([
  "Delivered",
  "In Transit",
  "Partially Delivered",
]);

export interface PendingDispatchInvoiceRow {
  dispatchId: string;
  dispatchNo: string;
  soNumber: string;
  salesOrderId: number | null;
  invoiceType: InvoiceDocumentType;
  customerName: string;
  dispatchDate: string;
  taxableValue: number;
  gstAmount: number;
  invoiceValue: number;
  /** When true, GST is IGST-only; otherwise CGST + SGST. */
  interstate?: boolean;
  status: string;
  warehouse: string;
  totalQty: number;
  qtyUnit: string;
  /** Near Expiry scheme type label, e.g. "Near Expiry" */
  schemeLabel: string | null;
  /** Financial settlement label, e.g. "Settlement Required" */
  settlementLabel: string | null;
}

function getEligibleNearExpirySchemes(
  dispatch: Pick<DispatchRecord, "nearExpirySchemes">,
): DispatchNearExpirySchemeEntry[] {
  return filterActiveNearExpirySchemeEntries(dispatch.nearExpirySchemes);
}

export function getDispatchSchemeLabels(
  dispatch: Pick<DispatchRecord, "nearExpirySchemes">,
): { schemeLabel: string | null; settlementLabel: string | null } {
  const schemes = getEligibleNearExpirySchemes(dispatch);
  if (!schemes.length) return { schemeLabel: null, settlementLabel: null };
  const hasNearExpiry = schemes.some((s) => s.schemeType === "Near Expiry");
  return {
    schemeLabel: hasNearExpiry ? NEAR_EXPIRY_SCHEME_TYPE_LABEL : "Scheme",
    settlementLabel: NEAR_EXPIRY_SETTLEMENT_REQUIRED_LABEL,
  };
}

export function mapDispatchSchemeToInvoiceSettlement(
  entry: DispatchNearExpirySchemeEntry,
): InvoiceNearExpirySchemeSettlement {
  return {
    schemeId: entry.schemeId,
    schemeCode: entry.schemeCode,
    schemeName: entry.schemeName,
    schemeType: entry.schemeType,
    product: entry.product,
    productId: entry.productId,
    batchNumber: entry.batchNumber,
    batchExpiryDate: entry.batchExpiryDate,
    remainingExpiryDays: entry.remainingExpiryDays,
    benefitType: entry.benefitType,
    benefitValue: entry.benefitValue,
    estimatedBenefitAmount: entry.estimatedBenefitAmount,
    schemeStatus: entry.schemeStatus ?? NEAR_EXPIRY_SCHEME_STATUS_ACTIVE,
    settlementMethod: entry.settlementMethod ?? entry.settlement ?? NEAR_EXPIRY_SETTLEMENT_METHOD,
    settlementStatus: entry.settlementStatus ?? NEAR_EXPIRY_SETTLEMENT_STATUS_PENDING,
  };
}

export interface DispatchInvoiceLineResult {
  line: InvoiceLineItem;
  error?: string;
}

function findOrderBySoNumber(soNumber: string): SalesOrder | undefined {
  return hydrateOrders(loadOrders()).find((o) => o.soNumber === soNumber);
}

function findCustomerByName(name: string): Customer | undefined {
  const q = name.trim().toLowerCase();
  return loadCustomers().find((c) => c.customerName.trim().toLowerCase() === q);
}

function findProductMaster(sku: string, productName: string) {
  const products = loadProducts().filter((p) => p.status === "active");
  const skuNorm = sku.trim().toLowerCase();
  const nameNorm = productName.trim().toLowerCase();

  return (
    products.find((p) => p.sku.toLowerCase() === skuNorm) ??
    products.find((p) => p.productName.toLowerCase() === nameNorm) ??
    products.find(
      (p) =>
        nameNorm.includes(p.productName.toLowerCase()) ||
        p.productName.toLowerCase().includes(nameNorm),
    )
  );
}

function resolveUnitRate(
  dp: DispatchProduct,
  productId: number,
  customerId: number | null | undefined,
  order?: SalesOrder,
): number {
  if (dp.unitRate != null && dp.unitRate > 0) return dp.unitRate;

  const soLine = order?.lineItems?.find(
    (l) =>
      l.productName.toLowerCase() === dp.product.toLowerCase() ||
      (l.productCode && l.productCode.toLowerCase() === dp.sku.toLowerCase()),
  );
  if (soLine?.unitPrice) return soLine.unitPrice;

  const pricing = findActivePricingForStock(
    loadProducts().find((p) => p.id === productId)?.sku ?? dp.sku,
    dp.product,
  );
  if (pricing?.distributorPrice) return pricing.distributorPrice;

  return resolveSalesUnitPrice(productId, customerId ?? undefined).amount;
}

export function buildInvoiceLineFromDispatchProduct(
  dp: DispatchProduct,
  lineIndex: number,
  dispatch: DispatchRecord,
  customerId?: number | null,
  order?: SalesOrder,
): DispatchInvoiceLineResult {
  const master = findProductMaster(dp.sku, dp.product);
  if (!master) {
    return {
      line: createEmptyLine(),
      error: `Product mapping missing for Dispatch Line ${lineIndex + 1} (${dp.product}). Please check Product Master.`,
    };
  }

  const pricing = findActivePricingForStock(master.sku, master.productName);
  const taxPct = pricing?.gstPct ? parseTaxPct(pricing.gstPct) : parseTaxPct(master.gstRate);
  const unitPrice = resolveUnitRate(dp, master.id, customerId, order);
  const unit = pricing?.uom ?? master.packagingUnit ?? master.baseUnit ?? "PCS";

  const line = recalculateLineItem({
    id: `dispatch-${dispatch.id}-${lineIndex}`,
    productId: master.id,
    productName: master.productName,
    description: [
      dispatch.dispatchNumber,
      dp.batchNo ? `Batch ${dp.batchNo}` : "",
      dispatch.warehouse,
    ]
      .filter(Boolean)
      .join(" · "),
    hsn: master.hsnCode ?? "",
    qty: dp.dispatchQty,
    unit,
    unitPrice,
    discountPct: 0,
    taxPct,
    amount: 0,
  });

  return { line };
}

export function computeDispatchInvoiceTotals(dispatch: DispatchRecord, customerId?: number | null) {
  const order = findOrderBySoNumber(dispatch.salesOrderNumber);
  let taxableValue = 0;
  let gstAmount = 0;
  let invoiceValue = 0;

  dispatch.products.forEach((dp, i) => {
    if (dp.dispatchQty <= 0) return;
    const { line } = buildInvoiceLineFromDispatchProduct(dp, i, dispatch, customerId, order);
    const { taxable, taxAmt, amount } = calcLineAmounts(line);
    taxableValue += taxable;
    gstAmount += taxAmt;
    invoiceValue += amount;
  });

  return {
    taxableValue: Math.round(taxableValue * 100) / 100,
    gstAmount: Math.round(gstAmount * 100) / 100,
    invoiceValue: Math.round(invoiceValue * 100) / 100,
  };
}

function isDispatchInvoiced(dispatchNo: string): boolean {
  return loadInvoices().some(
    (inv) =>
      inv.dispatchNo?.trim() === dispatchNo.trim() &&
      inv.invoiceStatus !== "cancelled",
  );
}

function isPendingDispatchForCustomer(row: PendingDispatchInvoiceRow, customerId: number): boolean {
  const customer = loadCustomers().find((c) => c.id === customerId);
  if (!customer) return false;

  const nameNorm = customer.customerName.trim().toLowerCase();
  if (row.salesOrderId) {
    const order = getOrderById(row.salesOrderId);
    if (order?.customerId === customerId) return true;
  }
  const rowCustomer = findCustomerByName(row.customerName);
  if (rowCustomer?.id === customerId) return true;
  return row.customerName.trim().toLowerCase() === nameNorm;
}

function enrichPendingDispatchRow(
  d: DispatchRecord,
  row: Omit<PendingDispatchInvoiceRow, "warehouse" | "totalQty" | "qtyUnit" | "schemeLabel" | "settlementLabel">,
): PendingDispatchInvoiceRow {
  let totalQty = 0;
  let qtyUnit = "Units";
  d.products.forEach((p) => {
    if (p.dispatchQty > 0) totalQty += p.dispatchQty;
  });
  const firstProduct = d.products.find((p) => p.dispatchQty > 0);
  if (firstProduct) {
    const master = findProductMaster(firstProduct.sku, firstProduct.product);
    qtyUnit = master?.packagingUnit ?? master?.baseUnit ?? "Bags";
  }
  const labels = getDispatchSchemeLabels({
    nearExpirySchemes: getEligibleNearExpirySchemes(d),
  });
  return {
    ...row,
    warehouse: d.warehouse,
    totalQty,
    qtyUnit,
    schemeLabel: labels.schemeLabel,
    settlementLabel: labels.settlementLabel,
  };
}

/** All pending uninvoiced dispatches for a customer master id. */
export function listPendingDispatchesForCustomer(customerId: number): PendingDispatchInvoiceRow[] {
  return listPendingDispatchInvoices().filter((row) => isPendingDispatchForCustomer(row, customerId));
}

/** Most recent pending dispatch for a customer master id (name or linked sales order). */
export function findPendingDispatchForCustomer(
  customerId: number,
): PendingDispatchInvoiceRow | undefined {
  return listPendingDispatchesForCustomer(customerId)[0];
}

function mapDispatchToPendingRow(d: DispatchRecord): PendingDispatchInvoiceRow {
  const order = findOrderBySoNumber(d.salesOrderNumber);
  const customer = findCustomerByName(d.customer);
  const invoiceType = getDispatchInvoiceType(d);
  const totals = computeDispatchInvoiceTotals(d, customer?.id ?? order?.customerId);
  return enrichPendingDispatchRow(d, {
    dispatchId: d.id,
    dispatchNo: d.dispatchNumber,
    soNumber: d.salesOrderNumber,
    salesOrderId: invoiceType === "sales" ? order?.id ?? null : null,
    invoiceType,
    customerName: getDispatchPartyName(d),
    dispatchDate: d.dispatchDate,
    taxableValue: totals.taxableValue,
    gstAmount: totals.gstAmount,
    invoiceValue: totals.invoiceValue,
    status: d.deliveryStatus,
  });
}

export function listPendingDispatchInvoices(): PendingDispatchInvoiceRow[] {
  const seedRows = listPendingInvoiceSeedRows().map((row) => ({
    dispatchId: row.dispatchId,
    dispatchNo: row.dispatchNo,
    soNumber: row.soNumber,
    salesOrderId: row.salesOrderId,
    invoiceType: row.invoiceType,
    customerName: row.customerName,
    dispatchDate: row.dispatchDate,
    taxableValue: row.taxableValue,
    gstAmount: row.gstAmount,
    invoiceValue: row.invoiceValue,
    interstate: row.interstate,
    status: row.status,
    warehouse: row.invoiceType === "stock_transfer" ? row.customerName : "Central Warehouse",
    totalQty: 0,
    qtyUnit: "Units",
    schemeLabel: row.schemeLabel,
    settlementLabel: row.settlementLabel,
  }));

  const seedIds = new Set(seedRows.map((r) => r.dispatchId));

  const warehouseRows = getDispatchRecords()
    .filter((d) => INVOICE_READY_STATUSES.has(d.deliveryStatus))
    .filter((d) => !isDispatchInvoiced(d.dispatchNumber))
    .filter((d) => d.products.some((p) => p.dispatchQty > 0))
    .filter((d) => !seedIds.has(d.id))
    .map(mapDispatchToPendingRow);

  return [...seedRows, ...warehouseRows].sort((a, b) => b.dispatchDate.localeCompare(a.dispatchDate));
}

export function getDispatchById(dispatchId: string): DispatchRecord | undefined {
  const seed = getPendingInvoiceSeedDispatch(dispatchId);
  if (seed) return seed;
  if (isNearExpiryPendingDemoDispatch(dispatchId)) {
    return getNearExpiryPendingDemoDispatch();
  }
  return getDispatchRecords().find((d) => d.id === dispatchId);
}

export function getDispatchByNumber(dispatchNo: string): DispatchRecord | undefined {
  const seed = getPendingInvoiceSeedDispatch(null, dispatchNo);
  if (seed) return seed;
  if (isNearExpiryPendingDemoDispatch(null, dispatchNo)) {
    return getNearExpiryPendingDemoDispatch();
  }
  return getDispatchRecords().find((d) => d.dispatchNumber === dispatchNo);
}

function dueDateFromTerms(baseDate: string, creditDays: number): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + creditDays);
  return d.toISOString().slice(0, 10);
}

export interface DispatchSalesInvoicePrefill {
  invoiceType: InvoiceDocumentType;
  salesOrderId: number | null;
  salesOrderNo: string;
  sourceDispatchId: string;
  dispatchNo: string;
  branch: string;
  warehouse: string;
  salesperson: string;
  referenceNo: string;
  paymentTerms: string;
  creditDays: number;
  dueDate: string;
  invoiceDate: string;
  customerId: number | null;
  customerLedgerId: number | null;
  customerCode: string;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  customerGst: string;
  customerGstCategory?: string;
  billingAddress: string;
  shippingAddress: string;
  pan: string;
  contactPerson: string;
  placeOfSupply: string;
  state: string;
  gstTreatment: string;
  receivableLedger: string;
  lineItems: InvoiceLineItem[];
  lineErrors: string[];
  nearExpirySchemes: DispatchNearExpirySchemeEntry[];
}

export function buildSalesInvoicePrefillFromDispatch(
  dispatchId?: string | null,
  dispatchNo?: string | null,
  orderId?: number | null,
): DispatchSalesInvoicePrefill | null {
  const dispatch =
    (dispatchId ? getDispatchById(dispatchId) : null) ??
    (dispatchNo ? getDispatchByNumber(dispatchNo) : null);

  if (!dispatch) return null;

  const invoiceType = getDispatchInvoiceType(dispatch);
  const isStockTransfer = invoiceType === "stock_transfer";
  const destinationWarehouse = getDispatchPartyName(dispatch);
  const sourceWarehouse =
    dispatch.source_warehouse_name?.trim() ||
    dispatch.sourceWarehouse?.trim() ||
    dispatch.warehouse;

  const order = isStockTransfer
    ? undefined
    : (orderId ? getOrderById(orderId) : undefined) ??
      findOrderBySoNumber(dispatch.salesOrderNumber);

  const customer = isStockTransfer
    ? undefined
    : (order?.customerId ? loadCustomers().find((c) => c.id === order.customerId) : undefined) ??
      findCustomerByName(dispatch.customer);

  const custFields = customer
    ? customerMasterToTransactionFields(customer)
    : {
        customerId: null as number | null,
        customerCode: "",
        customerName: isStockTransfer ? destinationWarehouse : dispatch.customer,
        customerMobile: "",
        customerEmail: "",
        customerGst: "",
        customerGstCategory: undefined,
        billingAddress: isStockTransfer ? destinationWarehouse : "",
        shippingAddress: isStockTransfer ? destinationWarehouse : "",
        pan: "",
        contactPerson: "",
        paymentTerms: isStockTransfer ? "Immediate" : "Net 30",
        creditDays: isStockTransfer ? 0 : 30,
        placeOfSupply: "",
        state: "",
        gstTreatment: "registered",
        receivableLedger: isStockTransfer ? destinationWarehouse : dispatch.customer,
        defaultBillToId: "",
        defaultShipToId: "",
      };

  const ledger = customer ? ensureCustomerLedgerFromMaster(customer) : null;
  const creditDays = custFields.creditDays ?? (isStockTransfer ? 0 : 30);
  const invoiceDate = dispatch.dispatchDate || new Date().toISOString().slice(0, 10);
  const stockTransferDocNo =
    dispatch.source_document_no?.trim() || dispatch.salesOrderNumber;

  const lineItems: InvoiceLineItem[] = [];
  const lineErrors: string[] = [];

  dispatch.products.forEach((dp, i) => {
    if (dp.dispatchQty <= 0) return;
    const result = buildInvoiceLineFromDispatchProduct(
      dp,
      i,
      dispatch,
      custFields.customerId,
      order,
    );
    if (result.error) lineErrors.push(result.error);
    else lineItems.push(result.line);
  });

  return {
    invoiceType,
    salesOrderId: order?.id ?? null,
    salesOrderNo: isStockTransfer ? stockTransferDocNo : dispatch.salesOrderNumber,
    sourceDispatchId: dispatch.id,
    dispatchNo: dispatch.dispatchNumber,
    branch: "Head Office",
    warehouse: sourceWarehouse,
    salesperson: order?.salesManName ?? "",
    referenceNo: isStockTransfer ? stockTransferDocNo : dispatch.salesOrderNumber,
    paymentTerms: custFields.paymentTerms ?? "Net 30",
    creditDays,
    dueDate: dueDateFromTerms(invoiceDate, creditDays),
    invoiceDate,
    customerId: custFields.customerId,
    customerLedgerId: ledger?.id ?? null,
    customerCode: custFields.customerCode ?? "",
    customerName: custFields.customerName,
    customerMobile: custFields.customerMobile,
    customerEmail: custFields.customerEmail,
    customerGst: custFields.customerGst,
    customerGstCategory: custFields.customerGstCategory,
    billingAddress: custFields.billingAddress,
    shippingAddress: custFields.shippingAddress || custFields.billingAddress,
    pan: custFields.pan ?? "",
    contactPerson: custFields.contactPerson ?? "",
    placeOfSupply: custFields.placeOfSupply ?? "",
    state: custFields.state ?? "",
    gstTreatment: custFields.gstTreatment ?? "registered",
    receivableLedger: ledger?.accountName ?? custFields.receivableLedger,
    lineItems,
    lineErrors,
    nearExpirySchemes: getEligibleNearExpirySchemes(dispatch),
  };
}
