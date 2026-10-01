"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusKey } from "@/lib/tokens";
import type { ExpensePaidStatus, ExpenseStatus } from "../expense-data";

const STATUS_MAP: Record<ExpenseStatus, StatusKey> = {
  draft: "draft",
  submitted: "pending",
  pending_approval: "pending",
  approved: "approved",
  rejected: "rejected",
  paid: "approved",
  cancelled: "closed",
};

const LABELS: Record<ExpenseStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
  cancelled: "Cancelled",
};

export function ExpenseStatusBadge({ status }: { status: ExpenseStatus }) {
  return <StatusBadge status={STATUS_MAP[status]} label={LABELS[status]} size="sm" />;
}

export function PaidStatusBadge({ paidStatus }: { paidStatus: ExpensePaidStatus }) {
  return (
    <StatusBadge
      status={paidStatus === "paid" ? "approved" : "pending"}
      label={paidStatus === "paid" ? "Paid" : "Unpaid"}
      size="sm"
    />
  );
}
