import { masterToday } from "@/lib/masters/common";
import { STOCK_PRODUCT_CATALOG, STOCK_BATCH_SEEDS, buildStockMovementLedger } from "../mock-data/stockPositionLedger";
import type { StockLineStatus, StockPositionFilters, StockPositionKpis, StockPositionLine } from "../types/stock-position";

function movementDate(dateTime: string): string {
  return dateTime.slice(0, 10);
}

function lineKey(productCode: string, batchNumber: string, warehouse: string) {
  return `${productCode}::${batchNumber}::${warehouse}`;
}

function deriveInventoryStatus(expiryDate: string, asOn: string): StockLineStatus {
  const exp = new Date(expiryDate);
  const on = new Date(asOn);
  if (exp < on) return "Expired";
  const near = new Date(asOn);
  near.setDate(near.getDate() + 90);
  if (exp <= near) return "Near Expiry";
  return "Available";
}

function getProduct(productCode: string) {
  return STOCK_PRODUCT_CATALOG.find((p) => p.productCode === productCode)!;
}

/** Resolve from/to dates used for ledger calculations. */
export function resolveStockDateRange(filters: StockPositionFilters, today = masterToday()) {
  if (filters.dateMode === "single") {
    const d = filters.asOnDate || today;
    return { fromDate: d, toDate: d, positionDate: d };
  }
  let fromDate = filters.fromDate || today;
  let toDate = filters.toDate || today;
  if (fromDate > toDate) {
    [fromDate, toDate] = [toDate, fromDate];
  }
  return { fromDate, toDate, positionDate: toDate };
}

export function formatStockDateLabel(filters: StockPositionFilters, today = masterToday()) {
  const { fromDate, toDate } = resolveStockDateRange(filters, today);
  if (filters.dateMode === "single" || fromDate === toDate) {
    return `As on ${fromDate}`;
  }
  return `${fromDate} to ${toDate}`;
}

function computeMovementMetrics(
  movements: ReturnType<typeof buildStockMovementLedger>,
  productCode: string,
  batchNumber: string,
  warehouse: string,
  fromDate: string,
  toDate: string,
) {
  const relevant = movements.filter(
    (m) =>
      m.productCode === productCode &&
      m.batchNumber === batchNumber &&
      m.warehouse === warehouse &&
      movementDate(m.dateTime) <= toDate,
  );

  let openingQty = 0;
  let dayIn = 0;
  let dayOut = 0;

  for (const m of relevant) {
    const d = movementDate(m.dateTime);
    if (d < fromDate) {
      openingQty += m.inQty - m.outQty;
    } else if (d >= fromDate && d <= toDate) {
      dayIn += m.inQty;
      dayOut += m.outQty;
    }
  }

  const closingQty = openingQty + dayIn - dayOut;
  return { openingQty, dayIn, dayOut, closingQty };
}

/**
 * Stock position from inventory ledger only.
 * GRN / pending-QC quantities are excluded until QC acceptance posts to inventory.
 */
export function computeStockPosition(
  filters: StockPositionFilters,
  today = masterToday(),
): { lines: StockPositionLine[]; kpis: StockPositionKpis; dateLabel: string } {
  const { fromDate, toDate, positionDate } = resolveStockDateRange(filters, today);
  const movements = buildStockMovementLedger(today);

  const ledgerLines: StockPositionLine[] = STOCK_BATCH_SEEDS.map((batch) => {
    const product = getProduct(batch.productCode);
    const { openingQty, dayIn, dayOut, closingQty } = computeMovementMetrics(
      movements,
      batch.productCode,
      batch.batchNumber,
      batch.warehouse,
      fromDate,
      toDate,
    );

    const qty = Math.max(0, closingQty);
    const status = deriveInventoryStatus(batch.expiryDate, positionDate);
    const availableQty = status === "Available" || status === "Near Expiry" ? qty : 0;

    return {
      id: lineKey(batch.productCode, batch.batchNumber, batch.warehouse),
      productCode: product.productCode,
      productName: product.productName,
      hsn: product.hsn,
      scientificName: product.scientificName,
      category: product.category,
      packSize: product.packSize,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      warehouse: batch.warehouse,
      cp: product.cp,
      status,
      openingQty,
      dayIn,
      dayOut,
      closingQty: qty,
      availableQty,
      stockValuation: qty * product.cp,
    };
  }).filter((l) => l.closingQty > 0 || l.openingQty > 0 || l.dayIn > 0 || l.dayOut > 0);

  let lines = ledgerLines;

  if (filters.warehouse && filters.warehouse !== "All") {
    lines = lines.filter((l) => l.warehouse === filters.warehouse);
  }
  if (filters.product) {
    lines = lines.filter((l) => l.productCode === filters.product || l.productName === filters.product);
  }

  const kpis: StockPositionKpis = {
    openingStockQty: lines.reduce((s, l) => s + l.openingQty, 0),
    dayInQty: lines.reduce((s, l) => s + l.dayIn, 0),
    dayOutQty: lines.reduce((s, l) => s + l.dayOut, 0),
    closingStockQty: lines.reduce((s, l) => s + l.closingQty, 0),
    closingStockValue: lines.reduce((s, l) => s + l.stockValuation, 0),
  };

  return { lines, kpis, dateLabel: formatStockDateLabel(filters, today) };
}

export function getStockFilterOptions(today = masterToday()) {
  const { lines } = computeStockPosition(
    { datePreset: "today", dateMode: "single", asOnDate: today, fromDate: today, toDate: today, warehouse: "All", product: "" },
    today,
  );
  const products = Array.from(new Map(lines.map((l) => [l.productCode, l.productName])).entries()).map(
    ([value, label]) => ({ value, label }),
  );
  return { products };
}
