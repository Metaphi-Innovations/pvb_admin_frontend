"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { VendorTransactionFields } from "@/lib/accounts/transaction-master-fetch";

function InfoRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] text-muted-foreground flex-shrink-0 w-28">{label}</span>
      <span className={cn("text-xs font-medium text-foreground text-right flex-1 min-w-0", mono && "font-mono")}>
        {value?.trim() ? value : "—"}
      </span>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{title}</p>
      <div className="rounded-lg border border-border bg-muted/10 px-3 py-0.5">{children}</div>
    </div>
  );
}

function stateFromAddress(address: string): string {
  if (!address.trim()) return "";
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return "";
  return parts[parts.length - 2] ?? "";
}

export function DirectPurchaseSupplierInfoDialog({
  fields,
  open,
  onOpenChange,
}: {
  fields: VendorTransactionFields | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!fields) return null;

  const registeredAddress = fields.billingAddress?.trim() || fields.shippingAddress?.trim() || "";
  const state = stateFromAddress(registeredAddress);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
          <DialogTitle className="text-sm font-semibold leading-tight truncate">{fields.vendorName}</DialogTitle>
          <DialogDescription className="font-mono text-xs text-brand-700 mt-0.5">
            {fields.vendorCode}
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 py-4 space-y-3 max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
          <Block title="Basic Information">
            <InfoRow label="Supplier Name" value={fields.vendorName} />
            <InfoRow label="Supplier Code" value={fields.vendorCode} mono />
            <InfoRow label="GSTIN" value={fields.vendorGst} mono />
            <InfoRow label="PAN" value={fields.pan} mono />
          </Block>

          <Block title="Contact">
            <InfoRow label="Contact Person" value={fields.contactPerson} />
            <InfoRow label="Mobile" value={fields.vendorMobile} mono />
            <InfoRow label="Email" value={fields.vendorEmail} />
          </Block>

          <Block title="Commercial">
            <InfoRow label="Payment Terms" value={fields.paymentTerms} />
            <InfoRow label="Credit Days" value={String(fields.creditDays)} />
          </Block>

          <Block title="Address">
            <InfoRow label="State" value={state} />
            <InfoRow label="Registered Address" value={registeredAddress} />
          </Block>
        </div>

        <div className="px-4 py-3 border-t border-border bg-muted/20 flex justify-end gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" asChild>
            <Link href={`/masters/vendors/${fields.vendorId}`} onClick={() => onOpenChange(false)}>
              Open Supplier Master
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
