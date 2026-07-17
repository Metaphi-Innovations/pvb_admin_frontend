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
import { STATUS_BADGE_CONFIG } from "../../constants";
import {
  InventoryDetails,
  RejectedDetails,
  StockOverviewApi,
} from "../../services/stock-overview-api";

function stockStatusVariant(status: string): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  const s = status.toLowerCase();
  if (s.includes("available") || s.includes("reserved")) return "active";
  if (s.includes("reject") || s.includes("expired") || s.includes("low stock")) return "blocked";
  if (s.includes("pending") || s.includes("progress") || s.includes("awaiting")) return "draft";
  if (s.includes("disposed") || s.includes("out of stock")) return "inactive";
  return "neutral";
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const raw = String(value);
  return raw.length >= 10 ? raw.slice(0, 10) : raw;
}

export default function ViewStockDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params?.id;
  const isRejected = searchParams.get("type") === "rejected";

  const [inventoryDetails, setInventoryDetails] = useState<InventoryDetails | null>(null);
  const [rejectedDetails, setRejectedDetails] = useState<RejectedDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      : StockOverviewApi.getInventoryDetails(id, controller.signal).then((data) => {
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
  }, [id, isRejected]);

  if (loading) {
    return (
      <RecordDetailPage
        listHref="/warehouse/stock-overview"
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
        listHref="/warehouse/stock-overview"
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
          <Button variant="outline" size="sm" onClick={() => router.push("/warehouse/stock-overview")}>
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

    return (
      <RecordDetailPage
        listHref="/warehouse/stock-overview"
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
            { label: "Status", value: statusCfg.label },
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
                  label="Status"
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
  const statusCfg =
    STATUS_BADGE_CONFIG[details.status] || {
      bg: "bg-slate-100 text-slate-700 border-slate-200",
      label: details.status || "—",
    };

  return (
    <RecordDetailPage
      listHref="/warehouse/stock-overview"
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
          { label: "Stock Status", value: statusCfg.label },
          { label: "Batch No.", value: details.batch_no || "—" },
        ],
      }}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RecordSectionCard
            title="Product & Batch"
            icon={Layers}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <RecordKvRow label="Product Name" value={details.product.product_name || "—"} highlight />
              <RecordKvRow label="Product Code" value={details.product.product_code || "—"} mono />
              <RecordKvRow label="SKU" value={details.product.sku || "—"} mono />
              <RecordKvRow label="Batch No." value={details.batch_no || "—"} mono />
              <RecordKvRow
                label="Status"
                value={
                  <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${statusCfg.bg}`}>
                    {statusCfg.label}
                  </span>
                }
              />
            </div>
          </RecordSectionCard>

          <RecordSectionCard
            title="Location & Quantities"
            icon={Building}
          >
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
