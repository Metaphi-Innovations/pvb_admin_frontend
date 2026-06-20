"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle, Pencil, XCircle } from "lucide-react";
import { RecordDetailPage } from "@/components/record-detail";
import { NoteWorkflowBadge } from "../components/NoteWorkflowBadge";
import { CreditNoteCancelDialog } from "./components/CreditNoteCancelDialog";
import {
  approveCreditNote,
  canEditCreditNote,
  cancelCreditNote,
  getCreditNoteById,
  type CreditNoteRecord,
} from "./credit-notes-data";
import { CREDIT_NOTES_LIST_PATH, formatINR } from "./note-utils";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { creditNoteImpactResolved } from "@/lib/accounts/resolved-impact-previews";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs font-medium mt-0.5">{value ?? "—"}</p>
    </div>
  );
}

function workflowStatusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function workflowStatusVariant(status: string): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  if (status === "draft") return "draft";
  if (status === "pending_approval") return "neutral";
  if (status === "approved" || status === "processed") return "active";
  if (status === "cancelled") return "blocked";
  return "neutral";
}

export default function CreditNoteViewPageClient({ creditNoteId }: { creditNoteId: number }) {
  const router = useRouter();
  const [record, setRecord] = useState<CreditNoteRecord | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

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

  const canEdit = canEditCreditNote(record);
  const showApprovalActions = record.status === "draft" || record.status === "pending_approval";

  return (
    <RecordDetailPage
      embedded
      listHref={CREDIT_NOTES_LIST_PATH}
      listLabel="Credit Notes"
      recordName={record.customerName}
      recordCode={record.creditNoteNo}
      statusLabel={workflowStatusLabel(record.status)}
      statusVariant={workflowStatusVariant(record.status)}
      metaItems={[{ icon: Calendar, label: record.creditNoteDate }]}
      onEdit={canEdit ? () => router.push(`${CREDIT_NOTES_LIST_PATH}/${record.id}/edit`) : undefined}
      headerActions={
        showApprovalActions ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
              onClick={() => {
                approveCreditNote(record.id);
                refresh();
              }}
            >
              <CheckCircle className="w-3.5 h-3.5" /> Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs text-red-600 gap-1"
              onClick={() => setCancelOpen(true)}
            >
              <XCircle className="w-3.5 h-3.5" /> Cancel
            </Button>
          </div>
        ) : undefined
      }
      sidebar={{
        summary: [
          { label: "Original Amount", value: formatINR(record.originalAmount) },
          { label: "Already Adjusted", value: formatINR(record.alreadyAdjustedAmount) },
          { label: "This Credit", value: formatINR(record.currentCreditAmount), highlight: true },
          { label: "Balance After", value: formatINR(record.balanceAfterAdjustment) },
          { label: "Created By", value: record.createdBy },
          { label: "Updated By", value: record.updatedBy },
        ],
        approval: record.approvedBy
          ? [{ label: "Approved By", value: record.approvedBy, tone: "approved" as const }]
          : [],
        activity: [...record.activity].reverse().slice(0, 5).map((a, i) => ({
          id: `${a.at}-${i}`,
          title: a.action.replaceAll("_", " "),
          subtitle: a.detail,
          date: new Date(a.at).toLocaleString(),
        })),
        quickActions: canEdit
          ? [
              {
                label: "Edit Credit Note",
                icon: Pencil,
                variant: "outline" as const,
                onClick: () => router.push(`${CREDIT_NOTES_LIST_PATH}/${record.id}/edit`),
              },
            ]
          : [],
      }}
    >
      <div className="space-y-4">
        <LedgerImpactPreview
          title="Accounting Entry — reduces customer outstanding"
          lines={creditNoteImpactResolved({
            customerName: record.customerName,
            taxable: Math.max(0, record.currentCreditAmount - (record.taxCreditAmount ?? 0)),
            taxAmount: record.taxCreditAmount ?? 0,
            grandTotal: record.currentCreditAmount,
          })}
        />
        <NoteWorkflowBadge status={record.status} />

        <div className="rounded-lg border border-brand-200/50 bg-brand-50/20 p-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <DetailRow label="Customer" value={record.customerName} />
          <DetailRow label="Reference Invoice No." value={record.sourceInvoiceNo} />
          <DetailRow label="Reference Sales Order No." value={record.sourceOrderNo} />
          <DetailRow label="Credit Note Date" value={record.creditNoteDate} />
          <DetailRow label="Reason" value={record.reason} />
        </div>

        <div className="bg-white rounded-lg border border-border/60 p-4 overflow-x-auto">
          <h2 className="text-sm font-semibold mb-3">Line Items</h2>
          <table className="w-full text-xs min-w-[640px]">
            <thead className="border-b">
              <tr>
                {["Product", "Description", "Inv Qty", "Return Qty", "Credit Amount"].map((h) => (
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
                  <td className="py-1.5 text-muted-foreground">{l.description || "—"}</td>
                  <td className="py-1.5">{l.invoiceQty || "—"}</td>
                  <td className="py-1.5">{l.returnQty || "—"}</td>
                  <td className="py-1.5 tabular-nums font-medium">{formatINR(l.creditAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
                <p className="text-[10px] text-muted-foreground">
                  {a.by} · {new Date(a.at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
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
    </RecordDetailPage>
  );
}
