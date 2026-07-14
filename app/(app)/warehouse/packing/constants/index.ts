
export const PRIORITY_BADGE_CONFIG: Record<string, { bg: string; label: string }> = {
  "Low": { bg: "bg-slate-50 text-slate-700 border-slate-200", label: "Low" },
  "Medium": { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Medium" },
  "High": { bg: "bg-orange-50 text-orange-700 border-orange-200", label: "High" },
  "Urgent": { bg: "bg-rose-50 text-rose-700 border-rose-200", label: "Urgent" },
};

export const STATUS_BADGE_CONFIG: Record<string, { bg: string; label: string }> = {
  "Ready For Packing": { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Ready For Packing" },
  "Pending Packing": { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending Packing" },
  "Partially Packed": { bg: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Partially Packed" },
  "Packing In Progress": { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Packing In Progress" },
  "Fully Packed": { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Fully Packed" },
  "Packed": { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Packed" },
  "Ready For Dispatch": { bg: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200", label: "Ready For Dispatch" },
  "Dispatched": { bg: "bg-teal-50 text-teal-700 border-teal-200", label: "Dispatched" },
  "Cancelled": { bg: "bg-slate-100 text-slate-700 border-slate-200", label: "Cancelled" },
};
