export type StockMovementType =
  | "QC Accepted Stock"
  | "Stock Transfer In"
  | "Sales Return"
  | "Positive Adjustment"
  | "Opening Stock Entry"
  | "Sales Dispatch"
  | "Sample Issue"
  | "Stock Transfer Out"
  | "Purchase Return"
  | "Rejected Stock Disposal"
  | "Expired Stock Disposal"
  | "Negative Adjustment";

/** Inventory line status — only stock post-QC acceptance appears on this dashboard. */
export type StockLineStatus =
  | "Available"
  | "Hold"
  | "Near Expiry"
  | "Expired"
  | "Low Stock"
  | "Reserved"
  | "Out Of Stock";

export type StockDateMode = "single" | "range";

export interface StockProductMeta {
  productCode: string;
  productName: string;
  hsn: string;
  scientificName: string;
  category: string;
  packSize: string;
  cp: number;
}

/** Internal ledger entry — used for KPI/day qty calculation only, not shown in UI. */
export interface StockMovementEntry {
  id: string;
  dateTime: string;
  productCode: string;
  batchNumber: string;
  warehouse: string;
  transactionType: StockMovementType;
  referenceNo: string;
  inQty: number;
  outQty: number;
}

export interface StockPositionLine {
  id: string;
  productCode: string;
  productName: string;
  hsn: string;
  scientificName: string;
  category: string;
  packSize: string;
  batchNumber: string;
  expiryDate: string;
  warehouse: string;
  cp: number;
  status: StockLineStatus;
  openingQty: number;
  dayIn: number;
  dayOut: number;
  closingQty: number;
  availableQty: number;
  stockValuation: number;
}

export interface StockPositionKpis {
  openingStockQty: number;
  dayInQty: number;
  dayOutQty: number;
  closingStockQty: number;
  closingStockValue: number;
}

export interface StockPositionFilters {
  /** Period dropdown selection */
  datePreset: string;
  dateMode: StockDateMode;
  /** Single-date mode — stock position as on this date */
  asOnDate: string;
  /** Range mode — period start (inclusive) */
  fromDate: string;
  /** Range mode — period end (inclusive); closing stock evaluated as on this date */
  toDate: string;
  warehouse: string;
  product: string;
}

export const DEFAULT_STOCK_POSITION_FILTERS: StockPositionFilters = {
  datePreset: "today",
  dateMode: "single",
  asOnDate: "",
  fromDate: "",
  toDate: "",
  warehouse: "All",
  product: "",
};
