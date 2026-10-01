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
import {
  createEmptyAdditionalExpense,
  mapSalesOrderExpenseNameToHead,
  type InvoiceAdditionalExpense,
} from "@/app/(app)/accounts/invoices/invoice-additional-expenses";
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
  type SalesInvoiceSourceType,
} from "@/lib/accounts/invoice-type";
import { getQcPassedStockRecords } from "@/app/(app)/warehouse/stockoverview/mock-data";
import { resolveWarehouseOrderType } from "@/app/(app)/warehouse/lib/order-document-type";
import { loadWarehouses, type WarehouseMaster } from "@/app/(app)/masters/warehouse/warehouse-data";

const INVOICE_READY_STATUSES = new Set<DispatchRecord["deliveryStatus"]>([
  "Delivered",
  "In Transit",
  "Partially Delivered",
]);

/** Resolve Warehouse Master by name / code (Stock Transfer GST + Place of Supply). */
const WAREHOUSE_NAME_ALIASES: Record<string, string> = {
  "central warehouse": "Central Distribution Hub",
  "ahmedabad warehouse": "Gujarat Distribution Center",
  "pune warehouse": "Central Distribution Hub",
  "west zone hub": "Mumbai Transit Point",
  "north zone hub": "North Zone Regional Store",
  "south zone hub": "South Zone Depot",
  "east zone hub": "East Zone Depot",
};

export function resolveWarehouseMaster(
  ref: string | null | undefined,
): WarehouseMaster | undefined {
  const raw = (ref || "").trim().replace(/^transfer\s+to\s+/i, "");
  if (!raw) return undefined;
  const key = raw.toLowerCase();
  const aliased = WAREHOUSE_NAME_ALIASES[key] || raw;
  const aliasKey = aliased.toLowerCase();
  const all = loadWarehouses();
  return (
    all.find((w) => w.warehouseName.toLowerCase() === aliasKey) ??
    all.find((w) => w.warehouseName.toLowerCase() === key) ??
    all.find((w) => w.warehouseCode.toLowerCase() === key) ??
    all.find((w) => (w.warehouseType || "").toLowerCase() === key) ??
    all.find((w) => w.city.toLowerCase() === key) ??
    all.find(
      (w) =>
        aliasKey.includes(w.city.toLowerCase()) ||
        w.city.toLowerCase().includes(aliasKey) ||
        key.includes(w.city.toLowerCase()) ||
        aliasKey.includes(w.warehouseName.toLowerCase()) ||
        w.warehouseName.toLowerCase().includes(aliasKey),
    )
  );
}

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

  const soLine = order?.lineItems?.find(
    (l) =>
      l.productName.toLowerCase() === dp.product.toLowerCase() ||
      (l.productCode && l.productCode.toLowerCase() === dp.sku.toLowerCase()),
  );

  const hasScheme = soLine?.schemeApplied === "Yes";
  /**
   * Use list/dealer rate + commercial discount once.
   * Do not set unitPrice to scheme finalRate AND re-apply scheme % (double discount).
   */
  const originalRate =
    soLine?.originalDealerPrice ||
    soLine?.dealerPrice ||
    soLine?.unitPrice ||
    unitPrice;
  const discountPct = soLine?.discount || 0;
  const batchNo =
    dp.batchNo?.trim() ||
    dp.batchAllocations?.[0]?.batchNumber?.trim() ||
    "";
  const expiryDate =
    dp.batchExpiryDate?.trim() ||
    dp.batchAllocations?.[0]?.expiryDate?.trim() ||
    "";
  const manufacturingDate = resolveBatchManufacturingDate(
    master.sku ?? master.productCode ?? dp.sku,
    dp.product,
    batchNo,
  );

  const batchAvailableQty = resolveBatchAvailableQty(
    master.sku ?? master.productCode ?? dp.sku,
    dp.product,
    batchNo,
  );

  const qtyInCase =
    typeof (master as { unitsPerCase?: number }).unitsPerCase === "number"
      ? (master as { unitsPerCase?: number }).unitsPerCase
      : typeof (master as { caseQty?: number }).caseQty === "number"
        ? (master as { caseQty?: number }).caseQty
        : null;

  const line = recalculateLineItem({
    id: `dispatch-${dispatch.id}-${lineIndex}`,
    productId: master.id,
    productName: master.productName,
    productCode: master.sku ?? master.productCode ?? dp.sku,
    description: [
      dispatch.dispatchNumber,
      batchNo ? `Batch ${batchNo}` : "",
      dispatch.warehouse,
    ]
      .filter(Boolean)
      .join(" · "),
    hsn: master.hsnCode ?? "",
    qty: dp.dispatchQty,
    unit,
    unitPrice: originalRate,
    discountPct,
    taxPct,
    amount: 0,
    batchNo: batchNo || undefined,
    manufacturingDate: manufacturingDate || undefined,
    expiryDate: expiryDate || undefined,
    dispatchReadyQty: dp.dispatchQty,
    batchAvailableQty: batchAvailableQty ?? undefined,
    qtyInCase: qtyInCase ?? null,
    salesperson: order?.salesManName?.trim() || undefined,
    dealerPrice: soLine?.dealerPrice ?? originalRate,
    finalRate: soLine?.finalRate || originalRate,
    schemeApplied: hasScheme ? "Yes" : soLine?.schemeApplied ?? "No",
    schemeCode: soLine?.appliedSchemeCode ?? soLine?.schemeCode,
    schemeName: soLine?.appliedSchemeName ?? soLine?.schemeName,
    schemeDiscountPercent: soLine?.schemeDiscountPercent,
    schemeDiscountAmount: soLine?.schemeDiscountAmount,
    schemeDiscountType: soLine?.schemeDiscountType,
  });

  return { line };
}

/**
 * Sample Order Proforma: billing always ₹0.
 * GST % / scheme / discount kept for reference only.
 * Cost Price stored for inventory consumption posting.
 */
export function buildSampleOrderLineFromDispatchProduct(
  dp: DispatchProduct,
  lineIndex: number,
  dispatch: DispatchRecord,
): DispatchInvoiceLineResult {
  const master = findProductMaster(dp.sku, dp.product);
  if (!master) {
    return {
      line: createEmptyLine(),
      error: `Product mapping missing for Sample Dispatch Line ${lineIndex + 1} (${dp.product} / ${dp.sku}). Please check Product Master.`,
    };
  }

  const sku = master.sku ?? master.productCode ?? dp.sku;
  const pricing = findActivePricingForStock(sku, master.productName);
  const taxPct = pricing?.gstPct ? parseTaxPct(pricing.gstPct) : parseTaxPct(master.gstRate);
  const unit = master.packagingUnit ?? master.baseUnit ?? "PCS";

  const costPrice = pricing?.costPrice ?? 0;
  const cpMissing = !pricing || !(costPrice > 0);
  const costPriceSource = pricing
    ? `Pricing Master · ${pricing.sku || sku} · CP`
    : "Pricing Master (not found)";

  let batchNo =
    dp.batchNo?.trim() ||
    dp.batchAllocations?.[0]?.batchNumber?.trim() ||
    "";
  let expiryDate =
    dp.batchExpiryDate?.trim() ||
    dp.batchAllocations?.[0]?.expiryDate?.trim() ||
    "";
  let manufacturingDate =
    dp.manufacturingDate?.trim() ||
    dp.batchAllocations?.[0]?.manufacturingDate?.trim() ||
    "";

  if (!batchNo) {
    const stockHit = resolveStockBatchForProduct(
      master.productName,
      sku,
      dispatch.warehouse || dispatch.source_warehouse_name || "",
    );
    if (stockHit) {
      batchNo = stockHit.batchNumber;
      manufacturingDate = manufacturingDate || stockHit.manufacturingDate || "";
      expiryDate = expiryDate || stockHit.expiryDate || "";
    }
  } else {
    if (!manufacturingDate) {
      manufacturingDate = resolveBatchManufacturingDate(sku, dp.product, batchNo);
    }
    if (!expiryDate) {
      expiryDate = resolveBatchExpiryDate(sku, dp.product, batchNo);
    }
  }

  const batchAvailableQty = resolveBatchAvailableQty(sku, dp.product, batchNo);

  const qtyInCase =
    (typeof master.unitsPerCase === "number" && master.unitsPerCase > 0
      ? master.unitsPerCase
      : null) ??
    (typeof master.conversionQuantity === "number" && master.conversionQuantity > 0
      ? master.conversionQuantity
      : null);

  /** Reference-only commercial fields (billing remains ₹0). */
  const SAMPLE_ORDER_REF_DISCOUNT_PCT = 100;

  const line = recalculateLineItem({
    id: `dispatch-sm-${dispatch.id}-${lineIndex}`,
    productId: master.id,
    productName: master.productName,
    productCode: sku,
    description: "",
    hsn: master.hsnCode ?? "",
    qty: dp.dispatchQty,
    unit,
    unitPrice: 0,
    discountPct: SAMPLE_ORDER_REF_DISCOUNT_PCT,
    taxPct,
    amount: 0,
    batchNo: batchNo || undefined,
    manufacturingDate: manufacturingDate || undefined,
    expiryDate: expiryDate || undefined,
    dispatchReadyQty: dp.dispatchQty,
    batchAvailableQty: batchAvailableQty ?? undefined,
    qtyInCase: qtyInCase ?? null,
    costPrice: cpMissing ? 0 : costPrice,
    costPriceSource,
    cpMissing,
    schemeApplied: "No",
    dealerPrice: 0,
    finalRate: 0,
  });

  return { line };
}

/**
 * Stock Transfer valuation: Pricing Master Cost Price (CP) only.
 * Never uses DP, SO rate, customer price, or schemes.
 */
export function buildStockTransferLineFromDispatchProduct(
  dp: DispatchProduct,
  lineIndex: number,
  dispatch: DispatchRecord,
): DispatchInvoiceLineResult {
  const master = findProductMaster(dp.sku, dp.product);
  if (!master) {
    return {
      line: createEmptyLine(),
      error: `Product mapping missing for Dispatch Line ${lineIndex + 1} (${dp.product}). Please check Product Master.`,
    };
  }

  const sku = master.sku ?? master.productCode ?? dp.sku;
  const pricing = findActivePricingForStock(sku, master.productName);
  const taxPct = pricing?.gstPct ? parseTaxPct(pricing.gstPct) : parseTaxPct(master.gstRate);
  const unit = pricing?.uom ?? master.packagingUnit ?? master.baseUnit ?? "PCS";

  const costPrice = pricing?.costPrice ?? 0;
  const cpMissing = !pricing || !(costPrice > 0);
  const costPriceSource = pricing
    ? `Pricing Master · ${pricing.sku || sku} · CP`
    : "Pricing Master (not found)";

  let batchNo =
    dp.batchNo?.trim() ||
    dp.batchAllocations?.[0]?.batchNumber?.trim() ||
    "";
  let expiryDate =
    dp.batchExpiryDate?.trim() ||
    dp.batchAllocations?.[0]?.expiryDate?.trim() ||
    "";
  let manufacturingDate =
    dp.manufacturingDate?.trim() ||
    dp.batchAllocations?.[0]?.manufacturingDate?.trim() ||
    "";

  if (!batchNo) {
    const stockHit = resolveStockBatchForProduct(
      master.productName,
      sku,
      dispatch.warehouse || dispatch.source_warehouse_name || "",
    );
    if (stockHit) {
      batchNo = stockHit.batchNumber;
      manufacturingDate = manufacturingDate || stockHit.manufacturingDate || "";
      expiryDate = expiryDate || stockHit.expiryDate || "";
    }
  } else {
    if (!manufacturingDate) {
      manufacturingDate = resolveBatchManufacturingDate(sku, dp.product, batchNo);
    }
    if (!expiryDate) {
      expiryDate = resolveBatchExpiryDate(sku, dp.product, batchNo);
    }
  }

  const batchId =
    (dp.batchAllocations?.[0] as { batchId?: string } | undefined)?.batchId ||
    (dp as { batchId?: string }).batchId ||
    undefined;
  const batchAvailableQty = resolveBatchAvailableQty(sku, dp.product, batchNo);

  const qtyInCase =
    (typeof master.unitsPerCase === "number" && master.unitsPerCase > 0
      ? master.unitsPerCase
      : null) ??
    (typeof master.conversionQuantity === "number" && master.conversionQuantity > 0
      ? master.conversionQuantity
      : null) ??
    (typeof (master as { caseQty?: number }).caseQty === "number"
      ? (master as { caseQty?: number }).caseQty
      : null);

  const line = recalculateLineItem({
    id: `dispatch-st-${dispatch.id}-${lineIndex}`,
    productId: master.id,
    productName: master.productName,
    productCode: sku,
    description: "",
    hsn: master.hsnCode ?? "",
    qty: dp.dispatchQty,
    unit,
    unitPrice: cpMissing ? 0 : costPrice,
    discountPct: 0,
    taxPct,
    amount: 0,
    batchNo: batchNo || undefined,
    batchId: batchId || undefined,
    manufacturingDate: manufacturingDate || undefined,
    expiryDate: expiryDate || undefined,
    dispatchReadyQty: dp.dispatchQty,
    batchAvailableQty: batchAvailableQty ?? undefined,
    qtyInCase: qtyInCase ?? null,
    costPriceSource,
    cpMissing,
    schemeApplied: "No",
    dealerPrice: undefined,
    finalRate: undefined,
  });

  if (cpMissing) {
    return {
      line,
      error: `Cost Price not available for "${master.productName}" (SKU ${sku}${batchNo ? `, Batch ${batchNo}` : ""}). Set active Pricing Master CP before generating Stock Transfer Invoice.`,
    };
  }

  return { line };
}

function resolveStockBatchForProduct(
  productName: string,
  productCode: string,
  warehouse: string,
): { batchNumber: string; manufacturingDate?: string; expiryDate?: string } | null {
  try {
    const rows = getQcPassedStockRecords();
    const name = productName.trim().toLowerCase();
    const wh = warehouse.trim().toLowerCase();
    const candidates = rows.filter(
      (r) =>
        r.product.trim().toLowerCase() === name ||
        (productCode && r.product.toLowerCase().includes(productCode.toLowerCase())),
    );
    const inWh = wh
      ? candidates.find((r) => r.warehouse.trim().toLowerCase() === wh || r.warehouse.toLowerCase().includes(wh) || wh.includes(r.warehouse.toLowerCase()))
      : undefined;
    const hit = inWh || candidates[0];
    if (!hit?.batchNumber?.trim()) return null;
    return {
      batchNumber: hit.batchNumber.trim(),
      manufacturingDate: hit.manufacturingDate?.trim(),
      expiryDate: hit.expiryDate?.trim(),
    };
  } catch {
    return null;
  }
}

function resolveBatchExpiryDate(
  productCode: string,
  productName: string,
  batchNo: string,
): string {
  if (!batchNo.trim()) return "";
  try {
    const rows = getQcPassedStockRecords();
    const hit = rows.find(
      (r) =>
        r.batchNumber.trim().toLowerCase() === batchNo.trim().toLowerCase() &&
        (r.product.trim().toLowerCase() === productName.trim().toLowerCase() ||
          !productCode ||
          r.product.toLowerCase().includes(productCode.toLowerCase())),
    );
    return hit?.expiryDate?.trim() || "";
  } catch {
    return "";
  }
}

function resolveBatchManufacturingDate(
  productCode: string,
  productName: string,
  batchNo: string,
): string {
  if (!batchNo.trim()) return "";
  try {
    const rows = getQcPassedStockRecords();
    const hit = rows.find(
      (r) =>
        r.batchNumber.trim().toLowerCase() === batchNo.trim().toLowerCase() &&
        (r.product.trim().toLowerCase() === productName.trim().toLowerCase() ||
          !productCode ||
          r.product.toLowerCase().includes(productCode.toLowerCase())),
    );
    return hit?.manufacturingDate?.trim() || "";
  } catch {
    return "";
  }
}

function resolveBatchAvailableQty(
  productCode: string,
  productName: string,
  batchNo: string,
): number | null {
  if (!batchNo.trim()) return null;
  try {
    const rows = getQcPassedStockRecords();
    const hit = rows.find(
      (r) =>
        r.batchNumber.trim().toLowerCase() === batchNo.trim().toLowerCase() &&
        (r.product.trim().toLowerCase() === productName.trim().toLowerCase() ||
          !productCode ||
          r.product.toLowerCase().includes(productCode.toLowerCase())),
    );
    const qty = hit?.availableQuantity;
    return typeof qty === "number" && Number.isFinite(qty) ? qty : null;
  } catch {
    return null;
  }
}

function parseExpenseGstPct(rate: string | number | undefined): number {
  if (typeof rate === "number") return Number.isFinite(rate) ? rate : 0;
  const n = parseFloat(String(rate ?? "").replace("%", "").trim());
  return Number.isFinite(n) ? n : 0;
}

/** Prorate Sales Order expenses by dispatched product taxable share. */
export function mapProratedSalesOrderExpenses(
  order: SalesOrder | undefined,
  dispatchLineItems: InvoiceLineItem[],
): InvoiceAdditionalExpense[] {
  if (!order?.additionalExpenses?.length) return [];

  const orderProductTaxable = (order.lineItems ?? []).reduce((sum, l) => {
    const base = Math.max(0, (l.quantity || 0) * (l.unitPrice || l.dealerPrice || 0));
    const disc = Math.max(0, l.discountValue || 0);
    return sum + Math.max(0, base - disc);
  }, 0);

  const dispatchTaxable = dispatchLineItems.reduce((sum, l) => {
    const { taxable } = calcLineAmounts(l);
    return sum + taxable;
  }, 0);

  const ratio =
    orderProductTaxable > 0
      ? Math.min(1, dispatchTaxable / orderProductTaxable)
      : 1;

  return order.additionalExpenses
    .filter((e) => (e.amount || 0) > 0 || (e.expenseName || "").trim())
    .map((e) => {
      const amount = Math.round((e.amount || 0) * ratio * 100) / 100;
      const gstPct = parseExpenseGstPct(e.gstRate);
      return {
        ...createEmptyAdditionalExpense("sales_order"),
        id: `so-exp-${order.id}-${e.id}`,
        expenseHead: mapSalesOrderExpenseNameToHead(e.expenseName),
        amount,
        gstApplicable: gstPct > 0 || (e.gstAmount || 0) > 0,
        gstPct: gstPct > 0 ? gstPct : 0,
        remarks: e.remarks || `From Sales Order ${order.soNumber}`,
        origin: "sales_order" as const,
      };
    });
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
  sourceType?: SalesInvoiceSourceType;
  salesOrderId: number | null;
  salesOrderNo: string;
  salesOrderDate: string;
  sourceDispatchId: string;
  dispatchNo: string;
  dispatchDate: string;
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
  billFrom: string;
  billTo: string;
  shipTo: string;
  dispatchQty: number;
  transportMode: string;
  transporterName: string;
  transporterId: string;
  vehicleNo: string;
  lrNo: string;
  lrDate: string;
  transportDocNo: string;
  transportDocDate: string;
  distanceKm: number | null;
  lineItems: InvoiceLineItem[];
  lineErrors: string[];
  additionalExpenses: InvoiceAdditionalExpense[];
  nearExpirySchemes: DispatchNearExpirySchemeEntry[];
  /** Stock Transfer warehouse GST context */
  sourceWarehouseGstin?: string;
  destinationWarehouseGstin?: string;
  sourceWarehouseState?: string;
  destinationWarehouseState?: string;
}

function extractStateFromAddress(addr: string): string {
  const a = addr.trim();
  if (!a) return "";
  const known = [
    "Maharashtra",
    "Gujarat",
    "Karnataka",
    "Tamil Nadu",
    "Telangana",
    "Andhra Pradesh",
    "Rajasthan",
    "Madhya Pradesh",
    "Uttar Pradesh",
    "Delhi",
    "Haryana",
    "Punjab",
    "West Bengal",
    "Bihar",
    "Odisha",
    "Kerala",
  ];
  for (const s of known) {
    if (a.toLowerCase().includes(s.toLowerCase())) return s;
  }
  return "";
}

/** Place of Supply priority: ship-to state → customer state → billing state → SO territory heuristic. */
function resolvePlaceOfSupply(input: {
  shippingAddress: string;
  billingAddress: string;
  customerState: string;
  customerPlaceOfSupply: string;
}): string {
  return (
    extractStateFromAddress(input.shippingAddress) ||
    input.customerPlaceOfSupply?.trim() ||
    input.customerState?.trim() ||
    extractStateFromAddress(input.billingAddress) ||
    ""
  );
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
  const isSampleOrder = invoiceType === "sample_order";
  const destinationWarehouse = getDispatchPartyName(dispatch);
  const sourceWarehouse =
    dispatch.source_warehouse_name ||
    dispatch.sourceWarehouse ||
    dispatch.warehouse ||
    "";

  const sourceWh =
    resolveWarehouseMaster(sourceWarehouse) ||
    resolveWarehouseMaster(dispatch.warehouse) ||
    resolveWarehouseMaster(dispatch.sourceWarehouse);
  const destWh =
    resolveWarehouseMaster(destinationWarehouse) ||
    resolveWarehouseMaster(dispatch.target_warehouse_name) ||
    resolveWarehouseMaster(dispatch.targetWarehouse) ||
    resolveWarehouseMaster(dispatch.customer);

  const order =
    isStockTransfer || isSampleOrder
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
        customerGst: isStockTransfer ? destWh?.gstNumber || "" : "",
        customerGstCategory: undefined,
        billingAddress: isStockTransfer
          ? [destWh?.address, destWh?.city, destWh?.state].filter(Boolean).join(", ") ||
            destinationWarehouse
          : "",
        shippingAddress: isStockTransfer
          ? [destWh?.address, destWh?.city, destWh?.state].filter(Boolean).join(", ") ||
            destinationWarehouse
          : "",
        pan: "",
        contactPerson: "",
        paymentTerms: isStockTransfer ? "Immediate" : "Net 30",
        creditDays: isStockTransfer ? 0 : 30,
        placeOfSupply: isStockTransfer ? destWh?.state || "" : "",
        state: isStockTransfer ? destWh?.state || "" : "",
        gstTreatment: "registered",
        receivableLedger: isStockTransfer ? destinationWarehouse : dispatch.customer,
        defaultBillToId: "",
        defaultShipToId: "",
      };

  const ledger = customer ? ensureCustomerLedgerFromMaster(customer) : null;
  const creditDays = isSampleOrder
    ? 0
    : custFields.creditDays ?? (isStockTransfer ? 0 : 30);
  const warehouseOrderType = resolveWarehouseOrderType(dispatch);
  const isSalesOrderSource =
    !isStockTransfer &&
    !isSampleOrder &&
    (warehouseOrderType === "sales_order" || Boolean(order));
  const today = new Date().toISOString().slice(0, 10);
  /** Sales Order generation: Invoice Date defaults to today; other flows keep dispatch date. */
  const invoiceDate = isSalesOrderSource
    ? today
    : dispatch.dispatchDate || today;
  const dispatchDate = dispatch.dispatchDate || dispatch.dispatch_date || "";
  const stockTransferDocNo =
    dispatch.source_document_no?.trim() || dispatch.salesOrderNumber;
  const sampleOrderDocNo =
    dispatch.source_document_no?.trim() || dispatch.salesOrderNumber;

  const lineItems: InvoiceLineItem[] = [];
  const lineErrors: string[] = [];

  dispatch.products.forEach((dp, i) => {
    if (dp.dispatchQty <= 0) return;
    const result = isStockTransfer
      ? buildStockTransferLineFromDispatchProduct(dp, i, dispatch)
      : isSampleOrder
        ? buildSampleOrderLineFromDispatchProduct(dp, i, dispatch)
        : buildInvoiceLineFromDispatchProduct(
            dp,
            i,
            dispatch,
            custFields.customerId,
            order,
          );
    if (result.error) lineErrors.push(result.error);
    if (result.line?.productName || result.line?.productId) {
      lineItems.push(result.line);
    }
  });

  const additionalExpenses = isSalesOrderSource
    ? mapProratedSalesOrderExpenses(order, lineItems)
    : [];

  const sourceType: SalesInvoiceSourceType | undefined = isStockTransfer
    ? "stock_transfer"
    : isSampleOrder || warehouseOrderType === "sample_order"
      ? "sample_order"
      : isSalesOrderSource
        ? "sales_order"
        : undefined;

  const placeOfSupply = isStockTransfer
    ? destWh?.state?.trim() ||
      extractStateFromAddress(custFields.shippingAddress) ||
      ""
    : resolvePlaceOfSupply({
        shippingAddress: custFields.shippingAddress || "",
        billingAddress: custFields.billingAddress || "",
        customerState: custFields.state || customer?.stateName || "",
        customerPlaceOfSupply: custFields.placeOfSupply || "",
      });

  const dispatchQty = lineItems.reduce((s, l) => s + (l.qty || 0), 0);
  const partyName = isStockTransfer ? destinationWarehouse : custFields.customerName;

  return {
    invoiceType,
    sourceType,
    salesOrderId: order?.id ?? null,
    salesOrderNo: isStockTransfer
      ? stockTransferDocNo
      : isSampleOrder
        ? sampleOrderDocNo
        : dispatch.salesOrderNumber,
    salesOrderDate: order?.orderDate ?? "",
    sourceDispatchId: dispatch.id,
    dispatchNo: dispatch.dispatchNumber,
    dispatchDate,
    branch: "Head Office",
    warehouse: sourceWarehouse,
    salesperson: order?.salesManName ?? customer?.salesManName ?? "",
    referenceNo: isStockTransfer
      ? stockTransferDocNo
      : isSampleOrder
        ? sampleOrderDocNo
        : dispatch.salesOrderNumber,
    paymentTerms: isSampleOrder ? "N/A" : custFields.paymentTerms ?? "Net 30",
    creditDays,
    dueDate: isSampleOrder ? invoiceDate : dueDateFromTerms(invoiceDate, creditDays),
    invoiceDate,
    customerId: custFields.customerId,
    customerLedgerId: isSampleOrder ? null : (ledger?.id ?? null),
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
    placeOfSupply,
    state: isStockTransfer ? destWh?.state || placeOfSupply : custFields.state || placeOfSupply,
    gstTreatment: custFields.gstTreatment ?? "registered",
    receivableLedger: isSampleOrder
      ? ""
      : (ledger?.accountName ?? custFields.receivableLedger),
    billFrom: sourceWarehouse,
    billTo: partyName,
    shipTo: partyName,
    dispatchQty,
    transportMode: dispatch.transporterName ? "Road" : "",
    transporterName: dispatch.transporterName || "",
    transporterId: "",
    vehicleNo: dispatch.vehicleNumber || "",
    lrNo: (dispatch as { lrNumber?: string }).lrNumber || "",
    lrDate: "",
    transportDocNo:
      (dispatch as { transportDocNo?: string }).transportDocNo ||
      (dispatch as { lrNumber?: string }).lrNumber ||
      "",
    transportDocDate: (dispatch as { transportDocDate?: string }).transportDocDate || "",
    distanceKm: null,
    lineItems,
    lineErrors,
    additionalExpenses: isSampleOrder ? [] : additionalExpenses,
    nearExpirySchemes: isSampleOrder ? [] : getEligibleNearExpirySchemes(dispatch),
    sourceWarehouseGstin: sourceWh?.gstNumber || "",
    destinationWarehouseGstin: destWh?.gstNumber || "",
    sourceWarehouseState: sourceWh?.state || "",
    destinationWarehouseState: destWh?.state || placeOfSupply,
  };
}
