"use client";

/**
 * Credit Note View — loads GET /accounts/credit-note/:credit_note_id (UUID).
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { CreditNoteCancelDialog } from "./components/CreditNoteCancelDialog";
import { CREDIT_NOTES_BREADCRUMB, CREDIT_NOTES_LIST_PATH, formatINR } from "./note-utils";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { creditNoteImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import {
  CreditNoteListApi,
  creditNoteListApiError,
  type CreditNoteDetailApi,
} from "./credit-note-list-api";
import "./credit-note-tx.css";

const SOURCE_LABELS: Record<string, string> = {
  DIRECT: "Direct",
  SALES_INVOICE: "Sales Invoice",
  SALES_RETURN: "Sales Return",
  CASH_DISCOUNT: "Cash Discount",
  SPECIAL_SCHEME: "Special Scheme",
  TURNOVER_DISCOUNT: "Turnover Discount",
  NEAR_EXPIRY: "Near Expiry",
};

function toNum(value: unknown, fallback = 0): number {
  if (value == null || value === "") return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

function toDate(value: unknown): string {
  if (!value) return "";
  const s = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

type ViewLine = {
  key: string;
  description: string;
  ledgerName: string;
  qty: string;
  gstRate: number;
  taxable: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
};

function mapLines(record: CreditNoteDetailApi): ViewLine[] {
  const lines = Array.isArray(record.lines) ? record.lines : [];
  return lines.map((raw, i) => {
    const l = raw as Record<string, unknown>;
    const ledger = l.ledger as { ledger_name?: string } | undefined;
    return {
      key: String(l.credit_note_line_id || i),
      description: String(l.description || "—"),
      ledgerName: ledger?.ledger_name || String(l.ledger_name || "—"),
      qty: l.quantity != null ? String(l.quantity) : "—",
      gstRate: toNum(l.gst_rate),
      taxable: toNum(l.taxable_amount),
      gstAmount: toNum(l.gst_amount),
      cgst: toNum(l.cgst_amount),
      sgst: toNum(l.sgst_amount),
      igst: toNum(l.igst_amount),
      total: toNum(l.line_total),
    };
  });
}

export default function CreditNoteViewPageClient({ creditNoteId }: { creditNoteId: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<CreditNoteDetailApi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!creditNoteId || creditNoteId === "new" || !isUuid(creditNoteId)) {
      setError("Invalid credit note id.");
      setRecord(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await CreditNoteListApi.getById(creditNoteId);
      setRecord(next);
    } catch (e) {
      setRecord(null);
      setError(creditNoteListApiError(e, "Credit note not found."));
    } finally {
      setLoading(false);
    }
  }, [creditNoteId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Loading credit note…</div>
    );
  }

  if (error || !record) {
    return (
      <div className="p-8 space-y-3">
        <p className="text-sm text-red-600">{error || "Credit note not found."}</p>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => router.push(CREDIT_NOTES_LIST_PATH)}
        >
          Back to Credit Notes
        </Button>
      </div>
    );
  }

  const status = String(record.status || "");
  const canEdit = status === "DRAFT" || status === "REJECTED";
  const canCancel = status !== "POSTED" && status !== "CANCELLED" && status !== "REVERSED";
  const isQty = String(record.source_type) === "SALES_RETURN" || String(record.source_type) === "NEAR_EXPIRY";
  const lines = mapLines(record);
  const cgst = toNum(record.cgst_amount);
  const sgst = toNum(record.sgst_amount);
  const igst = toNum(record.igst_amount);
  const taxable = toNum(record.taxable_amount);
  const total = toNum(record.cn_amount);
  const invoiceCount = Array.isArray(record.references)
    ? record.references.filter((r) => {
        const t = (r as Record<string, unknown>).reference_type;
        return t === "SALES_INVOICE" || t === "SALES_INVOICE_ITEM";
      }).length
    : 0;
  const cnNo = record.cn_number || "—";
  const customerName = record.customer?.customer_name || "—";
  const sourceLabel = SOURCE_LABELS[String(record.source_type)] || record.source_type || "—";

  return (
    <>
      <div className="h-full min-h-0 flex flex-col">
      <AccountsFormLayout
        fullWidth
        title="Credit Note"
        breadcrumb={[...CREDIT_NOTES_BREADCRUMB]}
        code={cnNo}
        headerMeta={
          <span className="inline-flex items-center h-6 px-2 rounded-md border border-brand-200 bg-brand-50 font-mono text-[11px] font-semibold text-brand-700">
            {cnNo}
          </span>
        }
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => router.push(CREDIT_NOTES_LIST_PATH)}
            >
              Back
            </Button>
            {canEdit ? (
              <Button
                size="sm"
                className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                onClick={() =>
                  router.push(`${CREDIT_NOTES_LIST_PATH}/${record.credit_note_id}/edit`)
                }
              >
                Edit
              </Button>
            ) : null}
            {canCancel ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-red-600"
                onClick={() => setCancelOpen(true)}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="cnz">
          <div className="cnz-head">
            <div className="cnz-f">
              <label>Customer</label>
              <p className="cnz-ro font-medium">{customerName}</p>
            </div>
            <div className="cnz-f">
              <label>Credit Note No.</label>
              <p className="cnz-ro font-mono text-[13px]">{cnNo}</p>
            </div>
            <div className="cnz-f">
              <label>Credit Note Date</label>
              <p className="cnz-ro text-[13px]">{toDate(record.cn_date) || "—"}</p>
            </div>
            <div className="cnz-f">
              <label>Warehouse</label>
              <p className="cnz-ro text-[13px]">{record.warehouse?.warehouse_name || "—"}</p>
            </div>
            <div className="cnz-f">
              <label>Source</label>
              <p className="cnz-ro text-[13px]">{sourceLabel}</p>
            </div>
            <div className="cnz-f">
              <label>Status</label>
              <p className="cnz-ro text-[13px]">{status.replaceAll("_", " ") || "—"}</p>
            </div>
            <div className="cnz-f">
              <label>Linked Invoice</label>
              <p className="cnz-ro text-[13px]">
                {invoiceCount > 0
                  ? `${invoiceCount} Invoice${invoiceCount === 1 ? "" : "s"}`
                  : "—"}
              </p>
            </div>
            {record.scheme?.scheme_name ? (
              <div className="cnz-f">
                <label>Scheme</label>
                <p className="cnz-ro text-[13px] truncate">{record.scheme.scheme_name}</p>
              </div>
            ) : null}
            <div className="cnz-f cnz-head__full">
              <span className="cnz-tag">
                Source: {sourceLabel} · Status: {status.replaceAll("_", " ")}
              </span>
            </div>
          </div>

          <div className="cnz-items">
            <div className="cnz-items__bar">
              <h2 className="cnz-items__title">
                {isQty ? "Quantity Particulars" : "Particulars"}
              </h2>
            </div>
            <div className="cnz-table-wrap">
              <table className={isQty ? "cnz-table cnz-table--qty" : "cnz-table cnz-table--amt"}>
                <thead>
                  <tr>
                    <th>Particular</th>
                    <th>Ledger</th>
                    {isQty ? <th className="text-right">Qty</th> : null}
                    <th className="text-right">Taxable</th>
                    <th className="text-right">GST %</th>
                    {igst > 0 ? (
                      <th className="text-right">IGST</th>
                    ) : (
                      <>
                        <th className="text-right">CGST</th>
                        <th className="text-right">SGST</th>
                      </>
                    )}
                    <th className="text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={isQty ? 8 : 7} className="text-muted-foreground text-xs">
                        No line items.
                      </td>
                    </tr>
                  ) : (
                    lines.map((l) => (
                      <tr key={l.key}>
                        <td>{l.description}</td>
                        <td>{l.ledgerName}</td>
                        {isQty ? <td className="cnz-num">{l.qty}</td> : null}
                        <td className="cnz-num">{formatINR(l.taxable)}</td>
                        <td className="cnz-num">{l.gstRate > 0 ? `${l.gstRate}%` : "—"}</td>
                        {igst > 0 ? (
                          <td className="cnz-num">{formatINR(l.igst || l.gstAmount)}</td>
                        ) : (
                          <>
                            <td className="cnz-num">{formatINR(l.cgst)}</td>
                            <td className="cnz-num">{formatINR(l.sgst)}</td>
                          </>
                        )}
                        <td className="cnz-num font-semibold">{formatINR(l.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="cnz-after-table">
            <div />
            <div className="cnz-totals">
              <div className="cnz-totals__row">
                <span>Subtotal</span>
                <span>{formatINR(taxable)}</span>
              </div>
              {cgst > 0 ? (
                <div className="cnz-totals__row">
                  <span>CGST</span>
                  <span>{formatINR(cgst)}</span>
                </div>
              ) : null}
              {sgst > 0 ? (
                <div className="cnz-totals__row">
                  <span>SGST</span>
                  <span>{formatINR(sgst)}</span>
                </div>
              ) : null}
              {igst > 0 ? (
                <div className="cnz-totals__row">
                  <span>IGST</span>
                  <span>{formatINR(igst)}</span>
                </div>
              ) : null}
              <div className="cnz-totals__grand">
                <span>Credit Note Total</span>
                <span>{formatINR(total)}</span>
              </div>
            </div>
          </div>

          <div className="cnz-notes">
            <div className="cnz-f">
              <label>Narration</label>
              <p className="cnz-ro min-h-[3.25rem] items-start py-2 whitespace-pre-wrap text-[13px]">
                {record.narration || "—"}
              </p>
            </div>
          </div>

          <div className="cnz-impact">
            <LedgerImpactPreview
              title="Accounting Entry"
              lines={creditNoteImpactResolved({
                customerName,
                taxable: Math.max(0, total - toNum(record.gst_amount)),
                taxAmount: toNum(record.gst_amount),
                grandTotal: total,
              })}
            />
          </div>
        </div>
      </AccountsFormLayout>
      </div>

      <CreditNoteCancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        creditNoteNo={cnNo}
        onConfirm={async (reason) => {
          try {
            await CreditNoteListApi.cancel(record.credit_note_id, reason);
            setCancelOpen(false);
            await refresh();
          } catch (e) {
            setError(creditNoteListApiError(e, "Could not cancel credit note."));
          }
        }}
      />
    </>
  );
}
