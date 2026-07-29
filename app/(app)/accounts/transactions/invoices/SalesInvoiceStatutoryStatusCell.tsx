"use client";

/**
 * Sales Invoice listing — compact E-Invoice / E-Way Bill status badges + detail popups.
 * Listing-scoped only.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  ListingEInvoiceStatus,
  ListingEWayStatus,
  SalesInvoiceEInvoiceDetails,
  SalesInvoiceEWayDetails,
} from "./sales-invoice-statutory";

const EINVOICE_CFG: Record<
  ListingEInvoiceStatus,
  { bg: string; text: string }
> = {
  Generated: { bg: "bg-emerald-50", text: "text-emerald-700" },
  "Not Generated": { bg: "bg-amber-50", text: "text-amber-700" },
  "Not Applicable": { bg: "bg-slate-100", text: "text-slate-600" },
  Failed: { bg: "bg-red-50", text: "text-red-700" },
  Cancelled: { bg: "bg-red-50", text: "text-red-700" },
};

const EWAY_CFG: Record<ListingEWayStatus, { bg: string; text: string }> = {
  Generated: { bg: "bg-emerald-50", text: "text-emerald-700" },
  "Not Generated": { bg: "bg-amber-50", text: "text-amber-700" },
  "Not Applicable": { bg: "bg-slate-100", text: "text-slate-600" },
  Expired: { bg: "bg-orange-50", text: "text-orange-700" },
  Failed: { bg: "bg-red-50", text: "text-red-700" },
  Cancelled: { bg: "bg-red-50", text: "text-red-700" },
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground break-words">{value ?? "—"}</span>
    </div>
  );
}

function StatusPill({
  label,
  bg,
  text,
  onClick,
}: {
  label: string;
  bg: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap",
        "hover:ring-2 hover:ring-brand-200 transition-shadow cursor-pointer",
        bg,
        text,
      )}
      title="View details"
    >
      {label}
    </button>
  );
}

export function SalesInvoiceEInvoiceStatusCell({
  details,
}: {
  details: SalesInvoiceEInvoiceDetails;
}) {
  const [open, setOpen] = useState(false);
  const cfg = EINVOICE_CFG[details.status] ?? EINVOICE_CFG["Not Generated"];

  return (
    <>
      <StatusPill
        label={details.status}
        bg={cfg.bg}
        text={cfg.text}
        onClick={() => setOpen(true)}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">E-Invoice / IRN</DialogTitle>
            <DialogDescription className="text-[11px]">
              Statutory e-invoice details for this sales invoice.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border bg-muted/20 px-3 py-1">
            <InfoRow
              label="Status"
              value={
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
                    cfg.bg,
                    cfg.text,
                  )}
                >
                  {details.status}
                </span>
              }
            />
            <InfoRow label="E-Invoice Number" value={details.eInvoiceNo} />
            <InfoRow label="IRN" value={details.irn} />
            <InfoRow label="Acknowledgement Number" value={details.acknowledgementNo} />
            <InfoRow label="Acknowledgement Date" value={details.acknowledgementDate} />
            <InfoRow label="Generated Date & Time" value={details.generatedAt} />
            <InfoRow
              label="QR Code"
              value={
                details.qrCodeAvailable ? (
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-md border border-border bg-white text-[9px] text-muted-foreground">
                    QR
                  </span>
                ) : (
                  "—"
                )
              }
            />
            {details.status === "Cancelled" ? (
              <>
                <InfoRow label="Cancelled Date" value={details.cancelledAt} />
                <InfoRow label="Cancel Reason" value={details.cancelledReason} />
              </>
            ) : null}
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

export function SalesInvoiceEWayStatusCell({
  details,
}: {
  details: SalesInvoiceEWayDetails;
}) {
  const [open, setOpen] = useState(false);
  const cfg = EWAY_CFG[details.status] ?? EWAY_CFG["Not Generated"];

  return (
    <>
      <StatusPill
        label={details.status}
        bg={cfg.bg}
        text={cfg.text}
        onClick={() => setOpen(true)}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">E-Way Bill</DialogTitle>
            <DialogDescription className="text-[11px]">
              Transport e-way bill details for this sales invoice.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border bg-muted/20 px-3 py-1">
            <InfoRow
              label="Status"
              value={
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
                    cfg.bg,
                    cfg.text,
                  )}
                >
                  {details.status}
                </span>
              }
            />
            <InfoRow label="E-Way Bill Number" value={details.eWayBillNo} />
            <InfoRow label="Generated Date" value={details.generatedAt} />
            <InfoRow label="Expiry Date & Time" value={details.expiryAt} />
            <InfoRow label="Vehicle Number" value={details.vehicleNo} />
            <InfoRow label="Transporter Name" value={details.transporterName} />
            <InfoRow label="Transport Mode" value={details.transportMode} />
            {details.status === "Cancelled" ? (
              <>
                <InfoRow label="Cancelled Date" value={details.cancelledAt} />
                <InfoRow label="Cancel Reason" value={details.cancelledReason} />
              </>
            ) : null}
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
