"use client";

import { cn } from "@/lib/utils";
import { formatTrialBalanceReportDate } from "../trial-balance/TrialBalanceReportSummary";

export const BALANCE_SHEET_COMPANY_NAME = "Dharitri Sutra";

export function BalanceSheetReportSummary({
  financialYearLabel,
  asOnDate,
  className,
}: {
  financialYearLabel: string;
  asOnDate: string;
  className?: string;
}) {
  const asOn = formatTrialBalanceReportDate(asOnDate);

  const items = [
    { label: "Company", value: BALANCE_SHEET_COMPANY_NAME },
    { label: "Report", value: "Balance Sheet" },
    { label: "Financial Year", value: financialYearLabel },
    { label: "As On Date", value: asOn },
  ];

  const compactLine = `Balance Sheet | ${financialYearLabel} | As on ${asOn}`;

  return (
    <div
      className={cn(
        "flex-shrink-0 px-3 py-2 border-b border-border/60 bg-muted/10 text-[11px] w-full space-y-1",
        className,
      )}
    >
      <div className="hidden sm:flex flex-wrap items-center gap-x-4 gap-y-1">
        {items.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1">
            <span className="font-semibold text-foreground">{item.label}</span>
            <span className="text-muted-foreground">:</span>
            <span className="text-foreground">{item.value}</span>
          </span>
        ))}
      </div>
      <p className="sm:hidden text-foreground font-medium">{compactLine}</p>
    </div>
  );
}
