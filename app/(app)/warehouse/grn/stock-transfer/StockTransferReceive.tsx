"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormContainer } from "@/components/layout/FormContainer";
import { FormSection } from "@/components/ui/FormFields";
import { TextField } from "@/components/ui/FormFields";
import { cn } from "@/lib/utils";
import {
  createStockTransferGrn,
  getStockTransferDispatchLines,
} from "@/app/(app)/sales/stock-transfer/warehouse-receipt-sync";
import {
  getTransferById,
  hydrateTransferLineItems,
} from "@/app/(app)/sales/stock-transfer/stock-transfer-data";

function lineKey(productCode: string, batchNumber: string) {
  return `${productCode}::${batchNumber}`;
}

export function StockTransferReceive({ transferId }: { transferId: number }) {
  const router = useRouter();

  const transfer = useMemo(() => {
    const t = getTransferById(transferId);
    return t ? hydrateTransferLineItems(t) : null;
  }, [transferId]);

  const dispatchLines = useMemo(
    () => (transfer ? getStockTransferDispatchLines(transfer) : []),
    [transfer],
  );

  const [receivedQty, setReceivedQty] = useState<Record<string, number>>({});
  const [lineRemarks, setLineRemarks] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!dispatchLines.length) return;
    const initial: Record<string, number> = {};
    dispatchLines.forEach((line) => {
      initial[lineKey(line.productCode, line.batchNumber)] = line.dispatchedQty;
    });
    setReceivedQty(initial);
  }, [dispatchLines]);

  const hasShortage = dispatchLines.some((line) => {
    const key = lineKey(line.productCode, line.batchNumber);
    const received = receivedQty[key] ?? 0;
    return received > 0 && received < line.dispatchedQty;
  });

  const totalDispatched = dispatchLines.reduce((s, l) => s + l.dispatchedQty, 0);
  const totalReceived = dispatchLines.reduce((s, line) => {
    const key = lineKey(line.productCode, line.batchNumber);
    return s + (receivedQty[key] ?? 0);
  }, 0);

  const handleSave = () => {
    if (!transfer) return;
    setError(null);

    const result = createStockTransferGrn(
      transfer,
      dispatchLines.map((line) => {
        const key = lineKey(line.productCode, line.batchNumber);
        return {
          ...line,
          receivedQty: receivedQty[key] ?? 0,
          remarks: lineRemarks[key] ?? "",
        };
      }),
      remarks,
    );

    if ("error" in result) {
      setError(result.error);
      return;
    }

    router.push("/warehouse/grn");
  };

  if (!transfer) {
    return (
      <FormContainer
        title="Stock Transfer GRN"
        description="Transfer not found or not eligible for receipt."
        onBack={() => router.push("/warehouse/grn")}
      >
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700">
          This stock transfer is not available for GRN. It may already be received or is not in transit.
        </div>
      </FormContainer>
    );
  }

  return (
    <FormContainer
      title={`Receive ${transfer.transferNumber}`}
      description="Stock Transfer GRN — enter received qty per batch. Inventory is added only after QC pass."
      onBack={() => router.push("/warehouse/grn")}
      onCancel={() => router.push("/warehouse/grn")}
      actions={
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
          onClick={handleSave}
          disabled={totalReceived <= 0}
        >
          <Check className="w-3.5 h-3.5" /> Save GRN &amp; Create QC
        </Button>
      }
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{error}</div>
      )}

      {hasShortage && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2.5 text-amber-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="text-xs font-semibold">Shortage detected</p>
            <p className="text-[11px] mt-0.5">
              Received qty is less than dispatched qty on one or more lines. You can still save — add remarks for
              shortage or damage.
            </p>
          </div>
        </div>
      )}

      <FormSection title="Transfer Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <TextField label="Stock Transfer No." value={transfer.transferNumber} readOnly className="h-8 text-xs font-mono font-semibold bg-muted/30" />
          <TextField label="From Warehouse" value={transfer.sourceWarehouseName} readOnly className="h-8 text-xs bg-muted/30" />
          <TextField label="To Warehouse" value={transfer.targetWarehouseName} readOnly className="h-8 text-xs bg-muted/30" />
          <TextField label="Dispatch No." value={transfer.dispatchNumber ?? "—"} readOnly className="h-8 text-xs font-mono bg-muted/30" />
        </div>
      </FormSection>

      <FormSection title="Product Receipt — Dispatched vs Received Qty">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-brand-600" />
          <p className="text-[11px] text-muted-foreground">
            Total dispatched: <span className="font-semibold text-foreground">{totalDispatched}</span>
            {" · "}
            Total receiving: <span className="font-semibold text-foreground">{totalReceived}</span>
          </p>
        </div>

        <div className="border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["Product", "SKU", "Batch", "Expiry", "Dispatched", "Received Qty", "Line Remarks"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dispatchLines.map((line) => {
                  const key = lineKey(line.productCode, line.batchNumber);
                  const received = receivedQty[key] ?? 0;
                  const isShort = received > 0 && received < line.dispatchedQty;

                  return (
                    <tr
                      key={key}
                      className={cn("border-b border-border/60", isShort && "bg-amber-50/40")}
                    >
                      <td className="px-3 py-2 text-xs font-semibold">{line.productName}</td>
                      <td className="px-3 py-2 text-xs font-mono text-brand-700">{line.productCode}</td>
                      <td className="px-3 py-2 text-xs font-mono">{line.batchNumber}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{line.expDate || "—"}</td>
                      <td className="px-3 py-2 text-xs font-bold text-center tabular-nums">{line.dispatchedQty}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          max={line.dispatchedQty}
                          value={received}
                          onChange={(e) =>
                            setReceivedQty((prev) => ({
                              ...prev,
                              [key]: Math.max(0, parseInt(e.target.value, 10) || 0),
                            }))
                          }
                          className={cn("h-8 w-24 text-xs text-right mx-auto", isShort && "border-amber-400")}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          placeholder="Shortage / damage…"
                          value={lineRemarks[key] ?? ""}
                          onChange={(e) =>
                            setLineRemarks((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          className="h-8 text-xs"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </FormSection>

      <FormSection title="Receipt Remarks">
        <Textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Overall receipt remarks (shortage, transit damage, seal broken, etc.)"
          rows={2}
          className="text-xs"
        />
      </FormSection>
    </FormContainer>
  );
}
