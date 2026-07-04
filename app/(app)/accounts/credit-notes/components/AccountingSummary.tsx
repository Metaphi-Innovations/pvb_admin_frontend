"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import type { LedgerImpactLine } from "@/components/accounts/LedgerImpactPreview";
import { formatINR } from "../note-utils";

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="pb-2.5 border-b border-border mb-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

export interface AccountingSummaryProps {
  taxableAmount: number;
  gstAmount: number;
  totalAmount: number;
  narration: string;
  onNarrationChange: (value: string) => void;
  attachmentName: string;
  onAttachmentChange: (fileName: string) => void;
  impactLines?: LedgerImpactLine[];
  readOnly?: boolean;
}

export function AccountingSummary({
  taxableAmount,
  gstAmount,
  totalAmount,
  narration,
  onNarrationChange,
  attachmentName,
  onAttachmentChange,
  impactLines,
  readOnly,
}: AccountingSummaryProps) {
  return (
    <div className="px-6 py-5 space-y-4">
      <SectionHeading label="Accounting Summary" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-muted/10 p-3">
          <p className="text-xs font-medium text-muted-foreground">Taxable Amount</p>
          <p className="text-sm font-semibold tabular-nums mt-1">{formatINR(taxableAmount)}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/10 p-3">
          <p className="text-xs font-medium text-muted-foreground">GST Amount</p>
          <p className="text-sm font-semibold tabular-nums mt-1">{formatINR(gstAmount)}</p>
        </div>
        <div className="rounded-xl border border-border bg-brand-50/40 p-3">
          <p className="text-xs font-medium text-muted-foreground">Total Credit Note Amount</p>
          <p className="text-sm font-bold tabular-nums text-brand-700 mt-1">{formatINR(totalAmount)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2 space-y-1">
          <Label className="text-xs font-medium">Narration</Label>
          <Textarea
            className="min-h-[72px] text-xs resize-none"
            value={narration}
            onChange={(e) => onNarrationChange(e.target.value)}
            placeholder="Credit note narration for ledger posting…"
            disabled={readOnly}
          />
        </div>
        <div className="md:col-span-2 space-y-1">
          <Label className="text-xs font-medium">Attachment (Optional)</Label>
          <Input
            type="file"
            className="h-9 text-xs"
            disabled={readOnly}
            onChange={(e) => onAttachmentChange(e.target.files?.[0]?.name ?? "")}
          />
          {attachmentName && (
            <p className="text-[11px] text-muted-foreground">Selected: {attachmentName}</p>
          )}
        </div>
      </div>

      {impactLines && impactLines.length > 0 && totalAmount > 0 && (
        <div className="pt-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Posting Impact Preview
          </p>
          <LedgerImpactPreview lines={impactLines} />
          <p className="text-[11px] text-muted-foreground mt-2">
            Posting updates customer outstanding, customer ledger, general ledger, trial balance, P&amp;L, balance sheet, GST reports, and audit trail.
          </p>
        </div>
      )}
    </div>
  );
}
