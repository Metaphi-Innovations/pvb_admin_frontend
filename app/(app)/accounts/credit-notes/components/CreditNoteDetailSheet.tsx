"use client";

import { FileText, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { NoteWorkflowBadge } from "../../components/NoteWorkflowBadge";
import { formatLinkedInvoiceNos } from "./LinkedInvoicesMultiSelect";
import {
  canEditCreditNote,
  CREDIT_NOTE_SOURCE_LABELS,
  type CreditNoteRecord,
} from "../credit-notes-data";
import { formatINR } from "../note-utils";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { creditNoteImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import {
  canEditAccountsDocument,
} from "@/lib/accounts/accounts-maker-checker";

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
        {label}
      </p>
      <p className="text-xs font-medium text-foreground break-words">{value ?? "—"}</p>
    </div>
  );
}

export function CreditNoteDetailSheet({
  record,
  open,
  onOpenChange,
  onEdit,
}: {
  record: CreditNoteRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (record: CreditNoteRecord) => void;
}) {
  if (!record) return null;

  const canEdit =
    canEditCreditNote(record) && canEditAccountsDocument(record.workflow, record.status);

  const refDoc =
    record.source === "sales_return"
      ? record.sourceReturnNo
      : record.source === "payment_discount_scheme"
        ? record.schemeName ?? record.schemeCode
        : record.reason;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px]">
        <SheetHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="truncate font-mono text-brand-700">{record.creditNoteNo}</SheetTitle>
              <SheetDescription className="truncate">{record.customerName}</SheetDescription>
            </div>
            <NoteWorkflowBadge status={record.status} />
          </div>
        </SheetHeader>

        <SheetBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3 bg-muted/30 rounded-xl px-3 py-2.5">
            <InfoField label="Date" value={record.creditNoteDate} />
            <InfoField label="Source" value={CREDIT_NOTE_SOURCE_LABELS[record.source]} />
            <InfoField label="Reference" value={refDoc} />
            <InfoField
              label="Linked Invoice(s)"
              value={formatLinkedInvoiceNos(record.linkedInvoices) || record.sourceInvoiceNo || "—"}
            />
            <InfoField label="Taxable" value={formatINR(record.taxableValue)} />
            <InfoField label="Total Credit" value={formatINR(record.currentCreditAmount)} />
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px] tabular-nums">
            <div className="rounded-lg border border-border/60 px-2 py-1.5">
              <p className="text-[10px] text-muted-foreground uppercase">CGST</p>
              <p className="font-medium">{formatINR(record.cgstAmount)}</p>
            </div>
            <div className="rounded-lg border border-border/60 px-2 py-1.5">
              <p className="text-[10px] text-muted-foreground uppercase">SGST</p>
              <p className="font-medium">{formatINR(record.sgstAmount)}</p>
            </div>
            <div className="rounded-lg border border-border/60 px-2 py-1.5">
              <p className="text-[10px] text-muted-foreground uppercase">IGST</p>
              <p className="font-medium">{formatINR(record.igstAmount)}</p>
            </div>
          </div>

          <LedgerImpactPreview
            title="Accounting entry"
            lines={creditNoteImpactResolved({
              customerName: record.customerName,
              taxable: Math.max(0, record.currentCreditAmount - (record.taxCreditAmount ?? 0)),
              taxAmount: record.taxCreditAmount ?? 0,
              grandTotal: record.currentCreditAmount,
            })}
          />

          {record.lineItems.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Line Items
              </p>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr>
                      {["Product", "Qty", "Amount"].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {record.lineItems.map((l) => (
                      <tr key={l.id} className="border-b border-border/60 last:border-0">
                        <td className="px-2 py-1.5 truncate max-w-[140px]" title={l.productName}>
                          {l.productName || "—"}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">{l.returnQty || "—"}</td>
                        <td className="px-2 py-1.5 tabular-nums font-medium text-right">
                          {formatINR(l.creditAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {record.remarks && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                Narration
              </p>
              <p className="text-xs text-foreground">{record.remarks}</p>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Activity
            </p>
            <div className="space-y-1.5">
              {[...record.activity].reverse().slice(0, 4).map((a, i) => (
                <div key={i} className="text-[11px] border-l-2 border-brand-200 pl-2 py-0.5">
                  <p className="font-medium capitalize">{a.action.replaceAll("_", " ")}</p>
                  <p className="text-muted-foreground">{a.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </SheetBody>

        {canEdit && onEdit && (
          <SheetFooter>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
              onClick={() => onEdit(record)}
            >
              <Pencil className="w-3.5 h-3.5" /> Edit Credit Note
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
