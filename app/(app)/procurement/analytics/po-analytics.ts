import { getPOFollowUpSummary, loadAllFollowUps } from "../purchase-orders/po-followup-data";
import type { PurchaseOrder } from "../purchase-orders/po-data";
import { daysSince, monthlyTrendFromDates, topCounts } from "./proc-analytics-utils";

export interface POAnalytics {
  kpis: {
    total: number;
    pendingApproval: number;
    approved: number;
    invoiceUploaded: number;
    shortClosed: number;
    closed: number;
  };
  statusDistribution: { name: string; value: number; color: string }[];
  monthlyTrend: { month: string; count: number }[];
  topVendors: { name: string; count: number }[];
  followUp: {
    totalFollowUps: number;
    followUpDue: number;
    overdueFollowUps: number;
    noFollowUp: number;
  };
  invoice: {
    pending: number;
    uploaded: number;
    uploadPct: number;
  };
}

const PO_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  invoice_uploaded: "Invoice Uploaded",
  short_closed: "Short Closed",
  closed: "Closed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

const PO_STATUS_COLORS: Record<string, string> = {
  Draft: "#94A3B8",
  "Pending Approval": "#F59E0B",
  Approved: "#3A6DD8",
  "Invoice Uploaded": "#267A2E",
  "Short Closed": "#7C3AED",
  Closed: "#1A3A96",
  Cancelled: "#EF4444",
  Rejected: "#DC2626",
};

function isInvoiceUploaded(po: PurchaseOrder): boolean {
  return ["invoice_uploaded", "closed", "short_closed"].includes(po.status);
}

export function computePOAnalytics(records: PurchaseOrder[]): POAnalytics {
  const pendingApproval = records.filter((r) => r.status === "pending_approval");
  const approvedStatus = records.filter((r) => r.status === "approved");
  const invoiceUploaded = records.filter((r) => isInvoiceUploaded(r));
  const shortClosed = records.filter((r) => r.status === "short_closed");
  const closed = records.filter((r) => r.status === "closed");

  const statusMap = new Map<string, number>();
  for (const po of records) {
    const label = PO_STATUS_LABELS[po.status] ?? po.status;
    statusMap.set(label, (statusMap.get(label) ?? 0) + 1);
  }
  const statusDistribution = [...statusMap.entries()].map(([name, value]) => ({
    name,
    value,
    color: PO_STATUS_COLORS[name] ?? "#6B7280",
  }));

  const allFollowUps = loadAllFollowUps();
  const poIds = new Set(records.map((r) => r.id));
  const relevantFollowUps = allFollowUps.filter((f) => poIds.has(f.poId));

  let followUpDue = 0;
  let overdueFollowUps = 0;
  let noFollowUp = 0;

  for (const po of records) {
    if (["draft", "cancelled", "rejected", "closed", "short_closed"].includes(po.status)) continue;
    const summary = getPOFollowUpSummary(po.id);
    const age = daysSince(po.poDate);
    if (summary.totalFollowUps === 0) {
      noFollowUp += 1;
      if (age > 7) overdueFollowUps += 1;
      else if (age > 3) followUpDue += 1;
    } else if (summary.lastFollowUpAt) {
      const sinceFollowUp = daysSince(summary.lastFollowUpAt.slice(0, 10));
      if (sinceFollowUp > 7) overdueFollowUps += 1;
      else if (sinceFollowUp > 3) followUpDue += 1;
    }
  }

  const invoiceEligible = records.filter((r) =>
    ["approved", "invoice_uploaded", "closed", "short_closed"].includes(r.status),
  );
  const invPending = invoiceEligible.filter((r) => r.status === "approved").length;
  const invUploaded = invoiceEligible.filter((r) => isInvoiceUploaded(r)).length;
  const uploadPct = invoiceEligible.length
    ? Math.round((invUploaded / invoiceEligible.length) * 100)
    : 0;

  return {
    kpis: {
      total: records.length,
      pendingApproval: pendingApproval.length,
      approved: approvedStatus.length,
      invoiceUploaded: invoiceUploaded.length,
      shortClosed: shortClosed.length,
      closed: closed.length,
    },
    statusDistribution,
    monthlyTrend: monthlyTrendFromDates(records.map((r) => r.poDate)),
    topVendors: topCounts(records, (r) => r.supplierName, 10),
    followUp: {
      totalFollowUps: relevantFollowUps.length,
      followUpDue,
      overdueFollowUps,
      noFollowUp,
    },
    invoice: {
      pending: invPending,
      uploaded: invUploaded,
      uploadPct,
    },
  };
}
