"use client";

import React from "react";
import type { PurchaseOrder } from "../po-data";
import { getPOQtySummary, shortCloseReasonLabel } from "../po-qty";

function SectionHead({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="mb-2.5 mt-0.5">
      <p className="text-xs font-bold uppercase tracking-wider text-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function POQtySummaryCard({ po }: { po: PurchaseOrder }) {
  const q = getPOQtySummary(po);
  const rows = [
    { label: "Ordered Quantity", value: q.orderedQty },
    { label: "Received Quantity", value: q.receivedQty },
    { label: "Short Closed Quantity", value: q.shortClosedQty },
    { label: "Pending Quantity", value: q.pendingQty, highlight: true },
  ];

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <SectionHead label="PO Quantity Summary" sub="Order fulfillment and receipt status." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {rows.map((r) => (
          <div key={r.label} className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <p className="mb-0.5 text-[11px] text-muted-foreground">{r.label}</p>
            <p className={`text-sm font-bold tabular-nums ${r.highlight ? "text-brand-700" : "text-foreground"}`}>
              {r.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function POClosureInformation({ po }: { po: PurchaseOrder }) {
  if (!po.shortClose) return null;

  const sc = po.shortClose;
  const fields = [
    { label: "Close Type", value: "Short Close" },
    { label: "Short Closed Quantity", value: String(sc.quantity) },
    { label: "Short Close Reason", value: sc.reason },
    { label: "Short Close Remarks", value: sc.remarks },
    { label: "Short Closed By", value: sc.shortClosedBy },
    { label: "Short Closed Date", value: `${sc.shortClosedDate} ${sc.shortClosedTime}` },
  ];

  const timeline = po.activity.find((a) => a.action === "PO Short Closed");

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <SectionHead label="Closure Information" sub="Short close details and audit trail." />
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 text-xs">
        {fields.map((f) => (
          <div key={f.label}>
            <p className="mb-0.5 text-[11px] font-medium text-muted-foreground">{f.label}</p>
            <p className="whitespace-pre-wrap text-foreground">{f.value}</p>
          </div>
        ))}
      </div>
      {timeline && (
        <div className="mt-4 border-t border-border/60 pt-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Activity</p>
          <div className="flex gap-2.5 text-xs">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
            <div>
              <p className="font-semibold text-foreground">{timeline.action}</p>
              <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">{timeline.note}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {timeline.by} · {timeline.date}
                {sc.shortClosedTime ? ` ${sc.shortClosedTime}` : ""}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
