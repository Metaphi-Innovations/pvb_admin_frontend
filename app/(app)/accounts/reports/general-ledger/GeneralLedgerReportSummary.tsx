"use client";

import { cn } from "@/lib/utils";
import { ACCOUNTS_COMPANY_NAME } from "@/lib/accounts/report-export-presentation";
import { formatGeneralLedgerDate } from "@/lib/accounts/general-ledger-compute";
import type { GeneralLedgerSummary } from "@/lib/accounts/general-ledger-types";

export const GENERAL_LEDGER_COMPANY = {
  name: ACCOUNTS_COMPANY_NAME,
  address: "Plot 12, Agri Tech Park, Hinjewadi Phase 2, Pune — 411057",
  contact: "+91 20 4567 8900",
  email: "accounts@dharitrisutra.com",
};

export function formatGeneralLedgerPeriod(dateFrom: string, dateTo: string): string {
  return `${formatGeneralLedgerDate(dateFrom)} to ${formatGeneralLedgerDate(dateTo)}`;
}

export function GeneralLedgerReportSummary({
  summary,
  dateFrom,
  dateTo,
  financialYearLabel,
  className,
}: {
  summary?: GeneralLedgerSummary | null;
  dateFrom: string;
  dateTo: string;
  financialYearLabel: string;
  className?: string;
}) {
  const period = formatGeneralLedgerPeriod(dateFrom, dateTo);
  const items = [
    { label: "Company", value: GENERAL_LEDGER_COMPANY.name },
    ...(summary
      ? [
          { label: "Ledger", value: `${summary.ledgerName} (${summary.ledgerCode})` },
          { label: "Parent Group", value: summary.parentGroup },
        ]
      : []),
    { label: "Financial Year", value: financialYearLabel },
    { label: "Period", value: period },
  ];

  return (
    <div
      className={cn(
        "flex-shrink-0 px-3 py-2 border-b border-border/60 bg-muted/10 text-[11px] w-full space-y-1",
        className,
      )}
    >
      <div className="hidden md:grid md:grid-cols-2 gap-x-6 gap-y-0.5 text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">Address:</span> {GENERAL_LEDGER_COMPANY.address}
        </p>
        <p>
          <span className="font-semibold text-foreground">Contact:</span> {GENERAL_LEDGER_COMPANY.contact} ·{" "}
          {GENERAL_LEDGER_COMPANY.email}
        </p>
      </div>
      <div className="hidden sm:flex flex-wrap items-center gap-x-4 gap-y-1">
        {items.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1">
            <span className="font-semibold text-foreground">{item.label}</span>
            <span className="text-muted-foreground">:</span>
            <span className="text-foreground">{item.value}</span>
          </span>
        ))}
      </div>
      <p className="sm:hidden text-foreground font-medium">
        General Ledger | {financialYearLabel} | {period}
        {summary ? ` | ${summary.ledgerName}` : ""}
      </p>
    </div>
  );
}
