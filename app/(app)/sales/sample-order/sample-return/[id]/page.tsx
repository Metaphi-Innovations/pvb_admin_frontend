"use client";

import React from "react";
import { useParams } from "next/navigation";
import { Package } from "lucide-react";
import { RecordDetailPage } from "@/components/record-detail";
import { useSampleReturn } from "@/hooks/sales/use-return-documents";
import { formatReturnAmount } from "../../sample-return-data";
import { calcReturnLineAmount } from "../../sample-return-utils";

export default function SampleReturnViewPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: record, isLoading } = useSampleReturn(id);

  const listHref = "/sales/sample-order?tab=sales_return";

  if (isLoading) {
    return (
      <RecordDetailPage
        listHref={listHref}
        listLabel="Sample Returns"
        recordName="Sample Return"
        statusLabel="Loading"
        statusVariant="neutral"
      >
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          Loading…
        </div>
      </RecordDetailPage>
    );
  }

  if (!record) {
    return (
      <RecordDetailPage
        listHref={listHref}
        listLabel="Sample Returns"
        recordName="Sample Return"
        statusLabel="Not Found"
        statusVariant="neutral"
      >
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          Sample return record not found.
        </div>
      </RecordDetailPage>
    );
  }

  const displayStatus = record.status || "DRAFT";
  const statusLabelMap: Record<string, string> = {
    DRAFT: "Draft",
    SUBMITTED: "Submitted",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    RECEIVED: "Received",
    CANCELLED: "Cancelled",
  };
  const statusVariantMap: Record<string, "neutral" | "active" | "inactive"> = {
    DRAFT: "neutral",
    SUBMITTED: "neutral",
    APPROVED: "active",
    REJECTED: "inactive",
    RECEIVED: "active",
    CANCELLED: "inactive",
  };

  const getReturnTotalAmount = (r: typeof record) => {
    return r.items.reduce(
      (sum, p) => sum + (p.amount ?? p.returnedQty * (p.unitPerPacking * (p.amount ?? 0))),
      0,
    );
  };

  return (
    <RecordDetailPage
      listHref={listHref}
      listLabel="Sample Returns"
      recordName={record.returnNumber}
      recordCode={record.salesOrderNumber}
      statusLabel={statusLabelMap[displayStatus] || displayStatus}
      statusVariant={statusVariantMap[displayStatus] || "neutral"}
      metaItems={[
        { label: record.customerName },
        { label: record.dispatchNumber },
        { label: record.returnDate },
      ]}
      sidebar={{
        summary: [
          { label: "Dispatch No", value: record.dispatchNumber, highlight: true },
          { label: "Sample Order", value: record.salesOrderNumber },
          { label: "Warehouse", value: record.warehouseName },
          { label: "Return Value", value: formatReturnAmount(getReturnTotalAmount(record)) },
        ],
      }}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Return Date", value: record.returnDate },
            { label: "Dispatch No", value: record.dispatchNumber },
            { label: "Sample Order No", value: record.salesOrderNumber },
            { label: "Customer / Farmer", value: record.customerName },
          ].map((card) => (
            <div key={card.label} className="bg-white border border-border rounded-xl p-3 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</p>
              <p className="text-xs font-bold text-foreground mt-1">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5 mb-4">
            <Package className="w-4 h-4 text-brand-600" /> Returned Products
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-slate-50/60">
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Product</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">SKU</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Dispatch Qty</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Return Qty</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Remarks</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Value (₹)</th>
                </tr>
              </thead>
              <tbody>
                {record.items.map((p, idx) => (
                  <tr key={idx} className="border-b border-border/60">
                    <td className="py-3 px-3 text-xs font-bold">{p.productName}</td>
                    <td className="py-3 px-3 text-xs font-mono font-bold text-brand-700">{p.sku}</td>
                    <td className="py-3 px-3 text-xs font-bold text-center">{p.dispatchQty} Cases</td>
                    <td className="py-3 px-3 text-xs font-bold text-center text-red-600">
                      {p.quantityType === "PIECE"
                        ? `${p.returnedBaseQty} Pieces`
                        : `${p.returnedQty} Cases`}
                    </td>
                    <td className="py-3 px-3 text-xs text-right text-muted-foreground">{p.remarks || "—"}</td>
                    <td className="py-3 px-3 text-xs font-semibold text-right">
                      {formatReturnAmount(p.amount ?? calcReturnLineAmount(p.returnedBaseQty, p.unitPerPacking ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end bg-slate-50 border border-border rounded-xl px-4 py-3">
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Sample Return Value</p>
            <p className="text-lg font-bold text-red-600">{formatReturnAmount(getReturnTotalAmount(record))}</p>
          </div>
        </div>

        {record.remarks && (
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
            <p className="text-amber-800 font-semibold uppercase tracking-wider text-[10px]">Return Remarks</p>
            <p className="text-muted-foreground text-xs mt-1">{record.remarks}</p>
          </div>
        )}
      </div>
    </RecordDetailPage>
  );
}
