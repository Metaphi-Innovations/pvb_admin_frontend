"use client";

import Link from "next/link";
import { AlertTriangle, ExternalLink, Scale } from "lucide-react";
import { formatCurrency } from "@/lib/procurement/utils";
import { THREE_WAY_MATCH_LABELS, computeThreeWayMatch } from "@/lib/erp/three-way-match";
import { RecordSectionCard } from "@/components/record-detail";
import { ProcBadge } from "../../design/proc-design";
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
    { label: "Supplier Invoice Uploaded", ok: match.invoiceUploaded },
    { label: "GRN Created", ok: match.grnCreated },
    { label: "QC Completed", ok: match.qcCompleted },
  ];

  return (
    <RecordSectionCard title="3-Way Match" icon={Scale} accent="blue">
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
        <p className="text-[11px] text-muted-foreground mb-3">
          3-Way Match becomes ready when PO is approved, supplier invoice is uploaded, GRN is created, and QC is completed in Warehouse.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs min-w-[1100px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              {TABLE_HEADERS.map((h) => (
                <th key={h} className="px-2 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {match.lines.length === 0 ? (
              <tr>
                <td colSpan={TABLE_HEADERS.length} className="px-2 py-4 text-center text-muted-foreground">
                  No PO line items to compare.
                </td>
              </tr>
            ) : (
              match.lines.map((l) => (
                <tr key={l.productCode} className="border-b border-border/60">
                  <td className="px-2 py-2 text-xs font-medium text-foreground">{l.productName}</td>
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
                    {l.mismatchReason && (
                      <span className="block text-[9px] text-red-600 mt-0.5">{l.mismatchReason}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-muted-foreground">
        {match.grnNos.length > 0 && <span>GRN: {match.grnNos.join(", ")}</span>}
        {match.qcNos.length > 0 && <span>QC: {match.qcNos.join(", ")}</span>}
        {match.vendorInvoiceNo && <span>Supplier Invoice: {match.vendorInvoiceNo}</span>}
        <div className="flex flex-wrap items-center gap-3 ml-auto">
          <Link href="/warehouse/grn" className="text-brand-600 hover:underline inline-flex items-center gap-0.5">
            Warehouse GRN <ExternalLink className="w-3 h-3" />
          </Link>
          <Link href="/warehouse/qc" className="text-brand-600 hover:underline inline-flex items-center gap-0.5">
            Warehouse QC <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mt-2">
        Overall status: {THREE_WAY_MATCH_LABELS[match.status]}. Accounts reviews this before payment processing.
      </p>
    </RecordSectionCard>
  );
}

export function ThreeWayMatchListingCell({ po, onView }: { po: PurchaseOrder; onView?: () => void }) {
  const match = computeThreeWayMatch(po);
  return (
    <div className="py-1.5 space-y-1" onClick={(e) => e.stopPropagation()}>
      <ProcBadge status={match.status} />
      {match.vendorInvoiceNo && (
        <p className="text-[10px] text-muted-foreground leading-tight">{match.vendorInvoiceNo}</p>
      )}
      {onView && (
        <button type="button" className="text-[10px] text-brand-600 hover:underline" onClick={onView}>
          View Match
        </button>
      )}
    </div>
  );
}
