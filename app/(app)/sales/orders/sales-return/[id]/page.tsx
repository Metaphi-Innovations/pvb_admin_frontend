"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Package } from "lucide-react";
import { RecordDetailPage } from "@/components/record-detail";
import { SalesReturnService, type SalesReturnDetail } from "@/services/sales-return.service";
import {
  formatProductReturnQuantity,
  formatReturnAmount,
  getReturnTotalAmount,
  type SalesReturnRecord,
} from "../../sales-return-data";

function mapBackendReturnToFrontend(detail: SalesReturnDetail): SalesReturnRecord {
  const products = (detail.items || []).map((item) => {
    const unitPerPacking = Number(item.unitPerPacking) || 10;
    const totalPieces = Number(item.returnedBaseQty || 0);
    const cases = Math.floor(totalPieces / unitPerPacking);
    const pieces = totalPieces % unitPerPacking;

    return {
      product: item.productName || "Unknown Product",
      sku: item.sku || item.productCode || "",
      packedQty: 0,
      dispatchQty: 0,
      returnQty: totalPieces,
      unitRate: Number(item.amount || 0) / (totalPieces || 1),
      batchNo: item.batchNumber || "",
      returnCaseQty: cases,
      returnLooseQty: pieces,
      returnTotalPieces: totalPieces,
      lineAmount: Number(item.amount || 0),
      packingNumber: detail.packingNumber || "",
    };
  });

  const totalAmount = products.reduce((acc, p) => acc + p.lineAmount, 0);

  return {
    id: detail.id,
    returnNumber: detail.returnNumber,
    dispatchNumber: detail.dispatchNumber || "",
    salesOrderNumber: detail.salesOrderNumber || "",
    customer: detail.customerName || "",
    returnDate: detail.returnDate || "",
    warehouse: detail.warehouseName || "",
    products: products,
    totalAmount: totalAmount,
    remarks: detail.remarks || "",
    status: detail.status?.toLowerCase() as any,
  };
}

export default function SalesReturnViewPage() {
  const params = useParams();
  const id = params?.id as string;
  const [record, setRecord] = useState<SalesReturnRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setLoading(true);
      SalesReturnService.getById(id)
        .then((data) => {
          setRecord(mapBackendReturnToFrontend(data));
        })
        .catch((err) => {
          console.error("Failed to load sales return details:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id]);

  const listHref = "/sales/orders?tab=sales_return";

  if (loading || !record) {
    return (
      <RecordDetailPage
        listHref={listHref}
        listLabel="Sales Returns"
        recordName="Sales Return"
        statusLabel={loading ? "Loading" : "Not Found"}
        statusVariant="neutral"
      >
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          {loading ? "Loading sales return details..." : "Sales return record not found."}
        </div>
      </RecordDetailPage>
    );
  }

  return (
    <RecordDetailPage
      listHref={listHref}
      listLabel="Sales Returns"
      recordName={record.returnNumber}
      recordCode={record.salesOrderNumber}
      statusLabel="Processed"
      statusVariant="active"
      metaItems={[
        { label: record.customer },
        { label: record.dispatchNumber },
        { label: record.returnDate },
      ]}
      sidebar={{
        summary: [
          { label: "Dispatch No", value: record.dispatchNumber, highlight: true },
          { label: "Sales Order", value: record.salesOrderNumber },
          { label: "Warehouse", value: record.warehouse },
          { label: "Return Amount", value: formatReturnAmount(getReturnTotalAmount(record)) },
        ],
      }}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Return Date", value: record.returnDate },
            { label: "Dispatch No", value: record.dispatchNumber },
            { label: "Sales Order No", value: record.salesOrderNumber },
            { label: "Customer", value: record.customer },
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
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-slate-50/60">
                  <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Packing List</th>
                  <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Product</th>
                  <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Batch</th>
                  <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">Dispatch Qty</th>
                  <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">Return Qty</th>
                  <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {record.products.map((product, index) => (
                  <tr key={`${product.sku}-${product.batchNo || index}`} className="border-b border-border/60">
                    <td className="px-3 py-3 text-xs font-mono text-muted-foreground">{product.packingNumber || "-"}</td>
                    <td className="px-3 py-3 text-xs font-bold">{product.product}</td>
                    <td className="px-3 py-3 text-xs font-mono text-brand-700">{product.batchNo || "-"}</td>
                    <td className="px-3 py-3 text-center text-xs font-bold">{product.dispatchQty} Cases</td>
                    <td className="px-3 py-3 text-center text-xs font-bold text-red-600">{formatProductReturnQuantity(product)}</td>
                    <td className="px-3 py-3 text-right text-xs font-semibold">{formatReturnAmount(typeof product.lineAmount === "number" ? product.lineAmount : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end rounded-xl border border-border bg-slate-50 px-4 py-3">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sales Return Amount</p>
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
