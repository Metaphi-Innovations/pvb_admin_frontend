"use client";

import { Edit2 } from "lucide-react";
import type { ThreeWayMatchStatus } from "@/services/purchase-order-list.service";

const STATUS_STYLES: Record<ThreeWayMatchStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700 border-slate-200",
  MATCHED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  NOT_MATCHED: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<ThreeWayMatchStatus, string> = {
  PENDING: "Pending",
  MATCHED: "Matched",
  NOT_MATCHED: "Not Matched",
};

export function ThreeWayMatchListingCell({
  status,
  onEdit,
}: {
  status: ThreeWayMatchStatus;
  /** Opens PO edit so user can adjust qty/rate to resolve mismatch. */
  onEdit?: () => void;
}) {
  const isUnmatched = status === "NOT_MATCHED";

  return (
    <div className="py-1.5 space-y-1" onClick={(e) => e.stopPropagation()}>
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${STATUS_STYLES[status]}`}
      >
        {STATUS_LABELS[status]}
      </span>
      {isUnmatched && onEdit && (
        <button
          type="button"
          className="text-[10px] text-brand-600 hover:underline inline-flex items-center gap-0.5"
          onClick={onEdit}
        >
          <Edit2 className="w-3 h-3" />
          Edit
        </button>
      )}
    </div>
  );
}
