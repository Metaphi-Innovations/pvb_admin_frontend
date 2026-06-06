"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, Download, Eye, Pencil, PlayCircle } from "lucide-react";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { NoteWorkflowBadge } from "../components/NoteWorkflowBadge";
import {
  approveDebitNote,
  getDebitNoteById,
  processDebitNote,
  REFERENCE_TYPE_LABELS,
  totalRejectedQtyFromLines,
  type DebitNoteRecord,
} from "./debit-notes-data";
import { downloadDebitNotePdf } from "./debit-note-pdf";
import { DEBIT_NOTES_BREADCRUMB, DEBIT_NOTES_LIST_PATH, formatINR } from "./note-utils";

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

  const canEdit = record.status === "draft" || record.status === "pending_approval";

  return (
    <AccountsFormLayout
      title="View Debit Note"
      breadcrumb={[...DEBIT_NOTES_BREADCRUMB]}
      code={record.debitNoteNo}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => downloadDebitNotePdf(record)}>
            <Download className="w-3.5 h-3.5" /> Download PDF
          </Button>
          {canEdit && (
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" asChild>
              <Link href={`${DEBIT_NOTES_LIST_PATH}/${record.id}/edit`}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Link>
            </Button>
          )}
          {(record.status === "draft" || record.status === "pending_approval") && (
            <Button
              size="sm"
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
              onClick={() => {
                approveDebitNote(record.id);
                refresh();
              }}
            >
              <CheckCircle className="w-3.5 h-3.5" /> Approve
            </Button>
          )}
          {record.status === "approved" && (
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1"
              onClick={() => {
                processDebitNote(record.id);
                refresh();
              }}
            >
              <PlayCircle className="w-3.5 h-3.5" /> Mark Processed
            </Button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-8 items-start">
        <div className="lg:col-span-2 space-y-4">
          <NoteWorkflowBadge status={record.status} />

          <div className="rounded-lg border border-border/60 bg-white p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <DetailRow label="Vendor" value={record.vendorName} />
            <DetailRow label="Debit Note Date" value={record.debitNoteDate} />
            <DetailRow label="Reference Type" value={REFERENCE_TYPE_LABELS[record.againstType]} />
            <DetailRow label="Purchase Invoice No." value={record.sourceInvoiceNo} />
            <DetailRow label="PO No." value={record.sourcePoNo} />
            <DetailRow label="GRN No." value={record.sourceGrnNo} />
            <DetailRow label="QC Reference" value={record.sourceQcNo} />
            <DetailRow label="Rejected Qty" value={String(totalRejectedQtyFromLines(record.lineItems) || "—")} />
            <DetailRow label="Debit Amount" value={formatINR(record.currentDebitAmount)} />
            <DetailRow label="Reason" value={record.reason} />
          </div>

          {record.againstType !== "standalone_adjustment" && record.lineItems.length > 0 && (
            <div className="bg-white rounded-lg border border-border/60 p-4 overflow-x-auto">
              <h2 className="text-sm font-semibold mb-3">Line Items</h2>
              <table className="w-full text-xs min-w-[720px]">
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
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a href={att.dataUrl} download={att.fileName} className="p-1 hover:bg-muted rounded">
                          <Download className="w-3.5 h-3.5" />
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

        <div className="lg:sticky lg:top-20">
          <div className="rounded-lg border border-border/60 bg-white p-4 space-y-2 text-xs">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground">Summary</h2>
            <div className="flex justify-between"><span className="text-muted-foreground">Taxable</span><span className="tabular-nums">{formatINR(record.taxableAmount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span className="tabular-nums">{formatINR(record.gstAmount)}</span></div>
            <div className="flex justify-between font-semibold text-brand-700 pt-2 border-t"><span>Total Debit</span><span className="tabular-nums">{formatINR(record.currentDebitAmount)}</span></div>
            {record.originalAmount > 0 && (
              <div className="flex justify-between text-muted-foreground pt-1">
                <span>Balance After</span>
                <span className="tabular-nums">{formatINR(record.balanceAfterAdjustment)}</span>
              </div>
            )}
            <div className="pt-2 border-t text-[10px] text-muted-foreground">
              <p>Created by {record.createdBy}</p>
              <p>Updated by {record.updatedBy}</p>
            </div>
          </div>
        </div>
      </div>
    </AccountsFormLayout>
  );
}
