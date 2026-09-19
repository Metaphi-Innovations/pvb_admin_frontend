"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PreviewEwayBillResult } from "@/services/sales-invoice.service";

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 border-b border-border/40 py-1.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="break-all text-xs font-medium text-foreground">
        {String(value)}
      </span>
    </div>
  );
}

function formatSummaryLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function EwayBillPreviewDialog({
  open,
  onClose,
  preview,
  loading,
  generating,
  onConfirmGenerate,
}: {
  open: boolean;
  onClose: () => void;
  preview: PreviewEwayBillResult | null;
  loading?: boolean;
  generating?: boolean;
  onConfirmGenerate: () => void | Promise<void>;
}) {
  const [showJson, setShowJson] = useState(false);
  const busy = Boolean(loading || generating);
  const summary = preview?.summary;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm">Review E-Way Bill</DialogTitle>
          <DialogDescription className="text-xs">
            {preview?.already_generated
              ? "An E-Way Bill already exists for this document."
              : "Confirm the details below before generating. Nothing is sent to the GST portal until you click Generate."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          {loading ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Preparing preview…
            </p>
          ) : preview?.already_generated ? (
            <div className="space-y-1 text-xs">
              <SummaryRow label="E-Way Bill No." value={preview.eway_bill_number} />
              <SummaryRow
                label="Document"
                value={
                  preview.invoice_number ||
                  preview.challan_number ||
                  preview.dispatch_number ||
                  null
                }
              />
              <SummaryRow label="Transfer No." value={preview.transfer_no} />
              <SummaryRow label="IRN" value={preview.irn_number} />
            </div>
          ) : preview ? (
            <div className="space-y-3">
              <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                <p className="text-xs font-medium">
                  {String(summary?.flow_label ?? preview.flow)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {preview.invoice_number
                    ? `Invoice ${preview.invoice_number}`
                    : preview.challan_number
                      ? `Challan ${preview.challan_number}`
                      : preview.dispatch_number
                        ? `Dispatch ${preview.dispatch_number}`
                        : "Document"}
                  {preview.transfer_no ? ` · Transfer ${preview.transfer_no}` : ""}
                  {preview.irn_number
                    ? ` · IRN present`
                    : preview.flow === "standalone"
                      ? " · Standalone (no IRN)"
                      : ""}
                </p>
              </div>

              <div className="rounded-md border border-border/50 px-3 py-1">
                {summary
                  ? Object.entries(summary)
                      .filter(([key]) => key !== "flow_label")
                      .map(([key, value]) => (
                        <SummaryRow
                          key={key}
                          label={formatSummaryLabel(key)}
                          value={value}
                        />
                      ))
                  : null}
              </div>

              {preview.payload ? (
                <div>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                    onClick={() => setShowJson((v) => !v)}
                  >
                    {showJson ? "Hide request payload" : "Show request payload"}
                  </button>
                  {showJson ? (
                    <pre className="mt-2 max-h-56 overflow-auto rounded-md border border-border/50 bg-muted/30 p-2 text-[10px] leading-relaxed">
                      {JSON.stringify(preview.payload, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No preview available.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-sm font-medium"
            onClick={onClose}
            disabled={busy}
          >
            Close
          </Button>
          {!preview?.already_generated ? (
            <Button
              size="sm"
              className="h-9 text-sm font-medium"
              disabled={busy || !preview?.payload}
              onClick={() => void onConfirmGenerate()}
            >
              {generating ? "Generating…" : "Generate E-Way Bill"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
