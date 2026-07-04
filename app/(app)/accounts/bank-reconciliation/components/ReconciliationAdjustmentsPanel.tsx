"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import { formatMoney } from "@/lib/accounts/money-format";
import {
  adjustmentTypesForDirection,
  ledgerFilterForAdjustmentType,
  resolveDefaultLedgerForAdjustmentType,
  type BankReconAdjustmentRow,
} from "@/lib/accounts/bank-recon-adjustments";
import type { ReconciliationBreakdown } from "@/lib/accounts/bank-recon-matching";

export function ReconciliationAdjustmentsPanel({
  direction,
  adjustments,
  breakdown,
  onChange,
}: {
  direction: "receipt" | "payment";
  adjustments: BankReconAdjustmentRow[];
  breakdown: ReconciliationBreakdown;
  onChange: (rows: BankReconAdjustmentRow[]) => void;
}) {
  const types = adjustmentTypesForDirection(direction);
  const showPanel =
    breakdown.documentShortfall > 0.01 ||
    breakdown.bankUnaccounted > 0.01 ||
    adjustments.length > 0;

  if (!showPanel) return null;

  const addRow = () => {
    const suggestedType =
      breakdown.documentShortfall > 0.01
        ? types.find((t) => t.resolvesDocumentShortfall)
        : types.find((t) => t.absorbsBankSurplus);
    const typeId = suggestedType?.id ?? types[0]?.id ?? "other_deduction";
    const defaultLedger = resolveDefaultLedgerForAdjustmentType(typeId);
    const suggestedAmount =
      breakdown.documentShortfall > 0.01
        ? breakdown.documentShortfall - breakdown.shortfallAdjustments
        : breakdown.bankUnaccounted;

    onChange([
      ...adjustments,
      {
        id: `adj-${Date.now()}`,
        adjustmentTypeId: typeId,
        ledgerId: defaultLedger?.id ?? null,
        ledgerName: defaultLedger?.accountName ?? "",
        amount: Math.max(0, Math.round(suggestedAmount * 100) / 100),
      },
    ]);
  };

  const updateRow = (id: string, patch: Partial<BankReconAdjustmentRow>) => {
    onChange(
      adjustments.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        if (patch.adjustmentTypeId && patch.adjustmentTypeId !== row.adjustmentTypeId) {
          const ledger = resolveDefaultLedgerForAdjustmentType(patch.adjustmentTypeId);
          next.ledgerId = ledger?.id ?? null;
          next.ledgerName = ledger?.accountName ?? "";
        }
        return next;
      }),
    );
  };

  const removeRow = (id: string) => {
    onChange(adjustments.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-3 rounded-lg border border-amber-200/80 bg-amber-50/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-foreground">Adjustments</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Map GST/TDS, discounts, advances, or other differences before reconciliation.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-7 text-sm" onClick={addRow}>
          <Plus className="w-3 h-3 mr-1" />
          Add
        </Button>
      </div>

      {(breakdown.documentShortfall > 0.01 || breakdown.bankUnaccounted > 0.01) && (
        <div className="text-xs space-y-1 text-muted-foreground">
          {breakdown.documentShortfall > 0.01 && (
            <p>
              Document shortfall:{" "}
              <span className="font-semibold text-amber-800 tabular-nums">
                {formatMoney(breakdown.documentShortfall)}
              </span>
            </p>
          )}
          {breakdown.bankUnaccounted > 0.01 && (
            <p>
              Unaccounted bank amount:{" "}
              <span className="font-semibold text-amber-800 tabular-nums">
                {formatMoney(breakdown.bankUnaccounted)}
              </span>
            </p>
          )}
        </div>
      )}

      {adjustments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          Add an adjustment row to map the remaining difference.
        </p>
      ) : (
        <div className="space-y-2">
          {adjustments.map((row) => (
            <div key={row.id} className="rounded-md border border-border/60 bg-white p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs uppercase text-muted-foreground">Adjustment Type</Label>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-red-600"
                  onClick={() => removeRow(row.id)}
                  aria-label="Remove adjustment"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <Select
                value={row.adjustmentTypeId}
                onValueChange={(v) => updateRow(row.id, { adjustmentTypeId: v })}
              >
                <SelectTrigger className="h-9 text-sm font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <GroupedLedgerSelect
                label="Adjustment Ledger"
                required
                value={row.ledgerId}
                onChange={(ledger) =>
                  updateRow(row.id, { ledgerId: ledger.id, ledgerName: ledger.accountName })
                }
                ledgerFilter={ledgerFilterForAdjustmentType(row.adjustmentTypeId)}
                placeholder="Select ledger"
                contentClassName="w-[min(320px,calc(100vw-3rem))]"
              />

              <div className="space-y-1">
                <Label className="text-xs">Amount</Label>
                <AccountsMoneyInput
                  className="h-9 text-sm font-medium tabular-nums"
                  value={row.amount || ""}
                  onChange={(v) => updateRow(row.id, { amount: v })}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-md border border-border/50 bg-white/80 p-2.5 text-xs space-y-1">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Total accounted</span>
          <span className="font-semibold tabular-nums">{formatMoney(breakdown.totalAccounted)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Bank amount</span>
          <span className="font-medium tabular-nums">{formatMoney(breakdown.bankAmount)}</span>
        </div>
      </div>
    </div>
  );
}
