/**
 * Purchase Request status mapping between backend API values and frontend list tokens.
 */

export type PRListStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected";

export type PRBackendStatus =
  | "Draft"
  | "Pending Approval"
  | "Approved"
  | "Rejected";

export type PRPoStatus = "not_created" | "created";

export type PRBackendPoStatus = "Not Created" | "Created";

const BACKEND_TO_FRONTEND: Record<string, PRListStatus> = {
  Draft: "draft",
  "Pending Approval": "pending_approval",
  Pending: "pending_approval",
  Approved: "approved",
  Rejected: "rejected",
};

const FRONTEND_TO_BACKEND: Record<PRListStatus, PRBackendStatus> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_LABELS: Record<PRListStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
};

const PO_BACKEND_TO_FRONTEND: Record<string, PRPoStatus> = {
  "Not Created": "not_created",
  Not_Created: "not_created",
  Created: "created",
  PO_Created: "created",
};

const PO_FRONTEND_TO_BACKEND: Record<PRPoStatus, PRBackendPoStatus> = {
  not_created: "Not Created",
  created: "Created",
};

const PO_STATUS_LABELS: Record<PRPoStatus, string> = {
  not_created: "Not Created",
  created: "Created",
};

export function mapBackendStatusToFrontend(value: unknown): PRListStatus {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "draft";
  if (raw in BACKEND_TO_FRONTEND) return BACKEND_TO_FRONTEND[raw];
  const normalized = raw.toLowerCase().replace(/\s+/g, "_");
  if (normalized in FRONTEND_TO_BACKEND) return normalized as PRListStatus;
  return "draft";
}

export function mapFrontendStatusToBackend(
  value: unknown,
): PRBackendStatus | undefined {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return undefined;
  if (raw in FRONTEND_TO_BACKEND) {
    return FRONTEND_TO_BACKEND[raw as PRListStatus];
  }
  if (raw in BACKEND_TO_FRONTEND) return raw as PRBackendStatus;
  return undefined;
}

export function getPRStatusLabel(status: PRListStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function mapBackendPoStatusToFrontend(value: unknown): PRPoStatus {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "not_created";
  if (raw in PO_BACKEND_TO_FRONTEND) return PO_BACKEND_TO_FRONTEND[raw];
  const normalized = raw.toLowerCase().replace(/\s+/g, "_");
  if (normalized === "created" || normalized === "po_created") return "created";
  if (
    normalized === "not_created" ||
    normalized === "pending_po" ||
    normalized === "partially_converted"
  ) {
    return "not_created";
  }
  if (normalized === "fully_converted") return "created";
  return "not_created";
}

export function mapFrontendPoStatusToBackend(
  value: unknown,
): PRBackendPoStatus | undefined {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return undefined;
  if (raw === "pending_po" || raw === "partially_converted") {
    return "Not Created";
  }
  if (raw === "fully_converted") return "Created";
  if (raw in PO_FRONTEND_TO_BACKEND) {
    return PO_FRONTEND_TO_BACKEND[raw as PRPoStatus];
  }
  if (raw === "Not Created" || raw === "Created") {
    return raw as PRBackendPoStatus;
  }
  return undefined;
}

export function getPRPoStatusLabel(status: PRPoStatus): string {
  return PO_STATUS_LABELS[status] ?? status;
}

export const PR_LIST_TAB_STATUSES: PRListStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
];
