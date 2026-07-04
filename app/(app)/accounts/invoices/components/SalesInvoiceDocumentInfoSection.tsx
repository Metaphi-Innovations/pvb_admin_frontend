"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  InvoiceFormField,
  InvoiceFormInput,
  InvoiceFormReadOnly,
  INVOICE_FORM_GRID_CLASS,
  INVOICE_FORM_INPUT_CLASS,
  INVOICE_FORM_LABEL_CLASS,
} from "@/app/(app)/accounts/components/InvoiceFormLayout";
import { SalesInvoiceDispatchSelect } from "./SalesInvoiceDispatchSelect";
import { SalesInvoiceDispatchDetailsDialog } from "./SalesInvoiceDispatchDetailsDialog";
import type { PendingDispatchInvoiceRow } from "@/lib/accounts/dispatch-invoice-bridge";
import { cn } from "@/lib/utils";

function formatDisplayDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

export interface SalesInvoiceDocumentInfoSectionProps {
  isEdit: boolean;
  invoiceNo: string;
  invoiceDate: string;
  onInvoiceDateChange: (value: string) => void;
  dueDate: string;
  creditDays: number;
  salesOrderRef: string;
  dispatchRef: string;
  dispatchDate: string;
  sourceDispatchId: string;
  customerId: string;
  selectedDispatchId: string;
  onDispatchSelect: (dispatchId: string, row: PendingDispatchInvoiceRow | null) => void;
  showDispatchSelect?: boolean;
}

export function SalesInvoiceDocumentInfoSection({
  isEdit,
  invoiceNo,
  invoiceDate,
  onInvoiceDateChange,
  dueDate,
  creditDays,
  salesOrderRef,
  dispatchRef,
  dispatchDate,
  sourceDispatchId,
  customerId,
  selectedDispatchId,
  onDispatchSelect,
  showDispatchSelect = false,
}: SalesInvoiceDocumentInfoSectionProps) {
  const [dispatchInfoOpen, setDispatchInfoOpen] = useState(false);
  const hasDispatch = Boolean(sourceDispatchId || dispatchRef);

  return (
    <div className="space-y-3">
      <div className={INVOICE_FORM_GRID_CLASS}>
        <InvoiceFormField label="Invoice No.">
          <InvoiceFormInput
            disabled
            className="bg-slate-50 text-slate-700 font-mono"
            value={isEdit ? invoiceNo : "Auto-generated"}
          />
        </InvoiceFormField>
        <InvoiceFormField label="Invoice Date">
          <InvoiceFormInput
            type="date"
            value={invoiceDate}
            onChange={(e) => onInvoiceDateChange(e.target.value)}
          />
        </InvoiceFormField>
        <InvoiceFormField label="Due Date">
          <InvoiceFormInput
            type="date"
            value={dueDate}
            disabled
            className="bg-slate-50 text-slate-700"
          />
          <p className="text-xs text-muted-foreground mt-0.5">
            Auto-calculated · Net {creditDays} days
          </p>
        </InvoiceFormField>

        <InvoiceFormReadOnly label="Sales Order No." value={salesOrderRef || "—"} mono />

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label className={INVOICE_FORM_LABEL_CLASS}>Dispatch No.</Label>
            {hasDispatch && (
              <button
                type="button"
                onClick={() => setDispatchInfoOpen(true)}
                className="flex items-center justify-center w-5 h-5 transition-colors rounded-full shadow-sm bg-brand-600 hover:bg-brand-700"
                title="View dispatch details"
              >
                <Info className="w-3 h-3 text-white" />
              </button>
            )}
          </div>
          <div
            className={cn(
              INVOICE_FORM_INPUT_CLASS,
              "h-9 px-3 flex items-center bg-slate-50 text-slate-700 font-mono text-sm",
            )}
          >
            {dispatchRef || "—"}
          </div>
        </div>

        <InvoiceFormReadOnly
          label="Dispatch Date"
          value={dispatchDate ? formatDisplayDate(dispatchDate) : "—"}
        />
      </div>

      {showDispatchSelect && customerId && !hasDispatch && (
        <SalesInvoiceDispatchSelect
          customerId={customerId}
          value={selectedDispatchId}
          onChange={onDispatchSelect}
        />
      )}

      <SalesInvoiceDispatchDetailsDialog
        dispatchId={sourceDispatchId}
        dispatchNo={dispatchRef}
        open={dispatchInfoOpen}
        onOpenChange={setDispatchInfoOpen}
      />
    </div>
  );
}
