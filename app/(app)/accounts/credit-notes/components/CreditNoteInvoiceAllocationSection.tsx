"use client";

import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import {
  VoucherNoteField,
  VoucherNoteFieldGrid,
  VoucherNoteReadOnly,
} from "@/components/accounts/voucher-form/VoucherNoteFieldGrid";
import { SearchableSelect } from "./SearchableSelect";
import type { DirectCnMode, InvoiceOption } from "../credit-note-form-types";
import { formatCnMoney } from "../credit-note-form-utils";

export function CreditNoteInvoiceAllocationSection({
  visible,
  mode,
  onModeChange,
  invoices,
  invoiceId,
  onInvoiceChange,
  selected,
  allocation,
  onAllocationChange,
  cnAmount,
  disabled,
}: {
  visible: boolean;
  mode: DirectCnMode;
  onModeChange: (mode: DirectCnMode) => void;
  invoices: InvoiceOption[];
  invoiceId: string;
  onInvoiceChange: (id: string) => void;
  selected: InvoiceOption | null;
  allocation: string;
  onAllocationChange: (value: string) => void;
  cnAmount: number;
  disabled?: boolean;
}) {
  if (!visible) return null;

  const allocNum = Number(allocation) || 0;
  const outstanding = selected?.outstanding_amount ?? selected?.invoice_amount ?? null;

  return (
    <VoucherFormSectionCard title="Invoice Allocation" compact>
      <VoucherNoteFieldGrid columns={4}>
        <VoucherNoteField label="Direct mode" width="md">
          <div className="cnz-gst-toggle">
            <button
              type="button"
              data-active={mode === "on_account"}
              disabled={disabled}
              onClick={() => onModeChange("on_account")}
            >
              On-account
            </button>
            <button
              type="button"
              data-active={mode === "against_invoice"}
              disabled={disabled}
              onClick={() => onModeChange("against_invoice")}
            >
              Against Sales Invoice
            </button>
          </div>
        </VoucherNoteField>
        {mode === "against_invoice" ? (
          <>
            <VoucherNoteField label="Sales Invoice" required width="lg">
              <SearchableSelect
                value={invoiceId}
                onChange={onInvoiceChange}
                options={invoices.map((inv) => ({
                  value: inv.sales_invoice_id,
                  label: inv.invoice_number,
                  sub: `${inv.invoice_date} · ${formatCnMoney(inv.invoice_amount)}`,
                }))}
                placeholder="Select invoice…"
                disabled={disabled}
                required
              />
            </VoucherNoteField>
            <VoucherNoteField label="Invoice Date" width="sm">
              <VoucherNoteReadOnly>{selected?.invoice_date || "—"}</VoucherNoteReadOnly>
            </VoucherNoteField>
            <VoucherNoteField label="Invoice Amount" width="sm">
              <VoucherNoteReadOnly>
                {selected ? formatCnMoney(selected.invoice_amount) : "—"}
              </VoucherNoteReadOnly>
            </VoucherNoteField>
            <VoucherNoteField label="Outstanding" width="sm">
              <VoucherNoteReadOnly>
                {outstanding != null ? formatCnMoney(outstanding) : "Not returned by API"}
              </VoucherNoteReadOnly>
            </VoucherNoteField>
            <VoucherNoteField label="Allocation Amount" width="md">
              <AccountsMoneyInput
                className="h-7 text-xs"
                value={allocation}
                onChange={(v) => onAllocationChange(String(v))}
                disabled={disabled || !invoiceId}
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Leave blank for reference-only (no settlement). A value &gt; 0 settles the invoice.
                Backend requires allocation to equal the full CN amount when settling.
              </p>
            </VoucherNoteField>
            {allocNum > 0 && cnAmount > 0 && Math.abs(allocNum - cnAmount) > 0.009 ? (
              <VoucherNoteField label="Allocation check" width="lg">
                <p className="text-[11px] text-amber-700">
                  Allocation {formatCnMoney(allocNum)} does not match CN total {formatCnMoney(cnAmount)}.
                  Partial allocation is not supported by the backend.
                </p>
              </VoucherNoteField>
            ) : null}
          </>
        ) : (
          <VoucherNoteField label="Settlement" width="lg">
            <VoucherNoteReadOnly>
              On-account — no invoice settlement unless an allocation is supplied later.
            </VoucherNoteReadOnly>
          </VoucherNoteField>
        )}
      </VoucherNoteFieldGrid>
    </VoucherFormSectionCard>
  );
}
