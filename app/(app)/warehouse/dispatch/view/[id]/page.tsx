"use client";

import React, { useEffect, useState } from "react";
import { RecordDetailPage } from "@/components/record-detail";
import { Truck, Package, Building, User, Calendar, FileText, Download } from "lucide-react";
import { useParams } from "next/navigation";
import { getDispatchById } from "../../services";
import {
  mapDispatchToDeliveryChallan,
  openEditableDeliveryChallanPreview,
} from "../../dc-pdf/deliveryChallanPdf";
import {
  mapDispatchToTaxInvoice,
  openEditableTaxInvoicePreview,
} from "../../tax-invoice-pdf/taxInvoicePdf";
import {
  mapDispatchToStockTransfer,
  openEditableStockTransferPreview,
} from "../../stock-transfer-pdf/stockTransferPdf";
import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export default function ViewDispatchPage() {
  const params = useParams();
  const id = params?.id as string;

  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingChallan, setDownloadingChallan] = useState(false);
  const [downloadingTaxInvoice, setDownloadingTaxInvoice] = useState(false);
  const [downloadingStockTransfer, setDownloadingStockTransfer] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      getDispatchById(id)
        .then((data) => setRecord(data))
        .catch((err) => {
          console.error(err);
          alert("Failed to load dispatch details");
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading || !record) {
    return (
      <RecordDetailPage
        listHref="/warehouse/dispatch"
        listLabel="Dispatch"
        recordName="Dispatch Details"
        statusLabel={loading ? "Loading" : "Not Found"}
        statusVariant="neutral"
      >
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          {loading ? "Loading dispatch record..." : "Dispatch record not found"}
        </div>
      </RecordDetailPage>
    );
  }

  const statusVariant =
    record.status === "DISPATCHED" ? "active" :
    record.status === "DRAFT" ? "draft" : "neutral";

  const isSample =
    String(record.source_type || "").toLowerCase() === "sample_order" ||
    String(record.source_type || "").toLowerCase() === "sample";
  const isStockTransfer =
    String(record.source_type || "").toLowerCase() === "stock_transfer";
  const canDownloadInvoiceLike =
    String(record.status || "").toUpperCase() === "DISPATCHED" ||
    String(record.status || "").toUpperCase() === "DELIVERED" ||
    String(record.status || "").toUpperCase() === "CLOSED";

  const handleDownloadChallan = async () => {
    setDownloadingChallan(true);
    try {
      await openEditableDeliveryChallanPreview(
        mapDispatchToDeliveryChallan(record),
      );
    } catch (err) {
      console.error(err);
      alert("Failed to download delivery challan");
    } finally {
      setDownloadingChallan(false);
    }
  };

  const handleDownloadTaxInvoice = async () => {
    setDownloadingTaxInvoice(true);
    try {
      let salesOrder: Record<string, unknown> | null = null;
      const sourceId = record.source_id;
      const sourceType = String(record.source_type || "").toLowerCase();
      if (sourceId && (sourceType === "normal_sales" || sourceType === "sales_order")) {
        try {
          const soRes = await axiosInstance.get(
            API_ENDPOINTS.SALES.SALES_ORDER.DETAILS(String(sourceId)),
          );
          salesOrder = (soRes.data?.data || null) as Record<string, unknown> | null;
        } catch {
          salesOrder = null;
        }
      }
      await openEditableTaxInvoicePreview(
        mapDispatchToTaxInvoice(record, salesOrder),
      );
    } catch (err) {
      console.error(err);
      alert("Failed to download tax invoice");
    } finally {
      setDownloadingTaxInvoice(false);
    }
  };

  const handleDownloadStockTransfer = async () => {
    setDownloadingStockTransfer(true);
    try {
      let stockTransfer: Record<string, unknown> | null =
        (record.stock_transfer as Record<string, unknown>) || null;
      const sourceId = record.source_id;
      if (!stockTransfer && sourceId) {
        try {
          const stRes = await axiosInstance.get(
            API_ENDPOINTS.SALES.STOCK_TRANSFER.DETAILS(String(sourceId)),
          );
          stockTransfer = (stRes.data?.data || null) as Record<
            string,
            unknown
          > | null;
        } catch {
          stockTransfer = null;
        }
      }
      await openEditableStockTransferPreview(
        mapDispatchToStockTransfer(record, stockTransfer),
      );
    } catch (err) {
      console.error(err);
      alert("Failed to download stock transfer PDF");
    } finally {
      setDownloadingStockTransfer(false);
    }
  };

  return (
    <RecordDetailPage
      listHref="/warehouse/dispatch"
      listLabel="Dispatch"
      recordName={record.dispatch_number}
      recordCode={record.packing_done?.packing_done_no || ""}
      statusLabel={record.status}
      statusVariant={statusVariant}
      metaItems={[
        { icon: User, label: record.customer?.customer_name || record.source_type },
        { icon: Building, label: record.warehouse?.warehouse_name },
        { icon: Calendar, label: record.created_at ? new Date(record.created_at).toLocaleDateString() : "" },
      ]}
      sidebar={{
        summary: [
          { label: "Challan No", value: record.challan_number || "Assigned on download", highlight: true },
          { label: "Vehicle", value: record.vehicle_number, highlight: true },
          { label: "Driver", value: record.driver_name },
          { label: "Transporter", value: record.transporter || "—" },
          { label: "Products", value: record.items?.length || 0 },
        ],
        quickActions: isSample
          ? []
          : [
              {
                label: downloadingChallan ? "Downloading…" : "Download Challan",
                icon: downloadingChallan ? Download : FileText,
                onClick: handleDownloadChallan,
              },
              ...(canDownloadInvoiceLike && !isStockTransfer
                ? [
                    {
                      label: downloadingTaxInvoice
                        ? "Downloading…"
                        : "Download Tax Invoice",
                      icon: downloadingTaxInvoice ? Download : FileText,
                      onClick: handleDownloadTaxInvoice,
                    },
                  ]
                : []),
              ...(canDownloadInvoiceLike && isStockTransfer
                ? [
                    {
                      label: downloadingStockTransfer
                        ? "Downloading…"
                        : "Download Stock Transfer",
                      icon: downloadingStockTransfer ? Download : FileText,
                      onClick: handleDownloadStockTransfer,
                    },
                  ]
                : []),
            ],
      }}
    >
      <div className="space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { 
              label: "Packing No", 
              value: record.packing_done?.packing_done_no || "—", 
              icon: Package 
            },
            { 
              label: "Customer / Destination", 
              value: record.customer?.customer_name || record.source_type, 
              icon: User 
            },
            { 
              label: "Warehouse", 
              value: record.warehouse?.warehouse_name, 
              icon: Building 
            },
            { label: "Dispatch Date", value: record.dispatch_date ? new Date(record.dispatch_date).toLocaleDateString() : new Date(record.created_at).toLocaleDateString(), icon: Calendar },
          ].map(card => (
            <div key={card.label} className="bg-white border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
                  <card.icon className="w-3.5 h-3.5 text-brand-600" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</p>
              </div>
              <p className="text-sm font-bold text-foreground leading-tight">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Vehicle & Transport Details */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5 mb-4">
            <Truck className="w-4 h-4 text-brand-600" /> Vehicle & Transport Details
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {[
              { label: "Vehicle Number", value: record.vehicle_number },
              { label: "Driver Name", value: record.driver_name },
              { label: "Transporter Name", value: record.transporter || "—" },
              { label: "LR Number", value: record.lr_number || "—" },
            ].map(item => (
              <div key={item.label}>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{item.label}</p>
                <p className="text-sm font-bold text-foreground mt-1">{item.value || "—"}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Products */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5 mb-4">
            <Package className="w-4 h-4 text-brand-600" /> Dispatched Products
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-slate-50/60">
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Product</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">SKU</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Batch</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Dispatch Qty</th>
                </tr>
              </thead>
              <tbody>
                {record.items?.map((p: any, i: number) => {
                  const packSize = Number(p.product?.unit_per_packing || p.product?.conversion_rate || 1);
                  const baseQty = Number(p.dispatched_base_qty || 0);
                  const cases = Math.floor(baseQty / packSize);
                  return (
                  <tr key={i} className="border-b border-border/60 hover:bg-slate-50/40">
                    <td className="py-3 px-3 text-xs font-bold">{p.product?.product_name || "—"}</td>
                    <td className="py-3 px-3 text-xs font-mono font-bold text-brand-700">{p.product?.product_code || "—"}</td>
                    <td className="py-3 px-3 text-xs text-center">
                      {p.inventory_batch?.batch_no || "—"}
                      {p.packing_done_product?.quantity_type && p.packing_done_product?.quantity_type !== "N/A" && (
                        <span className="ml-1.5 font-mono text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded">
                          {p.packing_done_product?.quantity_type}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-xs font-bold text-center">
                      <span className="text-emerald-700">{cases > 0 ? cases : baseQty} {cases > 0 && packSize > 1 ? "Cases" : "Units"}</span>
                      {packSize > 1 && cases > 0 && <span className="text-muted-foreground ml-1 text-[10px]">({baseQty} Units)</span>}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RecordDetailPage>
  );
}
