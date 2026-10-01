"use client";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/accounts/money-format";

export interface VoucherNoteReferenceStripProps {
  /** e.g. "Sales Invoice" / "Purchase Return" */
  documentLabel: string;
  documentNo: string;
  dateLabel?: string;
  date: string;
  partyLabel: string;
  partyName: string;
  totalLabel?: string;
  total: number | null | undefined;
  className?: string;
}

/**
 * @deprecated Replaced by NoteReferenceDocumentDetails for Credit / Debit Note.
 * Compact read-only source document strip — not used by active CN/DN routes.
 */
export function VoucherNoteReferenceStrip({
  documentLabel,
  documentNo,
  dateLabel = "Date",
  date,
  partyLabel,
  partyName,
  totalLabel = "Document Total",
  total,
  className,
}: VoucherNoteReferenceStripProps) {
  const totalText =
    total == null || Number.isNaN(total) ? "—" : formatMoney(total);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1.5 border-b border-border/70 bg-muted/20 text-[11px]",
        className,
      )}
    >
      <span className="text-muted-foreground font-medium">
        {documentLabel}:{" "}
        <span className="font-mono font-medium text-foreground">{documentNo || "—"}</span>
      </span>
      <span className="text-muted-foreground">
        {dateLabel}: <span className="text-foreground font-normal">{date || "—"}</span>
      </span>
      <span className="text-muted-foreground">
        {partyLabel}: <span className="text-foreground font-normal">{partyName || "—"}</span>
      </span>
      <span className="text-muted-foreground ml-auto tabular-nums">
        {totalLabel}: <span className="text-foreground font-medium">{totalText}</span>
      </span>
    </div>
  );
}
