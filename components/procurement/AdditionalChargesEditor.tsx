"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { IndianRupeeInput } from "@/components/ui/IndianRupeeInput";
import { cn } from "@/lib/utils";
import {
  ADDITIONAL_CHARGE_PRESETS,
  newAdditionalCharge,
  sumAdditionalCharges,
  type ProcurementAdditionalCharge,
} from "@/lib/procurement/procurement-line-utils";
import { formatCurrency } from "@/lib/procurement/utils";

const chargeNameOptions = ADDITIONAL_CHARGE_PRESETS.map((c) => ({ value: c, label: c }));
const inputCls = "h-8 rounded-lg text-xs";

export function AdditionalChargesEditor({
  charges,
  onChange,
  readOnly,
  productTotal,
  taxTotal,
  className,
}: {
  charges: ProcurementAdditionalCharge[];
  onChange: (charges: ProcurementAdditionalCharge[]) => void;
  readOnly?: boolean;
  productTotal: number;
  taxTotal: number;
  className?: string;
}) {
  const additionalTotal = sumAdditionalCharges(charges);
  const taxableAmount = productTotal + additionalTotal;
  const grandTotal = taxableAmount + taxTotal;

  const update = (uid: string, patch: Partial<ProcurementAdditionalCharge>) => {
    onChange(charges.map((c) => (c.uid === uid ? { ...c, ...patch } : c)));
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">Additional Charges</p>
          <p className="text-[11px] text-muted-foreground">Freight, transport, loading, and other charges</p>
        </div>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 rounded-lg text-[11px] font-semibold"
            onClick={() => onChange([...charges, newAdditionalCharge()])}
          >
            <Plus className="h-3.5 w-3.5" /> Add Charge
          </Button>
        )}
      </div>

      {charges.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          No additional charges
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full">
            <thead className="bg-muted/30">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Charge Name</th>
                <th className="w-36 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Amount</th>
                <th className="min-w-[140px] px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Remarks</th>
                {!readOnly && <th className="w-12 px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {charges.map((row) => (
                <tr key={row.uid}>
                  <td className="px-3 py-2">
                    <AutocompleteSelect
                      options={chargeNameOptions}
                      value={row.chargeName}
                      onChange={(v) => update(row.uid, { chargeName: String(v) })}
                      placeholder="Select charge"
                      disabled={readOnly}
                      className={inputCls}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <IndianRupeeInput
                      value={row.amount}
                      onChange={(n) => update(row.uid, { amount: n })}
                      disabled={readOnly}
                      className={inputCls}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.remarks ?? ""}
                      onChange={(e) => update(row.uid, { remarks: e.target.value })}
                      disabled={readOnly}
                      placeholder="Optional"
                      className={inputCls}
                    />
                  </td>
                  {!readOnly && (
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                        onClick={() => onChange(charges.filter((c) => c.uid !== row.uid))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg border border-border bg-muted/10 p-3 text-xs">
        <div className="flex justify-between py-1">
          <span className="text-muted-foreground">Product Total</span>
          <span className="font-medium tabular-nums">{formatCurrency(productTotal)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-muted-foreground">Additional Charges</span>
          <span className="font-medium tabular-nums">{formatCurrency(additionalTotal)}</span>
        </div>
        <div className="flex justify-between border-t border-border/60 py-1 pt-2 font-semibold">
          <span>Taxable Amount</span>
          <span className="tabular-nums">{formatCurrency(taxableAmount)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-muted-foreground">GST</span>
          <span className="font-medium tabular-nums">{formatCurrency(taxTotal)}</span>
        </div>
        <div className="flex justify-between border-t border-border/60 py-1 pt-2 text-sm font-bold text-brand-700">
          <span>Grand Total</span>
          <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
