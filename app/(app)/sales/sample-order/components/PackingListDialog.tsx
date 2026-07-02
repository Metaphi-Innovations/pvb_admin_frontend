"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle, Check, ChevronsUpDown, Package, Printer, Save,
  ChevronDown, ChevronUp,
} from "lucide-react";
import {
  type SalesOrder,
  attachPackingListToOrder,
  hydrateOrderLineItems,
} from "../orders-data";
import {
  type PackingList,
  type PackingListLine,
  getActiveWarehousesForPacking,
  buildAllPackingListLines,
  createPackingList,
  getTotalAllocatedBaseForLine,
  lineHasInsufficientStock,
  savePackingList,
  validatePackingListLines,
  getCartonsForProductInWarehouse,
  CartonAllocation,
} from "../packing-list-data";
import { printPackingListDocument } from "../pi-document";

interface PackingListDialogProps {
  order: SalesOrder | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (order: SalesOrder, packingList: PackingList) => void;
}

export default function PackingListDialog({
  order,
  open,
  onClose,
  onSuccess,
}: PackingListDialogProps) {
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [warehouseCode, setWarehouseCode] = useState("");
  const [warehouseName, setWarehouseName] = useState("");
  const [lines, setLines] = useState<PackingListLine[]>([]);
  const [error, setError] = useState("");
  const [savedList, setSavedList] = useState<PackingList | null>(null);
  const [whOpen, setWhOpen] = useState(false);
  const [checkedAllocations, setCheckedAllocations] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const warehouses = getActiveWarehousesForPacking();

  useEffect(() => {
    if (!order || !open) return;
    hydrateOrderLineItems(order);
    setWarehouseId(null);
    setWarehouseCode("");
    setWarehouseName("");
    setLines([]);
    setCheckedAllocations({});
    setExpandedSections({});
    setError("");
    setSavedList(null);
  }, [order, open]);

  useEffect(() => {
    if (!order || !warehouseCode) {
      setLines([]);
      setCheckedAllocations({});
      setExpandedSections({});
      return;
    }
    const allLines = buildAllPackingListLines(order, warehouseCode);
    setLines(allLines);

    const initialChecked: Record<string, boolean> = {};
    const initialExpanded: Record<string, boolean> = {};
    for (const line of allLines) {
      initialExpanded[line.lineItemId] = true;
      for (const alloc of line.allocations) {
        if (alloc.allocatedBaseQty > 0) {
          initialChecked[`${line.lineItemId}-${alloc.cartonId}`] = true;
        }
      }
    }
    setCheckedAllocations(initialChecked);
    setExpandedSections(initialExpanded);
    setError("");
  }, [order, warehouseCode]);

  if (!order) return null;

  const selectWarehouse = (id: number, code: string, name: string) => {
    setWarehouseId(id);
    setWarehouseCode(code);
    setWarehouseName(name);
    setWhOpen(false);
    setError("");
  };

  const toggleCheckbox = (lineItemId: string, cartonId: string, alloc: CartonAllocation) => {
    const key = `${lineItemId}-${cartonId}`;
    const isCurrentlyChecked = !!checkedAllocations[key];
    const newChecked = !isCurrentlyChecked;

    setCheckedAllocations(prev => ({ ...prev, [key]: newChecked }));

    setLines(prev => prev.map(line => {
      if (line.lineItemId !== lineItemId) return line;

      const updatedAllocations = line.allocations.map(a => {
        if (a.cartonId !== cartonId) return a;
        if (!newChecked) {
          return { ...a, allocatedPackingQty: 0, allocatedBaseQty: 0 };
        } else {
          const totalAlreadyAllocated = line.allocations
            .filter(x => x.cartonId !== cartonId && checkedAllocations[`${lineItemId}-${x.cartonId}`])
            .reduce((sum, x) => sum + x.allocatedBaseQty, 0);

          const pending = Math.max(0, line.orderedBaseQty - totalAlreadyAllocated);
          const autoFillBase = Math.min(a.availableBaseQty, pending);
          const autoFillPacking = autoFillBase / a.unitsPerPackingUnit;

          return {
            ...a,
            allocatedPackingQty: autoFillPacking,
            allocatedBaseQty: autoFillBase
          };
        }
      });

      return { ...line, allocations: updatedAllocations };
    }));
    setError("");
  };

  const updateAllocation = (
    lineItemId: string,
    cartonId: string,
    field: "packing" | "base",
    value: number,
  ) => {
    const key = `${lineItemId}-${cartonId}`;
    if (value > 0) {
      setCheckedAllocations(prev => ({ ...prev, [key]: true }));
    }

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

    // Validation
    for (const line of lines) {
      let productSelectedTotal = 0;
      for (const alloc of line.allocations) {
        const isChecked = !!checkedAllocations[`${line.lineItemId}-${alloc.cartonId}`];
        if (isChecked) {
          if (alloc.allocatedBaseQty <= 0) {
            setError(`Pack Qty is required and must be greater than 0 for selected batches.`);
            return;
          }
          if (alloc.allocatedBaseQty > alloc.availableBaseQty) {
            setError("Pack Qty cannot exceed available batch quantity.");
            return;
          }
          productSelectedTotal += alloc.allocatedBaseQty;
        }
      }
      if (productSelectedTotal > line.orderedBaseQty) {
        setError("Selected batch quantity cannot exceed pending product quantity.");
        return;
      }
    }

    const finalLines = lines.map(line => ({
      ...line,
      allocations: line.allocations.filter(alloc => checkedAllocations[`${line.lineItemId}-${alloc.cartonId}`])
    }));

    const validationError = validatePackingListLines(finalLines, warehouseCode);
    if (validationError) {
      setError(validationError);
      return;
    }

    const list = createPackingList(order, finalLines, warehouseId, warehouseCode, warehouseName);
    savePackingList(list);

    const attachResult = attachPackingListToOrder(
      order.id,
      list.id,
      list.packingListNumber,
      warehouseId,
      warehouseName,
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
              <Package className="w-4 h-4 text-brand-600" />
            </div>
            Generate Packing List — {order.soNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              Warehouse <span className="text-red-500">*</span>
            </Label>
            <Popover open={whOpen} onOpenChange={setWhOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full h-8 px-2.5 text-xs text-left border rounded-lg bg-background flex items-center justify-between hover:bg-muted/30",
                    !warehouseId && error === "Warehouse is required" ? "border-red-400" : "border-border",
                  )}
                >
                  <span className={warehouseId ? "text-foreground" : "text-muted-foreground"}>
                    {warehouseId ? `${warehouseCode} — ${warehouseName}` : "Select warehouse…"}
                  </span>
                  <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-1 max-h-[200px] overflow-y-auto">
                {warehouses.map(wh => (
                  <button
                    key={wh.id}
                    type="button"
                    onClick={() => selectWarehouse(wh.id, wh.warehouseCode, wh.warehouseName)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-xs text-left rounded-lg hover:bg-muted/60",
                      warehouseId === wh.id && "bg-brand-50",
                    )}
                  >
                    <span className="font-mono text-brand-700 flex-shrink-0">{wh.warehouseCode}</span>
                    <span className="flex-1 truncate">{wh.warehouseName}</span>
                    {warehouseId === wh.id && <Check className="w-3.5 h-3.5 text-brand-600" />}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          {warehouseCode && lines.map(line => {
            const allocated = line.allocations.reduce((sum, a) => {
              const isChecked = !!checkedAllocations[`${line.lineItemId}-${a.cartonId}`];
              return sum + (isChecked ? a.allocatedBaseQty : 0);
            }, 0);
            const insufficient = allocated < line.orderedBaseQty;

            const isExpanded = !!expandedSections[line.lineItemId];
            const selectedCount = line.allocations.filter(a => !!checkedAllocations[`${line.lineItemId}-${a.cartonId}`]).length;

            return (
              <div key={line.lineItemId} className="border border-border rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedSections(prev => ({ ...prev, [line.lineItemId]: !isExpanded }))}
                  className="w-full px-3 py-2 bg-muted/30 border-b border-border text-left hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold">{line.productName}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{line.productCode}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs">
                        <span className="text-muted-foreground">Ordered: </span>
                        <span className="font-semibold">{line.orderedBaseQty} {line.baseUnit}</span>
                        <span className="mx-2 text-muted-foreground">|</span>
                        <span className="text-muted-foreground">Allocated: </span>
                        <span className={cn("font-semibold", insufficient && "text-amber-600")}>
                          {allocated} {line.baseUnit}
                        </span>
                        {!isExpanded && selectedCount > 0 && (
                          <span className="ml-2 text-muted-foreground">({selectedCount} batch{selectedCount !== 1 ? "es" : ""} selected)</span>
                        )}
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-[11px] text-muted-foreground">
                    <span>Packing: {line.packingUnit}</span>
                    <span>Base: {line.baseUnit}</span>
                    <span>1 {line.packingUnit} = {line.unitsPerPackingUnit} {line.baseUnit}</span>
                  </div>
                </button>

                {isExpanded && line.allocations.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead>
                        <tr className="bg-muted/20 border-b border-border">
                          <th className="px-3 py-1.5 text-left w-10">Select</th>
                          <th className="px-2 py-1.5 text-left text-[11px] font-semibold">Batch</th>
                          <th className="px-2 py-1.5 text-left text-[11px] font-semibold">Expiry</th>
                          <th className="px-2 py-1.5 text-left text-[11px] font-semibold">Box/Carton</th>
                          <th className="px-2 py-1.5 text-right text-[11px] font-semibold">Avail Pkg</th>
                          <th className="px-2 py-1.5 text-right text-[11px] font-semibold">Avail Base</th>
                        </tr>
                      </thead>
                      <tbody>
                        {line.allocations.map(alloc => {
                          const isChecked = !!checkedAllocations[`${line.lineItemId}-${alloc.cartonId}`];
                          return (
                            <tr key={alloc.cartonId} className="border-b border-border/60">
                              <td className="px-3 py-1.5">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleCheckbox(line.lineItemId, alloc.cartonId, alloc)}
                                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                                />
                              </td>
                              <td className="px-2 py-1.5 text-xs font-mono text-brand-700">{alloc.batchNumber}</td>
                              <td className="px-2 py-1.5 text-xs">{alloc.expiryDate}</td>
                              <td className="px-2 py-1.5 text-xs font-mono">{alloc.cartonNumber}</td>
                              <td className="px-2 py-1.5 text-xs text-right tabular-nums">{alloc.availablePackingQty}</td>
                              <td className="px-2 py-1.5 text-xs text-right tabular-nums">{alloc.availableBaseQty}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Close</Button>
            {savedList && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => printPackingListDocument(savedList)}
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </Button>
            )}
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
              onClick={handleSave}
              disabled={!warehouseCode}
            >
              <Save className="w-3.5 h-3.5" /> Save Packing List
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


