"use client";

/**
 * Credit Note View — loads GET /accounts/credit-note/:credit_note_id (UUID).
 * Same workspace chrome as Create/Edit so the header never overlays the document.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import {
  VoucherNoteField,
  VoucherNoteFieldGrid,
  VoucherNoteReadOnly,
} from "@/components/accounts/voucher-form/VoucherNoteFieldGrid";
import {
  TransactionViewHero,
  buildVoucherViewMeta,
  voucherStatusToBadgeKey,
} from "@/components/accounts/voucher-form/TransactionViewHero";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";
import { CreditNoteCancelDialog } from "./components/CreditNoteCancelDialog";
import { CreditNoteReverseDialog } from "./components/CreditNoteReverseDialog";
import { CreditNoteAmountSummary } from "./components/CreditNoteAmountSummary";
import { CREDIT_NOTES_BREADCRUMB, CREDIT_NOTES_LIST_PATH } from "./note-utils";
import {
  CreditNoteListApi,
  creditNoteListApiError,
  type CreditNoteDetailApi,
} from "./credit-note-list-api";
import { SOURCE_TYPE_LABELS, STATUS_LABELS, statusChipClass } from "./credit-note-form-utils";
import { formatMoney } from "@/lib/accounts/money-format";
import { formatDisplayDate, toIsoDateOnly } from "@/lib/accounts/date-display";
import "./credit-note-tx.css";
import "@/components/accounts/voucher-form/note-form-compact.css";
import "@/components/accounts/voucher-form/transaction-view.css";

function toNum(value: unknown, fallback = 0): number {
  if (value == null || value === "") return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

function toDate(value: unknown): string {
  return toIsoDateOnly(value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function uniqueRefCodes(record: CreditNoteDetailApi, type: string): string[] {
  const refs = Array.isArray(record.references) ? record.references : [];
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const raw of refs) {
    const r = raw as Record<string, unknown>;
    if (r.reference_type !== type) continue;
    const code = String(r.reference_code || "").trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    codes.push(code);
  }
  return codes;
}

type ViewLine = {
  key: string;
  description: string;
  ledgerName: string;
  hsn: string;
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
    const hsnSnap = l.hsn_snapshot as { hsn_code?: string } | undefined;
    return {
      key: String(l.credit_note_line_id || i),
      description: String(l.description || "—"),
      ledgerName: ledger?.ledger_name || String(l.ledger_name || "—"),
      hsn:
        String(l.hsn_code || l.hsn || hsnSnap?.hsn_code || "").trim(),
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
  const { toast, showToast, dismissToast } = useAccountsToast();
  const reverseBusyRef = useRef(false);
  const [record, setRecord] = useState<CreditNoteDetailApi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reverseOpen, setReverseOpen] = useState(false);
  const [reverseBusy, setReverseBusy] = useState(false);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!creditNoteId || creditNoteId === "new" || !isUuid(creditNoteId)) {
      setError("Invalid credit note id.");
      setRecord(null);
      setLoading(false);
      return;
    }
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const next = await CreditNoteListApi.getById(creditNoteId);
      setRecord(next);
    } catch (e) {
      if (!opts?.silent) {
        setRecord(null);
        setError(creditNoteListApiError(e, "Credit note not found."));
      }
    } finally {
      setLoading(false);
    }
  }, [creditNoteId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div className="credit-debit-note-form flex-1 min-h-0 h-full flex flex-col">
        <AccountsFormLayout
          fullWidth
          title="Credit Note"
          breadcrumb={[...CREDIT_NOTES_BREADCRUMB]}
          stickyFooter={
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => router.push(CREDIT_NOTES_LIST_PATH)}
            >
              Back
            </Button>
          }
        >
          <div className="bg-muted/30 border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground">
            Loading credit note…
          </div>
        </AccountsFormLayout>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="credit-debit-note-form flex-1 min-h-0 h-full flex flex-col">
        <AccountsFormLayout
          fullWidth
          title="Credit Note"
          breadcrumb={[...CREDIT_NOTES_BREADCRUMB]}
          stickyFooter={
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => router.push(CREDIT_NOTES_LIST_PATH)}
            >
              Back to Credit Notes
            </Button>
          }
        >
          <p className="text-sm text-red-600">{error || "Credit note not found."}</p>
        </AccountsFormLayout>
      </div>
    );
  }

  const status = String(record.status || "");
  const canEdit = status === "DRAFT" || status === "REJECTED";
  const canCancel = status !== "POSTED" && status !== "CANCELLED" && status !== "REVERSED";
  const canReverse = status === "POSTED";
  const isQty = String(record.source_type) === "SALES_RETURN" || String(record.source_type) === "NEAR_EXPIRY";
  const lines = mapLines(record);
  const cgst = toNum(record.cgst_amount);
  const sgst = toNum(record.sgst_amount);
  const igst = toNum(record.igst_amount);
  const gst = toNum(record.gst_amount);
  const taxable = toNum(record.taxable_amount);
  const total = toNum(record.cn_amount);
  const roundOff = toNum(record.round_off_amount);
  const interstate = Boolean(record.is_interstate);
  const invoiceNos = uniqueRefCodes(record, "SALES_INVOICE");
  const returnNos = uniqueRefCodes(record, "SALES_RETURN");
  const cnNo = record.cn_number || "—";
  const customerName = record.customer?.customer_name || "—";
  const sourceLabel = SOURCE_TYPE_LABELS[String(record.source_type)] || record.source_type || "—";
  const showLineHsn = lines.some((l) => Boolean(l.hsn));

  return (
    <>
      <div className="credit-debit-note-form flex-1 min-h-0 h-full flex flex-col">
        <AccountsFormLayout
          fullWidth
          title="Credit Note"
          breadcrumb={[...CREDIT_NOTES_BREADCRUMB]}
          code={cnNo !== "—" ? cnNo : undefined}
          headerMeta={
            <div className="flex items-center gap-1.5">
              <span
                className={`cdn-chip inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusChipClass(status)}`}
              >
                {STATUS_LABELS[status] || status.replaceAll("_", " ")}
              </span>
              {cnNo !== "—" ? (
                <span className="cdn-chip cdn-chip--code inline-flex items-center h-5 px-1.5 rounded border font-mono text-[10px]">
                  {cnNo}
                </span>
              ) : null}
            </div>
          }
          stickyFooter={
            <div className="flex items-center justify-between w-full gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => router.push(CREDIT_NOTES_LIST_PATH)}
              >
                Back
              </Button>
              <div className="flex items-center gap-1.5">
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
                {canReverse ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-red-600"
                    onClick={() => setReverseOpen(true)}
                    disabled={reverseBusy}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>
          }
        >
          <div className="cdn-stack transaction-voucher-view pb-4">
            <TransactionViewHero
              statusKey={voucherStatusToBadgeKey(status)}
              statusLabel={STATUS_LABELS[status] || status.replaceAll("_", " ")}
              chips={[sourceLabel]}
              metaItems={buildVoucherViewMeta({
                draftNo: cnNo !== "—" ? cnNo : undefined,
                voucherDate: toDate(record.cn_date) || undefined,
                branchName: record.warehouse?.warehouse_name || undefined,
              })}
              partyLabel={customerName}
              amountLabel="CN Amount"
              amount={total}
            />

            <VoucherFormSectionCard title="Basic Details" compact highlight>
              <VoucherNoteFieldGrid columns={4}>
                <VoucherNoteField label="Customer">
                  <VoucherNoteReadOnly>{customerName}</VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="Credit Note No.">
                  <VoucherNoteReadOnly mono>{cnNo}</VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="Credit Note Date">
                  <VoucherNoteReadOnly>{formatDisplayDate(record.cn_date)}</VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="Warehouse">
                  <VoucherNoteReadOnly>
                    {record.warehouse?.warehouse_name || "—"}
                  </VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="Source">
                  <VoucherNoteReadOnly>{sourceLabel}</VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="Status">
                  <VoucherNoteReadOnly>
                    {STATUS_LABELS[status] || status.replaceAll("_", " ") || "—"}
                  </VoucherNoteReadOnly>
                </VoucherNoteField>
                {returnNos.length ? (
                  <VoucherNoteField label="Sales Return">
                    <VoucherNoteReadOnly mono>{returnNos.join(", ")}</VoucherNoteReadOnly>
                  </VoucherNoteField>
                ) : null}
                <VoucherNoteField label="Linked Invoice">
                  <VoucherNoteReadOnly mono>
                    {invoiceNos.length ? invoiceNos.join(", ") : "—"}
                  </VoucherNoteReadOnly>
                </VoucherNoteField>
                {record.scheme?.scheme_name ? (
                  <VoucherNoteField label="Scheme">
                    <VoucherNoteReadOnly>{record.scheme.scheme_name}</VoucherNoteReadOnly>
                  </VoucherNoteField>
                ) : null}
              </VoucherNoteFieldGrid>
            </VoucherFormSectionCard>

            <VoucherFormSectionCard
              title={isQty ? "Quantity Particulars" : "Particulars"}
              compact
              highlight
              flush
            >
              <div className="cnz-table-wrap">
                <table className={isQty ? "cnz-table cnz-table--qty" : "cnz-table cnz-table--amt"}>
                  <thead>
                    <tr>
                      <th className="text-left">Particular</th>
                      <th className="text-left">Ledger</th>
                      {showLineHsn ? <th className="text-left">HSN</th> : null}
                      {isQty ? <th className="text-right">Qty</th> : null}
                      <th className="text-right">Taxable</th>
                      <th className="text-right">GST %</th>
                      {interstate ? (
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
                        <td
                          colSpan={
                            (showLineHsn ? 1 : 0) +
                            (isQty ? 1 : 0) +
                            (interstate ? 6 : 7)
                          }
                          className="text-muted-foreground text-xs"
                        >
                          No line items.
                        </td>
                      </tr>
                    ) : (
                      lines.map((l) => (
                        <tr key={l.key}>
                          <td>{l.description}</td>
                          <td>{l.ledgerName}</td>
                          {showLineHsn ? (
                            <td className="font-mono">{l.hsn || "—"}</td>
                          ) : null}
                          {isQty ? <td className="cnz-num">{l.qty}</td> : null}
                          <td className="cnz-num">{formatMoney(l.taxable)}</td>
                          <td className="cnz-num">{l.gstRate > 0 ? `${l.gstRate}%` : "—"}</td>
                          {interstate ? (
                            <td className="cnz-num">{formatMoney(l.igst || l.gstAmount)}</td>
                          ) : (
                            <>
                              <td className="cnz-num">{formatMoney(l.cgst)}</td>
                              <td className="cnz-num">{formatMoney(l.sgst)}</td>
                            </>
                          )}
                          <td className="cnz-num font-semibold">{formatMoney(l.total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </VoucherFormSectionCard>

            <CreditNoteAmountSummary
              taxable={taxable}
              cgst={cgst}
              sgst={sgst}
              igst={igst}
              gst={gst}
              roundOff={roundOff}
              total={total}
              interstate={interstate}
              locked
            />

            <VoucherFormSectionCard title="Narration" compact highlight>
              <p className="text-xs text-foreground whitespace-pre-wrap min-h-[2.5rem]">
                {record.narration?.trim() || "—"}
              </p>
            </VoucherFormSectionCard>
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

      <CreditNoteReverseDialog
        open={reverseOpen}
        onClose={() => {
          if (!reverseBusy) setReverseOpen(false);
        }}
        busy={reverseBusy}
        onConfirm={async (payload) => {
          if (reverseBusyRef.current) return;
          reverseBusyRef.current = true;
          setReverseBusy(true);
          try {
            const next = await CreditNoteListApi.reverse(record.credit_note_id, payload);
            setRecord(next);
            setReverseOpen(false);
            showToast("Credit Note cancelled.");
            await refresh({ silent: true });
          } catch (e) {
            showToast(
              creditNoteListApiError(e, "Could not cancel this Credit Note."),
              "error",
            );
          } finally {
            reverseBusyRef.current = false;
            setReverseBusy(false);
          }
        }}
      />

      <AccountsToast toast={toast} onDismiss={dismissToast} />
    </>
  );
}
