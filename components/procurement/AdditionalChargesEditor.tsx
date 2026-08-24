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
  applyTaxSupplyToRates,
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
import { useGstDropdown } from "@/hooks/masters/use-gst";
import { useAdditionalChargeDropdown } from "@/hooks/masters/use-additional-charge";
import type { AdditionalChargeDropdownItem } from "@/services/additional-charge.service";

type GstSelectOption = {
  value: string;
  label: string;
  sublabel?: string;
  gstPercentage: number;
};

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

function resolveChargeGst(
  charge: AdditionalChargeDropdownItem,
  taxSupplyType: TaxSupplyType,
  gstOptions: GstSelectOption[],
): Pick<ProcurementAdditionalCharge, "gstId" | "gstMasterId" | "cgstPct" | "sgstPct" | "igstPct"> {
  const gstPct = charge.gst_applicable ? Number(charge.default_gst_rate) || 0 : 0;
  const rates = applyTaxSupplyToRates(gstPct, taxSupplyType);
  const gstIdFromMaster =
    charge.default_gst_rate_id &&
    gstOptions.some((o) => o.value === charge.default_gst_rate_id)
      ? charge.default_gst_rate_id
      : undefined;
  const gstId =
    gstIdFromMaster ??
    gstOptions.find((o) => Math.abs(o.gstPercentage - gstPct) < 0.001)?.value ??
    gstOptions.find((o) => o.gstPercentage === 0)?.value ??
    "";
  const gstMasterId =
    findGstMasterIdByTotalPct(gstPct) ?? getDefaultGstMasterId();
  return {
    gstId: gstId || undefined,
    gstMasterId,
    ...rates,
  };
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
  const gstDropdownQuery = useGstDropdown();
  const chargeDropdownQuery = useAdditionalChargeDropdown();

  const gstOptions = React.useMemo((): GstSelectOption[] => {
    const fromApi = (gstDropdownQuery.data ?? [])
      .map((g) => ({
        value: g.id,
        label: `${g.gstPercentage}%`,
        sublabel: g.remark || undefined,
        gstPercentage: g.gstPercentage,
      }))
      .sort((a, b) => a.gstPercentage - b.gstPercentage);
    if (fromApi.length > 0) return fromApi;

    return getActiveGstMasterOptions().map((g) => {
      const gstMaster = applyGstMasterToTaxRates(Number(g.value), "intra");
      const gstPercentage = totalGstPctFromRates(
        gstMaster.cgstPct,
        gstMaster.sgstPct,
        gstMaster.igstPct,
      );
      return {
        value: g.value,
        label: g.label,
        sublabel: g.sublabel,
        gstPercentage,
      };
    });
  }, [gstDropdownQuery.data]);

  const chargeOptions = React.useMemo(() => {
    return (chargeDropdownQuery.data ?? []).map((c) => {
      const isAlreadyAdded = charges.some(
        (row) =>
          row.chargeMasterId === c.additional_charge_id ||
          (!row.chargeMasterId &&
            row.chargeName.trim().toLowerCase() === c.charge_name.trim().toLowerCase()),
      );
      const gstLabel = c.gst_applicable
        ? `GST ${Number(c.default_gst_rate) || 0}%`
        : "No GST";
      return {
        value: c.additional_charge_id,
        label: c.charge_name,
        sublabel: isAlreadyAdded
          ? "Already added"
          : [c.charge_code, gstLabel].filter(Boolean).join(" · "),
        disabled: isAlreadyAdded,
        searchText: `${c.charge_code} ${c.description ?? ""}`,
      };
    });
  }, [chargeDropdownQuery.data, charges]);

  const update = (uid: string, patch: Partial<ProcurementAdditionalCharge>) => {
    onChange(charges.map((c) => (c.uid === uid ? { ...c, ...patch } : c)));
  };

  const selectChargeFromMaster = (uid: string, chargeMasterId: string) => {
    const master = (chargeDropdownQuery.data ?? []).find(
      (c) => c.additional_charge_id === chargeMasterId,
    );
    if (!master) return;
    update(uid, {
      chargeMasterId: master.additional_charge_id,
      chargeCode: master.charge_code,
      chargeName: master.charge_name,
      ...resolveChargeGst(master, taxSupplyType, gstOptions),
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">Additional Charges</p>
          <p className="text-[11px] text-muted-foreground">
            Select from Additional Charge Master — GST auto-fills from master and stays locked
          </p>
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
                <th className="min-w-[180px] px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">
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
                const selectedChargeValue = (() => {
                  if (
                    row.chargeMasterId &&
                    chargeOptions.some((o) => o.value === row.chargeMasterId)
                  ) {
                    return row.chargeMasterId;
                  }
                  const byName = (chargeDropdownQuery.data ?? []).find(
                    (c) =>
                      c.charge_name.trim().toLowerCase() ===
                      (row.chargeName || "").trim().toLowerCase(),
                  );
                  return byName?.additional_charge_id ?? "";
                })();

                return (
                  <tr key={row.uid} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2">
                      {readOnly ? (
                        <div>
                          <span className="text-xs text-foreground">{row.chargeName || "—"}</span>
                          {row.chargeCode ? (
                            <p className="mt-0.5 text-[10px] text-muted-foreground">{row.chargeCode}</p>
                          ) : null}
                        </div>
                      ) : (
                        <AutocompleteSelect
                          options={chargeOptions.map((o) =>
                            o.value === row.chargeMasterId
                              ? { ...o, disabled: false, sublabel: o.sublabel === "Already added" ? undefined : o.sublabel }
                              : o,
                          )}
                          value={selectedChargeValue}
                          onChange={(v) => selectChargeFromMaster(row.uid, String(v))}
                          placeholder={
                            chargeDropdownQuery.isLoading
                              ? "Loading charges…"
                              : "Select additional charge…"
                          }
                          searchPlaceholder="Search charge…"
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
                      <span
                        className={cn(
                          "inline-flex h-8 min-w-[56px] items-center justify-end rounded-lg border border-border bg-muted/40 px-2 text-xs tabular-nums text-muted-foreground",
                          !row.chargeMasterId && !row.chargeName && "text-muted-foreground/60",
                        )}
                        title="GST is set from Additional Charge Master"
                      >
                        {row.chargeMasterId || row.chargeName ? `${gstPct}%` : "—"}
                      </span>
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
