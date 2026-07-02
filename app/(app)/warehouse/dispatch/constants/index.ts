export const WAREHOUSE_OPTIONS = [
  { label: "Central Warehouse", value: "Central Warehouse" },
  { label: "North Zone Hub", value: "North Zone Hub" },
  { label: "South Zone Depot", value: "South Zone Depot" },
  { label: "West Zone Hub", value: "West Zone Hub" },
];

export const CUSTOMER_OPTIONS = [
  { label: "Karan Johar", value: "Karan Johar" },
  { label: "Aditya Birla Group", value: "Aditya Birla Group" },
  { label: "Reliance Agri", value: "Reliance Agri" },
  { label: "Mahindra Farms", value: "Mahindra Farms" },
  { label: "Tata Agro", value: "Tata Agro" },
];

export const TRANSPORTER_OPTIONS = [
  { label: "Blue Dart Logistics", value: "Blue Dart Logistics" },
  { label: "DTDC Cargo", value: "DTDC Cargo" },
  { label: "Gati Express", value: "Gati Express" },
  { label: "VRL Logistics", value: "VRL Logistics" },
];

export const DELIVERY_STATUS_OPTIONS = [
  { label: "Pending Dispatch", value: "Pending Dispatch" },
  { label: "In Transit", value: "In Transit" },
  { label: "Delivered", value: "Delivered" },
  { label: "Partially Delivered", value: "Partially Delivered" },
  { label: "Returned", value: "Returned" },
  { label: "Cancelled", value: "Cancelled" },
];

export const DELIVERY_STATUS_BADGE_CONFIG: Record<string, { bg: string; label: string }> = {
  "Pending Dispatch": { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending Dispatch" },
  "Ready to Dispatch": { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Ready to Dispatch" },
  "In Transit": { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "In Transit" },
  "Delivered": { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Delivered" },
  "Dispatched": { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Dispatched" },
  "Partially Delivered": { bg: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Partially Delivered" },
  "Returned": { bg: "bg-rose-50 text-rose-700 border-rose-200", label: "Returned" },
  "Cancelled": { bg: "bg-slate-100 text-slate-600 border-slate-200", label: "Cancelled" },
};
