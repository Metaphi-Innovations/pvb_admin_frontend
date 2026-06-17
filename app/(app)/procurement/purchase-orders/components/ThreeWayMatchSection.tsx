"use client";

import Link from "next/link";
import { AlertTriangle, ExternalLink, Scale } from "lucide-react";
import { formatCurrency } from "@/lib/procurement/utils";
import { THREE_WAY_MATCH_LABELS, computeThreeWayMatch } from "@/lib/erp/three-way-match";
import { ProcBadge, ProcCardSection } from "../../design/proc-design";
import type { PurchaseOrder } from "../po-data";

const TABLE_HEADERS = [
  "Product",
  "PO Qty",
  "PO Rate",
  "PO Amount",
  "Invoice Qty",
  "Invoice Rate",
  "Invoice Amount",
  "GRN Received",
  "QC Accepted",
  "QC Rejected",
  "Match Status",
];

export function ThreeWayMatchSection({ po, refreshKey = 0 }: { po: PurchaseOrder; refreshKey?: number }) {
  void refreshKey;
  const match = computeThreeWayMatch(po);

  const readiness = [
    { label: "PO Approved", ok: match.poApproved },
    { label: "Vendor Invoice Uploaded", ok: match.invoiceUploaded },
    { label: "GRN Created", ok: match.grnCreated },
    { label: "QC Completed", ok: match.qcCompleted },
  ];

  return (
    <ProcCardSection accent="navy" title="3-Way Match" icon={<Scale className="w-3.5 h-3.5 text-violet-600" />}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <ProcBadge status={match.status} />
        {match.matchReady && match.status === "mismatch" && (
          <span className="text-[10px] text-red-600 inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Review before payment
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] mb-3">
        {readiness.map((r) => (
          <div
            key={r.label}
            className={`rounded-[9px] border px-2 py-1.5 ${r.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}
          >
            {r.ok ? "✓" : "○"} {r.label}
          </div>
        ))}
      </div>

      {!match.matchReady && (
        <p className="text-[11px] text-[#6B80A0] mb-3">
          3-Way Match becomes ready when PO is approved, vendor invoice is uploaded, GRN is created, and QC is completed in Warehouse.
        </p>
      )}

      <div className="overflow-x-auto rounded-[9px] border border-[#DDE3EF]">
        <table className="w-full text-[11px] min-w-[1100px]">
          <thead>
            <tr className="bg-[#F7F9FC] border-b border-[#DDE3EF]">
              {TABLE_HEADERS.map((h) => (
                <th key={h} className="px-2 py-1.5 text-left font-bold text-[#9AAAC5] uppercase text-[10px] whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {match.lines.length === 0 ? (
              <tr>
                <td colSpan={TABLE_HEADERS.length} className="px-2 py-4 text-center text-[#6B80A0]">
                  No PO line items to compare.
                </td>
              </tr>
            ) : (
              match.lines.map((l) => (
                <tr key={l.productCode} className="border-b border-[#F0F3FA]">
                  <td className="px-2 py-1.5 text-[#0A1628] font-medium">{l.productName}</td>
                  <td className="px-2 py-1.5 tabular-nums">{l.poQty}</td>
                  <td className="px-2 py-1.5 tabular-nums">{formatCurrency(l.poRate)}</td>
                  <td className="px-2 py-1.5 tabular-nums">{formatCurrency(l.poAmount)}</td>
                  <td className="px-2 py-1.5 tabular-nums">{l.invoiceQty}</td>
                  <td className="px-2 py-1.5 tabular-nums">{formatCurrency(l.invoiceRate)}</td>
                  <td className="px-2 py-1.5 tabular-nums">{formatCurrency(l.invoiceAmount)}</td>
                  <td className="px-2 py-1.5 tabular-nums">{l.grnQty}</td>
                  <td className="px-2 py-1.5 tabular-nums text-emerald-700">{l.qcAcceptedQty}</td>
                  <td className="px-2 py-1.5 tabular-nums text-red-700">{l.qcRejectedQty}</td>
                  <td className="px-2 py-1.5">
                    <ProcBadge status={l.lineStatus} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-[#6B80A0]">
        {match.grnNos.length > 0 && <span>GRN: {match.grnNos.join(", ")}</span>}
        {match.qcNos.length > 0 && <span>QC: {match.qcNos.join(", ")}</span>}
        {match.vendorInvoiceNo && <span>Vendor Invoice: {match.vendorInvoiceNo}</span>}
        <Link href="/warehouse/grnqc" className="text-brand-600 hover:underline inline-flex items-center gap-0.5 ml-auto">
          Warehouse GRN & QC <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <p className="text-[10px] text-[#9AAAC5] mt-2">
        Overall status: {THREE_WAY_MATCH_LABELS[match.status]}. Accounts reviews this before payment processing.
      </p>
    </ProcCardSection>
  );
}

export function ThreeWayMatchListingCell({ po, onView }: { po: PurchaseOrder; onView?: () => void }) {
  const match = computeThreeWayMatch(po);
  return (
    <div className="py-1.5 space-y-1" onClick={(e) => e.stopPropagation()}>
      <ProcBadge status={match.status} />
      {match.vendorInvoiceNo && (
        <p className="text-[10px] text-[#6B80A0] leading-tight">{match.vendorInvoiceNo}</p>
      )}
      {onView && (
        <button type="button" className="text-[10px] text-brand-600 hover:underline" onClick={onView}>
          View Match
        </button>
      )}
    </div>
  );
}
