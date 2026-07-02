"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertCircle, Check, ChevronsUpDown, Package, Save,
  ChevronDown, ChevronUp, ArrowLeft
} from "lucide-react";
import {
  type SalesOrder,
  attachPackingListToOrder,
  hydrateOrderLineItems,
  getOrderById,
} from "../../../orders-data";
import {
  type PackingList,
  type PackingListLine,
  getActiveWarehousesForPacking,
  buildAllPackingListLines,
  createPackingList,
  savePackingList,
  validatePackingListLines,
  CartonAllocation,
  InventoryType,
} from "../../../packing-list-data";

export default function NewSampleOrderPackingListPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = Number(params.id);

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [warehouseCode, setWarehouseCode] = useState("");
  const [warehouseName, setWarehouseName] = useState("");
  const [lines, setLines] = useState<PackingListLine[]>([]);
  const [error, setError] = useState("");
  const [whOpen, setWhOpen] = useState(false);
  const [checkedAllocations, setCheckedAllocations] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const warehouses = getActiveWarehousesForPacking();

  useEffect(() => {
    const o = getOrderById(orderId);
    if (o) {
      setOrder(hydrateOrderLineItems(o));
    }
  }, [orderId]);

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

  if (!order) return <div className="p-8">Order not found.</div>;

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
          const autoFillPacking = Math.floor(autoFillBase / a.unitsPerPackingUnit);

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
    field: "cases" | "loose",
    value: string,
  ) => {
    const numValue = parseInt(value, 10) || 0;
    const key = `${lineItemId}-${cartonId}`;
    
    setLines(prev =>
      prev.map(line => {
        if (line.lineItemId !== lineItemId) return line;
        return {
          ...line,
          allocations: line.allocations.map(alloc => {
            if (alloc.cartonId !== cartonId) return alloc;
            
            let c = alloc.allocatedPackingQty;
            let p = alloc.allocatedBaseQty - (c * alloc.unitsPerPackingUnit);

            if (field === "cases") {
              c = numValue;
            } else {
              p = numValue;
            }

            const totalBase = (c * alloc.unitsPerPackingUnit) + p;
            setCheckedAllocations(prevChecks => ({ ...prevChecks, [key]: totalBase > 0 }));

            return { ...alloc, allocatedPackingQty: c, allocatedBaseQty: totalBase };
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
        setError(`Selected batch quantity cannot exceed pending product quantity for ${line.productName}.`);
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

    router.push(`/sales/sample-order`);
  };

  const formatInventoryType = (type: InventoryType) => {
    switch (type) {
      case "original": return "Original";
      case "sales_return": return "Sales Return";
      case "sample_return": return "Sample Return";
      default: return type;
    }
  };

  return (
    <div className="p-6 w-full space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push(`/sales/sample-order`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-600" />
            Generate Packing List
          </h1>
          <p className="text-sm text-muted-foreground">Sample Order: {order.soNumber}</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="space-y-1.5 flex-1 min-w-[250px]">
            <Label className="text-sm font-medium">
              Warehouse <span className="text-red-500">*</span>
            </Label>
            <Popover open={whOpen} onOpenChange={setWhOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full h-10 px-3 text-sm text-left border rounded-lg bg-background flex items-center justify-between hover:bg-muted/30",
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
                      "w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-lg hover:bg-muted/60",
                      warehouseId === wh.id && "bg-brand-50",
                    )}
                  >
                    <span className="font-mono text-brand-700 flex-shrink-0">{wh.warehouseCode}</span>
                    <span className="flex-1 truncate">{wh.warehouseName}</span>
                    {warehouseId === wh.id && <Check className="w-4 h-4 text-brand-600" />}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>

        </div>

        {warehouseCode && lines.map(line => {
          const visibleAllocations = line.allocations;

          if (visibleAllocations.length === 0) return null;

          const allocated = line.allocations.reduce((sum, a) => {
            const isChecked = !!checkedAllocations[`${line.lineItemId}-${a.cartonId}`];
            return sum + (isChecked ? a.allocatedBaseQty : 0);
          }, 0);
          const insufficient = allocated < line.orderedBaseQty;

          const isExpanded = !!expandedSections[line.lineItemId];
          const selectedCount = line.allocations.filter(a => !!checkedAllocations[`${line.lineItemId}-${a.cartonId}`]).length;

          return (
            <div key={line.lineItemId} className="border border-border rounded-xl overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setExpandedSections(prev => ({ ...prev, [line.lineItemId]: !isExpanded }))}
                className="w-full px-4 py-3 bg-muted/30 border-b border-border text-left hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{line.productName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{line.productCode}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <span className="text-muted-foreground">Ordered: </span>
                      <span className="font-semibold">{line.orderedBaseQty} {line.baseUnit}</span>
                      <span className="mx-3 text-muted-foreground">|</span>
                      <span className="text-muted-foreground">Allocated: </span>
                      <span className={cn("font-semibold", insufficient && "text-amber-600")}>
                        {allocated} {line.baseUnit}
                      </span>
                      {!isExpanded && selectedCount > 0 && (
                        <span className="ml-2 text-muted-foreground">({selectedCount} batch{selectedCount !== 1 ? "es" : ""} selected)</span>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Packing: <span className="font-medium text-foreground">{line.packingUnit}</span></span>
                  <span>Base: <span className="font-medium text-foreground">{line.baseUnit}</span></span>
                  <span>Conversion: <span className="font-medium text-foreground">1 {line.packingUnit} = {line.unitsPerPackingUnit} {line.baseUnit}</span></span>
                </div>
              </button>

              {isExpanded && (
                <div className="overflow-x-auto bg-white">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="bg-muted/10 border-b border-border">
                        <th className="px-4 py-2.5 text-left w-12">Select</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold">Inventory Type</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold">Batch</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold">Box/Carton</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold w-16">Avail Cases</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold w-16">Avail Loose</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold w-24">Cases</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold w-24">Loose ({line.baseUnit})</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold w-20">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleAllocations.map(alloc => {
                        const isChecked = !!checkedAllocations[`${line.lineItemId}-${alloc.cartonId}`];
                        return (
                          <tr key={alloc.cartonId} className={cn("border-b border-border/60", isChecked && "bg-brand-50/30")}>
                            <td className="px-4 py-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleCheckbox(line.lineItemId, alloc.cartonId, alloc)}
                                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap",
                                alloc.inventoryType === "original" ? "bg-emerald-100 text-emerald-700" :
                                alloc.inventoryType === "sales_return" ? "bg-amber-100 text-amber-700" :
                                "bg-blue-100 text-blue-700"
                              )}>
                                {formatInventoryType(alloc.inventoryType)}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-xs font-mono text-brand-700">{alloc.batchNumber}</td>
                            <td className="px-3 py-2.5 text-xs font-mono">{alloc.cartonNumber}</td>
                            <td className="px-3 py-2.5 text-xs text-left tabular-nums text-muted-foreground">{Math.floor(alloc.availableBaseQty / alloc.unitsPerPackingUnit)}</td>
                            <td className="px-3 py-2.5 text-xs text-left tabular-nums text-muted-foreground">{alloc.availableBaseQty % alloc.unitsPerPackingUnit}</td>
                            <td className="px-3 py-2.5">
                              <Input
                                type="number"
                                min="0"
                                value={isChecked && alloc.allocatedPackingQty > 0 ? alloc.allocatedPackingQty : (isChecked ? 0 : "")}
                                onChange={(e) => updateAllocation(line.lineItemId, alloc.cartonId, "cases", e.target.value)}
                                className={cn("h-7 text-xs px-2 w-full", isChecked && "bg-white")}
                                placeholder="0"
                                disabled={!isChecked}
                              />
                            </td>
                            <td className="px-3 py-2.5">
                              <Input
                                type="number"
                                min="0"
                                value={isChecked ? alloc.allocatedBaseQty - (alloc.allocatedPackingQty * alloc.unitsPerPackingUnit) : (isChecked ? 0 : "")}
                                onChange={(e) => updateAllocation(line.lineItemId, alloc.cartonId, "loose", e.target.value)}
                                className={cn("h-7 text-xs px-2 w-full", isChecked && "bg-white")}
                                placeholder="0"
                                disabled={!isChecked}
                              />
                            </td>
                            <td className="px-3 py-2.5 text-xs font-semibold tabular-nums text-muted-foreground">
                              {isChecked ? alloc.allocatedBaseQty : 0}
                            </td>
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
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="pt-4 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => router.push(`/sales/sample-order`)}>
            Cancel
          </Button>
          <Button
            className="gap-2 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={handleSave}
            disabled={!warehouseCode}
          >
            <Save className="w-4 h-4" /> Save Packing List
          </Button>
        </div>
      </div>
    </div>
  );
}
