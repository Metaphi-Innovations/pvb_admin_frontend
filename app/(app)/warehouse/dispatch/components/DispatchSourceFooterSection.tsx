"use client";

import React from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  AdditionalChargesEditor,
  ProcurementTotalSummary,
} from "@/components/procurement/AdditionalChargesEditor";
import type { DispatchSourceFooterData } from "../dispatch-source-footer";

function SectionHead({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="mb-2.5">
      <p className="text-xs font-bold uppercase tracking-wider text-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function DispatchSourceFooterSection({ data }: { data: DispatchSourceFooterData }) {
  return (
    <div className="border-t border-border/80 pt-6 mt-6 space-y-4">
      <AdditionalChargesEditor
        charges={data.additionalCharges}
        onChange={() => {}}
        readOnly
        taxSupplyType={data.taxSupplyType}
      />

      <div className="border-t border-border/60 pt-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-start">
          <div className="min-w-0 space-y-4">
            <SectionHead
              label="Remarks & Attachments"
              sub="Additional notes and supporting documents."
            />
            <div>
              <p className="mb-1.5 text-xs font-medium text-foreground">Remarks</p>
              <Textarea
                readOnly
                value={data.remarks}
                placeholder="Purpose or internal notes..."
                className="min-h-[90px] rounded-lg text-xs bg-muted/30 resize-none"
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/10 p-3.5">
              <p className="mb-2 text-xs font-medium text-foreground">Attachments</p>
              {data.attachments.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                  No attachments
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.attachments.map((a) => (
                    <li
                      key={a.uid}
                      className="flex items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-2 text-xs"
                    >
                      <span className="min-w-0 flex-1 truncate text-foreground">{a.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex justify-end lg:justify-start">
            <ProcurementTotalSummary
              productTotal={data.productTotal}
              additionalCharges={data.additionalCharges}
              taxTotal={data.taxTotal}
              taxSupplyType={data.taxSupplyType}
              totalCgst={data.totalCgst}
              totalSgst={data.totalSgst}
              totalIgst={data.totalIgst}
              className="w-full max-w-[380px]"
            />
          </div>
        </div>

        {data.amountInWords && (
          <p className="mt-2 text-right text-[11px] text-muted-foreground italic">
            {data.amountInWords}
          </p>
        )}
      </div>
    </div>
  );
}
