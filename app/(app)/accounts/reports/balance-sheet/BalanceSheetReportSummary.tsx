"use client";

import { cn } from "@/lib/utils";
import { formatTrialBalanceReportDate } from "../trial-balance/TrialBalanceReportSummary";

export function BalanceSheetReportSummary({
  companyName,
  financialYearLabel,
  asOnDate,
  branchLabel,
  className,
}: {
  companyName: string;
  financialYearLabel: string;
  asOnDate: string;
  branchLabel: string;
  className?: string;
}) {
  const asOn = asOnDate ? formatTrialBalanceReportDate(asOnDate) : "—";
  const items = [
    { label: "Company", value: companyName || "—" },
    { label: "Report", value: "Balance Sheet" },
    { label: "Financial Year", value: financialYearLabel || "—" },
    { label: "As On Date", value: asOn },
    { label: "Branch", value: branchLabel || "All Branches" },
  ];

  return (
    <div
      className={cn(
        "flex-shrink-0 px-3 py-2 border-b border-border/60 bg-muted/10 text-[11px] w-full",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {items.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1">
            <span className="font-semibold text-foreground">{item.label}</span>
            <span className="text-muted-foreground">:</span>
            <span className="text-foreground">{item.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
