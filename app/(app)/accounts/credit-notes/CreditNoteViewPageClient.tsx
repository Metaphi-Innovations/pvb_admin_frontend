"use client";

/**
 * Credit Note View — compact continuous document (aligned with create/edit).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { AccountsDocumentWorkflowSection } from "@/components/accounts/AccountsDocumentWorkflowSection";
import { CreditNoteCancelDialog } from "./components/CreditNoteCancelDialog";
import { CreditNoteCustomerInfoButton } from "./components/CreditNoteCustomerInfoButton";
import {
  canEditCreditNote,
  cancelCreditNote,
  CREDIT_NOTE_SOURCE_LABELS,
  getCreditNoteById,
  getCustomersForCreditNote,
  type CreditNoteRecord,
} from "./credit-notes-data";
import { CREDIT_NOTES_BREADCRUMB, CREDIT_NOTES_LIST_PATH, formatINR } from "./note-utils";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { creditNoteImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import {
  canEditAccountsDocument,
  resolveWorkflowStatus,
} from "@/lib/accounts/accounts-maker-checker";
import "./credit-note-tx.css";

export default function CreditNoteViewPageClient({ creditNoteId }: { creditNoteId: number }) {
  const router = useRouter();
  const [record, setRecord] = useState<CreditNoteRecord | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const customers = getCustomersForCreditNote();

  const refresh = () => {
    const r = getCreditNoteById(creditNoteId);
    if (!r) {
      router.replace(CREDIT_NOTES_LIST_PATH);
      return;
    }
    setRecord(r);
  };

  useEffect(() => {
    refresh();
  }, [creditNoteId]);

  if (!record) return null;

  const canEdit =
    canEditCreditNote(record) && canEditAccountsDocument(record.workflow, record.status);
  const displayStatus = resolveWorkflowStatus(record.workflow, record.status);
  const isScheme = record.source === "payment_discount_scheme";
  const isQty =
    record.source === "sales_return" ||
    record.lineItems.some((l) => (l.invoiceQty || 0) > 0);
  const customer = record.customerId
    ? customers.find((c) => c.id === record.customerId)
    : customers.find((c) => c.customerName === record.customerName);
  const invoiceCount =
    record.linkedInvoices?.length ||
    record.sourceInvoiceIds?.length ||
    (record.sourceInvoiceNo ? 1 : 0);
  const showCgst = (record.cgstAmount || 0) > 0;
  const showSgst = (record.sgstAmount || 0) > 0;
  const showIgst = (record.igstAmount || 0) > 0;

  return (
    <>
      <div className="h-full min-h-0 flex flex-col">
      <AccountsFormLayout
        fullWidth
        title="Credit Note"
        breadcrumb={[...CREDIT_NOTES_BREADCRUMB]}
        code={record.creditNoteNo}
        headerMeta={
          <span className="inline-flex items-center h-6 px-2 rounded-md border border-brand-200 bg-brand-50 font-mono text-[11px] font-semibold text-brand-700">
            {record.creditNoteNo}
          </span>
        }
        stickyFooter={
          <div className="cnz-footer">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => router.push(CREDIT_NOTES_LIST_PATH)}
            >
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              {canEdit ? (
                <Button
                  size="sm"
                  className="h-7 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                  onClick={() =>
                    router.push(`${CREDIT_NOTES_LIST_PATH}/${record.id}/edit`)
                  }
                >
                  Edit
                </Button>
              ) : null}
              {record.status !== "cancelled" && record.status !== "posted" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-red-600"
                  onClick={() => setCancelOpen(true)}
                >
                  Cancel Note
                </Button>
              ) : null}
            </div>
          </div>
        }
      >
        <div className="cnz">
          <div className="cnz-head">
            <div className="cnz-f">
              <label>
                Customer
                <CreditNoteCustomerInfoButton
                  customer={customer}
                  placeOfSupply={record.placeOfSupply}
                />
              </label>
              <p className="cnz-ro font-medium">{record.customerName}</p>
            </div>
            <div className="cnz-f">
              <label>Credit Note No.</label>
              <p className="cnz-ro font-mono text-[13px]">{record.creditNoteNo}</p>
            </div>
            <div className="cnz-f">
              <label>Credit Note Date</label>
              <p className="cnz-ro text-[13px]">{record.creditNoteDate}</p>
            </div>
            <div className="cnz-f">
              <label>Reference No.</label>
              <p className="cnz-ro text-[13px]">{record.referenceNo || "—"}</p>
            </div>
            <div className="cnz-f">
              <label>Salesperson</label>
              <p className="cnz-ro text-[13px]">{record.salesperson || "—"}</p>
            </div>
            <div className="cnz-f">
              <label>Credit Note Basis</label>
              <p className="cnz-ro text-[13px]">
                {isScheme ? "Scheme" : isQty ? "Quantity Based" : "Amount Based"}
              </p>
            </div>
            <div className="cnz-f">
              <label>Reason</label>
              <p className="cnz-ro text-[13px]">{record.reason || "—"}</p>
            </div>
            <div className="cnz-f">
              <label>Linked Invoice</label>
              <p className="cnz-ro text-[13px]">
                {invoiceCount > 0
                  ? `${invoiceCount} Invoice${invoiceCount === 1 ? "" : "s"}`
                  : record.sourceInvoiceNo || "—"}
              </p>
            </div>
            {isScheme && record.adjustmentLedgerName ? (
              <div className="cnz-f">
                <label>Mapped Ledger</label>
                <p className="cnz-ro text-[13px] truncate">
                  {record.adjustmentLedgerName}
                </p>
              </div>
            ) : null}
            <div className="cnz-f cnz-head__full">
              <span className="cnz-tag">
                Source: {CREDIT_NOTE_SOURCE_LABELS[record.source]} · Status:{" "}
                {displayStatus.replaceAll("_", " ")}
              </span>
            </div>
          </div>

          <div className="cnz-items">
            <div className="cnz-items__bar">
              <h2 className="cnz-items__title">
                {isScheme
                  ? "Scheme Particulars"
                  : isQty
                    ? "Quantity Particulars"
                    : "Amount Particulars"}
              </h2>
            </div>
            <div className="cnz-table-wrap">
              <table
                className={
                  isScheme
                    ? "cnz-table cnz-table--scheme"
                    : isQty
                      ? "cnz-table cnz-table--qty"
                      : "cnz-table cnz-table--amt"
                }
              >
                <thead>
                  <tr>
                    {isScheme ? (
                      <>
                        <th>Scheme Particular</th>
                        <th>Mapped Ledger</th>
                        <th className="text-right">Taxable</th>
                        <th className="text-right">GST Amount</th>
                        <th className="text-right">Credit Note Total</th>
                      </>
                    ) : isQty ? (
                      <>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Batch</th>
                        <th className="text-right">Invoice Qty</th>
                        <th className="text-right">Credit Qty</th>
                        <th className="text-right">Rate</th>
                        <th className="text-right">GST %</th>
                        <th className="text-right">Total</th>
                      </>
                    ) : (
                      <>
                        <th>Particular</th>
                        <th>Adjustment Ledger</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">GST %</th>
                        {(record.igstAmount || 0) > 0 ? (
                          <th className="text-right">IGST</th>
                        ) : (
                          <>
                            <th className="text-right">CGST</th>
                            <th className="text-right">SGST</th>
                          </>
                        )}
                        <th className="text-right">Line Total</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {record.lineItems.map((l) => (
                    <tr key={l.id}>
                      {isScheme ? (
                        <>
                          <td className="font-medium">
                            {l.productName || record.schemeName || "—"}
                          </td>
                          <td>{record.adjustmentLedgerName || "—"}</td>
                          <td className="cnz-num">
                            {formatINR(Math.max(0, l.creditAmount - (l.gstAmount || 0)))}
                          </td>
                          <td className="cnz-num">{formatINR(l.gstAmount || 0)}</td>
                          <td className="cnz-num font-semibold">
                            {formatINR(l.creditAmount)}
                          </td>
                        </>
                      ) : isQty ? (
                        <>
                          <td className="font-medium">{l.productName || "—"}</td>
                          <td className="font-mono text-[12px]">{l.sku || "—"}</td>
                          <td className="font-mono text-[12px]">{l.batchNo || "—"}</td>
                          <td className="cnz-num">{l.invoiceQty || "—"}</td>
                          <td className="cnz-num">{l.returnQty || "—"}</td>
                          <td className="cnz-num">
                            {l.unitPrice ? l.unitPrice.toFixed(2) : "0.00"}
                          </td>
                          <td className="cnz-num">
                            {l.taxPct > 0 ? `${l.taxPct}%` : "—"}
                          </td>
                          <td className="cnz-num font-semibold">
                            {formatINR(l.creditAmount)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            {l.description || l.productName || record.reason || "—"}
                          </td>
                          <td>{record.adjustmentLedgerName || "—"}</td>
                          <td className="cnz-num">
                            {formatINR(Math.max(0, l.creditAmount - (l.gstAmount || 0)))}
                          </td>
                          <td className="cnz-num">
                            {l.taxPct > 0 ? `${l.taxPct}%` : "—"}
                          </td>
                          {(record.igstAmount || 0) > 0 ? (
                            <td className="cnz-num">
                              {formatINR(l.gstAmount || record.igstAmount || 0)}
                            </td>
                          ) : (
                            <>
                              <td className="cnz-num">
                                {formatINR(
                                  l.gstAmount
                                    ? Math.round((l.gstAmount / 2) * 100) / 100
                                    : record.cgstAmount || 0,
                                )}
                              </td>
                              <td className="cnz-num">
                                {formatINR(
                                  l.gstAmount
                                    ? Math.round((l.gstAmount / 2) * 100) / 100
                                    : record.sgstAmount || 0,
                                )}
                              </td>
                            </>
                          )}
                          <td className="cnz-num font-semibold">
                            {formatINR(l.creditAmount)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="cnz-after-table">
            <div />
            <div className="cnz-totals">
              <div className="cnz-totals__row">
                <span>Subtotal</span>
                <span>{formatINR(record.taxableValue)}</span>
              </div>
              {showCgst ? (
                <div className="cnz-totals__row">
                  <span>CGST</span>
                  <span>{formatINR(record.cgstAmount)}</span>
                </div>
              ) : null}
              {showSgst ? (
                <div className="cnz-totals__row">
                  <span>SGST</span>
                  <span>{formatINR(record.sgstAmount)}</span>
                </div>
              ) : null}
              {showIgst ? (
                <div className="cnz-totals__row">
                  <span>IGST</span>
                  <span>{formatINR(record.igstAmount)}</span>
                </div>
              ) : null}
              <div className="cnz-totals__grand">
                <span>Credit Note Total</span>
                <span>{formatINR(record.currentCreditAmount)}</span>
              </div>
            </div>
          </div>

          <div className="cnz-notes">
            <div className="cnz-f">
              <label>Narration</label>
              <p className="cnz-ro min-h-[3.25rem] items-start py-2 whitespace-pre-wrap text-[13px]">
                {record.remarks || "—"}
              </p>
            </div>
            <div className="cnz-f">
              <AccountsDocumentWorkflowSection
                category="credit_note"
                documentId={record.id}
                workflow={record.workflow}
                legacyStatus={record.status}
                onUpdated={refresh}
              />
            </div>
          </div>

          <div className="cnz-impact">
            <LedgerImpactPreview
              title="Accounting Entry"
              lines={creditNoteImpactResolved({
                customerName: record.customerName,
                taxable: Math.max(
                  0,
                  record.currentCreditAmount - (record.taxCreditAmount ?? 0),
                ),
                taxAmount: record.taxCreditAmount ?? 0,
                grandTotal: record.currentCreditAmount,
              })}
            />
          </div>
        </div>
      </AccountsFormLayout>
      </div>

      <CreditNoteCancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        creditNoteNo={record.creditNoteNo}
        onConfirm={(reason) => {
          cancelCreditNote(record.id, reason);
          refresh();
        }}
      />
    </>
  );
}
