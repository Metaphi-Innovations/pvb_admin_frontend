"use client";

import { ACCOUNTS_COMPANY_NAME } from "@/lib/accounts/report-export-presentation";
import { cn } from "@/lib/utils";
import type { Gstr1ReportHeader } from "../gstr1-report-types";

export function Gstr1ReportHeaderBlock({
  header,
  className,
}: {
  header: Gstr1ReportHeader;
  className?: string;
}) {
  const items = [
    { label: "Company Name", value: header.companyName || ACCOUNTS_COMPANY_NAME },
    { label: "Report Name", value: header.reportName },
    { label: "GST Registration (GSTIN)", value: header.gstin, mono: true },
    { label: "Financial Year", value: header.financialYear },
    { label: "Return Period", value: header.returnPeriod },
    { label: "Filing Status", value: header.filingStatus, status: true },
  ];

  return (
    <div
      className={cn(
        "flex-shrink-0 px-3 py-2.5 border border-border rounded-xl bg-muted/10 shadow-sm",
        className,
      )}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-[11px]">
        {items.map((item) => (
          <p key={item.label} className="leading-snug">
            <span className="font-semibold text-foreground">{item.label}</span>
            <span className="text-muted-foreground">: </span>
            <span
              className={cn(
                item.mono && "font-mono text-brand-700",
                item.status && "text-amber-700 font-medium",
              )}
            >
              {item.value}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}
