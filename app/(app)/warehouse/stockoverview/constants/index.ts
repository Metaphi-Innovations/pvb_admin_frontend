export const WAREHOUSE_OPTIONS = [
  { label: "Central Warehouse", value: "Central Warehouse" },
  { label: "North Zone Hub", value: "North Zone Hub" },
  { label: "South Zone Depot", value: "South Zone Depot" },
  { label: "West Zone Hub", value: "West Zone Hub" },
];

export const PRODUCT_OPTIONS = [
  { label: "Urea 50kg", value: "Urea 50kg" },
  { label: "NPK 10:26:26", value: "NPK 10:26:26" },
  { label: "Hybrid Maize Seed", value: "Hybrid Maize Seed" },
  { label: "DAP 50kg", value: "DAP 50kg" },
  { label: "Zinc Sulphate 21%", value: "Zinc Sulphate 21%" },
];

export const VENDOR_OPTIONS = [
  { label: "Chambal Fertilizers Ltd", value: "Chambal Fertilizers Ltd" },
  { label: "Rashtriya Chemicals & Fert", value: "Rashtriya Chemicals & Fert" },
  { label: "Pioneer Seeds Ltd", value: "Pioneer Seeds Ltd" },
  { label: "IFFCO Cooperative", value: "IFFCO Cooperative" },
  { label: "Aries Agro Industries", value: "Aries Agro Industries" },
];

// Daily Log Stock Statuses (QC-accepted sellable only — matches getDailyLogStatus)
export const DAILY_LOG_STATUS_OPTIONS = [
  { label: "Available", value: "Available" },
  { label: "Near Expiry", value: "Near Expiry" },
];

// QC Passed / Inventory Stock Statuses (matches backend StockOverviewService.getStatus)
// Reserved qty is a separate column — not a line-level stock status.
export const QC_PASSED_STATUS_OPTIONS = [
  { label: "Available", value: "Available" },
  { label: "Low Stock", value: "Low Stock" },
  { label: "Near Expiry", value: "Near Expiry" },
  { label: "Expired", value: "Expired" },
  { label: "Out Of Stock", value: "Out Of Stock" },
];

// Rejected Stock Statuses (lifecycle — PO return still uses REJECTED / PARTIALLY_RETURNED)
export const REJECTED_STATUS_OPTIONS = [
  { label: "Rejected", value: "Rejected" },
];

/** QC reject category shown on Rejected tab (not lifecycle status) */
export const REJECT_TYPE_OPTIONS = [
  { label: "Damaged", value: "Damaged" },
  { label: "Expired", value: "Expired" },
];

// Sales Return Stock Statuses (post GRN+QC — same lifecycle as Inventory)
export const SALES_RETURN_STOCK_STATUS_OPTIONS = [
  { label: "Available", value: "Available" },
  { label: "Low Stock", value: "Low Stock" },
  { label: "Near Expiry", value: "Near Expiry" },
  { label: "Expired", value: "Expired" },
  { label: "Out Of Stock", value: "Out Of Stock" },
];

// Sample Return Stock Statuses (post GRN+QC — same lifecycle as Inventory)
export const SAMPLE_RETURN_STOCK_STATUS_OPTIONS = [
  { label: "Available", value: "Available" },
  { label: "Low Stock", value: "Low Stock" },
  { label: "Near Expiry", value: "Near Expiry" },
  { label: "Expired", value: "Expired" },
  { label: "Out Of Stock", value: "Out Of Stock" },
];

// GRN Pending Stock Statuses
export const GRN_PENDING_STATUS_OPTIONS = [
  { label: "Pending QC", value: "Pending QC" },
  { label: "QC In Progress", value: "QC In Progress" },
  { label: "Awaiting Inspection", value: "Awaiting Inspection" },
];

// Compatibility
export const STATUS_OPTIONS = QC_PASSED_STATUS_OPTIONS;

/** Source status = inbound origin after GRN+QC */
export const SOURCE_STATUS_OPTIONS = [
  { label: "Purchase", value: "Purchase" },
  { label: "Stock Transfer", value: "Stock Transfer" },
  { label: "Sales Return", value: "Sales Return" },
  { label: "Sample Return", value: "Sample Return" },
];

/** Inventory tab only mixes Purchase + Stock Transfer */
export const INVENTORY_SOURCE_STATUS_OPTIONS = [
  { label: "Purchase", value: "Purchase" },
  { label: "Stock Transfer", value: "Stock Transfer" },
];

export const STATUS_BADGE_CONFIG: Record<string, { bg: string; label: string }> = {
  Available: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Available" },
  "Low Stock": { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Low Stock" },
  Reserved: { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Reserved" },
  Expired: { bg: "bg-rose-50 text-rose-700 border-rose-200", label: "Expired" },
  Damaged: { bg: "bg-orange-50 text-orange-700 border-orange-200", label: "Damaged" },
  "Near Expiry": { bg: "bg-orange-50 text-orange-700 border-orange-200", label: "Near Expiry" },
  "Out Of Stock": { bg: "bg-slate-100 text-slate-700 border-slate-200", label: "Out Of Stock" },
  Hold: { bg: "bg-navy-50 text-navy-700 border-navy-200", label: "Hold" },
  Rejected: { bg: "bg-rose-50 text-rose-700 border-rose-200", label: "Rejected" },
  "Under Review": { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Under Review" },
  Disposed: { bg: "bg-slate-100 text-slate-700 border-slate-200", label: "Disposed" },
  "Returned To Supplier": { bg: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Returned To Supplier" },
  "QC Pending": { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "QC Pending" },
  "Pending QC": { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending QC" },
  "QC In Progress": { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "QC In Progress" },
  "Awaiting Inspection": { bg: "bg-purple-50 text-purple-700 border-purple-200", label: "Awaiting Inspection" },
  COMPLETED: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Completed" },
  REJECTED: { bg: "bg-rose-50 text-rose-700 border-rose-200", label: "Rejected" },
  Purchase: { bg: "bg-sky-50 text-sky-700 border-sky-200", label: "Purchase" },
  "Stock Transfer": { bg: "bg-violet-50 text-violet-700 border-violet-200", label: "Stock Transfer" },
  "Sales Return": { bg: "bg-teal-50 text-teal-700 border-teal-200", label: "Sales Return" },
  "Sample Return": { bg: "bg-cyan-50 text-cyan-700 border-cyan-200", label: "Sample Return" },
};
