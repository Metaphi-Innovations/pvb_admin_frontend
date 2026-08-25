"use client";

import React from "react";
import { useParams } from "next/navigation";
import { Package } from "lucide-react";
import { RecordDetailPage } from "@/components/record-detail";
import { ProductSkuCell } from "@/app/(app)/warehouse/grn/shared/components/ProductSkuCell";
import { useSampleReturn } from "@/hooks/sales/use-return-documents";
import type { SampleReturnLineItem } from "@/services/sample-return.service";
import { formatReturnAmount } from "../../sample-return-data";
import { calcReturnLineAmount } from "../../sample-return-utils";
import { SalesReturnStackedQty } from "../../../orders/components/SalesReturnStackedQty";
import type { SalesReturnQtyMetaSource } from "../../../orders/sales-return-qty";

function lineQtySource(item: SampleReturnLineItem): SalesReturnQtyMetaSource {
  return {
    unitPerPacking: item.unitPerPacking,
    quantityType: item.quantityType,
    uom: item.unit,
    productSnapshot: item.productSnapshot,
  };
}

function getReturnTotalAmount(record: { items: SampleReturnLineItem[] }) {
  return record.items.reduce(
    (sum, item) =>
      sum + (item.amount ?? calcReturnLineAmount(item.returnedBaseQty, item.unitPerPacking ?? 0)),
    0,
  );
}

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
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
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
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
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
    sample_returned: "Sample Returned",
    PARTIALLY_RECEIVED: "Partially Received",
    RECEIVED: "Received",
    CANCELLED: "Cancelled",
  };
  const statusVariantMap: Record<string, "neutral" | "active" | "inactive"> = {
    DRAFT: "neutral",
    SUBMITTED: "neutral",
    APPROVED: "active",
    REJECTED: "inactive",
    sample_returned: "neutral",
    PARTIALLY_RECEIVED: "neutral",
    RECEIVED: "active",
    CANCELLED: "inactive",
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Return Date", value: record.returnDate },
            { label: "Dispatch No", value: record.dispatchNumber },
            { label: "Sample Order No", value: record.salesOrderNumber },
            { label: "Customer / Farmer", value: record.customerName },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-border bg-white p-3 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-xs font-bold text-foreground">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-1.5 border-b pb-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <Package className="h-4 w-4 text-brand-600" /> Returned Products
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-slate-50/60">
                  <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground min-w-[160px]">Product</th>
                  <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Batch</th>
                  <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">Dispatch Qty</th>
                  <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">Return Qty</th>
                  <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Remarks</th>
                  <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {record.items.map((item, index) => (
                  <tr key={`${item.id}-${index}`} className="border-b border-border/60">
                    <td className="px-3 py-3 align-top min-w-[160px]">
                      <ProductSkuCell name={item.productName} sku={item.sku || item.productCode} />
                    </td>
                    <td className="px-3 py-3 text-xs font-mono font-semibold text-brand-700">{item.batchNumber || "-"}</td>
                    <td className="px-3 py-3 align-top">
                      <SalesReturnStackedQty
                        baseQty={item.dispatchedBaseQty}
                        source={lineQtySource(item)}
                      />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <SalesReturnStackedQty
                        baseQty={item.returnedBaseQty}
                        source={lineQtySource(item)}
                        accent="emerald"
                      />
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-muted-foreground">{item.remarks || "—"}</td>
                    <td className="px-3 py-3 text-right text-xs font-semibold">
                      {formatReturnAmount(item.amount ?? calcReturnLineAmount(item.returnedBaseQty, item.unitPerPacking ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end rounded-xl border border-border bg-slate-50 px-4 py-3">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sample Return Value</p>
            <p className="text-lg font-bold text-red-600">{formatReturnAmount(getReturnTotalAmount(record))}</p>
          </div>
        </div>

        {record.remarks ? (
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">Return Remarks</p>
            <p className="mt-1 text-xs text-muted-foreground">{record.remarks}</p>
          </div>
        ) : null}
      </div>
    </RecordDetailPage>
  );
}
