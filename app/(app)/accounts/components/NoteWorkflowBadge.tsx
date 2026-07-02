"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusKey } from "@/lib/tokens";

const MAP: Record<string, { status: StatusKey; label: string }> = {
  draft: { status: "draft", label: "Draft" },
  pending_approval: { status: "pending", label: "Pending Approval" },
  sent_back: { status: "pending", label: "Sent Back" },
  approved: { status: "approved", label: "Posted" },
  processed: { status: "active", label: "Posted" },
  posted: { status: "approved", label: "Posted" },
  rejected: { status: "rejected", label: "Rejected" },
  cancelled: { status: "closed", label: "Cancelled" },
};

export function NoteWorkflowBadge({ status }: { status: string }) {
  const m = MAP[status] ?? { status: "inactive" as StatusKey, label: status };
  return <StatusBadge status={m.status} label={m.label} size="sm" />;
}
