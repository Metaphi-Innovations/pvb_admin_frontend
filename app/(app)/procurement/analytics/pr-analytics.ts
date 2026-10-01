import type { PurchaseRequest } from "../purchase-requests/pr-data";
import {
  daysSince,
  isPRConverted,
  monthlyTrendFromDates,
  prSubmittedAt,
  topCounts,
} from "./proc-analytics-utils";

export interface PRAnalytics {
  kpis: {
    total: number;
    pendingApproval: number;
    approved: number;
    rejected: number;
    poCreated: number;
  };
  statusDistribution: { name: string; value: number; color: string }[];
  monthlyTrend: { month: string; count: number }[];
  topRequestors: { name: string; count: number }[];
  pendingAging: { bucket: string; count: number; color: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  Draft: "#94A3B8",
  "Pending Approval": "#F59E0B",
  Approved: "#267A2E",
  Rejected: "#EF4444",
  Converted: "#1A3A96",
};

function prDonutLabel(pr: PurchaseRequest): string {
  if (isPRConverted(pr)) return "Converted";
  if (pr.status === "draft") return "Draft";
  if (pr.status === "pending_approval") return "Pending Approval";
  if (pr.status === "approved") return "Approved";
  if (pr.status === "rejected") return "Rejected";
  if (["partially_converted", "fully_converted"].includes(pr.status)) return "Converted";
  return "Approved";
}

export function computePRAnalytics(records: PurchaseRequest[]): PRAnalytics {
  const pending = records.filter((r) => r.status === "pending_approval");
  const approved = records.filter(
    (r) => r.status === "approved" || ["partially_converted", "fully_converted", "closed"].includes(r.status),
  );
  const rejected = records.filter((r) => r.status === "rejected");
  const poCreated = records.filter((r) => isPRConverted(r));

  const statusMap = new Map<string, number>();
  for (const pr of records) {
    const label = prDonutLabel(pr);
    statusMap.set(label, (statusMap.get(label) ?? 0) + 1);
  }
  const statusDistribution = [...statusMap.entries()].map(([name, value]) => ({
    name,
    value,
    color: STATUS_COLORS[name] ?? "#6B7280",
  }));

  const aging = { "0-3 Days": 0, "4-7 Days": 0, "8+ Days": 0 };
  for (const pr of pending) {
    const days = daysSince(prSubmittedAt(pr));
    if (days <= 3) aging["0-3 Days"] += 1;
    else if (days <= 7) aging["4-7 Days"] += 1;
    else aging["8+ Days"] += 1;
  }

  return {
    kpis: {
      total: records.length,
      pendingApproval: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      poCreated: poCreated.length,
    },
    statusDistribution,
    monthlyTrend: monthlyTrendFromDates(records.map((r) => r.prDate)),
    topRequestors: topCounts(records, (r) => r.requestedBy, 5),
    pendingAging: [
      { bucket: "0-3 Days", count: aging["0-3 Days"], color: "#267A2E" },
      { bucket: "4-7 Days", count: aging["4-7 Days"], color: "#F59E0B" },
      { bucket: "8+ Days", count: aging["8+ Days"], color: "#EF4444" },
    ],
  };
}
