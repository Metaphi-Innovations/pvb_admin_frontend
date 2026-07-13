"use client";

import { Fragment } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
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
import { DP_TABLE_INPUT_CLASS } from "./direct-purchase-form-ui";

const UQC_SELECT_OPTIONS: AutocompleteOption[] = UQC_OPTIONS.map((u) => ({
  value: u,
  label: u,
}));

const TABLE_CELL = "px-1.5 py-1 align-middle";
const MONEY_CELL_CLASS = cn(DP_TABLE_INPUT_CLASS, "text-right tabular-nums");
const NUM_CELL_CLASS = cn(
  DP_TABLE_INPUT_CLASS,
  "text-right tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
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
        "px-2 py-2.5 text-xs font-semibold text-foreground whitespace-nowrap bg-muted/40 sticky top-0 z-10 border-b border-border",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </th>
  );
}

function AmountCell({ value, bold }: { value: string; bold?: boolean }) {
  return (
    <div
      className={cn(
        "h-8 flex items-center justify-end px-2 rounded-lg bg-muted/20 border border-border/40 tabular-nums text-[13px]",
        bold ? "font-semibold text-foreground" : "text-muted-foreground",
      )}
    >
      {value}
    </div>
  );
}

function lineTaxTotal(line: DirectPurchaseLineItem): number {
  return line.cgst + line.sgst + line.igst;
}

function TaxBreakupRow({
  line,
  interstate,
  colSpanBefore,
  colSpanAmounts,
  hasAction,
}: {
  line: DirectPurchaseLineItem;
  interstate: boolean;
  colSpanBefore: number;
  colSpanAmounts: number;
  hasAction: boolean;
}) {
  const taxTotal = lineTaxTotal(line);
  if (taxTotal <= 0 && line.gstRate <= 0) return null;

  return (
    <tr className="border-b border-border/50 bg-muted/10">
      <td colSpan={colSpanBefore} className="py-0" />
      <td colSpan={colSpanAmounts} className="px-2 pb-1.5 pt-0 align-top">
        <div className="flex flex-col items-end gap-0.5 text-[11px] text-muted-foreground tabular-nums">
          {interstate ? (
            <span>
              IGST <span className="font-medium text-foreground">{formatMoney(line.igst)}</span>
            </span>
          ) : (
            <>
              <span>
                CGST <span className="font-medium text-foreground">{formatMoney(line.cgst)}</span>
              </span>
              <span>
                SGST <span className="font-medium text-foreground">{formatMoney(line.sgst)}</span>
              </span>
            </>
          )}
        </div>
      </td>
      {hasAction && <td className="py-0" />}
    </tr>
  );
}

export function PurchaseInvoiceDirectLineTable({
  lines,
  onChange,
  interstate,
  purchaseNature,
  defaultItc,
  coaRecords,
  readOnly,
}: {
  lines: DirectPurchaseLineItem[];
  onChange: (lines: DirectPurchaseLineItem[]) => void;
  interstate: boolean;
  purchaseNature: PurchaseNature;
  defaultItc: ItcClassification;
  coaRecords: ChartOfAccount[];
  readOnly?: boolean;
}) {
  const colSpanBefore = 7;
  const colSpanAmounts = 3;

  const updateLine = (idx: number, patch: Partial<DirectPurchaseLineItem>) => {
    onChange(
      lines.map((l, i) =>
        i === idx
          ? recalcDirectLine({ ...l, ...patch, purchaseNature }, interstate)
          : l,
      ),
    );
  };

  const addLine = () => {
    const blank = recalcDirectLine(
      { ...emptyDirectLine(defaultItc), purchaseNature },
      interstate,
    );
    onChange([...lines, blank]);
  };

  const removeLine = (idx: number) => {
    if (lines.length <= 1) return;
    onChange(lines.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-[13px] min-w-[920px] border-collapse">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[20%]" />
            <col className="w-[7%]" />
            <col className="w-[5%]" />
            <col className="w-[6%]" />
            <col className="w-[8%]" />
            <col className="w-[7%]" />
            <col className="w-[9%]" />
            <col className="w-[8%]" />
            <col className="w-[9%]" />
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
              <Th align="right">Line Total</Th>
              {!readOnly && <Th align="center" />}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <Fragment key={line.id}>
                <tr className="border-b border-border/60 hover:bg-muted/15 group transition-colors">
                  <td className={TABLE_CELL}>
                    <Input
                      className={DP_TABLE_INPUT_CLASS}
                      value={line.description}
                      readOnly={readOnly}
                      onChange={(e) => updateLine(idx, { description: e.target.value })}
                      placeholder="Particulars…"
                    />
                  </td>
                  <td className={TABLE_CELL}>
                    <DirectPurchaseLineLedgerSelect
                      purchaseNature={purchaseNature}
                      coaRecords={coaRecords}
                      value={line.expenseLedgerId}
                      fallbackLabel={line.expenseLedgerName}
                      disabled={readOnly}
                      onChange={(ledger) =>
                        updateLine(idx, {
                          expenseLedgerId: ledger.id,
                          expenseLedgerName: ledger.accountName,
                        })
                      }
                    />
                  </td>
                  <td className={TABLE_CELL}>
                    <Input
                      className={cn(DP_TABLE_INPUT_CLASS, "font-mono text-center")}
                      value={line.hsnSac}
                      readOnly={readOnly}
                      onChange={(e) => updateLine(idx, { hsnSac: e.target.value })}
                      placeholder="HSN"
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
                    <AmountCell value={formatMoney(line.taxableAmount)} bold />
                  </td>
                  <td className={cn(TABLE_CELL, "relative z-0")}>
                    <DirectPurchaseGstRateSelect
                      value={line.gstRate}
                      disabled={readOnly}
                      onChange={(rate) => updateLine(idx, { gstRate: rate })}
                    />
                  </td>
                  <td className={TABLE_CELL}>
                    <AmountCell value={formatMoney(line.lineTotal)} bold />
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
                <TaxBreakupRow
                  line={line}
                  interstate={interstate}
                  colSpanBefore={colSpanBefore}
                  colSpanAmounts={colSpanAmounts}
                  hasAction={!readOnly}
                />
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
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
      )}
    </div>
  );
}
