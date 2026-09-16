"use client";

import React from "react";
import { RecordDetailPage } from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Building,
  AlertCircle,
  LayoutList,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { BatchDetailsReadOnlyTable } from "../shared/components/BatchDetailsReadOnlyTable";
import { cn } from "@/lib/utils";
import { useGrn } from "@/hooks/warehouse/use-grn";
import { formatQtyStackTotals } from "@/lib/warehouse/grn-quantity";
import { stackGrnLineQty } from "../shared/grn-qty-stack";

const STATUS_CONFIG = {
  pending_qc: {
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    label: "Pending QC",
    variant: "draft" as const,
  },
  qc_in_progress: {
    bg: "bg-navy-50 text-navy-700 border-navy-200",
    label: "QC In Progress",
    variant: "neutral" as const,
  },
  qc_completed: {
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    label: "QC Completed",
    variant: "active" as const,
  },
};

export function SampleReturnView({ id }: { id: string }) {
  const router = useRouter();
  const { data: grn, isLoading, isError, error } = useGrn(id);

  if (isLoading) {
    return (
      <RecordDetailPage
        listHref="/warehouse/grn/sample-return"
        listLabel="GRN"
        recordName="Loading…"
        statusLabel="Loading"
        statusVariant="neutral"
      >
        <div className="max-w-[800px] mx-auto text-center py-12">
          <p className="text-xs text-muted-foreground">Loading GRN details…</p>
        </div>
      </RecordDetailPage>
    );
  }

  if (isError || !grn) {
    return (
      <RecordDetailPage
        listHref="/warehouse/grn/sample-return"
        listLabel="GRN"
        recordName="GRN Record Not Found"
        statusLabel="Not Found"
        statusVariant="blocked"
      >
        <div className="max-w-[800px] mx-auto text-center py-12 space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-base font-bold text-foreground">GRN Record Not Found</h1>
          <p className="text-xs text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "The GRN ID you requested does not exist or has been removed."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/warehouse/grn/sample-return")}
          >
            Go Back
          </Button>
        </div>
      </RecordDetailPage>
    );
  }

  const statusCfg = STATUS_CONFIG[grn.status] || {
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    label: "Unknown",
    variant: "neutral" as const,
  };

  const orderedStacks = grn.items.map((it) =>
    stackGrnLineQty(it.orderedQty || 0, {
      packingSize: it.unitPerPacking || 1,
      unit: it.unit,
      netWeightPerPack: it.netWeightPerPack,
      weightUom: it.weightUom,
    }),
  );
  const receivedStacks = grn.items.map((it) =>
    stackGrnLineQty(it.receivedQty, {
      packingSize: it.unitPerPacking || 1,
      unit: it.unit,
      netWeightPerPack: it.netWeightPerPack,
      weightUom: it.weightUom,
    }),
  );
  const totalOrderedLabel = formatQtyStackTotals(orderedStacks);
  const totalReceivedLabel = formatQtyStackTotals(receivedStacks);
  const canStartQc = grn.status !== "qc_completed";
  const canEdit = grn.status !== "qc_completed";
  const customerName = grn.customerName || grn.vendorName || "—";

  return (
    <RecordDetailPage
      listHref="/warehouse/grn/sample-return"
      listLabel="GRN"
      recordName={grn.grnNo}
      recordCode={grn.sampleReturnNo || "Sample Return"}
      statusLabel={statusCfg.label}
      statusVariant={statusCfg.variant}
      metaItems={[
        { icon: User, label: `Customer: ${customerName}` },
        { icon: Building, label: `Warehouse: ${grn.warehouse || "—"}` },
        { icon: Calendar, label: grn.grnDate },
      ]}
      onEdit={canEdit ? () => router.push(`/warehouse/grn/sample-return/${id}/edit`) : undefined}
      editLabel="Edit GRN"
      secondaryAction={
        canStartQc
          ? {
              label: "Perform QC Check",
              onClick: () => router.push(`/warehouse/qc/create?grnId=${id}`),
            }
          : undefined
      }
    >
      <div className="w-full space-y-6">
        {grn.receiptRemarks && (
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-2">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2">
              Remarks
            </h2>
            <p className="text-xs text-foreground whitespace-pre-wrap">{grn.receiptRemarks}</p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2">
            Received Items
          </h2>
          <BatchDetailsReadOnlyTable
            batches={grn.batches}
            items={grn.items}
            variant="sample_return"
          />
        </div>

        <div className="w-full max-w-sm ml-auto rounded-xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border/60 bg-muted/20 px-4 py-2.5">
            <LayoutList className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Summary
            </h3>
          </div>
          <div className="p-3">
            <dl className="space-y-2">
              {[
                { label: "GRN Date", value: grn.grnDate || "—" },
                { label: "GRN Number", value: grn.grnNo, highlight: true },
                { label: "Customer", value: customerName },
                { label: "Warehouse", value: grn.warehouse || "—" },
                { label: "Received", value: totalReceivedLabel },
                { label: "Returned", value: totalOrderedLabel },
                { label: "Items", value: grn.items.length },
              ].map((item) => (
                <div key={item.label} className="flex justify-between gap-3 text-xs">
                  <dt className="text-muted-foreground flex-shrink-0">{item.label}</dt>
                  <dd
                    className={cn(
                      "text-right font-medium text-foreground min-w-0 break-words",
                      item.highlight && "font-semibold text-brand-700",
                    )}
                  >
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </RecordDetailPage>
  );
}
