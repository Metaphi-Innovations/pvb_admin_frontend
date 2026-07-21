"use client";

import { memo, useState } from "react";
import { Info } from "lucide-react";
import {
  InvoiceFormField,
  InvoiceFormInput,
  InvoiceFormReadOnly,
  INVOICE_FORM_GRID_CLASS,
  INVOICE_FORM_INPUT_CLASS,
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
  previewInvoiceNo?: string;
  compactGrid?: boolean;
  invoiceDateRequired?: boolean;
  goodsGenerateCompact?: boolean;
  bankAccountSlot?: React.ReactNode;
  /** Optional helper under Bank Account (kept in reserved helper row for alignment). */
  bankAccountHelper?: string;
  /** Read-only ERP context for the compact Dispatch Details popup (Goods only). */
  dispatchContext?: {
    salesOrderNo?: string;
    salesOrderDate?: string;
    placeOfSupply?: string;
    billFrom?: string;
    billTo?: string;
    shipTo?: string;
    warehouse?: string;
    dispatchQty?: number;
    qtyUnit?: string;
  };
  /** @deprecated Goods narration is placed after Additional Charges. */
  narrationSlot?: React.ReactNode;
}

function SalesInvoiceDocumentInfoSectionInner({
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
  previewInvoiceNo,
  compactGrid = false,
  invoiceDateRequired = false,
  goodsGenerateCompact = false,
  bankAccountSlot,
  bankAccountHelper,
  dispatchContext,
}: SalesInvoiceDocumentInfoSectionProps) {
  const [dispatchInfoOpen, setDispatchInfoOpen] = useState(false);
  const hasDispatch = Boolean(sourceDispatchId || dispatchRef);
  const displayInvoiceNo = isEdit
    ? invoiceNo
    : previewInvoiceNo?.trim() || "Auto-generated";

  if (goodsGenerateCompact) {
    return (
      <div className="space-y-2">
        <div className="so-goods-field-grid">
          <div className="so-goods-field so-w-inv-no">
            <p className="so-goods-field__label">Invoice No.</p>
            <div className="so-goods-field__control">
              <div className="so-goods-ro so-goods-ro--mono w-full">{displayInvoiceNo}</div>
            </div>
            <p className="so-goods-field__helper">&nbsp;</p>
          </div>

          <div className="so-goods-field so-w-date">
            <p className="so-goods-field__label">
              Invoice Date{invoiceDateRequired ? <span className="text-red-500 ml-0.5">*</span> : null}
            </p>
            <div className="so-goods-field__control">
              <InvoiceFormInput
                type="date"
                className="h-8 w-full"
                value={invoiceDate}
                onChange={(e) => onInvoiceDateChange(e.target.value)}
                required={invoiceDateRequired}
              />
            </div>
            <p className="so-goods-field__helper">&nbsp;</p>
          </div>

          <div className="so-goods-field so-w-date">
            <p className="so-goods-field__label">Due Date</p>
            <div className="so-goods-field__control">
              <InvoiceFormInput
                type="date"
                value={dueDate}
                disabled
                className="h-8 w-full bg-slate-50 text-slate-700"
              />
            </div>
            <p className="so-goods-field__helper">Net {creditDays} days</p>
          </div>

          <div className="so-goods-field so-w-so">
            <p className="so-goods-field__label">Sales Order No.</p>
            <div className="so-goods-field__control">
              <div className="so-goods-ro so-goods-ro--mono w-full">{salesOrderRef || "—"}</div>
            </div>
            <p className="so-goods-field__helper">&nbsp;</p>
          </div>

          <div className="so-goods-field so-w-dispatch">
            <p className="so-goods-field__label">Dispatch No.</p>
            <div className="so-goods-field__control">
              <div className="so-goods-ro-with-info">
                <span className="so-goods-ro-with-info__value so-goods-ro-with-info__value--mono">
                  {dispatchRef || "—"}
                </span>
                {hasDispatch ? (
                  <button
                    type="button"
                    onClick={() => setDispatchInfoOpen(true)}
                    className="so-goods-info-btn"
                    title="View dispatch details"
                    aria-label="Dispatch details"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
            <p className="so-goods-field__helper">&nbsp;</p>
          </div>

          {bankAccountSlot ? (
            <div className="so-goods-field so-w-bank">
              <p className="so-goods-field__label">
                Bank Account<span className="text-red-500 ml-0.5">*</span>
              </p>
              <div className="so-goods-field__control min-w-0 w-full">
                {bankAccountSlot}
              </div>
              <p className="so-goods-field__helper" title={bankAccountHelper || undefined}>
                {bankAccountHelper?.trim() || "\u00a0"}
              </p>
            </div>
          ) : null}
        </div>

        <SalesInvoiceDispatchDetailsDialog
          dispatchId={sourceDispatchId}
          dispatchNo={dispatchRef}
          open={dispatchInfoOpen}
          onOpenChange={setDispatchInfoOpen}
          goodsInvoiceFields
          context={dispatchContext}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={compactGrid ? "so-inv-grid" : INVOICE_FORM_GRID_CLASS}>
        <InvoiceFormField label="Invoice No.">
          <InvoiceFormInput
            disabled
            className="bg-slate-50 text-slate-700 font-mono"
            value={displayInvoiceNo}
          />
        </InvoiceFormField>
        <InvoiceFormField label="Invoice Date" required={invoiceDateRequired}>
          <InvoiceFormInput
            type="date"
            value={invoiceDate}
            onChange={(e) => onInvoiceDateChange(e.target.value)}
            required={invoiceDateRequired}
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

        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium">Dispatch No.</p>
            {hasDispatch && (
              <button
                type="button"
                onClick={() => setDispatchInfoOpen(true)}
                className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted hover:text-brand-700"
                title="View dispatch details"
                aria-label="Dispatch details"
              >
                <Info className="w-3 h-3" />
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

export const SalesInvoiceDocumentInfoSection = memo(SalesInvoiceDocumentInfoSectionInner);
