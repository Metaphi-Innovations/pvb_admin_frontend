"use client";

/**
 * Sales Invoice View — E-Invoice / E-Way Bill status + generate actions.
 * Uses View API nested applicability/status. IRN generation calls PVB backend only.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InvoiceRecord } from "../invoices-data";

type Tone = "muted" | "ok" | "warn";

function eInvoiceLabel(
  applicable: boolean | undefined,
  status: InvoiceRecord["eInvoiceStatus"] | undefined,
): { text: string; tone: Tone } {
  if (applicable === false) {
    return { text: "Not Applicable", tone: "muted" };
  }
  switch (status) {
    case "generated":
      return { text: "Generated", tone: "ok" };
    case "failed":
      return { text: "Failed", tone: "warn" };
    case "cancelled":
      return { text: "Cancelled", tone: "muted" };
    case "stale":
      return { text: "Stale — regenerate", tone: "warn" };
    case "not_applicable":
      return { text: "Not Applicable", tone: "muted" };
    default:
      return { text: "Not Generated", tone: "muted" };
  }
}

function ewayLabel(
  status: InvoiceRecord["ewayBillStatus"] | undefined,
): { text: string; tone: Tone } {
  switch (status) {
    case "generated":
    case "manual":
      return { text: "Generated", tone: "ok" };
    case "expired":
      return { text: "Expired", tone: "warn" };
    case "failed":
      return { text: "Failed", tone: "warn" };
    case "cancelled":
      return { text: "Cancelled", tone: "muted" };
    case "stale":
      return { text: "Stale — regenerate", tone: "warn" };
    case "not_applicable":
      return { text: "Not Applicable", tone: "muted" };
    default:
      return { text: "Not Generated", tone: "muted" };
  }
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  if (!value?.trim()) return null;
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-0.5">
      <span className="so-info-row-label">{label}</span>
      <span className={cn("so-info-row-value break-all", mono && "font-mono")}>
        {value}
      </span>
    </div>
  );
}

function qrImageSrc(raw?: string | null, fallback?: string | null): string | null {
  const signed = (raw || "").trim();
  if (signed.startsWith("data:") || /^https?:\/\//i.test(signed)) return signed;
  const payload = signed || (fallback || "").trim();
  if (!payload) return null;
  return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(payload)}`;
}

export function InvoiceViewStatutorySection({
  record,
  canAct,
  onGenerateEInvoice,
  onGenerateEway,
  eInvoiceBusy,
  ewayBusy,
}: {
  record: InvoiceRecord;
  /** POSTED invoices only — hide generate when cancelled/reversed. */
  canAct: boolean;
  onGenerateEInvoice: () => void;
  onGenerateEway: () => void;
  eInvoiceBusy?: boolean;
  ewayBusy?: boolean;
}) {
  const [detailsOpen, setDetailsOpen] = useState(true);

  const eInvApplicable = record.eInvoiceApplicable === true;
  const eInvStatus = record.eInvoiceStatus ?? "not_generated";
  const ewayStatus = record.ewayBillStatus ?? "not_generated";
  const isStockTransfer = record.sourceType === "stock_transfer";

  const einv = eInvoiceLabel(record.eInvoiceApplicable, eInvStatus);
  const eway = ewayLabel(ewayStatus);

  // Backend chooses EWB-by-IRN vs standalone when IRN is absent.
  const showGenerateEway = canAct && ewayStatus === "not_generated";
  const showGenerateIRN =
    canAct && eInvApplicable && eInvStatus === "not_generated";

  const hasGeneratedDetails = Boolean(
    record.ewayBillNo?.trim() ||
      record.eInvoiceNo?.trim() ||
      record.irn?.trim() ||
      record.acknowledgementNo?.trim(),
  );

  const ewayQrSrc = qrImageSrc(record.ewayBillQrCode, record.ewayBillNo);
  const irnQrSrc = qrImageSrc(record.signedQrCode, record.irn);

  return (
    <div id="invoice-view-statutory" className="space-y-2.5 scroll-mt-24">
      {isStockTransfer ? (
        <p className="text-[11px] text-muted-foreground">
          Stock Transfer Invoice: buyer / consignee is the destination warehouse
          GSTIN. IRN and E-Way Bill use the same flows as Sales Invoice.
        </p>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div className="rounded-lg border border-border bg-muted/10 px-3 py-2.5 flex items-center justify-between gap-3 min-h-[52px]">
          <div className="min-w-0 space-y-0.5">
            <p className="so-stat-eyebrow">E-Invoice / IRN</p>
            <p className="so-stat-status text-xs">
              Status:{" "}
              <span
                className={cn(
                  "font-medium",
                  einv.tone === "ok" && "text-emerald-700",
                  einv.tone === "warn" && "text-amber-700",
                  einv.tone === "muted" && "text-muted-foreground",
                )}
              >
                {einv.text}
              </span>
            </p>
            {!eInvApplicable && record.eInvoiceApplicabilityReason ? (
              <p className="text-[11px] text-muted-foreground leading-snug">
                {record.eInvoiceApplicabilityReason}
              </p>
            ) : null}
          </div>
          {showGenerateIRN ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs shrink-0"
              disabled={eInvoiceBusy}
              onClick={onGenerateEInvoice}
            >
              {eInvoiceBusy ? "Generating…" : "Generate IRN"}
            </Button>
          ) : null}
        </div>

        <div className="rounded-lg border border-border bg-muted/10 px-3 py-2.5 flex items-center justify-between gap-3 min-h-[52px]">
          <div className="min-w-0 space-y-0.5">
            <p className="so-stat-eyebrow">E-Way Bill</p>
            <p className="so-stat-status text-xs">
              Status:{" "}
              <span
                className={cn(
                  "font-medium",
                  eway.tone === "ok" && "text-emerald-700",
                  eway.tone === "warn" && "text-amber-700",
                  eway.tone === "muted" && "text-muted-foreground",
                )}
              >
                {eway.text}
              </span>
            </p>
          </div>
          {showGenerateEway ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs shrink-0"
              disabled={ewayBusy}
              onClick={onGenerateEway}
            >
              Generate E-Way Bill
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
            <span className="text-xs font-medium">Generated reference details</span>
            <span className="text-[11px] text-muted-foreground">
              {detailsOpen ? "Hide" : "Show"}
            </span>
          </button>
          {detailsOpen ? (
            <div className="mt-2 pt-2 border-t border-border/60 space-y-0.5">
              <DetailRow label="IRN" value={record.irn} mono />
              <DetailRow label="Ack No." value={record.acknowledgementNo} mono />
              <DetailRow label="Ack Date" value={record.acknowledgementDate} />
              <DetailRow label="E-Invoice No." value={record.eInvoiceNo} mono />
              <DetailRow label="E-Way Bill No." value={record.ewayBillNo} mono />
              <DetailRow
                label="E-Way Generated"
                value={record.ewayBillGeneratedAt}
              />
              <DetailRow label="E-Way Expiry" value={record.ewayBillExpiryDate} />
              {ewayQrSrc ? (
                <div className="grid grid-cols-[120px_1fr] gap-2 py-1">
                  <span className="so-info-row-label">E-Way QR</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ewayQrSrc}
                    alt="E-Way Bill QR"
                    width={72}
                    height={72}
                    className="rounded-md border border-border bg-white p-1"
                  />
                </div>
              ) : null}
              {irnQrSrc ? (
                <div className="grid grid-cols-[120px_1fr] gap-2 py-1">
                  <span className="so-info-row-label">E-Invoice QR</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={irnQrSrc}
                    alt="E-Invoice QR"
                    width={72}
                    height={72}
                    className="rounded-md border border-border bg-white p-1"
                  />
                </div>
              ) : record.signedQrCode?.trim() || record.irn?.trim() ? (
                <p className="pt-1 text-[11px] text-muted-foreground">
                  E-Invoice QR available on Tax Invoice PDF.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              {[
                record.ewayBillNo && `EWB ${record.ewayBillNo}`,
                record.irn && `IRN ${record.irn.slice(0, 16)}…`,
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
