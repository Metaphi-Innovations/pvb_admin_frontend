"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { QcItem } from "../../types";
import { ProductSkuCell, GRN_QTY_INPUT_CLASSNAME } from "@/app/(app)/warehouse/grn/shared/components/ProductSkuCell";
import { StackedQtyCell } from "@/app/(app)/warehouse/grn/shared/components/StackedQtyCell";
import { qcItemQtyStack } from "../qc-quantity";

const TH =
  "px-3 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap";
const TH_CENTER = cn(TH, "text-center");
const TD = "px-3 py-2.5 align-top text-xs";

const REJECT_TYPE_OPTIONS = [
  { label: "Damaged", value: "DAMAGED" },
] as const;

type QtyField = "accepted" | "rejected";

interface QcBatchInspectionTableProps {
  items: QcItem[];
  onQtyChange: (
    idx: number,
    field: QtyField,
    type: "cases" | "loose",
    raw: string,
  ) => void;
  onReasonChange: (idx: number, val: string) => void;
  onRejectTypeChange: (idx: number, val: string) => void;
}

function QcQtyInputCell({
  item,
  idx,
  field,
  isRowValid,
  onQtyChange,
}: {
  item: QcItem;
  idx: number;
  field: QtyField;
  isRowValid: boolean;
  onQtyChange: QcBatchInspectionTableProps["onQtyChange"];
}) {
  const isCase = String(item.quantityType || "PIECE").toUpperCase() === "CASE";
  const baseQty = field === "accepted" ? item.acceptedQty : item.rejectedQty;
  const inputVal = field === "accepted" ? item.acceptedInput : item.rejectedInput;
  const stack = qcItemQtyStack(baseQty, item);

  return (
    <div className="space-y-1.5 min-w-[72px]">
      {isCase ? (
        <Input
          type="text"
          inputMode="decimal"
          placeholder="Cases"
          value={inputVal ?? ""}
          onFocus={(e) => e.target.select()}
          onChange={(e) => onQtyChange(idx, field, "cases", e.target.value)}
          className={cn(GRN_QTY_INPUT_CLASSNAME, "h-8", !isRowValid && "border-red-300")}
        />
      ) : (
        <Input
          type="text"
          inputMode="numeric"
          placeholder="Units"
          value={inputVal ?? ""}
          onFocus={(e) => e.target.select()}
          onChange={(e) => onQtyChange(idx, field, "loose", e.target.value)}
          className={cn(GRN_QTY_INPUT_CLASSNAME, "h-8", !isRowValid && "border-red-300")}
        />
      )}
      {baseQty > 0 ? (
        <StackedQtyCell
          stack={stack}
          empty={false}
          className={cn(
            "min-w-0",
            field === "accepted"
              ? "[&_p:first-child]:text-emerald-700"
              : "[&_p:first-child]:text-red-700",
          )}
        />
      ) : null}
    </div>
  );
}

export function QcBatchInspectionTable({
  items,
  onQtyChange,
  onReasonChange,
  onRejectTypeChange,
}: QcBatchInspectionTableProps) {
  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        Referenced GRN contains no batch rows.
      </p>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className={cn(TH, "min-w-[160px]")}>Product</th>
              <th className={cn(TH, "w-28")}>Batch No.</th>
              <th className={cn(TH, "w-28")}>MFG Date</th>
              <th className={cn(TH, "w-28")}>Expiry Date</th>
              <th className={cn(TH_CENTER, "w-36")}>Qty</th>
              <th className={cn(TH_CENTER, "w-40 text-emerald-800")}>Accepted</th>
              <th className={cn(TH_CENTER, "w-40 text-red-800")}>Rejected</th>
              <th className={cn(TH, "w-36")}>Reject Type</th>
              <th className={cn(TH, "min-w-[140px]")}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const sum = item.acceptedQty + item.rejectedQty;
              const isRowValid = sum === item.receivedQty;
              const needsRejectType = item.rejectedQty > 0;
              const rejectTypeMissing = needsRejectType && !item.rejectType;
              const receivedStack = qcItemQtyStack(item.receivedQty, item);

              return (
                <tr
                  key={`${item.grnBatchId ?? item.batchNumber}-${idx}`}
                  className={cn(
                    "border-b border-border/60 bg-muted/5 transition-colors",
                    (!isRowValid || rejectTypeMissing) && "bg-red-50/20",
                  )}
                >
                  <td className={cn(TD, "min-w-[160px]")}>
                    <ProductSkuCell name={item.productName} sku={item.productCode} />
                  </td>
                  <td className={cn(TD, "font-mono font-semibold text-brand-700")}>
                    {item.batchNumber || "—"}
                  </td>
                  <td className={cn(TD, "text-muted-foreground")}>
                    {item.mfgDate?.trim() ? item.mfgDate : "—"}
                  </td>
                  <td className={cn(TD, "text-muted-foreground")}>
                    {item.expDate?.trim() ? item.expDate : "—"}
                  </td>
                  <td className={cn(TD, "text-center")}>
                    <StackedQtyCell
                      stack={receivedStack}
                      empty={!(item.receivedQty > 0)}
                      className="[&_p:first-child]:text-brand-700"
                    />
                  </td>
                  <td className={cn(TD, "text-center")}>
                    <QcQtyInputCell
                      item={item}
                      idx={idx}
                      field="accepted"
                      isRowValid={isRowValid}
                      onQtyChange={onQtyChange}
                    />
                  </td>
                  <td className={cn(TD, "text-center")}>
                    <QcQtyInputCell
                      item={item}
                      idx={idx}
                      field="rejected"
                      isRowValid={isRowValid}
                      onQtyChange={onQtyChange}
                    />
                  </td>
                  <td className={TD}>
                    <Select
                      value={item.rejectType || undefined}
                      onValueChange={(val) => onRejectTypeChange(idx, val)}
                      disabled={!needsRejectType}
                    >
                      <SelectTrigger
                        className={cn(
                          "h-8 w-full min-w-[120px] rounded-input text-xs",
                          rejectTypeMissing && "border-red-400",
                        )}
                      >
                        <SelectValue
                          placeholder={needsRejectType ? "Select…" : "—"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {REJECT_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className={TD}>
                    <Input
                      placeholder="Remarks…"
                      value={item.rejectionReason ?? ""}
                      onChange={(e) => onReasonChange(idx, e.target.value)}
                      className="h-8 text-xs w-full"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
