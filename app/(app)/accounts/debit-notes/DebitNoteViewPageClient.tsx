"use client";

/**
 * Debit Note View — same enterprise workspace as Create/Edit (read-only).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { AccountsDocumentWorkflowSection } from "@/components/accounts/AccountsDocumentWorkflowSection";
import {
  canEditAccountsDocument,
  resolveWorkflowStatus,
} from "@/lib/accounts/accounts-maker-checker";
import {
  canEditDebitNote,
  DEBIT_NOTE_SOURCE_LABELS,
  getDebitNoteById,
  type DebitNoteRecord,
} from "./debit-notes-data";
import { downloadDebitNotePdf } from "./debit-note-pdf";
import { DEBIT_NOTES_BREADCRUMB, DEBIT_NOTES_LIST_PATH, formatINR } from "./note-utils";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { debitNoteImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import "../credit-notes/credit-note-workspace.css";

export default function DebitNoteViewPageClient({ debitNoteId }: { debitNoteId: number }) {
  const router = useRouter();
  const [record, setRecord] = useState<DebitNoteRecord | null>(null);

  const refresh = () => {
    const r = getDebitNoteById(debitNoteId);
    if (!r) {
      router.replace(DEBIT_NOTES_LIST_PATH);
      return;
    }
    setRecord(r);
  };

  useEffect(() => {
    refresh();
  }, [debitNoteId]);

  if (!record) return null;

  const canEdit =
    canEditDebitNote(record) && canEditAccountsDocument(record.workflow, record.status);
  const displayStatus = resolveWorkflowStatus(record.workflow, record.status);
  const isFresh = record.againstType === "standalone_adjustment";
  const statusBadgeClass =
    displayStatus === "posted"
      ? "cn-ws__badge is-posted"
      : displayStatus === "draft"
        ? "cn-ws__badge is-draft"
        : "cn-ws__badge";

  return (
    <AccountsFormLayout
      fullWidth
      title="View Debit Note"
      breadcrumb={[...DEBIT_NOTES_BREADCRUMB]}
      code={record.debitNoteNo}
      headerMeta={
        <>
          <span className={statusBadgeClass}>{displayStatus.replaceAll("_", " ")}</span>
          <span className="cn-ws__badge">
            {isFresh ? "Amount Based" : "Quantity Based"}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {record.debitNoteNo}
          </span>
        </>
      }
      stickyFooter={
        <div className="flex items-center justify-between w-full gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => router.push(DEBIT_NOTES_LIST_PATH)}
          >
            Back
          </Button>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => downloadDebitNotePdf(record)}
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </Button>
            {canEdit ? (
              <Button
                size="sm"
                className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                onClick={() =>
                  router.push(`${DEBIT_NOTES_LIST_PATH}/${record.id}/edit`)
                }
              >
                Edit
              </Button>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="cn-ws">
        <section className="cn-ws__section">
          <p className="cn-ws__label">Basic Information</p>
          <div className="cn-ws__grid-3">
            <div className="cn-ws__field">
              <span className="cn-ws__flabel">Vendor</span>
              <p className="cn-ws__ro font-medium">{record.vendorName}</p>
            </div>
            <div className="cn-ws__field">
              <span className="cn-ws__flabel">Debit Note Date</span>
              <p className="cn-ws__ro">{record.debitNoteDate}</p>
            </div>
            <div className="cn-ws__field">
              <span className="cn-ws__flabel">Debit Note No.</span>
              <p className="cn-ws__ro font-mono">{record.debitNoteNo}</p>
            </div>
            <div className="cn-ws__field">
              <span className="cn-ws__flabel">Reference No.</span>
              <p className="cn-ws__ro">{record.referenceNo || "—"}</p>
            </div>
            <div className="cn-ws__field">
              <span className="cn-ws__flabel">Accounts Payable</span>
              <p className="cn-ws__ro">{record.vendorName}</p>
            </div>
            <div className="cn-ws__field">
              <span className="cn-ws__flabel">Status</span>
              <p className="cn-ws__ro capitalize">
                {displayStatus.replaceAll("_", " ")}
              </p>
            </div>
          </div>
        </section>

        <section className="cn-ws__section">
          <p className="cn-ws__label">Debit Note Basis</p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="cn-ws__badge">
              {isFresh ? "Amount Based" : "Quantity Based"}
            </span>
            <span className="cn-ws__hint">
              Source: {DEBIT_NOTE_SOURCE_LABELS[record.source]}
            </span>
          </div>
        </section>

        <section className="cn-ws__section">
          <p className="cn-ws__label">Reference Information</p>
          <div className="cn-ws__grid-4">
            <div className="cn-ws__field">
              <span className="cn-ws__flabel">Reason</span>
              <p className="cn-ws__ro">{record.reason || "—"}</p>
            </div>
            {!isFresh ? (
              <>
                <div className="cn-ws__field">
                  <span className="cn-ws__flabel">Purchase Invoice</span>
                  <p className="cn-ws__ro font-mono">{record.sourceInvoiceNo || "—"}</p>
                </div>
                <div className="cn-ws__field">
                  <span className="cn-ws__flabel">Purchase Return</span>
                  <p className="cn-ws__ro font-mono">{record.sourceReturnNo || "—"}</p>
                </div>
                <div className="cn-ws__field">
                  <span className="cn-ws__flabel">PO No.</span>
                  <p className="cn-ws__ro font-mono">{record.sourcePoNo || "—"}</p>
                </div>
                <div className="cn-ws__field">
                  <span className="cn-ws__flabel">GRN No.</span>
                  <p className="cn-ws__ro font-mono">{record.sourceGrnNo || "—"}</p>
                </div>
              </>
            ) : (
              <div className="cn-ws__field">
                <span className="cn-ws__flabel">Adjustment Ledger</span>
                <p className="cn-ws__ro">{record.adjustmentLedgerName || "—"}</p>
              </div>
            )}
          </div>
        </section>

        <section className="cn-ws__section cn-ws__section--flush">
          <div className="px-4 pt-2.5 pb-1">
            <p className="cn-ws__label mb-0">Particulars</p>
          </div>
          <div className="cn-ws__table-wrap">
            <table className="cn-ws__table min-w-[640px]">
              <thead>
                <tr>
                  {isFresh ? (
                    <>
                      <th>Description</th>
                      <th>Adjustment Ledger</th>
                      <th className="text-right">Amount</th>
                    </>
                  ) : (
                    <>
                      <th>Product</th>
                      <th className="text-right">Original Qty</th>
                      <th className="text-right">Debit Qty</th>
                      <th className="text-right">Rate</th>
                      <th className="text-right">GST %</th>
                      <th className="text-right">Amount</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {isFresh ? (
                  <tr>
                    <td>{record.reason || "Direct Adjustment"}</td>
                    <td>{record.adjustmentLedgerName || "—"}</td>
                    <td className="cn-num font-semibold">
                      {formatINR(record.currentDebitAmount)}
                    </td>
                  </tr>
                ) : (
                  record.lineItems.map((l) => (
                    <tr key={l.id}>
                      <td className="font-medium">{l.productName || "—"}</td>
                      <td className="cn-num">{l.invoiceQty || "—"}</td>
                      <td className="cn-num">{l.returnQty || "—"}</td>
                      <td className="cn-num">
                        {l.unitPrice ? l.unitPrice.toFixed(2) : "—"}
                      </td>
                      <td className="cn-num">{l.taxPct ? `${l.taxPct}%` : "—"}</td>
                      <td className="cn-num font-semibold">
                        {formatINR(l.debitAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="cn-ws__summary">
          <div>
            <LedgerImpactPreview
              title="Accounting Entry"
              lines={debitNoteImpactResolved({
                vendorName: record.vendorName,
                taxable: record.taxableAmount,
                taxAmount: record.gstAmount,
                grandTotal: record.currentDebitAmount,
                adjustmentLedgerName: record.adjustmentLedgerName,
              })}
            />
            <div className="mt-2">
              <AccountsDocumentWorkflowSection
                category="debit_note"
                documentId={record.id}
                workflow={record.workflow}
                legacyStatus={record.status}
                onUpdated={refresh}
              />
            </div>
          </div>
          <div className="cn-ws__summary-rows">
            <div>
              <span className="cn-muted">Subtotal</span>
              <span className="tabular-nums">{formatINR(record.taxableAmount)}</span>
            </div>
            <div>
              <span className="cn-muted">CGST</span>
              <span className="tabular-nums">{formatINR(record.cgstAmount)}</span>
            </div>
            <div>
              <span className="cn-muted">SGST</span>
              <span className="tabular-nums">{formatINR(record.sgstAmount)}</span>
            </div>
            <div>
              <span className="cn-muted">IGST</span>
              <span className="tabular-nums">{formatINR(record.igstAmount)}</span>
            </div>
            <div className="cn-total">
              <span>Grand Total</span>
              <span className="tabular-nums">
                {formatINR(record.currentDebitAmount)}
              </span>
            </div>
          </div>
        </div>

        <section className="cn-ws__section">
          <p className="cn-ws__label">Narration &amp; Attachments</p>
          <div className="cn-ws__grid-3">
            <div className="cn-ws__field">
              <span className="cn-ws__flabel">Reason Summary</span>
              <p className="cn-ws__ro">{record.reason || "—"}</p>
            </div>
            <div className="cn-ws__field">
              <span className="cn-ws__flabel">Internal Reference</span>
              <p className="cn-ws__ro">{record.referenceNo || "—"}</p>
            </div>
            <div className="cn-ws__field">
              <span className="cn-ws__flabel">Attachments</span>
              <p className="cn-ws__ro">
                {record.attachments?.length
                  ? `${record.attachments.length} file(s)`
                  : "—"}
              </p>
            </div>
            <div className="cn-ws__field" style={{ gridColumn: "1 / -1" }}>
              <span className="cn-ws__flabel">Narration</span>
              <p className="cn-ws__ro min-h-[48px] items-start py-2">
                {record.remarks || "—"}
              </p>
            </div>
          </div>
          {record.attachments?.length > 0 ? (
            <div className="mt-2 space-y-1">
              {record.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 text-[11px] py-1 px-2 border rounded"
                >
                  <span className="font-medium">{att.documentName}</span>
                  <span className="text-muted-foreground flex-1 truncate">
                    {att.fileName}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {record.activity.length > 0 ? (
          <section className="cn-ws__section">
            <p className="cn-ws__label">Activity</p>
            <div className="space-y-1.5">
              {[...record.activity].reverse().slice(0, 8).map((a, i) => (
                <div
                  key={`${a.at}-${i}`}
                  className="text-[11px] flex gap-3 border-b border-border/40 pb-1"
                >
                  <span className="font-medium capitalize min-w-[7rem]">
                    {a.action.replaceAll("_", " ")}
                  </span>
                  <span className="text-muted-foreground flex-1">{a.detail}</span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {a.by} · {new Date(a.at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </AccountsFormLayout>
  );
}
