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

export const CUSTOMER_OPTIONS = [
  { label: "Karan Johar", value: "Karan Johar" },
  { label: "Aditya Birla Group", value: "Aditya Birla Group" },
  { label: "Reliance Agri", value: "Reliance Agri" },
  { label: "Mahindra Farms", value: "Mahindra Farms" },
  { label: "Tata Agro", value: "Tata Agro" },
];

export const PACKED_BY_OPTIONS = [
  { label: "Rahul S.", value: "Rahul S." },
  { label: "Suresh P.", value: "Suresh P." },
  { label: "Amit V.", value: "Amit V." },
];

export const PRIORITY_OPTIONS = [
  { label: "Low", value: "Low" },
  { label: "Medium", value: "Medium" },
  { label: "High", value: "High" },
  { label: "Urgent", value: "Urgent" },
];

export const READY_STATUS_OPTIONS = [
  { label: "Ready For Packing", value: "Ready For Packing" },
  { label: "Partially Packed", value: "Partially Packed" },
  { label: "Packing In Progress", value: "Packing In Progress" },
];

export const DONE_STATUS_OPTIONS = [
  { label: "Packed", value: "Packed" },
  { label: "Dispatched", value: "Dispatched" },
  { label: "Cancelled", value: "Cancelled" },
];

export const PRIORITY_BADGE_CONFIG: Record<string, { bg: string; label: string }> = {
  "Low": { bg: "bg-slate-50 text-slate-700 border-slate-200", label: "Low" },
  "Medium": { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Medium" },
  "High": { bg: "bg-orange-50 text-orange-700 border-orange-200", label: "High" },
  "Urgent": { bg: "bg-rose-50 text-rose-700 border-rose-200", label: "Urgent" },
};

export const STATUS_BADGE_CONFIG: Record<string, { bg: string; label: string }> = {
  "Ready For Packing": { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Ready For Packing" },
  "Partially Packed": { bg: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Partially Packed" },
  "Packing In Progress": { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Packing In Progress" },
  "Packed": { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Packed" },
  "Dispatched": { bg: "bg-teal-50 text-teal-700 border-teal-200", label: "Dispatched" },
  "Cancelled": { bg: "bg-slate-100 text-slate-700 border-slate-200", label: "Cancelled" },
};
