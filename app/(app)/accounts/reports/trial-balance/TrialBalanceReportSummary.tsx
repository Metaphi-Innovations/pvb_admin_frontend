"use client";

import { cn } from "@/lib/utils";
import type { TrialBalanceTab } from "./trial-balance-data";
import { trialBalanceViewLabel } from "./TrialBalanceViewTabs";

export const TRIAL_BALANCE_COMPANY_NAME = "Dharitri Sutra";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatTrialBalanceReportDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const month = MONTHS[d.getMonth()] ?? "";
  return `${day}-${month}-${d.getFullYear()}`;
}

export function formatTrialBalancePeriod(dateFrom: string, dateTo: string): string {
  return `${formatTrialBalanceReportDate(dateFrom)} to ${formatTrialBalanceReportDate(dateTo)}`;
}

export function TrialBalanceReportSummary({
  financialYearLabel,
  dateFrom,
  dateTo,
  activeTab,
  className,
}: {
  financialYearLabel: string;
  dateFrom: string;
  dateTo: string;
  activeTab: TrialBalanceTab;
  className?: string;
}) {
  const period = formatTrialBalancePeriod(dateFrom, dateTo);
  const view = trialBalanceViewLabel(activeTab);

  const items = [
    { label: "Company", value: TRIAL_BALANCE_COMPANY_NAME },
    { label: "Report", value: "Trial Balance" },
    { label: "Financial Year", value: financialYearLabel },
    { label: "Period", value: period },
    { label: "View", value: view },
  ];

  const compactLine = `Trial Balance | ${financialYearLabel} | ${period} | ${view}`;

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
