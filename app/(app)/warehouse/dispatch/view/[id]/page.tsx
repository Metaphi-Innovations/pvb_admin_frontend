"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RecordDetailPage } from "@/components/record-detail";
import { Truck, Package, Building, User, Calendar, FileText } from "lucide-react";
import { useParams } from "next/navigation";
import {
  generateDispatchEwayBill,
  getDispatchById,
  previewDispatchEwayBill,
  type DispatchPreviewEwayBillResult,
} from "../../services";
import {
  formatPackingDates,
  resolveProductSku,
} from "../../dispatch-display-utils";
import { showToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { EwayBillPreviewDialog } from "@/app/(app)/accounts/invoices/components/EwayBillPreviewDialog";
import type { PreviewEwayBillResult } from "@/services/sales-invoice.service";

function normalizeGstin(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function formatDisplayDate(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function qrImageSrc(raw?: string | null): string | null {
  const signed = (raw || "").trim();
  if (!signed) return null;
  if (signed.startsWith("data:") || /^https?:\/\//i.test(signed)) return signed;
  return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(signed)}`;
}

export default function ViewDispatchPage() {
  const params = useParams();
  const id = params?.id as string;

  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ewayPreviewOpen, setEwayPreviewOpen] = useState(false);
  const [ewayPreviewLoading, setEwayPreviewLoading] = useState(false);
  const [ewayBusy, setEwayBusy] = useState(false);
  const [ewayPreview, setEwayPreview] =
    useState<DispatchPreviewEwayBillResult | null>(null);

  const refresh = useCallback(() => {
    if (!id) return Promise.resolve();
    return getDispatchById(id)
      .then((data) => setRecord(data))
      .catch((err) => {
        console.error(err);
        showToast("Failed to load dispatch details", "error");
      });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [id, refresh]);

  const isStockTransfer = record?.source_type === "stock_transfer";
  const hasSalesInvoice = Boolean(
    record?.sales_invoice?.sales_invoice_id &&
      !record?.sales_invoice?.is_deleted,
  );

  const sameGstin = useMemo(() => {
    if (!isStockTransfer || !record?.stock_transfer) return false;
    const from = normalizeGstin(
      record.stock_transfer.from_warehouse?.gst_number ??
        record.stock_transfer.from_warehouse?.gstin,
    );
    const to = normalizeGstin(
      record.stock_transfer.to_warehouse?.gst_number ??
        record.stock_transfer.to_warehouse?.gstin,
    );
    return Boolean(from && to && from === to);
  }, [isStockTransfer, record]);

  const ewayNumber = String(record?.eway_bill_number || "").trim();
  const canGenerateEway =
    isStockTransfer &&
    sameGstin &&
    !hasSalesInvoice &&
    !ewayNumber &&
    (record?.status === "Ready for Dispatch" ||
      record?.status === "DISPATCHED" ||
      record?.status === "DELIVERED");

  const showEwaySection =
    isStockTransfer && sameGstin && !hasSalesInvoice;

  const handleOpenEwayPreview = async () => {
    if (!id || ewayBusy || ewayPreviewLoading) return;
    setEwayPreviewLoading(true);
    setEwayPreview(null);
    setEwayPreviewOpen(true);
    try {
      const preview = await previewDispatchEwayBill(id);
      setEwayPreview(preview);
      if (preview.already_generated) {
        showToast(
          "E-Way Bill was already generated for this Dispatch.",
          "success",
        );
      }
    } catch (e) {
      setEwayPreviewOpen(false);
      showToast(
        e instanceof Error ? e.message : "Failed to preview E-Way Bill.",
        "error",
      );
    } finally {
      setEwayPreviewLoading(false);
    }
  };

  const handleConfirmGenerateEway = async () => {
    if (!id || ewayBusy) return;
    setEwayBusy(true);
    try {
      const result = await generateDispatchEwayBill(id);
      showToast(
        result.already_generated
          ? "E-Way Bill was already generated for this Dispatch."
          : "E-Way Bill generated successfully.",
        "success",
      );
      setEwayPreviewOpen(false);
      setEwayPreview(null);
      await refresh();
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Failed to generate E-Way Bill.",
        "error",
      );
    } finally {
      setEwayBusy(false);
    }
  };

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
    record.status === "DISPATCHED" || record.status === "Ready for Dispatch"
      ? "active"
      : record.status === "DRAFT"
        ? "draft"
        : "neutral";

  const packingNos = (
    Array.isArray(record.packing_dones) && record.packing_dones.length > 0
      ? record.packing_dones.map((pd: any) => pd.packing_done_no).filter(Boolean)
      : [record.packing_done?.packing_done_no].filter(Boolean)
  ) as string[];
  const packingLabel = packingNos.length > 0 ? packingNos.join(", ") : "—";
  const packingDates = formatPackingDates(
    Array.isArray(record.packing_dones) && record.packing_dones.length > 0
      ? record.packing_dones
      : record.packing_done?.packing_date
        ? [record.packing_done]
        : [],
  );

  const qrSrc = qrImageSrc(record.eway_bill_qr_code);

  const dialogPreview: PreviewEwayBillResult | null = ewayPreview
    ? {
        already_generated: ewayPreview.already_generated,
        flow: ewayPreview.flow,
        dispatch_id: ewayPreview.dispatch_id,
        dispatch_number: ewayPreview.dispatch_number,
        challan_number: ewayPreview.challan_number,
        transfer_no: ewayPreview.transfer_no,
        eway_bill_number: ewayPreview.eway_bill_number,
        eway_bill_date: ewayPreview.eway_bill_date,
        eway_bill_valid_upto: ewayPreview.eway_bill_valid_upto,
        eway_bill_status: ewayPreview.eway_bill_status,
        summary: ewayPreview.summary,
        payload: ewayPreview.payload,
      }
    : null;

  return (
    <>
      <RecordDetailPage
        listHref="/warehouse/dispatch"
        listLabel="Dispatch"
        recordName={record.dispatch_number}
        recordCode={packingLabel === "—" ? "" : packingLabel}
        statusLabel={record.status}
        statusVariant={statusVariant}
        metaItems={[
          { icon: User, label: record.customer?.customer_name || record.source_type },
          { icon: Building, label: record.warehouse?.warehouse_name },
          {
            icon: Calendar,
            label: record.dispatch_date
              ? new Date(record.dispatch_date).toLocaleDateString()
              : record.created_at
                ? new Date(record.created_at).toLocaleDateString()
                : "",
          },
        ]}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              {
                label: packingNos.length > 1 ? "Packing Nos" : "Packing No",
                value: packingLabel,
                icon: Package,
              },
              {
                label: packingDates.includes(",") ? "Packing Done Dates" : "Packing Done Date",
                value: packingDates,
                icon: Calendar,
              },
              {
                label: "Customer / Destination",
                value: record.customer?.customer_name || record.source_type,
                icon: User,
              },
              {
                label: "Warehouse",
                value: record.warehouse?.warehouse_name,
                icon: Building,
              },
              {
                label: "Dispatch Date",
                value: record.dispatch_date
                  ? new Date(record.dispatch_date).toLocaleDateString()
                  : new Date(record.created_at).toLocaleDateString(),
                icon: Calendar,
              },
            ].map((card) => (
              <div key={card.label} className="bg-white border border-border rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
                    <card.icon className="w-3.5 h-3.5 text-brand-600" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {card.label}
                  </p>
                </div>
                <p className="text-sm font-bold text-foreground leading-tight">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5 mb-4">
              <Truck className="w-4 h-4 text-brand-600" /> Vehicle & Transport Details
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {[
                { label: "Transport Mode", value: record.transport_mode },
                { label: "Transporter Name", value: record.transporter },
                { label: "Transporter ID", value: record.transporter_id },
                { label: "Vehicle Number", value: record.vehicle_number },
                {
                  label: "Distance (KM)",
                  value:
                    record.approx_distance != null && record.approx_distance !== ""
                      ? String(record.approx_distance)
                      : null,
                },
                { label: "LR Number", value: record.lr_number },
                {
                  label: "LR Date",
                  value: record.lr_date
                    ? new Date(record.lr_date).toLocaleDateString()
                    : null,
                },
                { label: "Transport Doc No.", value: record.transport_doc_number },
                {
                  label: "Transport Doc Date",
                  value: record.transport_doc_date
                    ? new Date(record.transport_doc_date).toLocaleDateString()
                    : null,
                },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    {item.label}
                  </p>
                  <p className="text-sm font-bold text-foreground mt-1">
                    {item.value || "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {showEwaySection ? (
            <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-2">
                <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand-600" /> E-Way Bill
                </h2>
                {canGenerateEway ? (
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    disabled={ewayBusy || ewayPreviewLoading}
                    onClick={() => void handleOpenEwayPreview()}
                  >
                    {ewayPreviewLoading ? "Preparing…" : "Generate E-Way Bill"}
                  </Button>
                ) : null}
              </div>
              {ewayNumber ? (
                <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <span className="text-muted-foreground">EWB No.</span>
                      <span className="font-mono font-semibold">{ewayNumber}</span>
                    </div>
                    {record.eway_bill_date ? (
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">EWB Date</span>
                        <span>{formatDisplayDate(record.eway_bill_date)}</span>
                      </div>
                    ) : null}
                    {record.eway_bill_valid_upto ? (
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">Valid Upto</span>
                        <span>{formatDisplayDate(record.eway_bill_valid_upto)}</span>
                      </div>
                    ) : null}
                    {record.eway_bill_status ? (
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">Status</span>
                        <span className="capitalize">{record.eway_bill_status}</span>
                      </div>
                    ) : null}
                  </div>
                  {qrSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrSrc}
                      alt="E-Way Bill QR"
                      className="h-[120px] w-[120px] rounded border border-border bg-white p-1"
                    />
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Same-GSTIN stock transfer — generate a standalone E-Way Bill on
                  this Delivery Challan (no Sales Invoice / IRN).
                </p>
              )}
            </div>
          ) : null}

          <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5 mb-4">
              <Package className="w-4 h-4 text-brand-600" /> Dispatched Products
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-slate-50/60">
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Product
                    </th>
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                      Batch
                    </th>
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                      Dispatch Qty
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {record.items?.map((p: any, i: number) => {
                    const packSize = Number(
                      p.product?.unit_per_packing || p.product?.conversion_rate || 1,
                    );
                    const baseQty = Number(p.dispatched_base_qty || 0);
                    const cases = Math.floor(baseQty / packSize);
                    return (
                      <tr key={i} className="border-b border-border/60 hover:bg-slate-50/40">
                        <td className="py-3 px-3 text-xs font-bold">
                          {p.product?.product_name || "—"}
                        </td>
                        <td className="py-3 px-3 text-xs font-mono font-bold text-brand-700">
                          {resolveProductSku({
                            sku: p.product?.sku,
                            product_code: p.product?.product_code,
                            product_snapshot: p.product_snapshot,
                          })}
                        </td>
                        <td className="py-3 px-3 text-xs text-center">
                          {p.inventory_batch?.batch_no || "—"}
                          {p.packing_done_product?.quantity_type &&
                            p.packing_done_product?.quantity_type !== "N/A" && (
                              <span className="ml-1.5 font-mono text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded">
                                {p.packing_done_product?.quantity_type}
                              </span>
                            )}
                        </td>
                        <td className="py-3 px-3 text-xs font-bold text-center">
                          <span className="text-emerald-700">
                            {cases > 0 ? cases : baseQty}{" "}
                            {cases > 0 && packSize > 1 ? "Cases" : "Units"}
                          </span>
                          {packSize > 1 && cases > 0 && (
                            <span className="text-muted-foreground ml-1 text-[10px]">
                              ({baseQty} Units)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </RecordDetailPage>

      <EwayBillPreviewDialog
        open={ewayPreviewOpen}
        onClose={() => {
          if (ewayBusy) return;
          setEwayPreviewOpen(false);
          setEwayPreview(null);
        }}
        preview={dialogPreview}
        loading={ewayPreviewLoading}
        generating={ewayBusy}
        onConfirmGenerate={handleConfirmGenerateEway}
      />
    </>
  );
}
