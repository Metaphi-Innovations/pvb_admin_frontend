"use client";

import React from "react";
import { RecordDetailPage } from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Building,
  Landmark,
  Receipt,
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
import { getGrnDocumentStatus } from "@/lib/warehouse/document-status";
import {
  formatDisplayQuantity,
  fromBaseQuantity,
  resolvePackingSize,
  resolvePoGrnQuantityType,
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

export function PurchaseView({ id }: { id: string }) {
  const router = useRouter();
  const { data: grn, isLoading, isError, error } = useGrn(id);

  const qcRedirect = () => {
    router.push(`/warehouse/qc/create?grnId=${id}`);
  };

  if (isLoading) {
    return (
      <RecordDetailPage
        listHref="/warehouse/grn/purchase"
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
        listHref="/warehouse/grn/purchase"
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
            onClick={() => router.push("/warehouse/grn/purchase")}
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
  const docStatus = getGrnDocumentStatus(grn);
  const totalReceived = grn.items.reduce((sum, it) => sum + it.receivedQty, 0);
  const totalOrdered = grn.items.reduce((sum, it) => sum + it.orderedQty, 0);
  const canStartQc = grn.status !== "qc_completed";
  const canEdit = grn.status !== "qc_completed";

  const primaryInvoice = grn.supplierInvoices[0];
  const invoiceMeta =
    grn.invoiceNumber || primaryInvoice
      ? {
          invoiceNumber: grn.invoiceNumber || primaryInvoice?.fileName || "—",
          supplierName: grn.vendorName,
          invoiceDate: grn.invoiceDate || primaryInvoice?.uploadedAt || "—",
        }
      : undefined;

  return (
    <RecordDetailPage
      listHref="/warehouse/grn/purchase"
      listLabel="GRN"
      recordName={grn.grnNo}
      recordCode={grn.poNumber || undefined}
      statusLabel={statusCfg.label}
      statusVariant={statusCfg.variant}
      metaItems={[
        { icon: Landmark, label: grn.vendorName || "—" },
        { icon: Building, label: grn.warehouse || "—" },
        { icon: Calendar, label: grn.grnDate || "—" },
      ]}
      onEdit={canEdit ? () => router.push(`/warehouse/grn/purchase/${id}/edit`) : undefined}
      editLabel="Edit GRN"
      secondaryAction={
        canStartQc
          ? {
              label: "Perform QC Check",
              onClick: qcRedirect,
            }
          : undefined
      }
      sidebar={{
        summary: [
          { label: "PO Number", value: grn.poNumber || "—", highlight: true },
          { label: "Supplier", value: grn.vendorName || "—" },
          { label: "Delivery Challan", value: grn.deliveryChallan ?? "—" },
          { label: "Items", value: grn.items.length },
          { label: "Total Ordered", value: totalOrdered },
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
                  onClick: () => router.push(`/warehouse/grn/purchase/${id}/edit`),
                },
              ]
            : []),
          ...(canStartQc
            ? [
                {
                  label: "Perform QC Check",
                  icon: ClipboardCheck,
                  variant: "primary" as const,
                  onClick: qcRedirect,
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
            Document Status
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Read-only tracking for warehouse operations. Procurement matching is handled separately.
          </p>
          <div className="rounded-lg border border-border bg-muted/10 px-3">
            <DocumentStatusRow
              label="Purchase Order"
              value={docStatus.purchaseOrder.label}
              done={docStatus.purchaseOrder.value === "linked"}
            />
            <DocumentStatusRow
              label="Delivery Challan"
              value={docStatus.deliveryChallan.label}
              done={docStatus.deliveryChallan.value === "uploaded"}
            />
            <DocumentStatusRow
              label="Supplier Invoice"
              value={docStatus.supplierInvoice.label}
              done={docStatus.supplierInvoice.value === "uploaded"}
            />
            <DocumentStatusRow
              label="OCR Extraction"
              value={docStatus.ocrExtraction.label}
              done={docStatus.ocrExtraction.value === "completed"}
            />
            <DocumentStatusRow
              label="QC Status"
              value={docStatus.qcStatus.label}
              done={docStatus.qcStatus.value === "completed"}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "PO Number", val: grn.poNumber || "—", icon: Receipt },
            { label: "Supplier", val: grn.vendorName || "—", icon: Landmark },
            { label: "Warehouse", val: grn.warehouse || "—", icon: Building },
            { label: "GRN Date", val: grn.grnDate || "—", icon: Calendar },
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
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2">
            Order Items Summary
          </h2>
          {grn.items.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No items found.</p>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground">
                      Product
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground w-28">
                      SKU
                    </th>
                    <th className="px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">
                      Ordered
                    </th>
                    <th className="px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">
                      Prev. Received
                    </th>
                    <th className="px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">
                      Pending
                    </th>
                    <th className="px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">
                      Quantity Type
                    </th>
                    <th className="px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">
                      Current Received
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {grn.items.map((it, idx) => {
                    const packingSize =
                      resolvePackingSize({
                        unitPerPacking: it.unitPerPacking,
                      }) || 1;
                    const quantityType = resolvePoGrnQuantityType(it.quantityType);
                    const display = formatDisplayQuantity({
                      baseQty: it.receivedQty,
                      quantityType,
                      packingSize,
                    });
                    const displayOrdered = round2(
                      fromBaseQuantity({
                        baseQty: it.orderedQty,
                        quantityType,
                        packingSize,
                      }),
                    );
                    const displayPrevReceived = round2(
                      fromBaseQuantity({
                        baseQty: it.alreadyReceivedQty ?? 0,
                        quantityType,
                        packingSize,
                      }),
                    );
                    const displayPending = round2(
                      fromBaseQuantity({
                        baseQty: it.pendingQty ?? 0,
                        quantityType,
                        packingSize,
                      }),
                    );
                    return (
                    <tr
                      key={`${it.productId}-${it.poNumber}-${idx}`}
                      className="border-b border-border/50"
                    >
                      <td className="px-4 py-2 text-xs font-bold text-foreground">
                        {it.productName}
                      </td>
                      <td className="px-4 py-2 text-xs font-mono text-muted-foreground">
                        {it.productCode || "—"}
                      </td>
                      <td className="px-4 py-2 text-xs text-center font-medium text-muted-foreground">
                        {displayOrdered}
                      </td>
                      <td className="px-4 py-2 text-xs text-center text-muted-foreground">
                        {displayPrevReceived}
                      </td>
                      <td className="px-4 py-2 text-xs text-center font-medium text-amber-700">
                        {displayPending}
                      </td>
                      <td className="px-4 py-2 text-xs text-center font-medium text-muted-foreground">
                        {display.label}
                      </td>
                      <td className="px-4 py-2 text-xs text-center font-bold text-brand-700 bg-brand-50/20">
                        {round2(display.quantity)}
                        <span className="block text-[10px] font-normal text-muted-foreground">
                          ({it.receivedQty} base)
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {grn.batches.length > 0 && (
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2">
              Batch Details
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Read-only — batch and invoice line details captured at GRN creation.
            </p>
            <BatchDetailsReadOnlyTable
              batches={grn.batches}
              items={grn.items}
              invoiceMeta={invoiceMeta}
            />
          </div>
        )}
      </div>
    </RecordDetailPage>
  );
}
