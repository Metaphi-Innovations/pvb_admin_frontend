"use client";

/**
 * Goods Sales Invoice — Statutory Generation (bottom of form).
 * soGen only. Generate actions validate current form values before demo populate.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GoodsTransportStatutoryState } from "./GoodsTransportStatutorySection";

function statusLabel(
  kind: "eway" | "einvoice",
  value: GoodsTransportStatutoryState,
): { text: string; tone: "muted" | "ok" | "warn" | "manual" } {
  if (kind === "eway") {
    switch (value.ewayBillStatus) {
      case "generated":
        return { text: "Generated", tone: "ok" };
      case "manual":
        return { text: "Entered", tone: "manual" };
      case "stale":
        return { text: "Stale — regenerate", tone: "warn" };
      default:
        return { text: "Not Generated", tone: "muted" };
    }
  }
  switch (value.eInvoiceStatus) {
    case "generated":
      return { text: "Generated", tone: "ok" };
    case "stale":
      return { text: "Stale — regenerate", tone: "warn" };
    case "not_applicable":
      return { text: "Not Applicable", tone: "muted" };
    default:
      return { text: "Not Generated", tone: "muted" };
  }
}

function ToneText({
  children,
}: {
  tone?: "muted" | "ok" | "warn" | "manual";
  children: React.ReactNode;
}) {
  return <span className="so-stat-status-value">{children}</span>;
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  if (!value?.trim()) return null;
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-0.5">
      <span className="so-info-row-label">{label}</span>
      <span className={cn("so-info-row-value break-all", mono && "font-mono")}>{value}</span>
    </div>
  );
}

export function GoodsStatutoryGenerationSection({
  value,
  onGenerateEInvoice,
  onGenerateEway,
  onViewQr,
  eInvoiceBusy,
  ewayBusy,
}: {
  value: GoodsTransportStatutoryState;
  onGenerateEInvoice: () => void;
  onGenerateEway: () => void;
  onViewQr?: () => void;
  eInvoiceBusy?: boolean;
  ewayBusy?: boolean;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const eway = statusLabel("eway", value);
  const einv = statusLabel("einvoice", value);
  const hasGeneratedDetails =
    Boolean(value.ewayBillNo?.trim()) ||
    Boolean(value.eInvoiceNo?.trim()) ||
    Boolean(value.irn?.trim());

  const canGenEInvoice =
    value.eInvoiceStatus === "not_generated" || value.eInvoiceStatus === "stale";
  const showEwayGenerate =
    value.ewayBillStatus === "not_generated" ||
    value.ewayBillStatus === "stale" ||
    value.ewayBillStatus === "generated" ||
    value.ewayBillStatus === "manual";

  return (
    <div id="goods-statutory-generation" className="space-y-2.5 scroll-mt-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div className="rounded-lg border border-border bg-muted/10 px-3 py-2.5 flex items-center justify-between gap-3 min-h-[52px]">
          <div className="min-w-0 space-y-0.5">
            <p className="so-stat-eyebrow">E-Invoice / IRN</p>
            <p className="so-stat-status">
              Status: <ToneText>{einv.text}</ToneText>
            </p>
          </div>
          {canGenEInvoice || value.eInvoiceStatus === "generated" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs shrink-0"
              disabled={eInvoiceBusy}
              onClick={onGenerateEInvoice}
            >
              {value.eInvoiceStatus === "not_generated"
                ? "Generate E-Invoice / IRN"
                : "Regenerate"}
            </Button>
          ) : null}
        </div>

        <div className="rounded-lg border border-border bg-muted/10 px-3 py-2.5 flex items-center justify-between gap-3 min-h-[52px]">
          <div className="min-w-0 space-y-0.5">
            <p className="so-stat-eyebrow">E-Way Bill</p>
            <p className="so-stat-status">
              Status: <ToneText>{eway.text}</ToneText>
            </p>
          </div>
          {showEwayGenerate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs shrink-0"
              disabled={ewayBusy}
              onClick={onGenerateEway}
            >
              {value.ewayBillStatus === "not_generated"
                ? "Generate E-Way Bill"
                : "Regenerate"}
            </Button>
          ) : null}
        </div>
      </div>

      {hasGeneratedDetails ? (
        <div className="rounded-lg border border-border bg-white px-3 py-2">
          <button
            type="button"
            className="w-full flex items-center justify-between text-foreground"
            onClick={() => setDetailsOpen((o) => !o)}
          >
            <span className="so-stat-status-value">Generated reference details</span>
            <span className="so-dialog-desc">
              {detailsOpen ? "Hide" : "Show"}
            </span>
          </button>
          {detailsOpen ? (
            <div className="mt-2 pt-2 border-t border-border/60 space-y-0.5">
              <DetailRow label="E-Way Bill No." value={value.ewayBillNo} mono />
              <DetailRow label="E-Way Expiry" value={value.ewayBillExpiryDate} />
              <DetailRow label="E-Invoice No." value={value.eInvoiceNo} mono />
              <DetailRow label="Ack No." value={value.acknowledgementNo} mono />
              <DetailRow label="Ack Date" value={value.acknowledgementDate} />
              <DetailRow label="IRN" value={value.irn} mono />
              {value.qrCodeAvailable ? (
                <div className="pt-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={onViewQr}
                  >
                    View QR
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="so-dialog-desc mt-1 truncate">
              {[
                value.ewayBillNo && `EWB ${value.ewayBillNo}`,
                value.irn && `IRN ${value.irn.slice(0, 16)}…`,
              ]
                .filter(Boolean)
                .join(" · ") || "Details available"}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
