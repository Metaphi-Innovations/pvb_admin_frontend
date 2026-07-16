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

export function StockTransferView({ id }: { id: string }) {
  const router = useRouter();
  const { data: grn, isLoading, isError, error } = useGrn(id);

  if (isLoading) {
    return (
      <RecordDetailPage
        listHref="/warehouse/grn/stock-transfer"
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
        listHref="/warehouse/grn/stock-transfer"
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
            onClick={() => router.push("/warehouse/grn/stock-transfer")}
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

  return (
    <RecordDetailPage
      listHref="/warehouse/grn/stock-transfer"
      listLabel="GRN"
      recordName={grn.grnNo}
      recordCode={grn.stockTransferNo || "Stock Transfer"}
      statusLabel={statusCfg.label}
      statusVariant={statusCfg.variant}
      metaItems={[
        { icon: Building, label: `From: ${grn.fromWarehouse || "—"}` },
        { icon: Building, label: `To: ${grn.toWarehouse || grn.warehouse || "—"}` },
        { icon: Calendar, label: grn.grnDate },
      ]}
      onEdit={canEdit ? () => router.push(`/warehouse/grn/stock-transfer/${id}/edit`) : undefined}
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
          { label: "GRN Number", value: grn.grnNo, highlight: true },
          { label: "Warehouse", value: grn.warehouse || "—" },
          { label: "From Warehouse", value: grn.fromWarehouse || "—" },
          { label: "To Warehouse", value: grn.toWarehouse || grn.warehouse || "—" },
          { label: "GRN Date", value: grn.grnDate || "—" },
          { label: "Items Received", value: grn.items.length },
          { label: "Total Dispatched", value: totalOrdered },
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
                  onClick: () => router.push(`/warehouse/grn/stock-transfer/${id}/edit`),
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
            Read-only tracking for stock transfer receipt and quality control verification.
          </p>
          <div className="pt-1">
            <DocumentStatusRow
              label="GRN Receipt"
              value="Completed"
              done
            />
            <DocumentStatusRow
              label="QC Status"
              value={statusCfg.label}
              done={grn.status === "qc_completed"}
            />
          </div>
        </div>

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
                    Ordered
                  </th>
                  <th className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">
                    Quantity Type
                  </th>
                  <th className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">
                    Received
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
                  const displayOrdered = round2(
                    fromBaseQuantity({
                      baseQty: item.orderedQty || 0,
                      quantityType,
                      packingSize,
                    }),
                  );
                  return (
                    <tr key={`${item.productId}-${idx}`} className="hover:bg-muted/10">
                      <td className="p-2 text-xs font-semibold text-foreground">{item.productName}</td>
                      <td className="p-2 text-xs font-mono text-muted-foreground">
                        {item.productCode || "—"}
                      </td>
                      <td className="p-2 text-xs text-right tabular-nums">{displayOrdered}</td>
                      <td className="p-2 text-xs text-center text-muted-foreground">
                        {display.label}
                      </td>
                      <td className="p-2 text-xs text-right tabular-nums font-semibold text-brand-600">
                        {round2(display.quantity)}
                        <span className="block text-[10px] font-normal text-muted-foreground">
                          ({item.receivedQty} base)
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <BatchDetailsReadOnlyTable batches={grn.batches} items={grn.items} />
      </div>
    </RecordDetailPage>
  );
}
