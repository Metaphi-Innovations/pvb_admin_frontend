"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, Pencil, XCircle } from "lucide-react";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { NoteWorkflowBadge } from "../components/NoteWorkflowBadge";
import { CreditNoteCancelDialog } from "./components/CreditNoteCancelDialog";
import {
  approveCreditNote,
  canEditCreditNote,
  cancelCreditNote,
  getCreditNoteById,
  type CreditNoteRecord,
} from "./credit-notes-data";
import { CREDIT_NOTES_BREADCRUMB, CREDIT_NOTES_LIST_PATH, formatINR } from "./note-utils";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs font-medium mt-0.5">{value ?? "—"}</p>
    </div>
  );
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

  return (
    <AccountsFormLayout
      title="View Credit Note"
      breadcrumb={[...CREDIT_NOTES_BREADCRUMB]}
      code={record.creditNoteNo}
      footer={
        <div className="flex flex-wrap gap-2">
          {canEditCreditNote(record) && (
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" asChild>
              <Link href={`${CREDIT_NOTES_LIST_PATH}/${record.id}/edit`}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Link>
            </Button>
          )}
          {(record.status === "draft" || record.status === "pending_approval") && (
            <>
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
            </>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-8 items-start">
        <div className="lg:col-span-2 space-y-4">
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

        <div className="lg:sticky lg:top-20 space-y-3">
          <div className="rounded-lg border bg-white p-4 space-y-2 text-xs shadow-sm">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground">Amount Summary</h2>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original Amount</span>
              <span className="tabular-nums">{formatINR(record.originalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Already Adjusted</span>
              <span className="tabular-nums">{formatINR(record.alreadyAdjustedAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-brand-700 pt-2 border-t">
              <span>This Credit</span>
              <span className="tabular-nums">{formatINR(record.currentCreditAmount)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Balance After</span>
              <span className="tabular-nums">{formatINR(record.balanceAfterAdjustment)}</span>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground space-y-0.5 px-1">
            <p>Created by {record.createdBy}</p>
            <p>Updated by {record.updatedBy}</p>
            {record.approvedBy && <p>Approved by {record.approvedBy}</p>}
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
    </AccountsFormLayout>
  );
}
