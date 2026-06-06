"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink, Package, Scale, FileText, AlertTriangle, Upload } from "lucide-react";
import { formatINR } from "@/app/(app)/accounts/purchase/purchase-utils";
import { formatCurrency } from "@/lib/procurement/utils";
import {
  getPOWorkflowSummary,
  GRN_STATUS_CFG,
  INVOICE_STATUS_CFG,
  MATCH_STATUS_CFG,
} from "../procurement-workflow";
import { StatusPill } from "./ProcurementUI";
import type { PurchaseOrder } from "../purchase-orders/po-data";
import type { PurchaseInvoiceRecord } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";

export function POWorkflowPanel({
  po,
  vendorInvoices,
  canUploadInvoice,
  onUploadInvoice,
}: {
  po: PurchaseOrder;
  vendorInvoices: PurchaseInvoiceRecord[];
  canUploadInvoice: boolean;
  onUploadInvoice: () => void;
}) {
  const wf = getPOWorkflowSummary(po);

  return (
    <div className="space-y-3">
      {/* Vendor Invoice */}
      <section className="rounded-lg border border-border/80 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-600" />
            <h3 className="text-xs font-semibold">Vendor Invoice</h3>
          </div>
          <StatusPill status={wf.invoiceStatus} config={INVOICE_STATUS_CFG} />
        </div>
        {canUploadInvoice && (
          <Button variant="outline" size="sm" className="h-8 text-xs w-full mb-3" onClick={onUploadInvoice}>
            <Upload className="w-3.5 h-3.5 mr-1" /> Upload Vendor Invoice
          </Button>
        )}
        {vendorInvoices.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No vendor invoice uploaded. Upload against this PO to create Accounts → Purchase entry.</p>
        ) : (
          <div className="space-y-2">
            {vendorInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-2.5 py-2 text-[11px]">
                <div>
                  <p className="font-mono font-medium">{inv.vendorInvoiceNo}</p>
                  <p className="text-muted-foreground">{inv.invoiceDate} · {formatINR(inv.grandTotal)}</p>
                  <p className="text-[10px] text-muted-foreground">Accounts: {inv.invoiceNo}</p>
                </div>
                <Link href={`/accounts/transactions/purchase/${inv.id}`} className="text-brand-600 hover:underline flex items-center gap-1 shrink-0 text-[10px]">
                  <ExternalLink className="w-3 h-3" /> Purchase
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Warehouse GRN / QC */}
      <section className="rounded-lg border border-border/80 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-cyan-600" />
            <h3 className="text-xs font-semibold">Warehouse GRN & QC</h3>
          </div>
          <StatusPill status={wf.grnStatus} config={GRN_STATUS_CFG} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
          <div className="rounded-md bg-muted/30 px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground">PO Qty</p>
            <p className="font-semibold tabular-nums">{wf.poOrderedQty}</p>
          </div>
          <div className="rounded-md bg-muted/30 px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground">GRN Received (ref.)</p>
            <p className="font-semibold tabular-nums text-cyan-700">{wf.grnReceivedQty}</p>
          </div>
        </div>
        {wf.grnRecordNos.length > 0 ? (
          <p className="text-[10px] text-muted-foreground">GRN: {wf.grnRecordNos.join(", ")}</p>
        ) : (
          <p className="text-[10px] text-muted-foreground">GRN created in Warehouse module will appear here.</p>
        )}
        <Link href="/warehouse/grnqc" className="text-[10px] text-brand-600 hover:underline mt-2 inline-block">
          View Warehouse GRN & QC →
        </Link>
      </section>

      {/* 3-Way Match */}
      <section id="match" className="rounded-lg border border-border/80 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-violet-600" />
            <h3 className="text-xs font-semibold">3-Way Match</h3>
          </div>
          <StatusPill status={wf.matchStatus} config={MATCH_STATUS_CFG} />
        </div>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between"><span className="text-muted-foreground">PO Amount</span><span className="font-medium">{formatCurrency(wf.poAmount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Invoice Amount</span><span className="font-medium">{formatCurrency(wf.totalInvoiceAmount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">GRN Received Qty</span><span className="font-medium">{wf.grnReceivedQty} / {wf.poOrderedQty}</span></div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Reference from Warehouse only. Receiving is not tracked on PO status.</p>
      </section>

      {/* Debit Notes */}
      <section className="rounded-lg border border-border/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <h3 className="text-xs font-semibold">Debit Note Reference</h3>
        </div>
        {wf.debitNotes.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No debit notes linked. Create in Accounts → Debit Note if adjustment required.</p>
        ) : (
          <div className="space-y-2">
            {wf.debitNotes.map((d) => (
              <div key={d.debitNoteNo} className="rounded-md border border-border/60 px-2.5 py-2 text-[11px]">
                <p className="font-mono font-medium">{d.debitNoteNo}</p>
                <p className="text-muted-foreground">{formatCurrency(d.debitAmount)} · {d.reason}</p>
                <p className="text-[10px] capitalize">{d.status.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
        )}
        <Link href="/accounts/transactions/debit-notes" className="text-[10px] text-brand-600 hover:underline mt-2 inline-block">
          Accounts → Debit Notes →
        </Link>
      </section>
    </div>
  );
}
