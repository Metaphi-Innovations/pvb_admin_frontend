"use client";

import { ACCOUNTS_COMPANY_NAME } from "@/lib/accounts/report-export-presentation";
import { cn } from "@/lib/utils";
import { formatGeneralLedgerDate } from "./general-ledger-data";

const COMPANY_ADDRESS = "Plot 42, Agri Tech Park, Gachibowli, Hyderabad — 500032";
const COMPANY_CONTACT = "+91 40 4521 8800";
const COMPANY_EMAIL = "accounts@dharitrisutra.in";

export function formatGeneralLedgerPeriod(dateFrom: string, dateTo: string): string {
  return `${formatGeneralLedgerDate(dateFrom)} to ${formatGeneralLedgerDate(dateTo)}`;
}

export function GeneralLedgerReportHeader({
  ledgerName,
  ledgerCode,
  parentGroup,
  ledgerType,
  gstin,
  pan,
  dateFrom,
  dateTo,
  financialYearLabel,
  className,
}: {
  ledgerName?: string;
  ledgerCode?: string;
  parentGroup?: string;
  ledgerType?: string;
  gstin?: string;
  pan?: string;
  dateFrom: string;
  dateTo: string;
  financialYearLabel?: string;
  className?: string;
}) {
  const period = formatGeneralLedgerPeriod(dateFrom, dateTo);
  const emptyLike = (v?: string) => !v || v === "—" || v.trim() === "";

  const companyItems = [
    { label: "Company", value: ACCOUNTS_COMPANY_NAME },
    { label: "Address", value: COMPANY_ADDRESS },
    { label: "Contact", value: COMPANY_CONTACT },
    { label: "Email", value: COMPANY_EMAIL },
  ];

  const ledgerItems = ledgerName
    ? [
        { label: "Ledger", value: ledgerName },
        ...(ledgerCode ? [{ label: "Code", value: ledgerCode }] : []),
        ...(ledgerType ? [{ label: "Type", value: ledgerType }] : []),
        ...(parentGroup ? [{ label: "Parent Group", value: parentGroup }] : []),
        ...(!emptyLike(gstin) ? [{ label: "GSTIN", value: gstin! }] : []),
        ...(!emptyLike(pan) ? [{ label: "PAN", value: pan! }] : []),
      ]
    : [];

  const periodItems = [
    ...(financialYearLabel ? [{ label: "Financial Year", value: financialYearLabel }] : []),
    { label: "Period", value: period },
  ];

  return (
    <div
      className={cn(
        "flex-shrink-0 px-3 py-2.5 border-b border-border/60 bg-muted/10 space-y-1.5",
        className,
      )}
    >
      <div className="hidden lg:grid lg:grid-cols-3 gap-x-4 gap-y-1 text-[11px]">
        <div className="space-y-0.5">
          {companyItems.map((item) => (
            <p key={item.label} className="leading-snug">
              <span className="font-semibold text-foreground">{item.label}</span>
              <span className="text-muted-foreground">: </span>
              <span className="text-foreground">{item.value}</span>
            </p>
          ))}
        </div>
        {ledgerItems.length > 0 && (
          <div className="space-y-0.5">
            {ledgerItems.map((item) => (
              <p key={item.label} className="leading-snug">
                <span className="font-semibold text-foreground">{item.label}</span>
                <span className="text-muted-foreground">: </span>
                <span
                  className={cn(
                    item.label === "Code" && "font-mono font-semibold text-brand-700",
                    item.label === "Ledger" && "font-semibold text-navy-700",
                  )}
                >
                  {item.value}
                </span>
              </p>
            ))}
          </div>
        )}
        <div className="space-y-0.5">
          {periodItems.map((item) => (
            <p key={item.label} className="leading-snug">
              <span className="font-semibold text-foreground">{item.label}</span>
              <span className="text-muted-foreground">: </span>
              <span className="text-foreground">{item.value}</span>
            </p>
          ))}
        </div>
      </div>
      <p className="lg:hidden text-[11px] text-foreground leading-snug">
        <span className="font-semibold text-navy-700">{ACCOUNTS_COMPANY_NAME}</span>
        {ledgerName ? (
          <>
            <span className="text-muted-foreground"> · </span>
            <span className="font-semibold">{ledgerName}</span>
            {ledgerCode ? (
              <span className="font-mono text-brand-700"> ({ledgerCode})</span>
            ) : null}
          </>
        ) : null}
        <span className="text-muted-foreground"> · </span>
        {period}
      </p>
    </div>
  );
}
