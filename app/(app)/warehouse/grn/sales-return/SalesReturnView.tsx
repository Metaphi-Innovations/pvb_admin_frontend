"use client";

import React from "react";
import { RecordDetailPage } from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Building,
  AlertCircle,
  ClipboardCheck,
  FileText,
  CheckCircle2,
  Clock,
  User,
  Reply,
  Pencil,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { BatchDetailsReadOnlyTable } from "../shared/components/BatchDetailsReadOnlyTable";
import { cn } from "@/lib/utils";
import { useGrn } from "@/hooks/warehouse/use-grn";
import {
  formatDisplayQuantity,
  fromBaseQuantity,
  resolveGrnQuantityType,
  resolvePackingSize,
} from "@/lib/warehouse/grn-quantity";
import { round2 } from "@/lib/procurement/utils";

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

function DocumentStatusRow({
  label,
  value,
  done,
}: {
  label: string;
  value: string;
  done: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/60 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
          done
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-amber-50 text-amber-700 border-amber-200",
        )}
      >
        {done ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
        {value}
      </span>
    </div>
  );
}

export function SalesReturnView({ id }: { id: string }) {
  const router = useRouter();
  const { data: grn, isLoading, isError, error } = useGrn(id);

  if (isLoading) {
    return (
      <RecordDetailPage
        listHref="/warehouse/grn/sales-return"
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
        listHref="/warehouse/grn/sales-return"
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
            onClick={() => router.push("/warehouse/grn/sales-return")}
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

  const totalReceived = grn.items.reduce((sum, it) => sum + it.receivedQty, 0);
  const totalOrdered = grn.items.reduce((sum, it) => sum + (it.orderedQty || 0), 0);
  const canStartQc = grn.status !== "qc_completed";
  const canEdit = grn.status !== "qc_completed";
  const customerName = grn.customerName || grn.vendorName || "—";

  return (
    <RecordDetailPage
      listHref="/warehouse/grn/sales-return"
      listLabel="GRN"
      recordName={grn.grnNo}
      recordCode={grn.salesReturnNo || "Sales Return"}
      statusLabel={statusCfg.label}
      statusVariant={statusCfg.variant}
      metaItems={[
        { icon: User, label: `Customer: ${customerName}` },
        { icon: Building, label: `Warehouse: ${grn.warehouse || "—"}` },
        { icon: Calendar, label: grn.grnDate },
      ]}
      onEdit={canEdit ? () => router.push(`/warehouse/grn/sales-return/${id}/edit`) : undefined}
      editLabel="Edit GRN"
      secondaryAction={
        canStartQc
          ? {
              label: "Perform QC Check",
              onClick: () => router.push(`/warehouse/qc/create?grnId=${id}`),
            }
          : undefined
      }
      sidebar={{
        summary: [
          { label: "Sales Return No.", value: grn.salesReturnNo || "—", highlight: true },
          { label: "Customer", value: customerName },
          { label: "Warehouse", value: grn.warehouse || "—" },
          { label: "GRN Date", value: grn.grnDate || "—" },
          { label: "Items Received", value: grn.items.length },
          { label: "Total Returned", value: totalOrdered },
          { label: "Total Received", value: totalReceived },
          { label: "Batches", value: grn.batches.length },
        ],
        quickActions: [
          ...(canEdit
            ? [
                {
                  label: "Edit GRN",
                  icon: Pencil,
                  variant: "outline" as const,
                  onClick: () => router.push(`/warehouse/grn/sales-return/${id}/edit`),
                },
              ]
            : []),
          ...(canStartQc
            ? [
                {
                  label: "Perform QC Check",
                  icon: ClipboardCheck,
                  variant: "primary" as const,
                  onClick: () => router.push(`/warehouse/qc/create?grnId=${id}`),
                },
              ]
            : []),
        ],
      }}
    >
      <div className="w-full space-y-6">
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-600" />
            Receipt Verification Status
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Read-only tracking for sales return receipt and quality control verification.
          </p>
          <div className="rounded-lg border border-border bg-muted/10 px-3">
            <DocumentStatusRow label="Sales Return Request" value="Created" done={true} />
            <DocumentStatusRow
              label="Physical Return Inward"
              value={
                totalReceived >= totalOrdered && totalOrdered > 0
                  ? "Fully Received"
                  : "Partially Received"
              }
              done={totalReceived >= totalOrdered && totalOrdered > 0}
            />
            <DocumentStatusRow
              label="QC Verification Status"
              value={grn.status === "qc_completed" ? "QC Completed" : "Pending QC"}
              done={grn.status === "qc_completed"}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Sales Return No.", val: grn.salesReturnNo || "—", icon: Reply },
            { label: "Customer", val: customerName, icon: User },
            { label: "Warehouse", val: grn.warehouse || "—", icon: Building },
            { label: "Receipt Date", val: grn.grnDate, icon: Calendar },
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl border border-border p-3 flex items-center gap-3 shadow-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none">
                    {card.label}
                  </p>
                  <p className="text-xs font-bold text-foreground mt-1 truncate max-w-[140px]">
                    {card.val}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2">
            Items Received
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Product
                  </th>
                  <th className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    SKU
                  </th>
                  <th className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">
                    Returned Qty
                  </th>
                  <th className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">
                    Quantity Type
                  </th>
                  <th className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">
                    Received Qty
                  </th>
                  <th className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Unit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {grn.items.map((item, idx) => {
                  const packingSize =
                    resolvePackingSize({ unitPerPacking: item.unitPerPacking }) || 1;
                  const quantityType = resolveGrnQuantityType(item.quantityType);
                  const display = formatDisplayQuantity({
                    baseQty: item.receivedQty,
                    quantityType,
                    packingSize,
                  });
                  const displayReturned = round2(
                    fromBaseQuantity({
                      baseQty: item.orderedQty || 0,
                      quantityType,
                      packingSize,
                    }),
                  );
                  return (
                    <tr key={idx} className="hover:bg-muted/10">
                      <td className="p-2 text-xs font-semibold text-foreground">{item.productName}</td>
                      <td className="p-2 text-xs font-mono text-muted-foreground">
                        {item.productCode}
                      </td>
                      <td className="p-2 text-xs text-right tabular-nums">
                        {displayReturned.toLocaleString()}
                      </td>
                      <td className="p-2 text-xs text-center text-muted-foreground">
                        {display.label}
                      </td>
                      <td className="p-2 text-xs font-semibold text-right tabular-nums text-brand-600">
                        {round2(display.quantity).toLocaleString()}
                        <span className="block text-[10px] font-normal text-muted-foreground">
                          ({item.receivedQty} base)
                        </span>
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">{item.unit || "Unit"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {grn.batches.length > 0 && (
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2">
              Batch Details
            </h3>
            <BatchDetailsReadOnlyTable batches={grn.batches} items={grn.items} />
          </div>
        )}

        {grn.receiptRemarks && (
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2">
              Receipt Remarks
            </h3>
            <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/50">
              {grn.receiptRemarks}
            </p>
          </div>
        )}
      </div>
    </RecordDetailPage>
  );
}
