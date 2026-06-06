"use client";

import React from "react";
import { ProcCardSection } from "../../design/proc-design";
import type { PurchaseOrder } from "../po-data";
import { getPOQtySummary, shortCloseReasonLabel } from "../po-qty";

export function POQtySummaryCard({ po }: { po: PurchaseOrder }) {
  const q = getPOQtySummary(po);
  const rows = [
    { label: "Ordered Quantity", value: q.orderedQty },
    { label: "Received Quantity", value: q.receivedQty },
    { label: "Short Closed Quantity", value: q.shortClosedQty },
    { label: "Pending Quantity", value: q.pendingQty, highlight: true },
  ];

  return (
    <ProcCardSection accent="green" title="PO Quantity Summary">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px]">
        {rows.map((r) => (
          <div key={r.label} className="rounded-[9px] border border-[#DDE3EF] px-3 py-2.5 bg-[#FAFBFE]">
            <p className="text-[11px] text-[#6B80A0] mb-0.5">{r.label}</p>
            <p className={`font-bold tabular-nums ${r.highlight ? "text-brand-700" : "text-[#0A1628]"}`}>
              {r.value}
            </p>
          </div>
        ))}
      </div>
    </ProcCardSection>
  );
}

export function POClosureInformation({ po }: { po: PurchaseOrder }) {
  if (!po.shortClose) return null;

  const sc = po.shortClose;
  const fields = [
    { label: "Close Type", value: "Short Close" },
    { label: "Short Closed Quantity", value: String(sc.quantity) },
    { label: "Short Close Reason", value: shortCloseReasonLabel(sc.reason) },
    { label: "Short Close Remarks", value: sc.remarks },
    { label: "Short Closed By", value: sc.shortClosedBy },
    { label: "Short Closed Date", value: `${sc.shortClosedDate} ${sc.shortClosedTime}` },
  ];

  const timeline = po.activity.find((a) => a.action === "PO Short Closed");

  return (
    <ProcCardSection accent="amber" title="Closure Information">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
        {fields.map((f) => (
          <div key={f.label}>
            <p className="text-[11px] font-semibold text-[#6B80A0] mb-0.5">{f.label}</p>
            <p className="text-[#0A1628] whitespace-pre-wrap">{f.value}</p>
          </div>
        ))}
      </div>
      {timeline && (
        <div className="mt-4 pt-3 border-t border-[#DDE3EF]">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#6B80A0] mb-2">Activity</p>
          <div className="flex gap-2.5 text-[12px]">
            <span className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
            <div>
              <p className="font-semibold text-[#0A1628]">{timeline.action}</p>
              <p className="text-[#6B80A0] mt-0.5 whitespace-pre-wrap">{timeline.note}</p>
              <p className="text-[#9AAAC5] mt-1">
                {timeline.by} · {timeline.date}
                {sc.shortClosedTime ? ` ${sc.shortClosedTime}` : ""}
              </p>
            </div>
          </div>
        </div>
      )}
    </ProcCardSection>
  );
}
