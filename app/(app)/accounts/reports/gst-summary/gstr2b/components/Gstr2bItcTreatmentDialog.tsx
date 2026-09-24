"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoneyString } from "@/lib/accounts/money-format";
import { showToast } from "@/lib/toast";
import {
  GstSummaryApiError,
  GstSummaryApiService,
} from "@/services/gst-summary.service";
import type {
  Gstr2aReconCombinedRowDto,
  GstPvbItcTreatmentApi,
  Gstr2bItcTreatmentBody,
} from "@/types/gst-summary.types";
import {
  formatPortalItcLabel,
  formatPvbItcLabel,
  GSTR2B_ITC_TRANSITIONS,
  GSTR2B_PVB_ITC_LABELS,
} from "../gstr2b-report-types";

type TreatmentTarget = Exclude<GstPvbItcTreatmentApi, "NOT_APPLICABLE">;

function moneyPreview(parts: {
  igst: string;
  cgst: string;
  sgst: string;
  cess: string;
}): string {
  const sum =
    Number(parts.igst || 0) +
    Number(parts.cgst || 0) +
    Number(parts.sgst || 0) +
    Number(parts.cess || 0);
  if (!Number.isFinite(sum)) return "—";
  return formatMoneyString(sum.toFixed(4));
}

export function Gstr2bItcTreatmentDialog({
  open,
  row,
  submitting,
  onClose,
  onSaved,
}: {
  open: boolean;
  row: Gstr2aReconCombinedRowDto | null;
  submitting?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const current = (row?.pvb_itc_treatment ??
    "TO_REVIEW") as GstPvbItcTreatmentApi;
  const allowed = useMemo(() => {
    const next = GSTR2B_ITC_TRANSITIONS[current] ?? [];
    // Always allow selecting current (no-op / re-confirm)
    if (!next.includes(current as TreatmentTarget) && current !== "NOT_APPLICABLE") {
      return [current as TreatmentTarget, ...next];
    }
    return next;
  }, [current]);

  const [treatment, setTreatment] = useState<TreatmentTarget>("TO_REVIEW");
  const [reason, setReason] = useState("");
  const [claimPeriod, setClaimPeriod] = useState("");
  const [claimIgst, setClaimIgst] = useState("");
  const [claimCgst, setClaimCgst] = useState("");
  const [claimSgst, setClaimSgst] = useState("");
  const [claimCess, setClaimCess] = useState("");
  const [claimTotal, setClaimTotal] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    const initial =
      (allowed[0] as TreatmentTarget | undefined) ??
      (current !== "NOT_APPLICABLE"
        ? (current as TreatmentTarget)
        : "TO_REVIEW");
    setTreatment(initial);
    setReason("");
    setClaimPeriod(row.pvb_itc_claim_period ?? "");
    const igst = row.pvb_itc_claim_igst ?? row.portal?.portal_igst ?? "";
    const cgst = row.pvb_itc_claim_cgst ?? row.portal?.portal_cgst ?? "";
    const sgst = row.pvb_itc_claim_sgst ?? row.portal?.portal_sgst ?? "";
    const cess = row.pvb_itc_claim_cess ?? row.portal?.portal_cess ?? "";
    setClaimIgst(igst);
    setClaimCgst(cgst);
    setClaimSgst(sgst);
    setClaimCess(cess);
    const suggestedTotal = moneyPreview({
      igst,
      cgst,
      sgst,
      cess,
    }).replace(/,/g, "");
    setClaimTotal(row.pvb_itc_claim_total ?? suggestedTotal);
  }, [open, row, allowed, current]);

  if (!row) return null;

  const needsReason =
    treatment === "HOLD" ||
    treatment === "INELIGIBLE" ||
    treatment === "REVERSAL_REQUIRED" ||
    (current === "CLAIMED" && treatment !== "CLAIMED");

  const needsClaims =
    treatment === "CLAIMED" || treatment === "ELIGIBLE_TO_CLAIM";

  const arithmeticPreview = moneyPreview({
    igst: claimIgst,
    cgst: claimCgst,
    sgst: claimSgst,
    cess: claimCess,
  });

  const handleSave = async () => {
    if (needsReason && !reason.trim()) {
      showToast("Reason is required for this treatment.", "error");
      return;
    }
    if (treatment === "CLAIMED") {
      if (!/^\d{4}-\d{2}$/.test(claimPeriod.trim())) {
        showToast("Claim period must be YYYY-MM.", "error");
        return;
      }
      if (!claimIgst || !claimCgst || !claimSgst || !claimTotal) {
        showToast("Claim amounts and total are required for CLAIMED.", "error");
        return;
      }
    }

    const body: Gstr2bItcTreatmentBody = {
      pvb_itc_treatment: treatment,
      reason: reason.trim() || null,
      claim_period: claimPeriod.trim() || null,
      claim_igst: claimIgst || null,
      claim_cgst: claimCgst || null,
      claim_sgst: claimSgst || null,
      claim_cess: claimCess || null,
      claim_total: claimTotal || null,
    };

    setBusy(true);
    try {
      await GstSummaryApiService.setGstr2bItcTreatment(
        row.reconciliation_item_id,
        body,
      );
      showToast("ITC treatment updated.", "success");
      onSaved();
      onClose();
    } catch (err) {
      const message =
        err instanceof GstSummaryApiError
          ? err.message
          : "Failed to update ITC treatment.";
      showToast(message, "error");
    } finally {
      setBusy(false);
    }
  };

  const isBusy = busy || !!submitting;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isBusy && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Manage ITC Treatment</DialogTitle>
          <DialogDescription className="text-xs">
            Compliance decision only — does not post to Input GST ledgers or
            create accounting vouchers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          <div className="rounded-xl border border-border bg-muted/10 p-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              2B Portal ITC (read-only)
            </p>
            <p>
              Status:{" "}
              <span className="font-semibold">
                {formatPortalItcLabel(row.portal_itc_availability)}
              </span>
            </p>
            {row.portal_itc_unavailable_reason && (
              <p className="text-muted-foreground">
                Reason: {row.portal_itc_unavailable_reason}
              </p>
            )}
            <p className="tabular-nums text-muted-foreground">
              IGST {formatMoneyString(row.portal?.portal_igst ?? "0")} · CGST{" "}
              {formatMoneyString(row.portal?.portal_cgst ?? "0")} · SGST{" "}
              {formatMoneyString(row.portal?.portal_sgst ?? "0")} · Cess{" "}
              {formatMoneyString(row.portal?.portal_cess ?? "0")}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/10 p-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Current PVB ITC
            </p>
            <p>
              Treatment:{" "}
              <span className="font-semibold">
                {formatPvbItcLabel(row.pvb_itc_treatment)}
              </span>
            </p>
            {(row.pvb_itc_claim_total || row.pvb_itc_claim_period) && (
              <p className="text-muted-foreground tabular-nums">
                Claim total{" "}
                {row.pvb_itc_claim_total
                  ? formatMoneyString(row.pvb_itc_claim_total)
                  : "—"}
                {row.pvb_itc_claim_period
                  ? ` · Period ${row.pvb_itc_claim_period}`
                  : ""}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              New Treatment
            </label>
            <Select
              value={treatment}
              onValueChange={(v) => setTreatment(v as TreatmentTarget)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowed.map((opt) => (
                  <SelectItem key={opt} value={opt} className="text-xs">
                    {GSTR2B_PVB_ITC_LABELS[opt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsReason && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {treatment === "HOLD"
                  ? "Reason for holding ITC"
                  : treatment === "INELIGIBLE"
                    ? "Reason for ineligibility"
                    : "Reason"}
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[72px] text-xs"
                placeholder="Required"
              />
            </div>
          )}

          {treatment === "REVERSAL_REQUIRED" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-[11px] text-amber-900">
              Compliance treatment only — no accounting reversal is posted from
              this screen.
            </div>
          )}

          {needsClaims && (
            <div className="space-y-2 rounded-xl border border-border p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Claim amounts
                {treatment === "ELIGIBLE_TO_CLAIM"
                  ? " (suggested from portal — confirm)"
                  : ""}
              </p>
              {treatment === "CLAIMED" && (
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">
                    Claim Period (YYYY-MM)
                  </label>
                  <Input
                    value={claimPeriod}
                    onChange={(e) => setClaimPeriod(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="2025-04"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["IGST", claimIgst, setClaimIgst],
                    ["CGST", claimCgst, setClaimCgst],
                    ["SGST", claimSgst, setClaimSgst],
                    ["Cess", claimCess, setClaimCess],
                  ] as const
                ).map(([label, value, setter]) => (
                  <div key={label} className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">
                      {label}
                    </label>
                    <Input
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      className="h-8 text-xs tabular-nums"
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">
                  Claim Total
                </label>
                <Input
                  value={claimTotal}
                  onChange={(e) => setClaimTotal(e.target.value)}
                  className="h-8 text-xs tabular-nums"
                />
                <p className="text-[10px] text-muted-foreground">
                  Component sum preview: {arithmeticPreview} (backend validates)
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={isBusy}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              disabled={isBusy || allowed.length === 0}
              onClick={() => void handleSave()}
            >
              {isBusy ? "Saving…" : "Save Treatment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
