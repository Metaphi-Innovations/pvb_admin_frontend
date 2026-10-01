"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  APPROVAL_STATUS_LABELS,
  resolveDisplayApprovalStatus,
  type ApprovalStatus,
  type SchemeRecord,
} from "../scheme-data";

const APPROVAL_STYLES: Record<ApprovalStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  manager_approval: "bg-indigo-50 text-indigo-700 border-indigo-200",
  finance_approval: "bg-violet-50 text-violet-700 border-violet-200",
  final_approval: "bg-purple-50 text-purple-700 border-purple-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  active: "bg-green-50 text-green-800 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-orange-50 text-orange-700 border-orange-200",
};

export function SchemeApprovalBadge({ record }: { record: SchemeRecord }) {
  const status = resolveDisplayApprovalStatus(record);
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-medium px-1.5 py-0 h-5", APPROVAL_STYLES[status])}
    >
      {APPROVAL_STATUS_LABELS[status]}
    </Badge>
  );
}

export function SchemeStatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-medium px-1.5 py-0 h-5",
        active
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-slate-50 text-slate-600 border-slate-200",
      )}
    >
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}
