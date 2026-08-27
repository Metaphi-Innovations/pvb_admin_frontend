"use client";

import React, { useEffect, useState } from "react";
import { RecordDetailPage } from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import {
  Calendar, Building, AlertCircle,
  Package, FileText, ClipboardCheck, User
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { PackingListService } from "@/services/packing-list.service";
import { PackingDoneService } from "@/services/packing-done.service";
import { STATUS_BADGE_CONFIG } from "../../constants";
import { PackingRecordUnion } from "../../types";
import { PackingProductsViewTable } from "../../components/PackingProductsViewTable";
import {
  getPackingDateLabel,
  getPackingDocumentNo,
  getPackingDocumentNoLabel,
  getPackingPartyLabel,
  getPackingPartyValue,
  getPackingQtyLabel,
  getPackingSectionTitle,
  getPackingWarehouseLabel,
  getPackingWarehouseValue,
  isPurchaseReturnDoc,
  isStockTransferDoc,
} from "../../lib/packing-document-labels";
import { resolvePackingReturnTo } from "../../lib/packing-list-nav";

function packingStatusVariant(status: string): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  const s = status.toLowerCase();
  if (s.includes("done") || s.includes("complete") || s.includes("packed")) return "active";
  if (s.includes("ready") || s.includes("pending")) return "draft";
  if (s.includes("cancel")) return "blocked";
  return "neutral";
}

export default function ViewPackingDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [unionRecord, setUnionRecord] = useState<PackingRecordUnion | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fallbackListHref = resolvePackingReturnTo(
    searchParams,
    undefined,
    "packing-done",
  );

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setNotFound(false);
      try {
        const pd = await PackingDoneService.getById(params.id);
        if (active) {
          setUnionRecord({ type: "packing", data: pd });
          setLoading(false);
        }
      } catch (err) {
        try {
          const pl = await PackingListService.getById(params.id);
          if (active) {
            setUnionRecord({ type: "order", data: pl });
            setLoading(false);
          }
        } catch (inner) {
          console.error("Failed to load details:", inner);
          if (active) {
            setUnionRecord(null);
            setNotFound(true);
            setLoading(false);
          }
        }
      }
    }
    load();
    return () => { active = false; };
  }, [params.id]);

  if (loading) {
    return (
      <RecordDetailPage
        listHref={fallbackListHref}
        listLabel="Packing"
        recordName="Loading…"
        statusLabel="Loading"
        statusVariant="neutral"
      >
        <div className="max-w-[800px] mx-auto text-center py-24 space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto" />
          <p className="text-xs text-muted-foreground">Loading packing details...</p>
        </div>
      </RecordDetailPage>
    );
  }

  if (notFound || !unionRecord) {
    return (
      <RecordDetailPage
        listHref={fallbackListHref}
        listLabel="Packing"
        recordName="Packing Record Not Found"
        statusLabel="Not Found"
        statusVariant="blocked"
      >
        <div className="max-w-[800px] mx-auto text-center py-12 space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-base font-bold text-foreground">Packing Record Not Found</h1>
          <p className="text-xs text-muted-foreground">The packing or sales order details record you requested does not exist.</p>
          <Button variant="outline" size="sm" onClick={() => router.push(fallbackListHref)}>
            Go Back
          </Button>
        </div>
      </RecordDetailPage>
    );
  }

  const { type, data } = unionRecord;
  const statusCfg = STATUS_BADGE_CONFIG[data.status] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: data.status };
  const rowData = data as any;
  const docType = rowData.sourceDocumentType;
  const isPurchaseReturn = isPurchaseReturnDoc(rowData);
  const isStockTransfer = isStockTransferDoc(rowData);
  const qtyLabel = getPackingQtyLabel(docType);

  const listHref = resolvePackingReturnTo(
    searchParams,
    docType,
    type === "packing" ? "packing-done" : "ready-for-packing",
  );

  return (
    <RecordDetailPage
      listHref={listHref}
      listLabel="Packing"
      recordName={
        type === "order"
          ? (isStockTransfer ? String(rowData.targetWarehouse ?? "Stock Transfer") : isPurchaseReturn ? String(rowData.customer ?? "Purchase Return") : String(rowData.customer ?? "Sales Order"))
          : String(rowData.packingNo ?? "Packing")
      }
      recordCode={
        type === "order"
          ? (isStockTransfer || isPurchaseReturn ? String(rowData.sourceDocumentNo ?? "") : String(rowData.salesOrderNo ?? ""))
          : // Avoid duplicating packing no in header meta — show source document instead
            String(getPackingDocumentNo(rowData) || "")
      }
      statusLabel={statusCfg.label}
      statusVariant={packingStatusVariant(data.status)}
      metaItems={[
        {
          icon: Building,
          label: String(
            isStockTransfer || isPurchaseReturn
              ? rowData.sourceWarehouse || data.warehouse
              : data.warehouse || "—",
          ),
        },
        ...(type === "order"
          ? [{ icon: Calendar, label: String(rowData.orderDate ?? "") }]
          : [{ icon: User, label: String(rowData.packedBy || "—") }]),
      ]}
      sidebar={
        // Packing Done info is already in the main Packing Information card — keep full width.
        type === "packing"
          ? undefined
          : {
              summary: [
                { label: getPackingPartyLabel(docType), value: getPackingPartyValue(rowData) },
                ...(isPurchaseReturn
                  ? [
                      { label: "PO No", value: String(rowData.poNumber ?? "—") },
                      { label: "Supplier Code", value: String(rowData.supplierCode ?? "—") },
                    ]
                  : []),
                { label: "Amount / Value", value: `₹${Number(rowData.orderAmount ?? 0).toLocaleString("en-IN")}`, highlight: true },
                { label: isPurchaseReturn ? "Return Date" : "Delivery Date", value: String(isPurchaseReturn ? rowData.orderDate : rowData.deliveryDate ?? "—") },
              ],
              quickActions: [],
            }
      }
    >
      <div className="space-y-6">

        {/* Sales Order / Stock Transfer View (Ready For Packing) */}
        {type === "order" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-border p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-brand-600" />
                {getPackingSectionTitle(docType)}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 pt-1">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    {getPackingDocumentNoLabel(docType)}
                  </p>
                  <p className="text-xs font-mono font-bold text-brand-700 mt-1">
                    {getPackingDocumentNo(rowData)}
                  </p>
                </div>
                {isPurchaseReturn && (
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                      Reference PO No.
                    </p>
                    <p className="text-xs font-mono font-bold text-foreground mt-1">{rowData.poNumber ?? "—"}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    {getPackingPartyLabel(docType)}
                  </p>
                  <p className="text-xs font-bold text-foreground mt-1">{getPackingPartyValue(rowData)}</p>
                  {isPurchaseReturn && rowData.supplierCode && (
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{rowData.supplierCode}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    {getPackingWarehouseLabel(docType)}
                  </p>
                  <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-muted-foreground/60" />
                    {getPackingWarehouseValue(rowData)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    {getPackingDateLabel(docType)}
                  </p>
                  <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                    {rowData.orderDate}
                  </p>
                </div>
                {!isPurchaseReturn && (
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Delivery Date</p>
                    <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                      {rowData.deliveryDate}
                    </p>
                  </div>
                )}
                {isPurchaseReturn && (
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Initiated By</p>
                    <p className="text-xs font-bold text-foreground mt-1">{rowData.initiatedBy ?? "—"}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Value Amount</p>
                  <p className="text-xs font-bold text-foreground mt-1">₹{Number(rowData.orderAmount).toLocaleString("en-IN")}</p>
                </div>
              </div>
              {isPurchaseReturn && rowData.returnRemarks && (
                <div className="pt-2 border-t border-border/60">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Return Remarks
                  </p>
                  <p className="text-xs text-foreground mt-1">{rowData.returnRemarks}</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-border p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-brand-600" />
                {isPurchaseReturn ? "Return Line Items" : "Product Details"}
              </h2>
              <PackingProductsViewTable
                products={rowData.products ?? []}
                qtyLabel={qtyLabel}
                showPending
              />
            </div>
          </div>
        )}

        {/* Completed Packing View (Packing Done) */}
        {type === "packing" && (
          <div className="space-y-6">
            {/* Header Information */}
            <div className="bg-white rounded-xl border border-border p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-brand-600" />
                Packing Information
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-1">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    {getPackingDocumentNoLabel(docType)}
                  </p>
                  <p className="text-xs font-mono font-bold text-slate-700 mt-1">
                    {getPackingDocumentNo(rowData) || "—"}
                  </p>
                </div>
                {isPurchaseReturn && (
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                      Reference PO No.
                    </p>
                    <p className="text-xs font-mono font-bold text-foreground mt-1">
                      {rowData.poNumber ? String(rowData.poNumber) : "—"}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    {getPackingPartyLabel(docType)}
                  </p>
                  <p className="text-xs font-bold text-foreground mt-1">
                    {getPackingPartyValue(rowData) || "—"}
                  </p>
                  {isPurchaseReturn && rowData.supplierCode && (
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{rowData.supplierCode}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    {getPackingWarehouseLabel(docType)}
                  </p>
                  <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-muted-foreground/60" />
                    {getPackingWarehouseValue(rowData) || data.warehouse || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Packing Date</p>
                  <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                    {rowData.packingDate || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Packed By</p>
                  <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-muted-foreground/60" />
                    {rowData.packedBy || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Packed Products Grid */}
            <div className="bg-white rounded-xl border border-border p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-brand-600" />
                Packed Products Details
              </h2>
              <PackingProductsViewTable
                products={rowData.products ?? []}
                qtyLabel={qtyLabel}
              />
            </div>
          </div>
        )}
      </div>
    </RecordDetailPage>
  );
}
