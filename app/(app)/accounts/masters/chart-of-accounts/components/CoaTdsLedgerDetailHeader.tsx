"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { formatBalanceAmount } from "@/lib/accounts/money-format";
import type { ChartOfAccount } from "../../../data";
import { resolveTdsLedgerUsageInfo } from "../coa-listing-data";
import { buildTdsPartyWiseReportHref } from "@/lib/accounts/tds-coa-utils";

export function CoaTdsLedgerDetailHeader({
  ledger,
  records,
  currentAmount,
  currentSide,
}: {
  ledger: ChartOfAccount;
  records: ChartOfAccount[];
  currentAmount: number;
  currentSide: "Debit" | "Credit";
}) {
  const tds = resolveTdsLedgerUsageInfo(ledger);
  if (!tds) return null;

  const reportHref = buildTdsPartyWiseReportHref(ledger, records);

  return (
    <div className="flex-shrink-0 px-3 py-2.5 border-b border-border/60 bg-muted/10">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-2 text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            TDS Section
          </span>
          <p className="font-mono font-semibold text-brand-700 mt-0.5">{tds.section}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Rate
          </span>
          <p className="font-semibold text-foreground mt-0.5">{tds.rate}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Payable / Receivable
          </span>
          <p className="font-semibold text-foreground mt-0.5">{tds.kind}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Deductee Type
          </span>
          <p className="text-foreground mt-0.5 truncate" title={tds.deductee}>
            {tds.deductee}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Linked TDS Master
          </span>
          <p className="text-foreground mt-0.5 truncate" title={tds.linkedMaster}>
            {tds.linkedMaster}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Current Balance
          </span>
          <p className="font-semibold tabular-nums text-foreground mt-0.5">
            {currentAmount > 0 ? formatBalanceAmount(currentAmount, currentSide) : "—"}
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <Link
          href="/masters/tds"
          className="text-[11px] text-brand-600 hover:underline inline-flex items-center gap-1"
        >
          TDS Master
          <ExternalLink className="w-3 h-3" />
        </Link>
        <Link
          href={reportHref}
          className="text-[11px] text-brand-600 hover:underline inline-flex items-center gap-1"
        >
          TDS Party-wise Report
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
