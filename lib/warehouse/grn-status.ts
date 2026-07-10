import type { GrnStatus } from "@/app/(app)/warehouse/grn/shared/types";

export type BackendGrnStatus = "DRAFT" | "QC_PENDING" | "QC_COMPLETED" | "CANCELLED";

export type BackendGrnSourceType =
  | "PURCHASE_ORDER"
  | "SALES_RETURN"
  | "SAMPLE_RETURN"
  | "STOCK_TRANSFER";

export const GRN_STATUS_CONFIG: Record<
  GrnStatus,
  { bg: string; label: string }
> = {
  pending_qc: {
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    label: "Pending QC",
  },
  qc_in_progress: {
    bg: "bg-navy-50 text-navy-700 border-navy-200",
    label: "QC In Progress",
  },
  qc_completed: {
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    label: "QC Completed",
  },
};

export function mapBackendGrnStatus(status: string): GrnStatus {
  switch (status) {
    case "QC_COMPLETED":
      return "qc_completed";
    case "DRAFT":
    case "QC_PENDING":
    default:
      return "pending_qc";
  }
}

export function mapFrontendGrnStatusToBackend(status: string): BackendGrnStatus | "" {
  switch (status) {
    case "qc_completed":
      return "QC_COMPLETED";
    case "pending_qc":
    case "qc_in_progress":
      return "QC_PENDING";
    default:
      return "";
  }
}

export function getGrnStatusLabel(status: GrnStatus): string {
  return GRN_STATUS_CONFIG[status]?.label ?? "Unknown";
}
