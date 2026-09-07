"use client";

import { formatMoney } from "@/lib/accounts/money-format";
import type { OutstandingBillSummaryDisplay } from "@/types/bill-wise-outstanding.types";

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-border px-2.5 py-1.5 shadow-sm min-w-0 min-h-[44px] flex flex-col justify-center">
      <p className="accounts-summary-label">{label}</p>
      <p className="accounts-summary-value mt-0.5 tabular-nums truncate">{value}</p>
    </div>
  );
}

export function OutstandingSummaryCards({
  summary,
  loading,
}: {
  summary: OutstandingBillSummaryDisplay;
  loading?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      <SummaryCard
        label="Total Bills"
        value={loading ? "…" : String(summary.totalBills)}
      />
      <SummaryCard
        label="Total Invoice Amount"
        value={loading ? "…" : formatMoney(summary.totalInvoiceAmount)}
      />
      <SummaryCard
        label="Total Adjusted"
        value={loading ? "…" : formatMoney(summary.totalAdjustedAmount)}
      />
      <SummaryCard
        label="Total Outstanding"
        value={loading ? "…" : formatMoney(summary.totalOutstandingAmount)}
      />
      <SummaryCard
        label="Total Overdue"
        value={loading ? "…" : formatMoney(summary.totalOverdueAmount)}
      />
    </div>
  );
}
