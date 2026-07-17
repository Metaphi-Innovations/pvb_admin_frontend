"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AdditionalChargesEditor,
  ProcurementTotalSummary,
} from "@/components/procurement/AdditionalChargesEditor";
import { recalcPurchaseReturn } from "../purchase-return-calc";
import {
  type PurchaseReturn,
  type PurchaseReturnItem,
} from "@/app/(app)/procurement/purchase-returns/purchase-return-data";
import { PReturnLineItemsSection } from "./PReturnLineItemsSection";

const inputCls = "h-8 rounded-lg text-xs";
const readOnlyCls = cn(inputCls, "bg-muted/30 text-foreground");

function SectionHead({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="mb-3 pb-2 border-b border-border">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ReadOnlyField({ value, mono }: { value: string; mono?: boolean }) {
  return (
    <Input
      value={value || "—"}
      readOnly
      className={cn(readOnlyCls, mono && "font-mono text-brand-700")}
    />
  );
}

function formatDisplayDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

export function PurchaseReturnForm({
  record,
  onChange,
  readOnly = false,
  errors = {},
  editMode = false,
}: {
  record: PurchaseReturn;
  onChange: (record: PurchaseReturn) => void;
  readOnly?: boolean;
  errors?: Record<string, string>;
  /** When true, line items are split into existing return lines + additional eligible GRNs. */
  editMode?: boolean;
}) {
  const detailsGridCls = "grid grid-cols-4 gap-3";
  const taxSupplyType = record.taxSupplyType ?? "intra";
  const summary = record.summary;
  const taxTotal = summary.totalCgst + summary.totalSgst + summary.totalIgst;

  const patch = (p: Partial<PurchaseReturn>) => {
    onChange(recalcPurchaseReturn({ ...record, ...p }));
  };

  const setItem = (id: string, itemPatch: Partial<PurchaseReturnItem>) => {
    patch({
      items: record.items.map((it) => (it.id === id ? { ...it, ...itemPatch } : it)),
    });
  };

  return (
    <div className={cn("rounded-xl border border-border bg-white p-4 shadow-sm", readOnly && "w-full")}>
      <div className="space-y-4">
        <div>
          <SectionHead
            label="Return Details"
            sub="Purchase return header and supplier reference."
          />
          <div className={detailsGridCls}>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Purchase Return No.</Label>
              <ReadOnlyField value={record.returnNumber} mono />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Purchase Return Date</Label>
              {readOnly ? (
                <ReadOnlyField value={formatDisplayDate(record.returnDate)} />
              ) : (
                <Input
                  type="date"
                  value={record.returnDate}
                  onChange={(e) => patch({ returnDate: e.target.value })}
                  className={inputCls}
                />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Reference PO No.</Label>
              <ReadOnlyField value={record.poNumber} mono />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Supplier Name</Label>
              <ReadOnlyField value={record.supplierName} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Supplier Code</Label>
              <ReadOnlyField value={record.supplierCode} mono />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Initiated By</Label>
              <ReadOnlyField value={record.initiatedBy} />
            </div>
            {readOnly && record.packingListNo && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Packing List</Label>
                <ReadOnlyField value={record.packingListNo} mono />
              </div>
            )}
            <div className="col-span-4 space-y-1">
              <Label className="text-xs font-medium">Overall Return Reason / Remarks</Label>
              <Textarea
                readOnly={readOnly}
                value={record.overallRemarks}
                onChange={(e) => patch({ overallRemarks: e.target.value })}
                placeholder="Enter overall return reason or remarks…"
                rows={3}
                className={cn(
                  "min-h-[72px] rounded-lg text-xs resize-none",
                  readOnly && "bg-muted/30",
                )}
              />
            </div>
          </div>
        </div>

        <PReturnLineItemsSection
          items={record.items}
          readOnly={readOnly}
          errors={errors}
          taxSupplyType={taxSupplyType}
          onItemChange={setItem}
          editMode={editMode}
          warehouseName={record.warehouseName}
        />

        <div className="border-t border-border/60 pt-4">
          <AdditionalChargesEditor
            charges={record.additionalCharges ?? []}
            onChange={(charges) => patch({ additionalCharges: charges })}
            readOnly={readOnly}
            taxSupplyType={taxSupplyType}
          />
        </div>

        <div className="border-t border-border/60 pt-4">
          <div className="flex justify-end">
            <ProcurementTotalSummary
              productTotal={summary.productTotal}
              additionalCharges={record.additionalCharges ?? []}
              taxTotal={taxTotal}
              taxSupplyType={taxSupplyType}
              totalCgst={summary.totalCgst}
              totalSgst={summary.totalSgst}
              totalIgst={summary.totalIgst}
              className="w-full max-w-[380px]"
            />
          </div>
          {summary.amountInWords && (
            <p className="mt-2 text-right text-[11px] text-muted-foreground italic">
              {summary.amountInWords}
            </p>
          )}
        </div>

        {readOnly && record.activity.length > 0 && (
          <div className="border-t border-border/60 pt-4">
            <SectionHead label="Audit Log" sub="Status changes and actions on this return." />
            <div className="rounded-xl border border-border bg-muted/10 p-3.5">
              <ul className="space-y-2">
                {record.activity.map((a, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-lg border border-border bg-white px-2.5 py-2 text-xs"
                  >
                    <span className="font-mono text-[11px] text-muted-foreground">{a.date}</span>
                    <span className="font-semibold text-foreground">{a.action}</span>
                    <span className="text-muted-foreground">by {a.by}</span>
                    {a.note && <span className="text-muted-foreground">— {a.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
