import { THREE_WAY_MATCH_LABELS, type ThreeWayMatchStatus } from "@/lib/erp/three-way-match";

const STATUS_STYLES: Record<ThreeWayMatchStatus, string> = {
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  matched: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partial_match: "bg-amber-50 text-amber-700 border-amber-200",
  mismatch: "bg-red-50 text-red-700 border-red-200",
};

export function ThreeWayMatchStatusBadge({ status }: { status: ThreeWayMatchStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${STATUS_STYLES[status]}`}
    >
      {THREE_WAY_MATCH_LABELS[status]}
    </span>
  );
}
