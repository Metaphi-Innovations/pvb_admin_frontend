"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatMoneyString } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import {
  GstSummaryApiError,
  GstSummaryApiService,
} from "@/services/gst-summary.service";
import type {
  Gstr2aCandidateRowDto,
  Gstr2aReconCombinedRowDto,
} from "@/types/gst-summary.types";
import { showToast } from "@/lib/toast";

function hasRemainingDiff(candidate: Gstr2aCandidateRowDto): boolean {
  const c = candidate.comparison;
  if (!c.gstin_match || !c.document_number_match || !c.date_match) return true;
  const amounts = [
    c.taxable_difference,
    c.cgst_difference,
    c.sgst_difference,
    c.igst_difference,
    c.gst_difference,
  ];
  return amounts.some((v) => {
    if (v == null || v === "") return false;
    const n = Number(v);
    return Number.isFinite(n) && Math.abs(n) > 0;
  });
}

export function Gstr2aCandidateMatchDrawer({
  open,
  onClose,
  row,
  mode,
  onMatched,
  variant = "gstr2a",
}: {
  open: boolean;
  onClose: () => void;
  row: Gstr2aReconCombinedRowDto | null;
  mode: "find" | "change";
  onMatched: () => void;
  /** Use GSTR-2B API surface when integrating 2B. */
  variant?: "gstr2a" | "gstr2b";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Gstr2aCandidateRowDto[]>([]);
  const [selected, setSelected] = useState<Gstr2aCandidateRowDto | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !row) {
      setCandidates([]);
      setSelected(null);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void (variant === "gstr2b"
      ? GstSummaryApiService.getGstr2bCandidates
      : GstSummaryApiService.getGstr2aCandidates)(
      row.reconciliation_item_id,
      {
        supplier_gstin: row.supplier.supplier_gstin ?? undefined,
        document_number: row.portal?.portal_invoice_number ?? undefined,
        page: 1,
        page_size: 25,
      },
      controller.signal,
    )
      .then((result) => {
        setCandidates(result.rows);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const message =
          err instanceof GstSummaryApiError
            ? err.message
            : "Failed to load candidates.";
        setError(message);
        setLoading(false);
      });
    return () => controller.abort();
  }, [open, row, variant]);

  const handleConfirmMatch = async () => {
    if (!row || !selected) return;
    const needsReason =
      row.status.match_status === "PARTIAL_MATCH" || hasRemainingDiff(selected);
    if (needsReason && !reason.trim()) {
      showToast("Reason is required for matches with differences.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const matchFn =
        variant === "gstr2b"
          ? GstSummaryApiService.matchGstr2bInvoice
          : GstSummaryApiService.matchGstr2aInvoice;
      await matchFn(row.reconciliation_item_id, {
        purchase_invoice_id: selected.purchase_invoice_id,
        reason: reason.trim() || undefined,
      });
      showToast("Match saved successfully.", "success");
      setConfirmOpen(false);
      setReason("");
      onMatched();
      onClose();
    } catch (err) {
      const message =
        err instanceof GstSummaryApiError
          ? err.message
          : "Failed to save match.";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="max-w-[min(48vw,640px)] w-full">
          <SheetHeader>
            <SheetTitle>
              {mode === "change" ? "Change Match" : "Find Match"}
            </SheetTitle>
            <SheetDescription>
              Select a purchase invoice candidate to link with this{" "}
              {variant === "gstr2b" ? "GSTR-2B" : "GSTR-2A"} document.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-3">
            {loading && (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Loading candidates…
              </p>
            )}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
            {!loading && !error && candidates.length === 0 && (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No purchase invoice candidates found.
              </p>
            )}
            {!loading &&
              candidates.map((candidate) => {
                const active =
                  selected?.purchase_invoice_id ===
                  candidate.purchase_invoice_id;
                return (
                  <button
                    key={candidate.purchase_invoice_id}
                    type="button"
                    onClick={() => setSelected(candidate)}
                    className={cn(
                      "w-full text-left rounded-xl border p-3 space-y-1.5 transition-colors",
                      active
                        ? "border-brand-400 bg-brand-50/60"
                        : "border-border hover:bg-muted/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {candidate.supplier_name || "—"}
                        </p>
                        <p className="text-[11px] font-mono text-brand-700">
                          {candidate.supplier_invoice_number}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        score {candidate.rank_score}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {candidate.supplier_gstin || "—"} ·{" "}
                      {candidate.supplier_invoice_date}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <span>
                        Taxable {formatMoneyString(candidate.taxable_amount)}
                      </span>
                      <span>GST {formatMoneyString(candidate.gst_amount)}</span>
                    </div>
                    {candidate.is_current_link && (
                      <p className="text-[10px] font-medium text-emerald-700">
                        Current link
                      </p>
                    )}
                    {candidate.already_linked_to_item_id &&
                      !candidate.is_current_link && (
                        <p className="text-[10px] font-medium text-amber-700">
                          Already linked to another item
                        </p>
                      )}
                  </button>
                );
              })}
          </SheetBody>
          <SheetFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              disabled={!selected}
              onClick={() => {
                if (!selected || !row) return;
                const needsReason =
                  row.status.match_status === "PARTIAL_MATCH" ||
                  hasRemainingDiff(selected);
                if (needsReason) {
                  setConfirmOpen(true);
                } else {
                  void handleConfirmMatch();
                }
              }}
            >
              Confirm Match
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog
        open={confirmOpen}
        onOpenChange={(o) => {
          if (!o) {
            setConfirmOpen(false);
            setReason("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Confirm Match</DialogTitle>
            <DialogDescription className="pt-1 text-xs">
              Review differences before linking. Reason is required when
              differences remain.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="rounded-lg border border-border bg-muted/20 p-2.5 space-y-1 text-[11px]">
              <p className="font-medium text-foreground">
                {selected.supplier_invoice_number}
              </p>
              <p className="text-muted-foreground">
                Taxable diff:{" "}
                {selected.comparison.taxable_difference ?? "—"} · GST diff:{" "}
                {selected.comparison.gst_difference ?? "—"}
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Reason</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="text-sm rounded-lg"
              placeholder="Explain remaining differences…"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={submitting}
              onClick={() => {
                setConfirmOpen(false);
                setReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              disabled={submitting || !reason.trim()}
              onClick={() => void handleConfirmMatch()}
            >
              {submitting ? "Saving…" : "Link Invoice"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
