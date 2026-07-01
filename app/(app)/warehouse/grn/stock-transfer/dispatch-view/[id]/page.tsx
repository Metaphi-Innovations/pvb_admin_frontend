"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { RecordDetailPage } from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import { getTransferById, hydrateTransferLineItems } from "@/app/(app)/sales/stock-transfer/stock-transfer-data";
import { getStockTransferDispatchLines } from "@/app/(app)/sales/stock-transfer/warehouse-receipt-sync";
import { AlertCircle, Calendar, Building, Reply } from "lucide-react";

export default function DispatchViewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const transferId = Number(params.id);

  const transfer = useMemo(() => {
    const t = getTransferById(transferId);
    return t ? hydrateTransferLineItems(t) : null;
  }, [transferId]);

  const dispatchLines = useMemo(() => {
    return transfer ? getStockTransferDispatchLines(transfer) : [];
  }, [transfer]);

  if (!transfer) {
    return (
      <RecordDetailPage
        listHref="/warehouse/grn/stock-transfer"
        listLabel="Stock Transfer"
        recordName="Dispatch Not Found"
        statusLabel="Not Found"
        statusVariant="blocked"
      >
        <div className="max-w-[800px] mx-auto text-center py-12 space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-base font-bold text-foreground">Dispatch Not Found</h1>
          <p className="text-xs text-muted-foreground">The Dispatch ID you requested does not exist.</p>
          <Button variant="outline" size="sm" onClick={() => router.push("/warehouse/grn/stock-transfer")}>
            Go Back
          </Button>
        </div>
      </RecordDetailPage>
    );
  }

  const totalQty = dispatchLines.reduce((sum, l) => sum + l.dispatchedQty, 0);

  return (
    <RecordDetailPage
      listHref="/warehouse/grn/stock-transfer"
      listLabel="Stock Transfer"
      recordName={transfer.transferNumber}
      recordCode="In Transit"
      statusLabel="Shipped"
      statusVariant="neutral"
      metaItems={[
        { icon: Building, label: `From: ${transfer.sourceWarehouseName}` },
        { icon: Building, label: `To: ${transfer.targetWarehouseName}` },
        { icon: Calendar, label: transfer.transferDate },
      ]}
      secondaryAction={{
        label: "Create GRN Receipt",
        onClick: () => router.push(`/warehouse/grn/stock-transfer/create?dispatchId=${transferId}`),
      }}
      sidebar={{
        summary: [
          { label: "Transfer Number", value: transfer.transferNumber, highlight: true },
          { label: "From", value: transfer.sourceWarehouseName },
          { label: "To", value: transfer.targetWarehouseName },
          { label: "Dispatch Date", value: transfer.transferDate },
          { label: "Total Dispatched", value: totalQty },
        ],
        quickActions: [
          {
            label: "Create GRN Receipt",
            icon: Reply,
            variant: "primary",
            onClick: () => router.push(`/warehouse/grn/stock-transfer/create?dispatchId=${transferId}`),
          },
        ],
      }}
    >
      <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2">Dispatched Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Product</th>
                <th className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SKU</th>
                <th className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Batch No.</th>
                <th className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Dispatched Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {dispatchLines.map((line, idx) => (
                <tr key={idx} className="hover:bg-muted/10">
                  <td className="p-2 text-xs font-semibold text-foreground">{line.productName}</td>
                  <td className="p-2 text-xs font-mono text-muted-foreground">{line.productCode}</td>
                  <td className="p-2 text-xs">
                    <span className="inline-block text-[10px] font-mono font-semibold bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-100">
                      {line.batchNumber}
                    </span>
                  </td>
                  <td className="p-2 text-xs text-right tabular-nums font-semibold text-brand-600">{line.dispatchedQty.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RecordDetailPage>
  );
}
