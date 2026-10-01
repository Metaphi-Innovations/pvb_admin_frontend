"use client";

import { cn } from "@/lib/utils";
import { REQUEST_STATUS_LABEL, type TravelRequestStatus } from "./travel-request-data";

export function TravelRequestStatusPill({ status }: { status: TravelRequestStatus }) {
  const map: Record<TravelRequestStatus, { bg: string; text: string; dot: string }> = {
    draft: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
    submitted: { bg: "bg-navy-50", text: "text-navy-700", dot: "bg-navy-500" },
    under_review: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
    approved: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    returned: { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-400" },
    rejected: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
    cancelled: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  };
  const cfg = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-semibold", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {REQUEST_STATUS_LABEL[status]}
    </span>
  );
}
