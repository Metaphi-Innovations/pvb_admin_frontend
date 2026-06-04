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

// QC Passed Stock Statuses
export const QC_PASSED_STATUS_OPTIONS = [
  { label: "Available", value: "Available" },
  { label: "Low Stock", value: "Low Stock" },
  { label: "Reserved", value: "Reserved" },
  { label: "Near Expiry", value: "Near Expiry" },
  { label: "Expired", value: "Expired" },
  { label: "Out Of Stock", value: "Out Of Stock" },
];

// Rejected Stock Statuses
export const REJECTED_STATUS_OPTIONS = [
  { label: "Rejected", value: "Rejected" },
  { label: "Under Review", value: "Under Review" },
  { label: "Disposed", value: "Disposed" },
  { label: "Returned To Vendor", value: "Returned To Vendor" },
];

// GRN Pending Stock Statuses
export const GRN_PENDING_STATUS_OPTIONS = [
  { label: "Pending QC", value: "Pending QC" },
  { label: "QC In Progress", value: "QC In Progress" },
  { label: "Awaiting Inspection", value: "Awaiting Inspection" },
];

// Compatibility
export const STATUS_OPTIONS = QC_PASSED_STATUS_OPTIONS;

export const STATUS_BADGE_CONFIG: Record<string, { bg: string; label: string }> = {
  // QC Passed Stock badges
  "Available": { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Available" },
  "Low Stock": { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Low Stock" },
  "Reserved": { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Reserved" },
  "Expired": { bg: "bg-rose-50 text-rose-700 border-rose-200", label: "Expired" },
  "Near Expiry": { bg: "bg-orange-50 text-orange-700 border-orange-200", label: "Near Expiry" },
  "Out Of Stock": { bg: "bg-slate-100 text-slate-700 border-slate-200", label: "Out Of Stock" },

  // Rejected Stock badges
  "Rejected": { bg: "bg-rose-50 text-rose-700 border-rose-200", label: "Rejected" },
  "Under Review": { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Under Review" },
  "Disposed": { bg: "bg-slate-100 text-slate-700 border-slate-200", label: "Disposed" },
  "Returned To Vendor": { bg: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Returned To Vendor" },

  // GRN Pending Stock badges
  "Pending QC": { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending QC" },
  "QC In Progress": { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "QC In Progress" },
  "Awaiting Inspection": { bg: "bg-purple-50 text-purple-700 border-purple-200", label: "Awaiting Inspection" },
};
