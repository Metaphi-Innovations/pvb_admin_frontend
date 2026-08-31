import type { AccountsColumnFilterMeta } from "@/lib/accounts/column-filter-types";
import {
  collectionStatusToBadge,
  payableStatusToBadge,
  receivableStatusToBadge,
} from "@/lib/accounts/accounts-status-badges";
import type { PayableStatus } from "@/lib/accounts/payables-data";
import type {
  CollectionFollowUpStatus,
  ReceivableStatus,
} from "@/lib/accounts/receivables-data";

function buildStatusColumnFilter<T extends string>(
  values: readonly T[],
  labelFor: (value: T) => string,
): AccountsColumnFilterMeta {
  return {
    type: "status",
    options: [...values],
    optionLabels: Object.fromEntries(values.map((value) => [value, labelFor(value)])),
  };
}

const RECEIVABLE_STATUSES: readonly ReceivableStatus[] = [
  "unpaid",
  "partially_paid",
  "paid",
  "overdue",
] as const;

const PAYABLE_STATUSES: readonly PayableStatus[] = [
  "unpaid",
  "partially_paid",
  "paid",
  "overdue",
] as const;

const COLLECTION_FOLLOWUP_STATUSES: readonly CollectionFollowUpStatus[] = [
  "not_contacted",
  "follow_up_scheduled",
  "promise_to_pay",
  "part_payment_received",
  "escalated",
  "closed",
] as const;

/** Receivable outstanding / invoice status column filter. */
export const RECEIVABLE_STATUS_COLUMN_FILTER = buildStatusColumnFilter(
  RECEIVABLE_STATUSES,
  (status) => receivableStatusToBadge(status).label,
);

/** Payable outstanding / bill status column filter. */
export const PAYABLE_STATUS_COLUMN_FILTER = buildStatusColumnFilter(
  PAYABLE_STATUSES,
  (status) => payableStatusToBadge(status).label,
);

/** Collection follow-up status column filter. */
export const COLLECTION_FOLLOWUP_STATUS_COLUMN_FILTER = buildStatusColumnFilter(
  COLLECTION_FOLLOWUP_STATUSES,
  (status) => collectionStatusToBadge(status).label,
);
