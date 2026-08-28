"use client";

import { useCallback, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { VOUCHER_INPUT_CLASS } from "@/components/accounts/voucher-simple-form-ui";
import { InvoiceTableReadonly } from "@/app/(app)/accounts/invoices/components/invoice-form-voucher-ui";
import type { DirectPurchaseLineItem, ItcClassification, PurchaseNature } from "./purchase-invoices-data";
import {
  UQC_OPTIONS,
  emptyDirectLine,
  recalcDirectLine,
} from "./purchase-invoice-direct-utils";
import { DirectPurchaseTableSelect } from "./DirectPurchaseSelectField";
import { DirectPurchaseGstRateSelect } from "./DirectPurchaseGstRateSelect";
import { DirectPurchaseLineLedgerSelect } from "./DirectPurchaseLineLedgerSelect";
import type { AutocompleteOption } from "@/components/ui/AutocompleteSelect";
import type { HsnDropdownItem } from "@/services/hsn-list.service";

const UQC_SELECT_OPTIONS: AutocompleteOption[] = UQC_OPTIONS.map((u) => ({
  value: u,
  label: u,
}));

const TABLE_CELL = "p-1.5 align-middle";
const MONEY_CELL_CLASS = cn(VOUCHER_INPUT_CLASS, "text-xs text-right tabular-nums");
const NUM_CELL_CLASS = cn(
  VOUCHER_INPUT_CLASS,
  "text-xs text-right tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
);

function Th({
  children,
  className,
  align = "left",
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      className={cn(
        "px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function PurchaseInvoiceDirectLineTable({
  lines,
  onChange,
  interstate,
  purchaseNature,
  defaultItc,
  hsnOptions = [],
  readOnly,
  hideAddButton = false,
  onBindAddRow,
}: {
  lines: DirectPurchaseLineItem[];
  onChange: (lines: DirectPurchaseLineItem[]) => void;
  interstate: boolean;
  purchaseNature: PurchaseNature;
  defaultItc: ItcClassification;
  hsnOptions?: HsnDropdownItem[];
  readOnly?: boolean;
  hideAddButton?: boolean;
  onBindAddRow?: (addRow: () => void) => void;
}) {
  const updateLine = (idx: number, patch: Partial<DirectPurchaseLineItem>) => {
    onChange(
      lines.map((l, i) =>
        i === idx
          ? recalcDirectLine({ ...l, ...patch, purchaseNature }, interstate)
          : l,
      ),
    );
  };

  const addLine = useCallback(() => {
    const blank = recalcDirectLine(
      { ...emptyDirectLine(defaultItc), purchaseNature },
      interstate,
    );
    onChange([...lines, blank]);
  }, [defaultItc, interstate, lines, onChange, purchaseNature]);

  useEffect(() => {
    onBindAddRow?.(addLine);
  }, [addLine, onBindAddRow]);

  const removeLine = (idx: number) => {
    if (lines.length <= 1) return;
    onChange(lines.filter((_, i) => i !== idx));
  };

  return (
    <div className="so-goods-product-table-wrap overflow-x-auto">
      <table className="so-invoice-table text-xs w-max min-w-[1100px]">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[16%]" />
            <col className="w-[6%]" />
            <col className="w-[5%]" />
            <col className="w-[5%]" />
            <col className="w-[7%]" />
            <col className="w-[6%]" />
            <col className="w-[8%]" />
            <col className="w-[6%]" />
            <col className="w-[6%]" />
            <col className="w-[6%]" />
            <col className="w-[6%]" />
            <col className="w-[8%]" />
            {!readOnly && <col className="w-[3%]" />}
          </colgroup>
          <thead>
            <tr>
              <Th>Description / Particulars</Th>
              <Th>Ledger</Th>
              <Th>HSN / SAC</Th>
              <Th align="right">Qty</Th>
              <Th align="center">Unit</Th>
              <Th align="right">Rate</Th>
              <Th align="right">Discount</Th>
              <Th align="right">Taxable Amt</Th>
              <Th align="center">GST Rate</Th>
              <Th align="right">CGST</Th>
              <Th align="right">SGST</Th>
              <Th align="right">IGST</Th>
              <Th align="right">Line Total</Th>
              {!readOnly && <Th align="center" />}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr
                key={line.id}
                className="border-b border-border/60 hover:bg-muted/15 group transition-colors"
              >
                <td className={TABLE_CELL}>
                  <Input
                    className={cn(VOUCHER_INPUT_CLASS, "text-xs")}
                    value={line.description}
                    readOnly={readOnly}
                    onChange={(e) => updateLine(idx, { description: e.target.value })}
                    placeholder="Particulars…"
                  />
                </td>
                <td className={TABLE_CELL}>
                  <DirectPurchaseLineLedgerSelect
                    purchaseNature={purchaseNature}
                    value={line.expenseLedgerId}
                    fallbackLabel={line.expenseLedgerName}
                    disabled={readOnly}
                    onChange={(ledger) =>
                      updateLine(idx, {
                        expenseLedgerId: ledger.ledgerId,
                        expenseLedgerName: ledger.ledgerName,
                      })
                    }
                  />
                </td>
                <td className={TABLE_CELL}>
                  <DirectPurchaseTableSelect
                    value={purchaseNature === "service" ? line.sacId || "" : line.hsnId || ""}
                    disabled={readOnly}
                    onChange={(id) => {
                      const picked = hsnOptions.find((h) => h.id === id);
                      updateLine(idx, {
                        hsnId: purchaseNature === "service" ? null : id || null,
                        sacId: purchaseNature === "service" ? id || null : null,
                        hsnSac: picked?.hsnCode || "",
                        gstRate: picked?.gstPercentage ?? line.gstRate,
                      });
                    }}
                    options={hsnOptions.map((h) => ({
                      value: h.id,
                      label: h.hsnCode,
                      sublabel: h.hsnDescription,
                    }))}
                    placeholder={purchaseNature === "service" ? "SAC" : "HSN"}
                    searchPlaceholder={purchaseNature === "service" ? "Search SAC…" : "Search HSN…"}
                    popoverMinWidth={100}
                  />
                </td>
                <td className={TABLE_CELL}>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    className={NUM_CELL_CLASS}
                    value={line.quantity || ""}
                    readOnly={readOnly}
                    onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className={TABLE_CELL}>
                  <DirectPurchaseTableSelect
                    value={line.uqc}
                    disabled={readOnly}
                    onChange={(v) => updateLine(idx, { uqc: v })}
                    options={UQC_SELECT_OPTIONS}
                    placeholder="Unit"
                    searchPlaceholder="Search unit…"
                    popoverMinWidth={100}
                  />
                </td>
                <td className={TABLE_CELL}>
                  <AccountsMoneyInput
                    className={MONEY_CELL_CLASS}
                    value={line.rate}
                    disabled={readOnly}
                    onChange={(v) => updateLine(idx, { rate: v })}
                  />
                </td>
                <td className={TABLE_CELL}>
                  <AccountsMoneyInput
                    className={MONEY_CELL_CLASS}
                    value={line.discount}
                    disabled={readOnly}
                    onChange={(v) => updateLine(idx, { discount: v })}
                  />
                </td>
                <td className={TABLE_CELL}>
                  <InvoiceTableReadonly value={formatMoney(line.taxableAmount)} />
                </td>
                <td className={cn(TABLE_CELL, "relative z-0")}>
                  <DirectPurchaseGstRateSelect
                    value={line.gstRate}
                    disabled={readOnly}
                    onChange={(rate) => updateLine(idx, { gstRate: rate })}
                  />
                </td>
                <td className={TABLE_CELL}>
                  <InvoiceTableReadonly value={formatMoney(line.cgst)} muted />
                </td>
                <td className={TABLE_CELL}>
                  <InvoiceTableReadonly value={formatMoney(line.sgst)} muted />
                </td>
                <td className={TABLE_CELL}>
                  <InvoiceTableReadonly value={formatMoney(line.igst)} muted />
                </td>
                <td className={TABLE_CELL}>
                  <InvoiceTableReadonly value={formatMoney(line.lineTotal)} strong />
                </td>
                {!readOnly && (
                  <td className={cn(TABLE_CELL, "text-center")}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 opacity-50 group-hover:opacity-100"
                      disabled={lines.length <= 1}
                      onClick={() => removeLine(idx)}
                      aria-label="Delete row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      {!readOnly && !hideAddButton ? (
        <div className="border-t border-border/60 px-2 py-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2.5 gap-1"
            onClick={addLine}
          >
            <Plus className="w-3.5 h-3.5" /> Add Row
          </Button>
        </div>
      ) : null}
    </div>
  );
}
