"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileText } from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatMoneyString } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import {
  GstSummaryApiError,
  GstSummaryApiService,
} from "@/services/gst-summary.service";
import type {
  Gstr2aAuditRowDto,
  Gstr2aMatchStatusApi,
  Gstr2aReconCombinedRowDto,
  Gstr2aReconDetailDto,
  Gstr2aReviewStatusApi,
} from "@/types/gst-summary.types";
import {
  GSTR2A_REVIEW_STATUS_LABELS,
} from "../gstr2a-report-types";

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="pb-2 border-b border-border mb-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: React.ReactNode;
  highlight?: boolean;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span
        className={cn(
          "text-xs text-right font-medium",
          highlight ? "text-amber-700 font-semibold" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function str(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value);
  return s === "" ? null : s;
}

function moneyOrBlank(value: unknown): string {
  if (value == null || value === "") return "—";
  return formatMoneyString(String(value));
}

function hasDiffAmount(value: unknown): boolean {
  if (value == null || value === "") return false;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) > 0;
}

function formatPortalItc(value: string | null | undefined): string {
  if (value == null || value === "" || value === "NOT_APPLICABLE") return "—";
  if (value === "AVAILABLE") return "ITC Available";
  if (value === "NOT_AVAILABLE") return "ITC Not Available";
  if (value === "UNKNOWN") return "Unknown";
  return value;
}

function formatPvbItc(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const map: Record<string, string> = {
    TO_REVIEW: "To Review",
    ELIGIBLE_TO_CLAIM: "Eligible to Claim",
    HOLD: "Hold",
    INELIGIBLE: "Ineligible",
    REVERSAL_REQUIRED: "Reversal Required",
    CLAIMED: "Claimed",
    NOT_APPLICABLE: "—",
  };
  return map[value] ?? value;
}

function formatItcAuditEvent(eventData: unknown): string {
  const rec = asRecord(eventData);
  if (!rec) return "";
  const parts: string[] = [];
  if (rec.previous_itc_treatment != null || rec.new_itc_treatment != null) {
    parts.push(
      `Treatment: ${String(rec.previous_itc_treatment ?? "—")} → ${String(rec.new_itc_treatment ?? "—")}`,
    );
  }
  if (rec.claim_period) parts.push(`Period: ${String(rec.claim_period)}`);
  if (rec.pvb_itc_claim_total != null || rec.claim_total != null) {
    parts.push(
      `Claim total: ${String(rec.pvb_itc_claim_total ?? rec.claim_total)}`,
    );
  }
  return parts.join(" · ");
}

export function Gstr2aComparisonSheet({
  open,
  onClose,
  row,
  variant = "gstr2a",
}: {
  open: boolean;
  onClose: () => void;
  row: Gstr2aReconCombinedRowDto | null;
  variant?: "gstr2a" | "gstr2b";
}) {
  const [detail, setDetail] = useState<Gstr2aReconDetailDto | null>(null);
  const [audit, setAudit] = useState<Gstr2aAuditRowDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row) {
      setDetail(null);
      setAudit([]);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void Promise.all([
      (variant === "gstr2b"
        ? GstSummaryApiService.getGstr2bReconciliationDetail
        : GstSummaryApiService.getGstr2aReconciliationDetail)(
        row.reconciliation_item_id,
        controller.signal,
      ),
      (variant === "gstr2b"
        ? GstSummaryApiService.getGstr2bAudit
        : GstSummaryApiService.getGstr2aAudit)(
        row.reconciliation_item_id,
        controller.signal,
      ),
    ])
      .then(([detailResult, auditResult]) => {
        setDetail(detailResult);
        setAudit(
          auditResult.rows?.length
            ? auditResult.rows
            : detailResult.recent_audit ?? [],
        );
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const message =
          err instanceof GstSummaryApiError
            ? err.message
            : "Failed to load comparison detail.";
        setError(message);
        setLoading(false);
      });
    return () => controller.abort();
  }, [open, row, variant]);

  if (!row) return null;

  const statementLabel = variant === "gstr2b" ? "GSTR-2B" : "GSTR-2A";
  const matchStatusLabels: Record<Gstr2aMatchStatusApi, string> = {
    MATCHED: "Matched",
    PARTIAL_MATCH: "Partial Match",
    MISSING_IN_BOOKS: "Missing in Books",
    MISSING_IN_GSTR:
      variant === "gstr2b" ? "Missing in GSTR-2B" : "Missing in GSTR-2A",
    DUPLICATE: "Duplicate",
    NEEDS_REVIEW: "Needs Review",
  };

  const comparison = asRecord(detail?.comparison) ?? {};
  const workflow = asRecord(detail?.workflow) ?? {};
  const portal = asRecord(detail?.portal);
  const books = asRecord(detail?.books);

  const matchStatus =
    (str(comparison.match_status) as Gstr2aMatchStatusApi | null) ??
    row.status.match_status;
  const reviewStatus =
    (str(workflow.review_status) as Gstr2aReviewStatusApi | null) ??
    row.status.review_status;
  const matchMethod =
    str(comparison.match_method) ?? row.status.match_method;
  const tolerance = str(comparison.tolerance);
  const dateMismatch =
    comparison.date_mismatch === true || row.differences.date_mismatch;
  const taxableDiff =
    str(comparison.taxable_difference) ?? row.differences.taxable_difference;
  const gstDiff =
    str(comparison.gst_difference) ?? row.differences.gst_difference;

  const booksInvoiceId =
    str(books?.purchase_invoice_id) ?? row.books?.purchase_invoice_id ?? null;
  const invoiceHref = booksInvoiceId
    ? `/accounts/purchase-invoices/${booksInvoiceId}`
    : null;

  const booksBlank = !books && !row.books;
  const portalBlank = !portal && !row.portal;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="max-w-[min(44vw,560px)] w-full">
        <SheetHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="truncate">View Comparison</SheetTitle>
              <SheetDescription>
                {row.supplier.books_supplier_name ||
                  row.supplier.portal_supplier_name ||
                  "—"}{" "}
                · {matchStatusLabels[matchStatus]}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="space-y-4">
          {loading && (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Loading comparison…
            </p>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
          {!loading && !error && (
            <>
              <div>
                <SectionHeading label="Status" />
                <InfoRow
                  label="Match Status"
                  value={matchStatusLabels[matchStatus]}
                />
                <InfoRow label="Match Method" value={matchMethod} />
                <InfoRow
                  label="Review Status"
                  value={GSTR2A_REVIEW_STATUS_LABELS[reviewStatus]}
                />
                {tolerance && <InfoRow label="Tolerance" value={tolerance} />}
              </div>

              <div>
                <SectionHeading label="Differences" />
                <InfoRow
                  label="Taxable Difference"
                  value={
                    taxableDiff != null ? formatMoneyString(taxableDiff) : "—"
                  }
                  highlight={hasDiffAmount(taxableDiff)}
                />
                <InfoRow
                  label="GST Difference"
                  value={gstDiff != null ? formatMoneyString(gstDiff) : "—"}
                  highlight={hasDiffAmount(gstDiff)}
                />
                <InfoRow
                  label="Date Mismatch"
                  value={dateMismatch ? "Yes" : "No"}
                  highlight={dateMismatch}
                />
                <InfoRow
                  label="Remarks"
                  value={
                    str(workflow.remarks) ??
                    row.workflow.remarks ??
                    "—"
                  }
                />
                {(str(workflow.manual_reason) || row.workflow.manual_reason) && (
                  <InfoRow
                    label="Manual Reason"
                    value={
                      str(workflow.manual_reason) ??
                      row.workflow.manual_reason
                    }
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-muted/10 p-3">
                  <SectionHeading label="PVB Books" />
                  {booksBlank ? (
                    <p className="text-[11px] text-muted-foreground mt-1">—</p>
                  ) : (
                    <>
                      <InfoRow
                        label="Invoice No."
                        value={
                          str(books?.supplier_invoice_number) ??
                          row.books?.books_invoice_number ??
                          "—"
                        }
                      />
                      <InfoRow
                        label="Date"
                        value={
                          str(books?.supplier_invoice_date) ??
                          row.books?.books_invoice_date ??
                          "—"
                        }
                        highlight={dateMismatch}
                      />
                      <InfoRow
                        label="Taxable Value"
                        value={moneyOrBlank(
                          books?.taxable_amount ?? row.books?.books_taxable,
                        )}
                        highlight={hasDiffAmount(taxableDiff)}
                      />
                      <InfoRow
                        label="CGST"
                        value={moneyOrBlank(
                          books?.cgst_amount ?? row.books?.books_cgst,
                        )}
                      />
                      <InfoRow
                        label="SGST"
                        value={moneyOrBlank(
                          books?.sgst_amount ?? row.books?.books_sgst,
                        )}
                      />
                      <InfoRow
                        label="IGST"
                        value={moneyOrBlank(
                          books?.igst_amount ?? row.books?.books_igst,
                        )}
                      />
                      <InfoRow
                        label="GST"
                        value={moneyOrBlank(
                          books?.gst_amount ?? row.books?.books_gst,
                        )}
                        highlight={hasDiffAmount(gstDiff)}
                      />
                    </>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-muted/10 p-3">
                  <SectionHeading label={statementLabel} />
                  {portalBlank ? (
                    <p className="text-[11px] text-muted-foreground mt-1">—</p>
                  ) : (
                    <>
                      <InfoRow
                        label="Invoice No."
                        value={
                          str(portal?.document_number) ??
                          row.portal?.portal_invoice_number ??
                          "—"
                        }
                      />
                      <InfoRow
                        label="Date"
                        value={
                          str(portal?.document_date) ??
                          row.portal?.portal_invoice_date ??
                          "—"
                        }
                        highlight={dateMismatch}
                      />
                      <InfoRow
                        label="Taxable Value"
                        value={moneyOrBlank(
                          portal?.taxable_value ?? row.portal?.portal_taxable,
                        )}
                        highlight={hasDiffAmount(taxableDiff)}
                      />
                      <InfoRow
                        label="CGST"
                        value={moneyOrBlank(
                          portal?.cgst_amount ?? row.portal?.portal_cgst,
                        )}
                      />
                      <InfoRow
                        label="SGST"
                        value={moneyOrBlank(
                          portal?.sgst_amount ?? row.portal?.portal_sgst,
                        )}
                      />
                      <InfoRow
                        label="IGST"
                        value={moneyOrBlank(
                          portal?.igst_amount ?? row.portal?.portal_igst,
                        )}
                      />
                      <InfoRow
                        label="GST"
                        value={moneyOrBlank(
                          portal?.gst_amount ?? row.portal?.portal_gst,
                        )}
                        highlight={hasDiffAmount(gstDiff)}
                      />
                    </>
                  )}
                </div>
              </div>

              {variant === "gstr2b" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-muted/10 p-3">
                    <SectionHeading label="2B Portal ITC" />
                    <InfoRow
                      label="2B ITC Status"
                      value={formatPortalItc(
                        row.portal_itc_availability ??
                          str(portal?.portal_itc_availability) ??
                          row.portal?.portal_itc_availability,
                      )}
                    />
                    <InfoRow
                      label="Unavailable Reason"
                      value={
                        row.portal_itc_unavailable_reason ??
                        str(portal?.portal_itc_unavailable_reason) ??
                        row.portal?.portal_itc_unavailable_reason ??
                        undefined
                      }
                    />
                    <InfoRow
                      label="Portal CGST"
                      value={moneyOrBlank(
                        portal?.cgst_amount ?? row.portal?.portal_cgst,
                      )}
                    />
                    <InfoRow
                      label="Portal SGST"
                      value={moneyOrBlank(
                        portal?.sgst_amount ?? row.portal?.portal_sgst,
                      )}
                    />
                    <InfoRow
                      label="Portal IGST"
                      value={moneyOrBlank(
                        portal?.igst_amount ?? row.portal?.portal_igst,
                      )}
                    />
                    <InfoRow
                      label="Portal Cess"
                      value={moneyOrBlank(
                        portal?.cess_amount ?? row.portal?.portal_cess,
                      )}
                    />
                  </div>
                  <div className="rounded-xl border border-border bg-muted/10 p-3">
                    <SectionHeading label="PVB ITC" />
                    <InfoRow
                      label="Treatment"
                      value={formatPvbItc(
                        str(workflow.pvb_itc_treatment) ??
                          row.pvb_itc_treatment,
                      )}
                    />
                    <InfoRow
                      label="Claim IGST"
                      value={moneyOrBlank(
                        str(workflow.pvb_itc_claim_igst) ??
                          row.pvb_itc_claim_igst,
                      )}
                    />
                    <InfoRow
                      label="Claim CGST"
                      value={moneyOrBlank(
                        str(workflow.pvb_itc_claim_cgst) ??
                          row.pvb_itc_claim_cgst,
                      )}
                    />
                    <InfoRow
                      label="Claim SGST"
                      value={moneyOrBlank(
                        str(workflow.pvb_itc_claim_sgst) ??
                          row.pvb_itc_claim_sgst,
                      )}
                    />
                    <InfoRow
                      label="Claim Cess"
                      value={moneyOrBlank(
                        str(workflow.pvb_itc_claim_cess) ??
                          row.pvb_itc_claim_cess,
                      )}
                    />
                    <InfoRow
                      label="Claim Total"
                      value={moneyOrBlank(
                        str(workflow.pvb_itc_claim_total) ??
                          row.pvb_itc_claim_total,
                      )}
                    />
                    <InfoRow
                      label="Claim Period"
                      value={
                        str(workflow.pvb_itc_claim_period) ??
                        row.pvb_itc_claim_period ??
                        undefined
                      }
                    />
                  </div>
                </div>
              )}

              <div>
                <SectionHeading label="Supplier" />
                <InfoRow
                  label="Supplier GSTIN"
                  value={row.supplier.supplier_gstin || "—"}
                />
                <InfoRow
                  label="Books Name"
                  value={row.supplier.books_supplier_name || "—"}
                />
                <InfoRow
                  label="Portal Name"
                  value={row.supplier.portal_supplier_name || "—"}
                />
              </div>

              <div>
                <SectionHeading label="Audit History" />
                {audit.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    No audit events yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {audit.map((entry) => (
                      <li
                        key={entry.audit_id}
                        className="rounded-lg border border-border/60 bg-muted/10 px-2.5 py-2"
                      >
                        <p className="text-xs font-medium text-foreground">
                          {entry.action}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {entry.performed_at
                            ? new Date(entry.performed_at).toLocaleString()
                            : "—"}
                          {entry.reason ? ` · ${entry.reason}` : ""}
                        </p>
                        {(entry.previous_match_status ||
                          entry.new_match_status) && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Match: {entry.previous_match_status ?? "—"} →{" "}
                            {entry.new_match_status ?? "—"}
                          </p>
                        )}
                        {entry.action === "ITC_TREATMENT_CHANGE" &&
                          entry.event_data != null && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 whitespace-pre-wrap">
                              {formatItcAuditEvent(entry.event_data)}
                            </p>
                          )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </SheetBody>

        <SheetFooter>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={onClose}
          >
            Close
          </Button>
          {invoiceHref && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
              asChild
            >
              <Link href={invoiceHref}>
                Open Purchase Invoice <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
