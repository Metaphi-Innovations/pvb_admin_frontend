"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RecordDetailPage } from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import { AlertCircle, Building, Calendar, Package, Reply, Truck } from "lucide-react";
import { getDispatchById } from "@/app/(app)/warehouse/dispatch/services";
import { StockTransferService } from "@/services/stock-transfer.service";
import {
  buildStockTransferLinesFromDispatch,
  getCustomerSnapshot,
  type StockTransferLineFromDispatch,
} from "../../stock-transfer-grn-utils";

export default function DispatchViewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const dispatchId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dispatch, setDispatch] = useState<Record<string, unknown> | null>(null);
  const [transferNo, setTransferNo] = useState("");
  const [lines, setLines] = useState<StockTransferLineFromDispatch[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getDispatchById(dispatchId);
        if (!active) return;
        if (!data) {
          setError("Dispatch not found.");
          return;
        }
        setDispatch(data as Record<string, unknown>);

        const sourceId = String(data.source_id || "");
        if (sourceId) {
          try {
            const transfer = await StockTransferService.getById(sourceId);
            if (active) setTransferNo(transfer.transferNumber);
          } catch {
            if (active) setTransferNo(data.dispatch_number || "");
          }
        }

        const built = await buildStockTransferLinesFromDispatch(data as Record<string, unknown>);
        if (active) setLines(built.lines);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load dispatch.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [dispatchId]);

  const snapshot = useMemo(
    () => getCustomerSnapshot(dispatch?.packing_done),
    [dispatch],
  );

  const totalQty = useMemo(
    () => lines.reduce((sum, l) => sum + l.maxQty, 0),
    [lines],
  );

  if (loading) {
    return (
      <RecordDetailPage
        listHref="/warehouse/grn/stock-transfer"
        listLabel="Stock Transfer"
        recordName="Loading…"
        statusLabel="Loading"
        statusVariant="neutral"
      >
        <div className="max-w-[800px] mx-auto text-center py-12">
          <p className="text-xs text-muted-foreground">Loading dispatch details…</p>
        </div>
      </RecordDetailPage>
    );
  }

  if (error || !dispatch) {
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
          <p className="text-xs text-muted-foreground">
            {error || "The Dispatch ID you requested does not exist."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/warehouse/grn/stock-transfer")}
          >
            Go Back
          </Button>
        </div>
      </RecordDetailPage>
    );
  }

  const dispatchNumber = String(dispatch.dispatch_number || "");
  const fromWarehouse = String(snapshot.from_warehouse || "—");
  const toWarehouse = String(snapshot.to_warehouse || "—");
  const dispatchDate = dispatch.dispatch_date
    ? String(dispatch.dispatch_date).slice(0, 10)
    : "—";

  return (
    <RecordDetailPage
      listHref="/warehouse/grn/stock-transfer"
      listLabel="Stock Transfer"
      recordName={transferNo || dispatchNumber}
      recordCode={dispatchNumber}
      statusLabel={String(dispatch.status || "DELIVERY_DONE")}
      statusVariant="active"
      metaItems={[
        { icon: Building, label: `From: ${fromWarehouse}` },
        { icon: Building, label: `To: ${toWarehouse}` },
        { icon: Calendar, label: dispatchDate },
      ]}
      secondaryAction={{
        label: "Create GRN Receipt",
        onClick: () =>
          router.push(`/warehouse/grn/stock-transfer/create?dispatchId=${dispatchId}`),
      }}
      sidebar={{
        summary: [
          { label: "Transfer Number", value: transferNo || "—", highlight: true },
          { label: "Dispatch No.", value: dispatchNumber },
          { label: "From", value: fromWarehouse },
          { label: "To", value: toWarehouse },
          { label: "Dispatch Date", value: dispatchDate },
          { label: "Total Dispatched", value: totalQty },
          {
            label: "Packing Done",
            value: String(
              (dispatch.packing_done as { packing_done_no?: string } | undefined)
                ?.packing_done_no || "—",
            ),
          },
        ],
        quickActions: [
          {
            label: "Create GRN Receipt",
            icon: Reply,
            variant: "primary",
            onClick: () =>
              router.push(`/warehouse/grn/stock-transfer/create?dispatchId=${dispatchId}`),
          },
          {
            label: "Open Dispatch",
            icon: Truck,
            variant: "outline",
            onClick: () => router.push(`/warehouse/dispatch/view/${dispatchId}`),
          },
        ],
      }}
    >
      <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-2">
          <Package className="w-3.5 h-3.5 text-brand-600" />
          Dispatched Items
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Product
                </th>
                <th className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  SKU
                </th>
                <th className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Batch No.
                </th>
                <th className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">
                  Dispatched Qty
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {lines.map((line, idx) => (
                <tr key={`${line.sourceItemId}-${idx}`} className="hover:bg-muted/10">
                  <td className="p-2 text-xs font-semibold text-foreground">{line.productName}</td>
                  <td className="p-2 text-xs font-mono text-muted-foreground">{line.sku}</td>
                  <td className="p-2 text-xs">
                    <span className="inline-block text-[10px] font-mono font-semibold bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-100">
                      {line.batchNo}
                    </span>
                  </td>
                  <td className="p-2 text-xs text-right tabular-nums font-semibold text-brand-600">
                    {line.maxQty.toLocaleString()}
                  </td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-xs text-muted-foreground">
                    No items found on this dispatch.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </RecordDetailPage>
  );
}
