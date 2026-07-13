import type { GrnRecord } from "./types";

export interface GrnListingKpis {
  pendingQc: number;
  qcInProgress: number;
  qcCompleted: number;
  totalGrns: number;
}

/** GRN-native KPIs — computed from provided records (no localStorage mock). */
export function computeGrnListingKpis(grns: GrnRecord[] = []): GrnListingKpis {
  return {
    pendingQc: grns.filter((g) => g.status === "pending_qc").length,
    qcInProgress: grns.filter((g) => g.status === "qc_in_progress").length,
    qcCompleted: grns.filter((g) => g.status === "qc_completed").length,
    totalGrns: grns.length,
  };
}
