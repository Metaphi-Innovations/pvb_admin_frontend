/**
 * Centralized Purchase Order status mapping between backend enums and frontend list values.
 */

/** Frontend listing status tokens (snake_case). */
export type POListStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "partially_received"
  | "received"
  | "invoice_uploaded"
  | "short_closed"
  | "closed"
  | "cancelled";

/** Backend `PurchaseOrderStatus` enum values. */
export type POBackendStatus =
  | "Draft"
  | "Pending_Approval"
  | "Approved"
  | "Rejected"
  | "Partially_Received"
  | "Received"
  | "Short_Closed"
  | "Cancelled"
  | "Closed";

const BACKEND_TO_FRONTEND: Record<POBackendStatus, POListStatus> = {
  Draft: "draft",
  Pending_Approval: "pending_approval",
  Approved: "approved",
  Rejected: "rejected",
  Partially_Received: "partially_received",
  Received: "received",
  Short_Closed: "short_closed",
  Cancelled: "cancelled",
  Closed: "closed",
};

const FRONTEND_TO_BACKEND: Partial<Record<POListStatus, POBackendStatus>> = {
  draft: "Draft",
  pending_approval: "Pending_Approval",
  approved: "Approved",
  rejected: "Rejected",
  partially_received: "Partially_Received",
  received: "Received",
  short_closed: "Short_Closed",
  cancelled: "Cancelled",
  closed: "Closed",
  // invoice_uploaded is a frontend-only status (invoice is a relation on the backend).
};

const STATUS_LABELS: Record<POListStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  partially_received: "Partially Received",
  received: "Received",
  invoice_uploaded: "Invoice Uploaded",
  short_closed: "Short Closed",
  closed: "Closed",
  cancelled: "Cancelled",
};

export function mapBackendStatusToFrontend(value: unknown): POListStatus {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "draft";

  if (raw in BACKEND_TO_FRONTEND) {
    return BACKEND_TO_FRONTEND[raw as POBackendStatus];
  }

  const normalized = raw.toLowerCase().replace(/\s+/g, "_");
  if (normalized in FRONTEND_TO_BACKEND || normalized === "invoice_uploaded") {
    return normalized as POListStatus;
  }

  return "draft";
}

export function mapFrontendStatusToBackend(value: unknown): POBackendStatus | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;

  if (raw in BACKEND_TO_FRONTEND) {
    return raw as POBackendStatus;
  }

  const normalized = raw.toLowerCase().replace(/\s+/g, "_") as POListStatus;
  return FRONTEND_TO_BACKEND[normalized] ?? null;
}

export function getPOStatusLabel(status: string): string {
  const mapped = mapBackendStatusToFrontend(status);
  return STATUS_LABELS[mapped] ?? status;
}

/** Status options for listing filters (frontend values). */
export const PO_LIST_STATUS_FILTER_OPTIONS: { label: string; value: POListStatus }[] = [
  { label: "Draft", value: "draft" },
  { label: "Pending Approval", value: "pending_approval" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Partially Received", value: "partially_received" },
  { label: "Received", value: "received" },
  { label: "Short Closed", value: "short_closed" },
  { label: "Closed", value: "closed" },
  { label: "Cancelled", value: "cancelled" },
];

/** PO main tab — drafts live on the Draft tab only. */
export const PO_MAIN_STATUS_FILTER_OPTIONS = PO_LIST_STATUS_FILTER_OPTIONS.filter(
  (o) => o.value !== "draft",
);

export const PO_DRAFT_STATUS_FILTER_OPTIONS = PO_LIST_STATUS_FILTER_OPTIONS.filter(
  (o) => o.value === "draft",
);

/** Backend statuses for the main PO list (excludes Draft). */
export const PO_MAIN_BACKEND_STATUSES: POBackendStatus[] = [
  "Pending_Approval",
  "Approved",
  "Rejected",
  "Partially_Received",
  "Received",
  "Short_Closed",
  "Cancelled",
  "Closed",
];
