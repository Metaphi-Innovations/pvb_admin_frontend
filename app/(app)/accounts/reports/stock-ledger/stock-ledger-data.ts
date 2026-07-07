/**
 * Stock Ledger report — built from actual warehouse & accounts transaction history.
 */

import { loadPurchaseInvoices } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { loadInvoices } from "@/app/(app)/accounts/invoices/invoices-data";
import { loadTransfers, type StockTransfer } from "@/app/(app)/sales/stock-transfer/stock-transfer-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import { getGrnRecords } from "@/app/(app)/warehouse/grn/mock-data";
import { getQcPassedStockRecords } from "@/app/(app)/warehouse/stockoverview/mock-data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import {
  buildInventoryMovements,
  resolveSku,
  type InventoryMovement,
} from "@/lib/accounts/inventory-accounting-data";
import { loadStockOpeningRows } from "@/lib/accounts/stock-opening-data";
import { roundMoney } from "@/lib/accounts/money-format";

export type StockLedgerTransactionType =
  | "opening"
  | "purchase"
  | "purchase_return"
  | "sales"
  | "sales_return"
  | "stock_transfer_in"
  | "stock_transfer_out"
  | "adjustment"
  | "production";

export const STOCK_LEDGER_TRANSACTION_TYPE_LABELS: Record<StockLedgerTransactionType, string> = {
  opening: "Opening",
  purchase: "Purchase",
  purchase_return: "Purchase Return",
  sales: "Sales",
  sales_return: "Sales Return",
  stock_transfer_in: "Stock Transfer In",
  stock_transfer_out: "Stock Transfer Out",
  adjustment: "Adjustment",
  production: "Production",
};

export const STOCK_LEDGER_TRANSACTION_TYPE_OPTIONS: {
  value: StockLedgerTransactionType | "all";
  label: string;
}[] = [
  { value: "all", label: "All types" },
  ...(
    Object.entries(STOCK_LEDGER_TRANSACTION_TYPE_LABELS) as [StockLedgerTransactionType, string][]
  ).map(([value, label]) => ({ value, label })),
];

export type StockLedgerSortKey =
  | "date"
  | "documentNo"
  | "transactionType"
  | "productName"
  | "warehouse"
  | "inQty"
  | "outQty"
  | "closingQty";

export interface StockLedgerRow {
  id: string;
  date: string;
  documentNo: string;
  transactionType: StockLedgerTransactionType;
  productCode: string;
  productName: string;
  warehouse: string;
  batchNo: string;
  mfgDate: string;
  expiryDate: string;
  openingQty: number;
  inQty: number;
  outQty: number;
  closingQty: number;
  unit: string;
  rate: number;
  value: number;
  referenceModule: string;
  createdBy: string;
  remarks: string;
  viewHref?: string;
}

export interface StockLedgerFilterParams {
  dateFrom: string;
  dateTo: string;
  financialYearId: string;
  productId: string;
  warehouse: string;
  batchNo: string;
  transactionType: string;
  documentNo: string;
  search: string;
}

export interface StockLedgerSummary {
  totalProducts: number;
  totalInwardQty: number;
  totalOutwardQty: number;
  netMovement: number;
  closingStock: number;
  stockValue: number;
}

interface RawMovement {
  id: string;
  date: string;
  transactionType: StockLedgerTransactionType;
  documentNo: string;
  productName: string;
  productCode: string;
  warehouse: string;
  batchNo: string;
  mfgDate: string;
  expiryDate: string;
  inQty: number;
  outQty: number;
  unit: string;
  rate: number;
  referenceModule: string;
  createdBy: string;
  remarks: string;
  viewHref?: string;
}

const TRANSFER_STOCK_STATUSES = new Set([
  "dispatched",
  "in_transit",
  "grn_pending",
  "partially_received",
  "received",
  "qc_pending",
  "qc_passed",
  "completed",
]);

function balanceKey(row: Pick<RawMovement, "productCode" | "warehouse" | "batchNo">): string {
  return `${row.productCode}|${row.warehouse}|${row.batchNo}`;
}

function lookupUnit(sku: string, productName: string): string {
  const product = loadProducts().find(
    (p) => p.sku === sku || p.productName.toLowerCase() === productName.toLowerCase(),
  );
  return product?.baseUnit ?? product?.mou ?? "—";
}

function buildBatchMetaMap(): Map<string, { mfgDate: string; expiryDate: string }> {
  const map = new Map<string, { mfgDate: string; expiryDate: string }>();
  const set = (sku: string, batch: string, wh: string, mfg: string, exp: string) => {
    if (!batch || batch === "—") return;
    const keys = [`${sku}|${batch}|${wh}`, `${sku}|${batch}`];
    for (const k of keys) {
      if (!map.has(k)) map.set(k, { mfgDate: mfg, expiryDate: exp });
    }
  };

  for (const row of loadStockOpeningRows()) {
    set(row.sku, row.batchNo, row.warehouse, "", row.expiryDate);
  }

  for (const grn of getGrnRecords()) {
    if (grn.status !== "qc_completed") continue;
    for (const batch of grn.batches) {
      const sku = resolveSku(batch.productName);
      set(sku, batch.batchNumber, grn.warehouse, batch.mfgDate ?? "", batch.expDate ?? "");
    }
  }

  for (const stock of getQcPassedStockRecords()) {
    const sku = resolveSku(stock.product);
    set(sku, stock.batchNumber, stock.warehouse, stock.manufacturingDate ?? "", stock.expiryDate ?? "");
  }

  return map;
}

function lookupBatchMeta(
  map: Map<string, { mfgDate: string; expiryDate: string }>,
  sku: string,
  batch: string,
  warehouse: string,
): { mfgDate: string; expiryDate: string } {
  if (!batch || batch === "—") return { mfgDate: "", expiryDate: "" };
  return (
    map.get(`${sku}|${batch}|${warehouse}`) ??
    map.get(`${sku}|${batch}`) ?? { mfgDate: "", expiryDate: "" }
  );
}

function mapInventoryVoucherType(voucherType: InventoryMovement["voucherType"]): StockLedgerTransactionType {
  switch (voucherType) {
    case "Opening Stock":
      return "opening";
    case "GRN":
      return "purchase";
    case "Sales Dispatch":
      return "sales";
    case "Purchase Return":
      return "purchase_return";
    case "Sales Return":
      return "sales_return";
    case "Stock Reconciliation":
    case "Stock Adjustment":
      return "adjustment";
    default:
      return "adjustment";
  }
}

function referenceModuleForType(type: StockLedgerTransactionType): string {
  switch (type) {
    case "opening":
      return "Stock Opening";
    case "purchase":
      return "Purchase / GRN";
    case "purchase_return":
      return "Purchase Return";
    case "sales":
      return "Sales Invoice";
    case "sales_return":
      return "Sales Return";
    case "stock_transfer_in":
    case "stock_transfer_out":
      return "Stock Transfer";
    case "adjustment":
      return "Stock Adjustment";
    case "production":
      return "Production";
    default:
      return "Warehouse";
  }
}

export function resolveStockLedgerDocumentHref(
  documentNo: string,
  transactionType: StockLedgerTransactionType,
): string | null {
  if (!documentNo || documentNo === "—") return null;

  switch (transactionType) {
    case "opening":
      return "/accounts/masters/stock-opening";
    case "purchase": {
      const pi = loadPurchaseInvoices().find(
        (p) => p.grnNo === documentNo || p.invoiceNo === documentNo,
      );
      if (pi) return `/accounts/purchase-invoices/${pi.id}`;
      const grn = getGrnRecords().find((g) => g.grnNo === documentNo);
      if (grn) return `/warehouse/grn/purchase/${grn.id}`;
      return "/warehouse/grn/purchase";
    }
    case "purchase_return":
      return "/accounts/debit-notes";
    case "sales": {
      const inv = loadInvoices().find((i) => i.invoiceNo === documentNo);
      if (inv) return `/accounts/transactions/invoices/${inv.id}`;
      return "/accounts/transactions/invoices";
    }
    case "sales_return":
      return "/accounts/credit-notes";
    case "stock_transfer_in":
    case "stock_transfer_out": {
      const transfer = loadTransfers().find((t) => t.transferNumber === documentNo);
      if (transfer) return `/sales/stock-transfer/${transfer.id}`;
      return "/sales/stock-transfer";
    }
    case "adjustment":
      return "/accounts/transactions/inventory-adjustments";
    case "production":
      return null;
    default:
      return null;
  }
}

function movementFromInventory(m: InventoryMovement, batchMap: Map<string, { mfgDate: string; expiryDate: string }>): RawMovement {
  const transactionType = mapInventoryVoucherType(m.voucherType);
  const batchNo = m.batchNo && m.batchNo !== "—" ? m.batchNo : "—";
  const meta = lookupBatchMeta(batchMap, m.sku, batchNo, m.warehouse);

  let createdBy = ACCOUNTS_CURRENT_USER;
  if (m.voucherType === "GRN") {
    const grn = getGrnRecords().find((g) => g.grnNo === m.voucherNo);
    if (grn?.createdBy) createdBy = grn.createdBy;
  } else if (m.voucherType === "Sales Dispatch" && m.voucherNo.startsWith("INV")) {
    const inv = loadInvoices().find((i) => i.invoiceNo === m.voucherNo);
    if (inv?.createdBy) createdBy = inv.createdBy;
  }

  return {
    id: m.id,
    date: m.date,
    transactionType,
    documentNo: m.voucherNo,
    productName: m.product,
    productCode: m.sku,
    warehouse: m.warehouse,
    batchNo,
    mfgDate: meta.mfgDate,
    expiryDate: meta.expiryDate,
    inQty: m.inQty,
    outQty: m.outQty,
    unit: lookupUnit(m.sku, m.product),
    rate: m.rate,
    referenceModule: m.source || referenceModuleForType(transactionType),
    createdBy,
    remarks: m.narration ?? "",
    viewHref: resolveStockLedgerDocumentHref(m.voucherNo, transactionType) ?? undefined,
  };
}

function movementsFromPurchaseInvoices(batchMap: Map<string, { mfgDate: string; expiryDate: string }>): RawMovement[] {
  const grnNos = new Set(getGrnRecords().map((g) => g.grnNo));
  const rows: RawMovement[] = [];

  for (const inv of loadPurchaseInvoices()) {
    if (inv.grnNo && grnNos.has(inv.grnNo)) continue;

    for (const line of inv.lineItems) {
      if (line.invoiceQty <= 0) continue;
      const sku = resolveSku(line.productName);
      const batchNo = line.batchNumber || "—";
      const meta = lookupBatchMeta(batchMap, sku, batchNo, "Central Warehouse");

      rows.push({
        id: `pi-${inv.id}-${line.id}`,
        date: inv.invoiceDate,
        transactionType: "purchase",
        documentNo: inv.invoiceNo,
        productName: line.productName,
        productCode: sku,
        warehouse: "Central Warehouse",
        batchNo,
        mfgDate: line.mfgDate ?? meta.mfgDate,
        expiryDate: line.expDate ?? meta.expiryDate,
        inQty: line.invoiceQty,
        outQty: 0,
        unit: line.unit || lookupUnit(sku, line.productName),
        rate: line.unitPrice,
        referenceModule: "Purchase Invoice",
        createdBy: inv.createdBy,
        remarks: inv.remarks,
        viewHref: `/accounts/purchase-invoices/${inv.id}`,
      });
    }
  }

  return rows;
}

function movementsFromStockTransfers(batchMap: Map<string, { mfgDate: string; expiryDate: string }>): RawMovement[] {
  const rows: RawMovement[] = [];

  for (const transfer of loadTransfers()) {
    if (!TRANSFER_STOCK_STATUSES.has(transfer.status)) continue;

    for (const line of transfer.lineItems) {
      if (!line.productName || (line.quantity ?? 0) <= 0) continue;
      const sku = resolveSku(line.productName);
      const qty = line.quantity ?? 0;
      const batchNo = line.batchNumber || "—";
      const unit = lookupUnit(sku, line.productName);
      const rate = line.unitPrice ?? 0;
      const meta = lookupBatchMeta(batchMap, sku, batchNo, transfer.sourceWarehouseName);

      const base = {
        documentNo: transfer.transferNumber,
        productName: line.productName,
        productCode: sku,
        batchNo,
        mfgDate: line.mfgDate ?? meta.mfgDate,
        expiryDate: line.expiryDate ?? meta.expiryDate,
        unit,
        rate,
        createdBy: transfer.createdBy,
        remarks: transfer.remarks ?? transfer.reasonPurpose ?? "",
      };

      rows.push({
        ...base,
        id: `st-out-${transfer.id}-${line.id}`,
        date: transfer.transferDate,
        transactionType: "stock_transfer_out",
        warehouse: transfer.sourceWarehouseName,
        inQty: 0,
        outQty: qty,
        referenceModule: "Stock Transfer",
        viewHref: `/sales/stock-transfer/${transfer.id}`,
      });

      rows.push({
        ...base,
        id: `st-in-${transfer.id}-${line.id}`,
        date: transfer.transferDate,
        transactionType: "stock_transfer_in",
        warehouse: transfer.targetWarehouseName,
        inQty: qty,
        outQty: 0,
        referenceModule: "Stock Transfer",
        viewHref: `/sales/stock-transfer/${transfer.id}`,
      });
    }
  }

  return rows;
}

function dedupeMovements(movements: RawMovement[]): RawMovement[] {
  const seen = new Set<string>();
  return movements.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

export function buildStockLedgerRows(): StockLedgerRow[] {
  const batchMap = buildBatchMetaMap();

  const raw: RawMovement[] = [
    ...buildInventoryMovements().map((m) => movementFromInventory(m, batchMap)),
    ...movementsFromPurchaseInvoices(batchMap),
    ...movementsFromStockTransfers(batchMap),
  ];

  const sorted = dedupeMovements(raw).sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return a.id.localeCompare(b.id);
  });

  const balances = new Map<string, number>();

  return sorted.map((seed) => {
    const key = balanceKey(seed);
    const openingQty = balances.get(key) ?? 0;
    const closingQty = openingQty + seed.inQty - seed.outQty;
    balances.set(key, closingQty);
    const movementQty = seed.inQty - seed.outQty;
    const value = roundMoney(Math.abs(movementQty) * seed.rate);

    return {
      ...seed,
      openingQty,
      closingQty,
      value,
    };
  });
}

export function getStockLedgerProductOptions(): { id: string; name: string; code: string }[] {
  const map = new Map<string, { id: string; name: string; code: string }>();
  for (const row of buildStockLedgerRows()) {
    if (!map.has(row.productCode)) {
      map.set(row.productCode, {
        id: row.productCode,
        name: row.productName,
        code: row.productCode,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getStockLedgerWarehouseOptions(): string[] {
  return Array.from(new Set(buildStockLedgerRows().map((r) => r.warehouse))).sort();
}

export function getStockLedgerBatchOptions(): string[] {
  return Array.from(
    new Set(buildStockLedgerRows().map((r) => r.batchNo).filter((b) => b && b !== "—")),
  ).sort();
}

function rowInFinancialYear(row: StockLedgerRow, financialYearId: string): boolean {
  if (financialYearId === "all") return true;
  const fy = loadFinancialYears().find((y) => String(y.id) === financialYearId);
  if (!fy) return true;
  return row.date >= fy.startDate && row.date <= fy.endDate;
}

function matchesSearch(search: string, parts: (string | number | undefined | null)[]): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return parts.some((p) => String(p ?? "").toLowerCase().includes(q));
}

export function filterStockLedgerRows(
  rows: StockLedgerRow[],
  filters: StockLedgerFilterParams,
): StockLedgerRow[] {
  return rows.filter((row) => {
    if (filters.dateFrom && row.date < filters.dateFrom) return false;
    if (filters.dateTo && row.date > filters.dateTo) return false;
    if (!rowInFinancialYear(row, filters.financialYearId)) return false;
    if (filters.productId !== "all" && row.productCode !== filters.productId) return false;
    if (filters.warehouse !== "all" && row.warehouse !== filters.warehouse) return false;
    if (filters.batchNo !== "all" && row.batchNo !== filters.batchNo) return false;
    if (filters.transactionType !== "all" && row.transactionType !== filters.transactionType) return false;
    if (
      filters.documentNo.trim() &&
      !row.documentNo.toLowerCase().includes(filters.documentNo.trim().toLowerCase())
    ) {
      return false;
    }
    if (
      !matchesSearch(filters.search, [
        row.productName,
        row.productCode,
        row.batchNo,
        row.documentNo,
        STOCK_LEDGER_TRANSACTION_TYPE_LABELS[row.transactionType],
      ])
    ) {
      return false;
    }
    return true;
  });
}

export function sortStockLedgerRows(
  rows: StockLedgerRow[],
  sortKey: StockLedgerSortKey,
  sortDir: "asc" | "desc",
): StockLedgerRow[] {
  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "date":
        cmp = a.date.localeCompare(b.date);
        break;
      case "documentNo":
        cmp = a.documentNo.localeCompare(b.documentNo);
        break;
      case "transactionType":
        cmp = STOCK_LEDGER_TRANSACTION_TYPE_LABELS[a.transactionType].localeCompare(
          STOCK_LEDGER_TRANSACTION_TYPE_LABELS[b.transactionType],
        );
        break;
      case "productName":
        cmp = a.productName.localeCompare(b.productName);
        break;
      case "warehouse":
        cmp = a.warehouse.localeCompare(b.warehouse);
        break;
      case "inQty":
        cmp = a.inQty - b.inQty;
        break;
      case "outQty":
        cmp = a.outQty - b.outQty;
        break;
      case "closingQty":
        cmp = a.closingQty - b.closingQty;
        break;
    }
    if (cmp === 0) cmp = a.id.localeCompare(b.id);
    return sortDir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export function computeStockLedgerSummary(rows: StockLedgerRow[]): StockLedgerSummary {
  const totalInwardQty = rows.reduce((s, r) => s + r.inQty, 0);
  const totalOutwardQty = rows.reduce((s, r) => s + r.outQty, 0);
  const productCodes = new Set(rows.map((r) => r.productCode));

  const latestByKey = new Map<string, StockLedgerRow>();
  for (const row of rows) {
    const key = balanceKey(row);
    const existing = latestByKey.get(key);
    if (!existing || row.date.localeCompare(existing.date) >= 0) {
      latestByKey.set(key, row);
    }
  }

  let closingStock = 0;
  let stockValue = 0;
  for (const row of latestByKey.values()) {
    closingStock += row.closingQty;
    stockValue += roundMoney(row.closingQty * row.rate);
  }

  return {
    totalProducts: productCodes.size,
    totalInwardQty,
    totalOutwardQty,
    netMovement: totalInwardQty - totalOutwardQty,
    closingStock,
    stockValue: roundMoney(stockValue),
  };
}

export function formatStockLedgerDate(iso: string): string {
  if (!iso) return "—";
  return new Date(`${iso}T12:00:00`)
    .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/ /g, "-");
}

export function formatQty(value: number, showZero = false): string {
  if (value === 0 && !showZero) return "—";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}
