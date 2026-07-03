"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { IndianRupeeInput } from "@/components/ui/IndianRupeeInput";
import { cn } from "@/lib/utils";
import {
  calcAdditionalChargeTax,
  migrateAdditionalCharge,
  newAdditionalCharge,
  sumAdditionalCharges,
  type ProcurementAdditionalCharge,
} from "@/lib/procurement/procurement-line-utils";
import {
  formatCurrency,
  type TaxSupplyType,
} from "@/lib/procurement/utils";
import {
  applyGstMasterToTaxRates,
  findGstMasterIdByTotalPct,
  getActiveGstMasterOptions,
  getDefaultGstMasterId,
  totalGstPctFromRates,
} from "@/lib/procurement/gst-master-utils";

const inputCls = "h-8 rounded-lg text-xs";

function TaxPctAmountCell({ pct, amount }: { pct: number; amount: number }) {
  return (
    <div className="space-y-0.5 text-right">
      <p className="text-xs tabular-nums text-foreground">{pct}%</p>
      <p className="text-[10px] tabular-nums font-medium text-muted-foreground">{formatCurrency(amount)}</p>
    </div>
  );
}

export function ProcurementTotalSummary({
  productTotal,
  additionalCharges = [],
  taxTotal,
  taxSupplyType = "intra",
  totalCgst,
  totalSgst,
  totalIgst,
  className,
}: {
  productTotal: number;
  additionalCharges?: ProcurementAdditionalCharge[];
  taxTotal: number;
  taxSupplyType?: TaxSupplyType;
  totalCgst?: number;
  totalSgst?: number;
  totalIgst?: number;
  className?: string;
}) {
  const additionalTotal = sumAdditionalCharges(additionalCharges);
  const taxableAmount = productTotal + additionalTotal;
  const grandTotal = taxableAmount + taxTotal;
  const cgst = totalCgst ?? 0;
  const sgst = totalSgst ?? 0;
  const igst = totalIgst ?? 0;

  return (
    <div
      className={cn(
        "w-full rounded-lg border border-border bg-muted/10 p-3 text-xs lg:sticky lg:top-4",
        className,
      )}
    >
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Total Summary
      </p>
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
      {taxSupplyType === "intra" ? (
        <>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">CGST</span>
            <span className="font-medium tabular-nums">{formatCurrency(cgst)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">SGST</span>
            <span className="font-medium tabular-nums">{formatCurrency(sgst)}</span>
          </div>
        </>
      ) : (
        <div className="flex justify-between py-1">
          <span className="text-muted-foreground">IGST</span>
          <span className="font-medium tabular-nums">{formatCurrency(igst)}</span>
        </div>
      )}
      <div className="flex justify-between border-t border-border/60 py-1 pt-2 text-sm font-bold text-brand-700">
        <span>Grand Total</span>
        <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
      </div>
    </div>
  );
}

export function AdditionalChargesEditor({
  charges,
  onChange,
  readOnly,
  taxSupplyType = "intra",
  className,
}: {
  charges: ProcurementAdditionalCharge[];
  onChange: (charges: ProcurementAdditionalCharge[]) => void;
  readOnly?: boolean;
  taxSupplyType?: TaxSupplyType;
  className?: string;
}) {
  const gstOptions = React.useMemo(() => getActiveGstMasterOptions(), []);

  const update = (uid: string, patch: Partial<ProcurementAdditionalCharge>) => {
    onChange(charges.map((c) => (c.uid === uid ? { ...c, ...patch } : c)));
  };

  const updateGstMaster = (uid: string, gstMasterId: number) => {
    const rates = applyGstMasterToTaxRates(gstMasterId, taxSupplyType);
    update(uid, rates);
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
            onClick={() => onChange([...charges, newAdditionalCharge(undefined, taxSupplyType)])}
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
                <th className="min-w-[140px] px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">
                  Charge Name
                </th>
                <th className="w-32 px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground">Amount</th>
                <th className="w-16 px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground">GST %</th>
                {taxSupplyType === "intra" ? (
                  <>
                    <th className="w-24 px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground">CGST</th>
                    <th className="w-24 px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground">SGST</th>
                  </>
                ) : (
                  <th className="w-24 px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground">IGST</th>
                )}
                <th className="w-28 px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground">Total</th>
                <th className="min-w-[120px] px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Remarks</th>
                {!readOnly && <th className="w-12 px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {charges.map((row) => {
                const migrated = migrateAdditionalCharge(row);
                const tax = calcAdditionalChargeTax(migrated);
                const gstPct = totalGstPctFromRates(
                  migrated.cgstPct,
                  migrated.sgstPct,
                  migrated.igstPct,
                );
                const gstMasterId =
                  migrated.gstMasterId ??
                  findGstMasterIdByTotalPct(gstPct) ??
                  getDefaultGstMasterId();

                return (
                  <tr key={row.uid} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2">
                      {readOnly ? (
                        <span className="text-xs text-foreground">{row.chargeName || "—"}</span>
                      ) : (
                        <Input
                          value={row.chargeName}
                          onChange={(e) => update(row.uid, { chargeName: e.target.value })}
                          placeholder="e.g. Freight Charges"
                          className={inputCls}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <IndianRupeeInput
                        value={row.amount}
                        onChange={(n) => update(row.uid, { amount: n })}
                        disabled={readOnly}
                        className={cn(inputCls, "ml-auto")}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {readOnly ? (
                        <span className="text-xs tabular-nums">{gstPct}%</span>
                      ) : (
                        <AutocompleteSelect
                          options={gstOptions}
                          value={String(gstMasterId)}
                          onChange={(v) => updateGstMaster(row.uid, Number(v))}
                          placeholder="Select GST…"
                          className={cn(inputCls, "ml-auto min-w-[88px]")}
                        />
                      )}
                    </td>
                    {taxSupplyType === "intra" ? (
                      <>
                        <td className="px-3 py-2 align-top">
                          <TaxPctAmountCell pct={migrated.cgstPct} amount={tax.cgstAmount} />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <TaxPctAmountCell pct={migrated.sgstPct} amount={tax.sgstAmount} />
                        </td>
                      </>
                    ) : (
                      <td className="px-3 py-2 align-top">
                        <TaxPctAmountCell pct={migrated.igstPct} amount={tax.igstAmount} />
                      </td>
                    )}
                    <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums font-mono text-foreground">
                      {formatCurrency(tax.netAmount)}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
