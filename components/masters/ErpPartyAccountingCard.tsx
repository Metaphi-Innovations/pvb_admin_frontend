"use client";

import Link from "next/link";
import { BookOpen, ExternalLink, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/accounts/money-format";
import type { PartyAccountingSummary } from "@/lib/accounts/erp-accounting-mapping";

export function ErpPartyAccountingCard({
  title,
  summary,
  partyLabel,
}: {
  title: string;
  summary: PartyAccountingSummary;
  partyLabel: "Customer" | "Vendor";
}) {
  const outstandingLabel = partyLabel === "Customer" ? "Outstanding Balance" : "Outstanding Payable";

  return (
    <div className="rounded-lg border border-border/60 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-brand-600" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-[10px] uppercase text-muted-foreground">Linked Ledger</p>
          <p className="font-medium mt-0.5 font-mono">{summary.ledgerCode}</p>
          <p className="text-foreground/90">{summary.ledgerName}</p>
          {summary.isSystemGenerated && (
            <p className="text-[10px] text-brand-700 mt-1">System-generated from {partyLabel} Master</p>
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase text-muted-foreground">{outstandingLabel}</p>
          <p className="font-semibold mt-0.5 tabular-nums text-base flex items-center gap-1">
            <IndianRupee className="w-3.5 h-3.5" />
            {formatMoney(summary.outstanding)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        {summary.ledgerId ? (
          <Button asChild variant="outline" size="sm" className="h-7 text-[11px] gap-1">
            <Link href={summary.ledgerHref}>
              <ExternalLink className="w-3 h-3" /> Open Ledger
            </Link>
          </Button>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Ledger will be created when {partyLabel.toLowerCase()} is activated.
          </p>
        )}
        {summary.ledgerId && (
          <Button asChild variant="ghost" size="sm" className="h-7 text-[11px]">
            <Link href={summary.coaHref}>View in COA</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
