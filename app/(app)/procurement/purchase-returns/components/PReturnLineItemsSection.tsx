"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCurrency, type TaxSupplyType } from "@/lib/procurement/utils";
import type { PurchaseReturnItem } from "../purchase-return-data";
import { clampReturnQty, getReturnQtyError } from "../purchase-return-utils";

const inputCls = "h-8 rounded-lg text-xs";

function SectionHead({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="mb-2.5 mt-0.5">
      <p className="text-xs font-bold uppercase tracking-wider text-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function LineStatusChip({ status }: { status: PurchaseReturnItem["lineStatus"] }) {
  const isFull = status === "fully_returned";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap",
        isFull ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700",
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full flex-shrink-0",
          isFull ? "bg-slate-400" : "bg-emerald-500",
        )}
      />
      {isFull ? "Fully Returned" : "Available for Return"}
    </span>
  );
}

function TaxPctAmountCell({ pct, amount }: { pct: number; amount: number }) {
  return (
    <div className="space-y-0.5 text-right">
      <p className="text-xs tabular-nums text-foreground">{pct}%</p>
      <p className="text-[10px] tabular-nums font-medium text-muted-foreground">
        {formatCurrency(amount)}
      </p>
    </div>
  );
}

function gstPctFromLine(it: PurchaseReturnItem): number {
  return it.cgstPct + it.sgstPct + it.igstPct;
}

export function PReturnLineItemsSection({
  items,
  readOnly,
  errors,
  taxSupplyType = "intra",
  onItemChange,
}: {
  items: PurchaseReturnItem[];
  readOnly?: boolean;
  errors?: Record<string, string>;
  taxSupplyType?: TaxSupplyType;
  onItemChange: (id: string, patch: Partial<PurchaseReturnItem>) => void;
}) {
  const selectedCount = useMemo(() => items.filter((it) => it.selected).length, [items]);
  const availableCount = useMemo(
    () => items.filter((it) => it.lineStatus === "available").length,
    [items],
  );
  const totalReturnQty = useMemo(
    () => items.filter((it) => it.selected).reduce((s, it) => s + (it.returnQty || 0), 0),
    [items],
  );
  const totalBalance = useMemo(
    () => items.reduce((s, it) => s + it.balanceRejectedQty, 0),
    [items],
  );
  const lineTotal = useMemo(
    () => items.filter((it) => it.selected).reduce((s, it) => s + (it.netAmount || 0), 0),
    [items],
  );

  const handleSelectChange = (it: PurchaseReturnItem, checked: boolean) => {
    if (checked) {
      onItemChange(it.id, { selected: true });
    } else {
      onItemChange(it.id, { selected: false, returnQty: 0, lineRemark: "" });
    }
  };

  return (
    <div className="border-t border-border/60 pt-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <SectionHead
          label="Inwarded Batch Items"
          sub="GRN rates and GST from purchase order. Select batches and enter return quantity."
        />
        {items.length > 0 && (
          <div className="mb-2.5 flex flex-wrap items-center gap-2 md:mb-0">
            <span className="inline-flex h-6 items-center rounded-full bg-brand-50 px-2.5 text-[11px] font-semibold text-brand-700">
              {items.length} batch{items.length === 1 ? "" : "es"}
            </span>
            <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-[11px] font-semibold text-muted-foreground">
              {availableCount} available
            </span>
            {!readOnly && selectedCount > 0 && (
              <span className="inline-flex h-6 items-center rounded-full bg-navy-50 px-2.5 text-[11px] font-semibold text-navy-700">
                {selectedCount} selected
              </span>
            )}
            <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-[11px] font-semibold text-muted-foreground">
              {totalBalance} balance rejected
            </span>
            {lineTotal > 0 && (
              <span className="inline-flex h-6 items-center rounded-full bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700">
                {formatCurrency(lineTotal)}
              </span>
            )}
          </div>
        )}
      </div>

      {errors?._form && (
        <p className="mb-3 flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {errors._form}
        </p>
      )}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-10 text-center">
          <Package className="mx-auto mb-2 h-10 w-10 text-muted-foreground/70" />
          <p className="text-sm font-semibold text-foreground">No inwarded batches</p>
          <p className="mt-1 text-xs text-muted-foreground">
            GRN batches for this purchase order will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
          <table className="w-full min-w-[1500px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {!readOnly ? (
                  <th className="w-10 px-3 py-2.5 text-center text-xs font-semibold text-foreground">
                    <span className="sr-only">Select</span>
                  </th>
                ) : (
                  <th className="w-10 px-3 py-2.5 text-center text-xs font-semibold text-foreground">
                    Sel.
                  </th>
                )}
                {[
                  "GRN No.",
                  "Product Code",
                  "Product Name",
                  "Batch No.",
                  "MFG Date",
                  "Expiry",
                  "GRN Rcvd",
                  "QC Rejected",
                  "Returned",
                  "Balance Rejected",
                  "Return Qty",
                  "Rate",
                  "GST %",
                  ...(taxSupplyType === "intra" ? ["CGST", "SGST"] : ["IGST"]),
                  "Amount",
                  "Line Remark",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    className={cn(
                      "px-3 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap",
                      [
                        "GRN Rcvd",
                        "QC Rejected",
                        "Returned",
                        "Balance Rejected",
                        "Return Qty",
                        "Rate",
                        "GST %",
                        "CGST",
                        "SGST",
                        "IGST",
                        "Amount",
                      ].includes(h) && "text-right",
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const fullyReturned = it.lineStatus === "fully_returned";
                const rowDisabled = fullyReturned || readOnly;
                const canEditQty = it.selected && !rowDisabled;
                const rowError = errors?.[it.id] ?? getReturnQtyError(it);
                const gstPct = gstPctFromLine(it);

                return (
                  <tr
                    key={it.id}
                    className={cn(
                      "border-b border-border/60 transition-colors",
                      fullyReturned ? "bg-muted/20 opacity-75" : "hover:bg-muted/20",
                      it.selected && !fullyReturned && "bg-brand-50/40",
                    )}
                  >
                    <td className="px-3 py-2 text-center">
                      {readOnly ? (
                        <span className="text-xs text-muted-foreground">{it.selected ? "✓" : "—"}</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={it.selected}
                          disabled={fullyReturned}
                          onChange={(e) => handleSelectChange(it, e.target.checked)}
                          className="h-4 w-4 rounded accent-brand-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Select batch ${it.batchNumber}`}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{it.grnNo}</td>
                    <td className="px-3 py-2 font-mono text-xs font-semibold text-brand-700">
                      {it.productCode}
                    </td>
                    <td className="px-3 py-2 text-xs font-medium text-foreground">{it.productName}</td>
                    <td className="px-3 py-2 font-mono text-xs text-foreground">{it.batchNumber}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{it.mfgDate || "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{it.expDate || "—"}</td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums text-foreground">
                      {it.grnReceivedQty}
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums font-medium text-red-600">
                      {it.qcRejectedQty || "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums text-muted-foreground">
                      {it.alreadyReturnedQty}
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums font-semibold text-foreground">
                      {it.balanceRejectedQty}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {!canEditQty ? (
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {fullyReturned ? "—" : it.returnQty || "—"}
                        </span>
                      ) : (
                        <div className="inline-block space-y-1 text-left">
                          <Input
                            type="number"
                            min={0}
                            max={it.balanceRejectedQty}
                            value={it.returnQty || ""}
                            onChange={(e) => {
                              const raw = e.target.value === "" ? 0 : Number(e.target.value);
                              const v = clampReturnQty(raw, it.balanceRejectedQty);
                              onItemChange(it.id, { returnQty: v });
                            }}
                            className={cn(
                              "h-8 w-20 text-xs tabular-nums",
                              rowError && "border-red-400",
                            )}
                          />
                          {rowError && (
                            <p className="text-[10px] leading-tight text-red-500 max-w-[160px]">
                              {rowError}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums text-foreground">
                      {formatCurrency(it.unitPrice)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums text-muted-foreground">
                      {gstPct}%
                    </td>
                    {taxSupplyType === "intra" ? (
                      <>
                        <td className="px-3 py-2 align-top">
                          <TaxPctAmountCell pct={it.cgstPct} amount={it.cgstAmount} />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <TaxPctAmountCell pct={it.sgstPct} amount={it.sgstAmount} />
                        </td>
                      </>
                    ) : (
                      <td className="px-3 py-2 align-top">
                        <TaxPctAmountCell pct={it.igstPct} amount={it.igstAmount} />
                      </td>
                    )}
                    <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums font-mono text-foreground">
                      {it.selected && it.returnQty > 0 ? formatCurrency(it.netAmount) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {!canEditQty ? (
                        <span className="text-xs text-muted-foreground">{it.lineRemark || "—"}</span>
                      ) : (
                        <Input
                          value={it.lineRemark}
                          onChange={(e) => onItemChange(it.id, { lineRemark: e.target.value })}
                          placeholder="Reason…"
                          className={cn(inputCls, "min-w-[120px]")}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <LineStatusChip status={it.lineStatus} />
                    </td>
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
