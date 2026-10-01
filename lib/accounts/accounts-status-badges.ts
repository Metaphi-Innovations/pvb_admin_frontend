import type { StatusKey } from "@/lib/tokens";
import type { ReceivableStatus } from "@/lib/accounts/receivables-data";
import type { PayableStatus } from "@/lib/accounts/payables-data";

export function receivableStatusToBadge(status: ReceivableStatus): { status: StatusKey; label: string } {
  switch (status) {
    case "paid":
      return { status: "approved", label: "Paid" };
    case "partially_paid":
      return { status: "partial", label: "Partially Received" };
    case "overdue":
      return { status: "overdue", label: "Overdue" };
    case "unpaid":
    default:
      return { status: "pending", label: "Pending" };
  }
}

export function payableStatusToBadge(status: PayableStatus): { status: StatusKey; label: string } {
  switch (status) {
    case "paid":
      return { status: "approved", label: "Paid" };
    case "partially_paid":
      return { status: "partial", label: "Partially Paid" };
    case "overdue":
      return { status: "overdue", label: "Overdue" };
    case "unpaid":
    default:
      return { status: "pending", label: "Pending" };
  }
}

export function noteWorkflowStatusToBadge(
  status: string,
): { status: StatusKey; label: string } {
  switch (status) {
    case "posted":
      return { status: "approved", label: "Posted" };
    case "cancelled":
      return { status: "rejected", label: "Cancelled" };
    case "draft":
    default:
      return { status: "draft", label: "Draft" };
  }
}

export function collectionStatusToBadge(
  status: string,
): { status: StatusKey; label: string } {
  const label =
    STATUS_LABELS[status as CollectionFollowUpStatusKey] ??
    status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  switch (status) {
    case "closed":
      return { status: "approved", label: "Closed" };
    case "part_payment_received":
      return { status: "partial", label: "Part Payment Received" };
    case "promise_to_pay":
      return { status: "pending", label: "Promise to Pay" };
    case "follow_up_scheduled":
      return { status: "partial", label: "Follow-up Scheduled" };
    case "escalated":
      return { status: "pending", label: "Escalated" };
    case "not_contacted":
      return { status: "draft", label: "Not Contacted" };
    case "overdue":
      return { status: "overdue", label: "Overdue" };
    default:
      return { status: "pending", label };
  }
}

type CollectionFollowUpStatusKey =
  | "not_contacted"
  | "follow_up_scheduled"
  | "promise_to_pay"
  | "part_payment_received"
  | "escalated"
  | "closed";

const STATUS_LABELS: Record<CollectionFollowUpStatusKey, string> = {
  not_contacted: "Not Contacted",
  follow_up_scheduled: "Follow-up Scheduled",
  promise_to_pay: "Promise to Pay",
  part_payment_received: "Part Payment Received",
  escalated: "Escalated",
  closed: "Closed",
};
