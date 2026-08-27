"use client";

/**
 * Credit Note View — loads GET /accounts/credit-note/:credit_note_id (UUID).
 * Same workspace chrome as Create/Edit so the header never overlays the document.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { AccountingImpactSection } from "@/components/accounts/AccountingImpactSection";
import { VoucherAccountingPostingSummary } from "@/components/accounts/voucher-form/VoucherAccountingPostingSummary";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import {
  VoucherNoteField,
  VoucherNoteFieldGrid,
  VoucherNoteReadOnly,
} from "@/components/accounts/voucher-form/VoucherNoteFieldGrid";
import { defaultVisibilityForType } from "@/components/accounts/voucher-form/voucher-form-shell";
import { CreditNoteCancelDialog } from "./components/CreditNoteCancelDialog";
import { CreditNoteAmountSummary } from "./components/CreditNoteAmountSummary";
import { CREDIT_NOTES_BREADCRUMB, CREDIT_NOTES_LIST_PATH } from "./note-utils";
import {
  CreditNoteListApi,
  creditNoteListApiError,
  type CreditNoteDetailApi,
} from "./credit-note-list-api";
import { SOURCE_TYPE_LABELS, STATUS_LABELS, statusChipClass } from "./credit-note-form-utils";
import { formatMoney } from "@/lib/accounts/money-format";
import "./credit-note-tx.css";
import "@/components/accounts/voucher-form/note-form-compact.css";

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
  const debitLedger = lines[0]?.ledgerName || "Adjustment ledger";
  const creditLedger = record.party_ledger?.ledger_name || customerName;
  const showGst = gst > 0.004;

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
              </div>
            </div>
          }
        >
          <div className="cdn-stack pb-4">
            <VoucherFormSectionCard title="Basic Details" compact>
              <VoucherNoteFieldGrid columns={4}>
                <VoucherNoteField label="Customer" width="md">
                  <VoucherNoteReadOnly>{customerName}</VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="Credit Note No." width="sm">
                  <VoucherNoteReadOnly mono>{cnNo}</VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="Credit Note Date" width="sm">
                  <VoucherNoteReadOnly>{toDate(record.cn_date) || "—"}</VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="Warehouse" width="md">
                  <VoucherNoteReadOnly>
                    {record.warehouse?.warehouse_name || "—"}
                  </VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="Source" width="md">
                  <VoucherNoteReadOnly>{sourceLabel}</VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="Status" width="sm">
                  <VoucherNoteReadOnly>
                    {STATUS_LABELS[status] || status.replaceAll("_", " ") || "—"}
                  </VoucherNoteReadOnly>
                </VoucherNoteField>
                {returnNos.length ? (
                  <VoucherNoteField label="Sales Return" width="md">
                    <VoucherNoteReadOnly mono>{returnNos.join(", ")}</VoucherNoteReadOnly>
                  </VoucherNoteField>
                ) : null}
                <VoucherNoteField label="Linked Invoice" width="lg">
                  <VoucherNoteReadOnly mono>
                    {invoiceNos.length ? invoiceNos.join(", ") : "—"}
                  </VoucherNoteReadOnly>
                </VoucherNoteField>
                {record.scheme?.scheme_name ? (
                  <VoucherNoteField label="Scheme" width="md">
                    <VoucherNoteReadOnly>{record.scheme.scheme_name}</VoucherNoteReadOnly>
                  </VoucherNoteField>
                ) : null}
              </VoucherNoteFieldGrid>
            </VoucherFormSectionCard>

            <VoucherFormSectionCard
              title={isQty ? "Quantity Particulars" : "Particulars"}
              compact
              flush
            >
              <div className="cnz-table-wrap">
                <table className={isQty ? "cnz-table cnz-table--qty accounts-table" : "cnz-table cnz-table--amt accounts-table"}>
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
                          <td className="cnz-num">{formatMoney(l.taxable)}</td>
                          <td className="cnz-num">{l.gstRate > 0 ? `${l.gstRate}%` : "—"}</td>
                          {igst > 0 ? (
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

            <VoucherFormSectionCard title="Narration" compact>
              <p className="text-xs text-foreground whitespace-pre-wrap min-h-[2.5rem]">
                {record.narration?.trim() || "—"}
              </p>
            </VoucherFormSectionCard>

            <AccountingImpactSection
              docKey="credit_note"
              compact
              entryPreview={
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground">
                    Posted accounting preview. Ledger balances are not edited from this screen.
                  </p>
                  <VoucherAccountingPostingSummary
                    compact
                    voucherTypeLabel="Credit Note"
                    debitLedgerLabel="Debit"
                    debitLedgerName={debitLedger}
                    creditLedgerLabel="Credit"
                    creditLedgerName={creditLedger}
                    voucherAmount={total}
                    voucherAmountLabel="Credit Note Amount"
                    gstAdjustments={
                      showGst
                        ? {
                            cgstLabel: "Output CGST",
                            cgstAmount: cgst,
                            sgstLabel: "Output SGST",
                            sgstAmount: sgst,
                            igstLabel: "Output IGST",
                            igstAmount: igst,
                          }
                        : undefined
                    }
                    visibilityItems={defaultVisibilityForType("credit_note", {
                      gstApplicable: showGst,
                    })}
                  />
                </div>
              }
            />
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
