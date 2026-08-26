"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { RecordDetailPage } from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, CheckCircle2, AlertTriangle, XCircle, ClipboardCheck, Building2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { QcService } from "@/services/qc.service";
import { QcRecord } from "../../types";
import {
  buildQcCreateHref,
  resolveQcReturnTo,
} from "../../shared/qc-list-nav";
import {
  QcAcceptedStockTable,
  QcInspectionSummaryTable,
  QcRejectedStockTable,
} from "../../shared/components/QcInspectionViewTables";

const STATUS_CONFIG = {
  pending: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending QC", variant: "draft" as const },
  completed: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Completed", variant: "active" as const },
};

function ViewQcPageContent({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [qc, setQc] = useState<QcRecord | null>(null);

  const listHref = resolveQcReturnTo(searchParams, undefined, "completed");

  useEffect(() => {
    QcService.get(id)
      .then((record) => {
        if (record) {
          setQc(record);
        }
      })
      .catch((err) => {
        console.error("Failed to load QC Record:", err);
      });
  }, [id]);

  const acceptedStock = useMemo(() => {
    if (!qc) return [];
    return qc.items.filter((it) => it.acceptedQty > 0);
  }, [qc]);

  const rejectedStock = useMemo(() => {
    if (!qc) return [];
    return qc.items.filter((it) => it.rejectedQty > 0);
  }, [qc]);

  if (!qc) {
    return (
      <RecordDetailPage
        listHref={listHref}
        listLabel="QC"
        recordName="QC Record Not Found"
        statusLabel="Not Found"
        statusVariant="blocked"
      >
        <div className="max-w-[800px] mx-auto text-center py-12 space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-base font-bold text-foreground">QC Record Not Found</h1>
          <p className="text-xs text-muted-foreground">The QC record you requested does not exist or has been removed.</p>
          <Button variant="outline" size="sm" onClick={() => router.push(listHref)}>
            Go Back
          </Button>
        </div>
      </RecordDetailPage>
    );
  }

  const backHref = resolveQcReturnTo(
    searchParams,
    qc.sourceType,
    qc.status === "completed" ? "completed" : "pending",
  );
  const createReturnTo = backHref;

  const statusCfg = STATUS_CONFIG[qc.status] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: "Unknown", variant: "neutral" as const };
  const totalAccepted = qc.items.reduce((sum, it) => sum + it.acceptedQty, 0);
  const totalRejected = qc.items.reduce((sum, it) => sum + it.rejectedQty, 0);
  const totalReceived = qc.totalReceivedQty ?? qc.items.reduce((sum, it) => sum + it.receivedQty, 0);
  const totalHold = qc.items.reduce((sum, it) => sum + (it.holdQty ?? 0), 0);
  const inspectionDateDisplay = qc.inspectionDate?.trim() ? qc.inspectionDate : "—";
  const canInspect = qc.status === "pending";
  const sourceDocLabel =
    qc.sourceType === "sales_return"
      ? "Sales Return No."
      : qc.sourceType === "sample_return"
        ? "Sample Return No."
        : qc.sourceType === "stock_transfer"
          ? "Stock Transfer No."
          : "PO No.";
  const partyLabel =
    qc.sourceType === "sales_return" || qc.sourceType === "sample_return"
      ? "Customer"
      : qc.sourceType === "stock_transfer"
        ? "From Warehouse"
        : "Supplier";

  return (
    <RecordDetailPage
      listHref={backHref}
      listLabel="QC"
      recordName={qc.qcNo}
      recordCode={qc.grnNo}
      statusLabel={statusCfg.label}
      statusVariant={statusCfg.variant}
      metaItems={[
        { icon: FileText, label: qc.poNumber || qc.stockTransferNo || "—" },
        { icon: CheckCircle2, label: qc.vendorName || qc.fromWarehouse || "—" },
        { icon: Building2, label: qc.warehouse },
        { icon: Calendar, label: inspectionDateDisplay },
      ]}
      secondaryAction={
        canInspect
          ? {
              label: "Perform QC",
              onClick: () =>
                router.push(
                  buildQcCreateHref({
                    grnId: qc.grnId || qc.id,
                    returnTo: createReturnTo,
                  }),
                ),
            }
          : undefined
      }
      sidebar={{
        summary: [
          { label: "GRN No.", value: qc.grnNo, highlight: true },
          { label: sourceDocLabel, value: qc.poNumber || qc.stockTransferNo || "—" },
          { label: partyLabel, value: qc.vendorName || qc.fromWarehouse || "—" },
          { label: "Warehouse", value: qc.warehouse },
          { label: "Total Received", value: totalReceived },
          { label: "Accepted Qty", value: totalAccepted },
          { label: "Rejected Qty", value: totalRejected },
          { label: "Products", value: qc.items.length },
        ],
        quickActions: canInspect
          ? [
              {
                label: "Perform QC",
                icon: ClipboardCheck,
                variant: "primary" as const,
                onClick: () =>
                  router.push(
                    buildQcCreateHref({
                      grnId: qc.grnId || qc.id,
                      returnTo: createReturnTo,
                    }),
                  ),
              },
            ]
          : [],
      }}
    >
      <div className="w-full space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "GRN No.", val: qc.grnNo, icon: FileText },
            { label: sourceDocLabel, val: qc.poNumber || qc.stockTransferNo || "—", icon: FileText },
            { label: partyLabel, val: qc.vendorName || qc.fromWarehouse || "—", icon: CheckCircle2 },
            { label: "Warehouse", val: qc.warehouse, icon: Building2 },
            { label: "Inspection Date", val: inspectionDateDisplay, icon: Calendar },
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <div key={idx} className="bg-white rounded-xl border border-border p-3 flex items-center gap-3 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none">
                    {card.label}
                  </p>
                  <p className="text-xs font-bold text-foreground mt-1 truncate max-w-[140px]">{card.val}</p>
                </div>
              </div>
            );
          })}
        </div>

        {qc.status === "pending" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
            <p className="text-xs font-semibold text-amber-800">Awaiting inspection</p>
            <p className="text-[11px] text-amber-700 mt-1">
              Start inspection to enter accepted and rejected quantities for each batch.
            </p>
          </div>
        )}

        {qc.qcRemarks && (
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">QC Remarks</h2>
            <p className="text-xs text-foreground">{qc.qcRemarks}</p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2">
            Batch Inspection Summary
          </h2>
          <QcInspectionSummaryTable items={qc.items} />
        </div>

        {qc.status === "completed" && (
          <>
            <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-emerald-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Accepted Stocks Allocation
              </h2>
              <QcAcceptedStockTable items={acceptedStock} />
            </div>

            <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-red-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                Rejected Stocks Details
              </h2>
              <QcRejectedStockTable items={rejectedStock} />
            </div>
          </>
        )}
      </div>
    </RecordDetailPage>
  );
}

export default function ViewQcPage({ params }: { params: { id: string } }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">Loading...</div>
      }
    >
      <ViewQcPageContent id={params.id} />
    </Suspense>
  );
}
