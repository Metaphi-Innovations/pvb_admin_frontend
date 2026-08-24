"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VOUCHER_INPUT_CLASS,
  VOUCHER_MONEY_INPUT_CLASS,
} from "@/components/accounts/voucher-simple-form-ui";
import {
  RECEIPT_ADJUSTMENT_TYPE_LABELS,
  type ReceiptAdjustmentType,
} from "@/types/receipt-voucher.types";
import { ReceiptSearchableSelect } from "./ReceiptSearchableSelect";
import {
  createEmptyAdjustment,
  type ReceiptUiAdjustment,
} from "../receipt-voucher-utils";
import { cn } from "@/lib/utils";

const ADJUSTMENT_TYPES: ReceiptAdjustmentType[] = [
  "CUSTOMER_TDS",
  "DISCOUNT_ALLOWED",
  "BANK_CHARGES",
  "OTHER",
  "ROUND_OFF",
];

const AMOUNT_INPUT = cn(
  VOUCHER_INPUT_CLASS,
  VOUCHER_MONEY_INPUT_CLASS,
  "h-9 w-[160px] max-w-full",
);

export function ReceiptAdjustmentsEditor({
  rows,
  ledgerOptions,
  readOnly,
  onChange,
}: {
  rows: ReceiptUiAdjustment[];
  ledgerOptions: { value: string; label: string; sub?: string }[];
  readOnly?: boolean;
  onChange: (rows: ReceiptUiAdjustment[]) => void;
}) {
  const update = (id: string, patch: Partial<ReceiptUiAdjustment>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  return (
    <div className="space-y-2.5">
      {rows.map((row) => {
        const needsLedger =
          row.adjustment_type === "DISCOUNT_ALLOWED" ||
          row.adjustment_type === "BANK_CHARGES" ||
          row.adjustment_type === "OTHER";
        const showDrCr =
          row.adjustment_type === "OTHER" || row.adjustment_type === "ROUND_OFF";
        const hideLedgerPicker =
          row.adjustment_type === "CUSTOMER_TDS" ||
          row.adjustment_type === "ROUND_OFF";

        return (
          <div
            key={row.id}
            className="rounded-lg border border-border bg-muted/10 p-2.5 space-y-2"
          >
            <div
              className={cn(
                "grid gap-2 items-end",
                "grid-cols-1",
                "md:grid-cols-[minmax(140px,0.9fr)_minmax(200px,1.6fr)_110px_160px_36px]",
              )}
            >
              <div className="space-y-1 min-w-0">
                <Label className="text-xs font-medium">Adjustment Type</Label>
                <Select
                  value={row.adjustment_type}
                  disabled={readOnly}
                  onValueChange={(v) => {
                    const type = v as ReceiptAdjustmentType;
                    update(row.id, {
                      adjustment_type: type,
                      entry_type: "DEBIT",
                      ledger_id:
                        type === "CUSTOMER_TDS" || type === "ROUND_OFF"
                          ? ""
                          : row.ledger_id,
                      ledger_name:
                        type === "CUSTOMER_TDS" || type === "ROUND_OFF"
                          ? ""
                          : row.ledger_name,
                    });
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADJUSTMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-sm">
                        {RECEIPT_ADJUSTMENT_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0">
                {!hideLedgerPicker && needsLedger ? (
                  <ReceiptSearchableSelect
                    label="Ledger"
                    required
                    disabled={readOnly}
                    value={row.ledger_id}
                    options={ledgerOptions}
                    placeholder="Select ledger…"
                    onChange={(id) => {
                      const opt = ledgerOptions.find((o) => o.value === id);
                      update(row.id, {
                        ledger_id: id,
                        ledger_name: opt?.label || "",
                      });
                    }}
                  />
                ) : (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Ledger</Label>
                    <p className="h-9 flex items-center text-xs text-muted-foreground">
                      {row.adjustment_type === "CUSTOMER_TDS"
                        ? "System TDS receivable (backend)"
                        : row.adjustment_type === "ROUND_OFF"
                          ? "System Round Off (backend)"
                          : "—"}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1 w-full max-w-[110px]">
                <Label className="text-xs font-medium">Dr / Cr</Label>
                {showDrCr ? (
                  <Select
                    value={row.entry_type}
                    disabled={readOnly}
                    onValueChange={(v) =>
                      update(row.id, {
                        entry_type: v as "DEBIT" | "CREDIT",
                      })
                    }
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEBIT">Debit</SelectItem>
                      <SelectItem value="CREDIT">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="h-9 flex items-center text-xs text-muted-foreground">
                    Debit
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Amount</Label>
                <Input
                  className={AMOUNT_INPUT}
                  value={row.amount}
                  disabled={readOnly}
                  onChange={(e) => update(row.id, { amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="flex items-end justify-end pb-0.5">
                {!readOnly ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-red-600"
                    onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <span className="w-9" />
                )}
              </div>
            </div>

            <div className="space-y-1 max-w-xl">
              <Label className="text-xs font-medium">Narration</Label>
              <Input
                className="h-9 text-sm"
                value={row.narration}
                disabled={readOnly}
                onChange={(e) => update(row.id, { narration: e.target.value })}
                placeholder="Optional…"
              />
            </div>
          </div>
        );
      })}

      {!readOnly ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => onChange([...rows, createEmptyAdjustment("OTHER")])}
        >
          <Plus className="w-3.5 h-3.5" /> Add Adjustment
        </Button>
      ) : null}
    </div>
  );
}
