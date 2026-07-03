"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar, Download, Eye, Pencil, PlayCircle } from "lucide-react";
import { RecordDetailPage } from "@/components/record-detail";
import { AccountsVoucherStatusBadge } from "@/components/accounts/AccountsVoucherStatusBadge";
import { AccountsDocumentWorkflowSection } from "@/components/accounts/AccountsDocumentWorkflowSection";
import {
  canEditAccountsDocument,
  resolveWorkflowStatus,
} from "@/lib/accounts/accounts-maker-checker";
import {
  canEditDebitNote,
  DEBIT_NOTE_SOURCE_LABELS,
  getDebitNoteById,
  processDebitNote,
  totalRejectedQtyFromLines,
  type DebitNoteRecord,
} from "./debit-notes-data";
import { downloadDebitNotePdf } from "./debit-note-pdf";
import { DEBIT_NOTES_LIST_PATH, formatINR } from "./note-utils";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { debitNoteImpactResolved } from "@/lib/accounts/resolved-impact-previews";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-xs font-medium mt-0.5">{value || "—"}</p>
    </div>
  );
}

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

  const canEdit = canEditDebitNote(record) && canEditAccountsDocument(record.workflow, record.status);
  const displayStatus = resolveWorkflowStatus(record.workflow, record.status);

  return (
    <RecordDetailPage
      embedded
      listHref={DEBIT_NOTES_LIST_PATH}
      listLabel="Debit Notes"
      recordName={record.vendorName}
      recordCode={record.debitNoteNo}
      statusLabel={displayStatus.replaceAll("_", " ")}
      statusVariant={displayStatus === "posted" ? "active" : displayStatus === "draft" ? "draft" : "neutral"}
      metaItems={[
        { icon: Calendar, label: record.debitNoteDate },
        { label: DEBIT_NOTE_SOURCE_LABELS[record.source] },
      ]}
      onEdit={canEdit ? () => router.push(`${DEBIT_NOTES_LIST_PATH}/${record.id}/edit`) : undefined}
      headerActions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-9 text-[13px] font-medium gap-1" onClick={() => downloadDebitNotePdf(record)}>
            <Download className="w-4 h-4" /> Download PDF
          </Button>
          {displayStatus === "posted" && record.status === "approved" && (
            <Button
              size="sm"
              className="h-9 text-[13px] font-medium bg-brand-600 hover:bg-brand-700 text-white gap-1"
              onClick={() => {
                processDebitNote(record.id);
                refresh();
              }}
            >
              <PlayCircle className="w-4 h-4" /> Mark Processed
            </Button>
          )}
        </div>
      }
      sidebar={{
        summary: [
          { label: "Taxable", value: formatINR(record.taxableAmount) },
          { label: "GST", value: formatINR(record.gstAmount) },
          { label: "Total Debit", value: formatINR(record.currentDebitAmount), highlight: true },
          ...(record.originalAmount > 0
            ? [{ label: "Balance After", value: formatINR(record.balanceAfterAdjustment) }]
            : []),
          { label: "Rejected Qty", value: String(totalRejectedQtyFromLines(record.lineItems) || "—") },
          { label: "Created By", value: record.createdBy },
        ],
        activity: [...record.activity].reverse().slice(0, 5).map((a, i) => ({
          id: `${a.at}-${i}`,
          title: a.action.replaceAll("_", " "),
          subtitle: a.detail,
          date: new Date(a.at).toLocaleString(),
        })),
        quickActions: [
          {
            label: "Download PDF",
            icon: Download,
            variant: "outline" as const,
            onClick: () => downloadDebitNotePdf(record),
          },
          ...(canEdit
            ? [
                {
                  label: "Edit Debit Note",
                  icon: Pencil,
                  variant: "outline" as const,
                  onClick: () => router.push(`${DEBIT_NOTES_LIST_PATH}/${record.id}/edit`),
                },
              ]
            : []),
        ],
      }}
    >
      <div className="space-y-4">
        <LedgerImpactPreview
          title="Accounting Entry — reduces supplier outstanding"
          lines={debitNoteImpactResolved({
            vendorName: record.vendorName,
            taxable: record.taxableAmount,
            taxAmount: record.gstAmount,
            grandTotal: record.currentDebitAmount,
          })}
        />
        <AccountsVoucherStatusBadge workflow={record.workflow} legacyStatus={record.status} />

        <AccountsDocumentWorkflowSection
          category="debit_note"
          documentId={record.id}
          workflow={record.workflow}
          legacyStatus={record.status}
          onUpdated={refresh}
        />

        <div className="rounded-lg border border-border/60 bg-white p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <DetailRow label="Source" value={DEBIT_NOTE_SOURCE_LABELS[record.source]} />
          <DetailRow
            label="Reference Document"
            value={record.source === "purchase_return" ? record.sourceReturnNo ?? "" : record.reason}
          />
          <DetailRow label="Supplier" value={record.vendorName} />
          <DetailRow label="Purchase Return Reference" value={record.sourceReturnNo ?? ""} />
          <DetailRow label="Purchase Invoice Reference" value={record.sourceInvoiceNo} />
          <DetailRow label="Debit Note Date" value={record.debitNoteDate} />
          <DetailRow label="Taxable Value" value={formatINR(record.taxableAmount)} />
          <DetailRow label="CGST" value={formatINR(record.cgstAmount)} />
          <DetailRow label="SGST" value={formatINR(record.sgstAmount)} />
          <DetailRow label="IGST" value={formatINR(record.igstAmount)} />
          <DetailRow label="Total" value={formatINR(record.currentDebitAmount)} />
        </div>

        {record.againstType !== "standalone_adjustment" && record.lineItems.length > 0 && (
          <div className="bg-white rounded-lg border border-border/60 p-4 overflow-x-auto">
            <h2 className="text-sm font-semibold mb-3">Line Items</h2>
            <table className="accounts-table w-full min-w-[720px]">
              <thead className="border-b">
                <tr>
                  {["Product", "Inv Qty", "Return Qty", "UOM", "Rate", "GST %", "Debit Amount"].map((h) => (
                    <th key={h} className="py-1.5 text-left text-[10px] uppercase text-muted-foreground font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {record.lineItems.map((l) => (
                  <tr key={l.id} className="border-b border-border/40">
                    <td className="py-1.5">{l.productName || "—"}</td>
                    <td className="py-1.5">{l.invoiceQty || "—"}</td>
                    <td className="py-1.5">{l.returnQty || "—"}</td>
                    <td className="py-1.5">{l.uom || "—"}</td>
                    <td className="py-1.5 tabular-nums">{formatINR(l.unitPrice)}</td>
                    <td className="py-1.5">{l.taxPct ? `${l.taxPct}%` : "—"}</td>
                    <td className="py-1.5 tabular-nums font-medium">{formatINR(l.debitAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {record.attachments.length > 0 && (
          <div className="bg-white rounded-lg border p-4">
            <h2 className="text-sm font-semibold mb-3">Attachments</h2>
            <div className="space-y-1.5">
              {record.attachments.map((att) => (
                <div key={att.id} className="flex items-center gap-2 text-xs py-1.5 px-2 border rounded">
                  <span className="font-medium">{att.documentName}</span>
                  <span className="text-muted-foreground truncate flex-1">{att.fileName}</span>
                  {att.dataUrl && (
                    <>
                      <button type="button" className="p-1 hover:bg-muted rounded" onClick={() => window.open(att.dataUrl, "_blank")}>
                        <Eye className="w-4 h-4" />
                      </button>
                      <a href={att.dataUrl} download={att.fileName} className="p-1 hover:bg-muted rounded">
                        <Download className="w-4 h-4" />
                      </a>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {record.remarks && (
          <div className="bg-white rounded-lg border p-4 text-xs">
            <p className="text-[10px] uppercase text-muted-foreground mb-1">Remarks</p>
            <p>{record.remarks}</p>
          </div>
        )}

        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-sm font-semibold mb-3">Activity Timeline</h2>
          <div className="space-y-2">
            {[...record.activity].reverse().map((a, i) => (
              <div key={i} className="text-xs border-l-2 border-brand-200 pl-3 py-0.5">
                <p className="font-medium capitalize">{a.action.replaceAll("_", " ")}</p>
                <p className="text-muted-foreground">{a.detail}</p>
                <p className="text-[10px] text-muted-foreground">{a.by} · {new Date(a.at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RecordDetailPage>
  );
}
