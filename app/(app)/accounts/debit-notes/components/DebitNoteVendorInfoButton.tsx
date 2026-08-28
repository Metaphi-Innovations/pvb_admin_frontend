"use client";

/**
 * Read-only Vendor/Supplier details popup for Direct Debit Note create/edit.
 * Uses already-available Supplier VIEW / dropdown / snapshot fields. Informational only.
 */

import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  const text = value?.trim();
  if (!text) return null;
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground break-words">{text}</span>
    </div>
  );
}

export type DebitNoteVendorInfo = {
  vendorName?: string;
  vendorCode?: string;
  gstin?: string;
  billingAddress?: string;
  state?: string;
  linkedLedger?: string;
  supplierType?: string;
  paymentTerms?: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
};

export function DebitNoteVendorInfoButton({
  enabled,
  info,
}: {
  enabled: boolean;
  info: DebitNoteVendorInfo;
}) {
  const [open, setOpen] = useState(false);
  const title = info.vendorName?.trim() || "Vendor";

  return (
    <>
      <button
        type="button"
        disabled={!enabled}
        className={cn(
          "inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md",
          enabled
            ? "text-muted-foreground hover:bg-muted hover:text-brand-700"
            : "text-muted-foreground/30 cursor-not-allowed",
        )}
        aria-label={`Vendor details for ${title}`}
        title={enabled ? "Vendor details" : undefined}
        onClick={(e) => {
          e.stopPropagation();
          if (enabled) setOpen(true);
        }}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">{title}</DialogTitle>
            <DialogDescription className="text-[11px]">Vendor details</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border bg-muted/20 px-3 py-1">
            <InfoRow label="Supplier Name" value={info.vendorName} />
            <InfoRow label="Supplier Code" value={info.vendorCode} />
            <InfoRow label="GSTIN" value={info.gstin} />
            <InfoRow label="Billing Address" value={info.billingAddress} />
            <InfoRow label="State" value={info.state} />
            <InfoRow label="AP / Payable Ledger" value={info.linkedLedger} />
            <InfoRow label="Supplier Type" value={info.supplierType} />
            <InfoRow label="Payment Terms" value={info.paymentTerms} />
            <InfoRow label="Contact Person" value={info.contactPerson} />
            <InfoRow label="Mobile" value={info.mobile} />
            <InfoRow label="Email" value={info.email} />
          </div>
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
