"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Building,
  Calendar,
  Layers,
  Package,
} from "lucide-react";
import {
  RecordDetailPage,
  RecordKvRow,
  RecordSectionCard,
} from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import { ListingAuditCell } from "@/components/listing";
import { StackedQtyDisplay, type QtyStackMeta } from "@/app/(app)/sales/shared/StackedQtyDisplay";
import { STATUS_BADGE_CONFIG } from "../../constants";
import { MoveToRejectedDialog, type MoveToRejectedTarget } from "../../components/MoveToRejectedDialog";
import {
  InventoryDetails,
  RejectedDetails,
  StockOverviewApi,
} from "../../services/stock-overview-api";

/** Remaining sellable on a batch row (UI splits into Available / Near / Expired). */
function batchMovableQty(row: {
  available_qty: number;
  near_expiry_qty: number;
  expired_qty: number;
}): number {
  return (
    Number(row.available_qty || 0) +
    Number(row.near_expiry_qty || 0) +
    Number(row.expired_qty || 0)
  );
}

const LIST_HREF = "/warehouse/stockoverview";

function stockStatusVariant(status: string): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  const s = status.toLowerCase();
  if (s.includes("available") || s.includes("reserved")) return "active";
  if (s.includes("reject") || s.includes("expired") || s.includes("low stock")) return "blocked";
  if (s.includes("near")) return "draft";
  if (s.includes("pending") || s.includes("progress") || s.includes("awaiting")) return "draft";
  if (s.includes("disposed") || s.includes("out of stock")) return "inactive";
  return "neutral";
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const raw = String(value);
  return raw.length >= 10 ? raw.slice(0, 10) : raw;
}

function toQtyMeta(details: InventoryDetails): QtyStackMeta {
  const unitsPerPacking = Number(details.unit_per_packing) || 1;
  const qtyType = String(details.quantity_type || "").trim().toLowerCase();
  const quantityType =
    qtyType === "piece" || qtyType === "pieces" || qtyType === "pcs" || qtyType === "unit"
      ? "Piece"
      : unitsPerPacking > 1
        ? "Case"
        : "Piece";

  return {
    unitsPerPacking: unitsPerPacking > 0 ? unitsPerPacking : 1,
    quantityType,
    uom: details.unit || details.product.uom || null,
    unitPackSize: details.pack_size != null && Number(details.pack_size) > 0 ? Number(details.pack_size) : null,
    netWeight: details.net_weight != null && Number(details.net_weight) > 0 ? Number(details.net_weight) : null,
  };
}

function StackedOrDash({
  qty,
  meta,
  tone,
}: {
  qty: number;
  meta: QtyStackMeta;
  tone?: "rose" | "amber";
}) {
  if (!qty || qty <= 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const toneClass =
    tone === "rose"
      ? "[&_p:first-child]:text-rose-700"
      : tone === "amber"
        ? "[&_p:first-child]:text-amber-700"
        : "";
  return (
    <StackedQtyDisplay
      baseQty={qty}
      meta={meta}
      layout="compact"
      className={`ml-auto ${toneClass}`}
    />
  );
}

export default function ViewStockDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params?.id;
  const isRejected = searchParams.get("type") === "rejected";
  const warehouseId = searchParams.get("warehouse_id") || undefined;

  const [inventoryDetails, setInventoryDetails] = useState<InventoryDetails | null>(null);
  const [rejectedDetails, setRejectedDetails] = useState<RejectedDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [moveTarget, setMoveTarget] = useState<MoveToRejectedTarget | null>(null);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setInventoryDetails(null);
    setRejectedDetails(null);

    const request = isRejected
      ? StockOverviewApi.getRejectedDetails(id, controller.signal).then((data) => {
          setRejectedDetails(data);
        })
      : StockOverviewApi.getInventoryDetails(id, {
          signal: controller.signal,
          warehouse_id: warehouseId,
        }).then((data) => {
          setInventoryDetails(data);
        });

    request
      .catch((err) => {
        if (controller.signal.aborted) return;
        setInventoryDetails(null);
        setRejectedDetails(null);
        setError(
          StockOverviewApi.getErrorMessage(
            err,
            isRejected ? "Failed to load rejected inventory details." : "Failed to load inventory details.",
          ),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id, isRejected, warehouseId, reloadNonce]);

  if (loading) {
    return (
      <RecordDetailPage
        listHref={LIST_HREF}
        listLabel="Stock Overview"
        recordName="Loading..."
        statusLabel="—"
        statusVariant="neutral"
      >
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {isRejected ? "Loading rejected inventory details..." : "Loading inventory details..."}
          </p>
        </div>
      </RecordDetailPage>
    );
  }

  if (error || (isRejected ? !rejectedDetails : !inventoryDetails)) {
    return (
      <RecordDetailPage
        listHref={LIST_HREF}
        listLabel="Stock Overview"
        recordName={isRejected ? "Rejected Inventory Not Found" : "Inventory Not Found"}
        statusLabel="Not Found"
        statusVariant="blocked"
      >
        <div className="max-w-[800px] mx-auto text-center py-12 space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-base font-bold text-foreground">
            {isRejected ? "Rejected Inventory Record Not Found" : "Inventory Record Not Found"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {error ||
              (isRejected
                ? "The rejected inventory record you requested does not exist or has been removed."
                : "The inventory record you requested does not exist or has been removed.")}
          </p>
          <Button variant="outline" size="sm" onClick={() => router.push(LIST_HREF)}>
            Go Back
          </Button>
        </div>
      </RecordDetailPage>
    );
  }

  if (isRejected && rejectedDetails) {
    const statusCfg =
      STATUS_BADGE_CONFIG[rejectedDetails.status] || {
        bg: "bg-slate-100 text-slate-700 border-slate-200",
        label: rejectedDetails.status || "—",
      };
    const sourceCfg =
      STATUS_BADGE_CONFIG[rejectedDetails.source_status || ""] || {
        bg: "bg-slate-100 text-slate-700 border-slate-200",
        label: rejectedDetails.source_status || "—",
      };

    return (
      <RecordDetailPage
        listHref={LIST_HREF}
        listLabel="Stock Overview"
        recordName={rejectedDetails.product.product_name || "—"}
        recordCode={rejectedDetails.batch_no || rejectedDetails.product.product_code || "—"}
        statusLabel={statusCfg.label}
        statusVariant={stockStatusVariant(rejectedDetails.status)}
        metaItems={[
          { icon: Building, label: rejectedDetails.warehouse.warehouse_name || "—" },
          { icon: Package, label: rejectedDetails.product.product_code || "—" },
        ]}
        sidebar={{
          summary: [
            {
              label: "Rejected Qty",
              value: rejectedDetails.rejected_qty.toLocaleString("en-IN"),
              highlight: true,
            },
            { label: "QC No.", value: rejectedDetails.qc_number || "—" },
            { label: "Source", value: sourceCfg.label },
            { label: "Reject Type", value: rejectedDetails.reject_type || "—" },
            { label: "Stock Status", value: statusCfg.label },
            { label: "Batch No.", value: rejectedDetails.batch_no || "—" },
          ],
        }}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RecordSectionCard title="Product & Batch" icon={Layers}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <RecordKvRow label="Product Name" value={rejectedDetails.product.product_name || "—"} highlight />
                <RecordKvRow label="Product Code" value={rejectedDetails.product.product_code || "—"} mono />
                <RecordKvRow label="Batch No." value={rejectedDetails.batch_no || "—"} mono />
                <RecordKvRow
                  label="Source"
                  value={
                    <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${sourceCfg.bg}`}>
                      {sourceCfg.label}
                    </span>
                  }
                />
                <RecordKvRow
                  label="Stock Status"
                  value={
                    <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${statusCfg.bg}`}>
                      {statusCfg.label}
                    </span>
                  }
                />
              </div>
            </RecordSectionCard>

            <RecordSectionCard title="Location & Rejection" icon={Building}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <RecordKvRow label="Warehouse" value={rejectedDetails.warehouse.warehouse_name || "—"} highlight />
                <RecordKvRow label="Warehouse Code" value={rejectedDetails.warehouse.warehouse_code || "—"} mono />
                <RecordKvRow
                  label="Rejected Qty"
                  value={rejectedDetails.rejected_qty.toLocaleString("en-IN")}
                />
                <RecordKvRow label="Reject Type" value={rejectedDetails.reject_type || "—"} />
                <RecordKvRow label="Reject Reason" value={rejectedDetails.reject_reason || "—"} />
              </div>
            </RecordSectionCard>
          </div>

          <RecordSectionCard title="QC Details" icon={Calendar}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <RecordKvRow label="QC No." value={rejectedDetails.qc_number || "—"} mono />
              <RecordKvRow label="Inspection Date" value={formatDate(rejectedDetails.inspection_date)} />
            </div>
          </RecordSectionCard>
        </div>
      </RecordDetailPage>
    );
  }

  const details = inventoryDetails!;
  const isProductBreakdown = Array.isArray(details.batches);

  // ── Product-level Inventory: one batch table ──────────────────────────────
  if (isProductBreakdown) {
    const meta = toQtyMeta(details);
    const productSku = details.product.sku || "—";

    return (
      <>
        <RecordDetailPage
          listHref={LIST_HREF}
          listLabel="Stock Overview"
          recordName={details.product.product_name || "—"}
          statusLabel=""
          hideStatus
          hideAvatar
          metaItems={[
            { label: details.warehouse.warehouse_name || "—" },
          ]}
        >
          <div className="overflow-x-auto rounded-lg border border-border bg-white">
            <table className="w-full min-w-[1180px] text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2.5 text-xs font-semibold text-foreground">SKU</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-foreground">Batch No</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-foreground">Mfg Date</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-foreground">Expiry</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-foreground text-right">Received</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-foreground text-right">Available</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-foreground text-right">Near Expiry</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-foreground text-right">Expired</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-foreground">Status</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-foreground text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {(details.batches || []).length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-10 text-center text-xs text-muted-foreground">
                      No batch lots found for this product.
                    </td>
                  </tr>
                ) : (
                  (details.batches || []).map((row, idx) => {
                    const rowStatus = row.status || row.condition || "Available";
                    const cfg =
                      STATUS_BADGE_CONFIG[rowStatus] || {
                        bg: "bg-slate-100 text-slate-700 border-slate-200",
                        label: rowStatus,
                      };
                    const movable = batchMovableQty(row);
                    return (
                      <tr
                        key={`${row.warehouse_id}_${row.batch_no}_${row.expiry_date || "none"}_${idx}`}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="px-3 py-2.5 font-mono text-xs text-foreground">
                          {row.sku || productSku}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs font-semibold text-brand-700">
                          {row.batch_no}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">
                          {formatDate(row.manufacture_date)}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">
                          {formatDate(row.expiry_date)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <StackedOrDash qty={row.received_qty} meta={meta} />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <StackedOrDash qty={row.available_qty} meta={meta} />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <StackedOrDash qty={row.near_expiry_qty} meta={meta} tone="amber" />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <StackedOrDash qty={row.expired_qty} meta={meta} tone="rose" />
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}
                          >
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {movable > 0 ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] text-rose-700 border-rose-200 hover:bg-rose-50"
                              onClick={() =>
                                setMoveTarget({
                                  productName: details.product.product_name || "—",
                                  batchNo: row.batch_no,
                                  availableQty: movable,
                                  availableCases:
                                    row.available_cases != null
                                      ? Number(row.available_cases)
                                      : null,
                                  status: rowStatus,
                                  qtyMeta: {
                                    ...meta,
                                    quantityType:
                                      row.quantity_type || meta.quantityType,
                                  },
                                  productId: details.id,
                                  warehouseId: row.warehouse_id || warehouseId,
                                  expiryDate: row.expiry_date,
                                })
                              }
                            >
                              Move to Rejected
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </RecordDetailPage>
        <MoveToRejectedDialog
          open={!!moveTarget}
          target={moveTarget}
          onClose={() => setMoveTarget(null)}
          onSuccess={() => setReloadNonce((n) => n + 1)}
        />
      </>
    );
  }

  // ── Legacy single-batch detail (Sales / Sample Return links) ──────────────
  const statusCfg =
    STATUS_BADGE_CONFIG[details.status] || {
      bg: "bg-slate-100 text-slate-700 border-slate-200",
      label: details.status || "—",
    };
  const sourceCfg =
    STATUS_BADGE_CONFIG[details.source_status || ""] || {
      bg: "bg-slate-100 text-slate-700 border-slate-200",
      label: details.source_status || "—",
    };

  return (
    <RecordDetailPage
      listHref={LIST_HREF}
      listLabel="Stock Overview"
      recordName={details.product.product_name || "—"}
      recordCode={details.batch_no || details.product.product_code || "—"}
      statusLabel={statusCfg.label}
      statusVariant={stockStatusVariant(details.status)}
      metaItems={[
        { icon: Building, label: details.warehouse.warehouse_name || "—" },
        { icon: Package, label: details.product.sku || details.product.product_code || "—" },
      ]}
      sidebar={{
        summary: [
          {
            label: "Available Qty",
            value: details.available_qty.toLocaleString("en-IN"),
            highlight: true,
          },
          {
            label: "Reserved Qty",
            value: details.reserved_qty.toLocaleString("en-IN"),
          },
          { label: "Source", value: sourceCfg.label },
          { label: "Stock Status", value: statusCfg.label },
          { label: "Batch No.", value: details.batch_no || "—" },
        ],
      }}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RecordSectionCard title="Product & Batch" icon={Layers}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <RecordKvRow label="Product Name" value={details.product.product_name || "—"} highlight />
              <RecordKvRow label="Product Code" value={details.product.product_code || "—"} mono />
              <RecordKvRow label="SKU" value={details.product.sku || "—"} mono />
              <RecordKvRow label="Batch No." value={details.batch_no || "—"} mono />
              <RecordKvRow
                label="Source"
                value={
                  <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${sourceCfg.bg}`}>
                    {sourceCfg.label}
                  </span>
                }
              />
              <RecordKvRow
                label="Stock Status"
                value={
                  <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${statusCfg.bg}`}>
                    {statusCfg.label}
                  </span>
                }
              />
            </div>
          </RecordSectionCard>

          <RecordSectionCard title="Location & Quantities" icon={Building}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <RecordKvRow label="Warehouse" value={details.warehouse.warehouse_name || "—"} highlight />
              <RecordKvRow label="Warehouse Code" value={details.warehouse.warehouse_code || "—"} mono />
              <RecordKvRow
                label="Available Qty"
                value={details.available_qty.toLocaleString("en-IN")}
              />
              <RecordKvRow
                label="Reserved Qty"
                value={details.reserved_qty.toLocaleString("en-IN")}
              />
            </div>
          </RecordSectionCard>
        </div>

        <RecordSectionCard title="Dates" icon={Calendar}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <RecordKvRow label="Manufacture Date" value={formatDate(details.manufacture_date)} />
            <RecordKvRow label="Expiry Date" value={formatDate(details.expiry_date)} />
          </div>
        </RecordSectionCard>

        <RecordSectionCard title="Audit">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                Created By
              </p>
              <ListingAuditCell
                name={details.created_by || undefined}
                date={formatDate(details.created_at)}
                variant="created"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                Updated By
              </p>
              <ListingAuditCell
                name={details.updated_by || undefined}
                date={formatDate(details.updated_at)}
                variant="updated"
              />
            </div>
          </div>
        </RecordSectionCard>
      </div>
    </RecordDetailPage>
  );
}
