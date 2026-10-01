"use client";

import { cn } from "@/lib/utils";
import { offboardingStatusLabel, type OffboardingStatus } from "../offboarding-data";

const TONE: Record<OffboardingStatus, { bg: string; text: string; dot: string }> = {
  pending_review: { bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-400" },
  initiated: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  notice_period: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  clearance_pending: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
  ready_for_exit: { bg: "bg-navy-50", text: "text-navy-700", dot: "bg-navy-500" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
  rejected: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
};

export function OffboardingStatusPill({ status }: { status: OffboardingStatus }) {
  const t = TONE[status] ?? TONE.initiated;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", t.bg, t.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", t.dot)} />
      {offboardingStatusLabel(status)}
    </span>
  );
}
