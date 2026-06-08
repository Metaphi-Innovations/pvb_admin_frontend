"use client";

import { cn } from "@/lib/utils";

const STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Active" },
  inactive: { bg: "bg-stone-50", text: "text-stone-600", border: "border-stone-200", label: "Inactive" },
  draft: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", label: "Draft" },
  submitted: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "Submitted" },
  pending_approval: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Pending Approval" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Approved" },
  rejected: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Rejected" },
  paid: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", label: "Paid" },
  pending_payment: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Pending Payment" },
  sent_to_accounts: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "Sent to Accounts" },
  present: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Present" },
  absent: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Absent" },
  half_day: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Half Day" },
  leave: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "Leave" },
  wfh: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", label: "WFH" },
  holiday: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "Holiday" },
  week_off: { bg: "bg-stone-50", text: "text-stone-600", border: "border-stone-200", label: "Week Off" },
  pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Pending" },
  awaiting_hierarchy: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", label: "Awaiting Hierarchy" },
  pending_hr_review: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Pending HR Review" },
  hr_approved: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "HR Approved" },
  hr_rejected: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "HR Rejected" },
  sent_back: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "Sent Back" },
  on_hold: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "On Hold" },
  ready_for_payment: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", label: "Ready for Payment" },
  pending_manager_approval: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Pending Manager Approval" },
  pending_higher_approval: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Pending Higher Approval" },
  hierarchy_complete: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Hierarchy Approved" },
  auto_approved: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", label: "Auto Approved" },
  complete: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Complete" },
};

export function HrStatusBadge({ status, label }: { status: string; label?: string }) {
  const c = STYLES[status] ?? STYLES.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
        c.bg,
        c.text,
        c.border,
      )}
    >
      {label ?? c.label}
    </span>
  );
}
