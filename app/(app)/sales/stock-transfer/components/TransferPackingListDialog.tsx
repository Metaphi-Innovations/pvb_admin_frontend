"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle, AlertTriangle, Package, Printer, Save,
} from "lucide-react";
import {
  type StockTransfer,
  attachPackingListToTransfer,
} from "../stock-transfer-data";
import {
  type PackingList,
  type PackingListLine,
  buildPackingListLines,
  createPackingList,
  lineHasInsufficientStock,
  savePackingList,
  validatePackingListLines,
  getPackingListById,
} from "@/app/(app)/sales/orders/packing-list-data";
import { printTransferPackingListDocument } from "../transfer-note-document";

interface TransferPackingListDialogProps {
  transfer: StockTransfer | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (transfer: StockTransfer, packingList: PackingList) => void;
}

export default function TransferPackingListDialog({
  transfer,
  open,
  onClose,
  onSuccess,
}: TransferPackingListDialogProps) {
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [warehouseCode, setWarehouseCode] = useState("");
  const [warehouseName, setWarehouseName] = useState("");
  const [lines, setLines] = useState<PackingListLine[]>([]);
  const [error, setError] = useState("");
  const [savedList, setSavedList] = useState<PackingList | null>(null);

  useEffect(() => {
    if (!transfer || !open) return;
    setWarehouseId(transfer.sourceWarehouseId);
    setWarehouseCode(transfer.sourceWarehouseCode);
    setWarehouseName(transfer.sourceWarehouseName);
    
    let existingList: PackingList | null = null;
    if (transfer.packingListId) {
      existingList = getPackingListById(transfer.packingListId) || null;
    }

    if (existingList) {
      setSavedList(existingList);
      setLines(existingList.lines);
    } else {
      setLines(buildPackingListLines(transfer as any, transfer.sourceWarehouseCode));
      setSavedList(null);
    }
    setError("");
  }, [transfer, open]);

  if (!transfer) return null;

  const hasInsufficient = warehouseCode ? lines.some(lineHasInsufficientStock) : false;

  const updateAllocation = (
    lineItemId: string,
    cartonId: string,
    field: "packing" | "base",
    value: number,
  ) => {
    setLines(prev =>
      prev.map(line => {
        if (line.lineItemId !== lineItemId) return line;
        return {
          ...line,
          allocations: line.allocations.map(alloc => {
            if (alloc.cartonId !== cartonId) return alloc;
            if (field === "packing") {
              const packing = Math.max(0, Math.min(alloc.availablePackingQty, value));
              const base = Math.min(alloc.availableBaseQty, packing * alloc.unitsPerPackingUnit);
              return { ...alloc, allocatedPackingQty: packing, allocatedBaseQty: base };
            }
            const base = Math.max(0, Math.min(alloc.availableBaseQty, value));
            const packing = Math.min(alloc.availablePackingQty, base / alloc.unitsPerPackingUnit);
            return { ...alloc, allocatedBaseQty: base, allocatedPackingQty: packing };
          }),
        };
      }),
    );
    setError("");
  };

  const handleSave = () => {
    if (!warehouseId || !warehouseCode) {
      setError("Warehouse is required");
      return;
    }

    const validationError = validatePackingListLines(lines, warehouseCode);
    if (validationError) {
      setError(validationError);
      return;
    }

    const fakeOrder = {
      id: transfer.id,
      soNumber: transfer.transferNumber,
      customerName: `Transfer to ${transfer.targetWarehouseName}`,
    };

    const list = createPackingList(fakeOrder as any, lines, warehouseId, warehouseCode, warehouseName);
    savePackingList(list);

    const attachResult = attachPackingListToTransfer(
      transfer.id,
      list.id,
      list.packingListNumber,
      list.status,
    );
    if ("error" in attachResult) {
      setError(attachResult.error);
      return;
    }

    setSavedList(list);
    onSuccess(attachResult, list);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
              <Package className="w-4 h-4 text-brand-600" />
            </div>
            Generate Packing List — {transfer.transferNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              Source Warehouse (Pre-selected)
            </Label>
            <div className="h-8 px-2.5 text-xs border border-border rounded-lg bg-muted/40 flex items-center font-medium">
              {warehouseCode} — {warehouseName}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {hasInsufficient && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Insufficient Stock Warning</p>
                <p className="mt-0.5">Some items do not have enough stock in the source warehouse. You can still save the packing list with partial allocations.</p>
              </div>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden bg-white">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="p-2 text-left font-semibold">Product</th>
                  <th className="p-2 text-right font-semibold w-24">Required Qty</th>
                  <th className="p-2 font-semibold">Warehouse Carton Allocation (FEFO)</th>
                  <th className="p-2 text-right font-semibold w-24">Allocated Base</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lines.map(line => {
                  const totalAllocated = line.allocations.reduce((s, a) => s + a.allocatedBaseQty, 0);
                  const isUnder = totalAllocated < line.orderedBaseQty;

                  return (
                    <tr key={line.lineItemId} className={cn(isUnder && "bg-amber-50/20")}>
                      <td className="p-2 align-top">
                        <p className="font-medium text-foreground">{line.productName}</p>
                        <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{line.productCode}</p>
                      </td>
                      <td className="p-2 text-right font-medium align-top tabular-nums">
                        {line.orderedBaseQty} {line.baseUnit}
                      </td>
                      <td className="p-2">
                        {line.allocations.length === 0 ? (
                          <p className="text-[11px] text-red-500 font-semibold py-1">No batch cartons available in warehouse</p>
                        ) : (
                          <div className="space-y-1.5 py-1">
                            {line.allocations.map(alloc => (
                              <div key={alloc.cartonId} className="flex items-center gap-3 text-[11px] border border-border/40 p-1.5 rounded bg-muted/10">
                                <div className="flex-1">
                                  <span className="font-semibold text-brand-700">{alloc.batchNumber}</span>
                                  <span className="text-muted-foreground mx-1">·</span>
                                  <span>Box: {alloc.cartonNumber}</span>
                                  <span className="text-muted-foreground mx-1">·</span>
                                  <span className="text-muted-foreground">Exp: {alloc.expiryDate}</span>
                                  <span className="text-muted-foreground mx-1">·</span>
                                  <span className="font-medium text-foreground">Avail: {alloc.availablePackingQty} {alloc.packingUnit} ({alloc.availableBaseQty} {alloc.baseUnit})</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={alloc.availablePackingQty}
                                    value={alloc.allocatedPackingQty || ""}
                                    onChange={e => updateAllocation(line.lineItemId, alloc.cartonId, "packing", parseInt(e.target.value) || 0)}
                                    placeholder="Packing Qty"
                                    className="w-16 h-6 text-[10px] px-1 text-right"
                                  />
                                  <span className="text-muted-foreground">{alloc.packingUnit}</span>
                                </div>
                                <div className="flex items-center gap-1 border-l pl-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={alloc.availableBaseQty}
                                    value={alloc.allocatedBaseQty || ""}
                                    onChange={e => updateAllocation(line.lineItemId, alloc.cartonId, "base", parseInt(e.target.value) || 0)}
                                    placeholder="Base Qty"
                                    className="w-16 h-6 text-[10px] px-1 text-right"
                                  />
                                  <span className="text-muted-foreground">{alloc.baseUnit}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-2 text-right align-top font-semibold tabular-nums">
                        <span className={cn(isUnder ? "text-amber-700" : "text-emerald-700")}>
                          {totalAllocated} / {line.orderedBaseQty} {line.baseUnit}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            {savedList ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => printTransferPackingListDocument(savedList, transfer)}
                  className="h-8 text-xs gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Packing List
                </Button>
                <Button
                  size="sm"
                  onClick={onClose}
                  className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                >
                  Done
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onClose}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
                >
                  <Save className="w-3.5 h-3.5" /> Save Packing List
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
