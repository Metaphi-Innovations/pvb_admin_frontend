import { getQcRecords } from "../mock-data";
import type { QcRecord } from "../types";

export interface QcListingKpis {
  pendingQc: number;
  qcCompleted: number;
  totalQc: number;
}

export function computeQcListingKpis(
  qcs: QcRecord[] = getQcRecords(),
): QcListingKpis {
  return {
    pendingQc: qcs.filter((q) => q.status === "pending").length,
    qcCompleted: qcs.filter((q) => q.status === "completed").length,
    totalQc: qcs.length,
  };
}
