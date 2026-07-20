"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  hydrateOrderLineItems,
} from "../../../orders-data";
import { useSampleOrder } from "@/hooks/sales/use-sample-orders";
import { mapBackendSampleOrder } from "@/services/sample-order.service";
import { useWarehousesDropdown } from "@/hooks/sales/use-sales-orders";
import { PackingListService } from "@/services/packing-list.service";
import {
  type PackingListLine,
  CartonAllocation,
  InventoryType,
} from "../../../packing-list-data";

export default function NewSampleOrderPackingListPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [warehouseCode, setWarehouseCode] = useState("");
  const [warehouseName, setWarehouseName] = useState("");
  const [lines, setLines] = useState<PackingListLine[]>([]);
  const [error, setError] = useState("");
  const [whOpen, setWhOpen] = useState(false);
  const [checkedAllocations, setCheckedAllocations] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [batchesMap, setBatchesMap] = useState<Record<string, any[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: rawOrder, isLoading: orderLoading } = useSampleOrder(orderId || null);
  const order = useMemo(() => {
    return rawOrder ? hydrateOrderLineItems(rawOrder) : null;
  }, [rawOrder]);

  const { data: backendWarehousesData } = useWarehousesDropdown();
  const warehouses = useMemo(() => {
    return (backendWarehousesData || []).map((w: any) => ({
      id: w.warehouse_id,
      warehouseName: w.warehouse_name,
      warehouseCode: w.warehouse_code || w.code || "",
      status: w.status?.toLowerCase() || "active",
    })).filter((w) => w.status === "active");
  }, [backendWarehousesData]);

  // Auto-select warehouse when order and warehouse list are loaded
  useEffect(() => {
    if (order?.warehouseId && warehouses.length > 0 && !warehouseId) {
      const match = warehouses.find(w => w.id === String(order.warehouseId));
      if (match) {
        setWarehouseId(match.id);
        setWarehouseCode(match.warehouseCode);
        setWarehouseName(match.warehouseName);
      } else {
        setWarehouseId(String(order.warehouseId));
        setWarehouseName(order.warehouseName || "");
        setWarehouseCode(order.warehouseCode || "");
      }
    }
  }, [order, warehouses, warehouseId]);

  // Fetch batches when warehouse changes
  useEffect(() => {
    if (!order || !warehouseId) return;

    const fetchAllBatches = async () => {
      const newBatchesMap: Record<string, any[]> = {};
      try {
        await Promise.all(
          order.lineItems.map(async (line) => {
            if (!line.productId) return;
            const data = await PackingListService.getBatches(String(line.productId), warehouseId, line.quantityType);
            newBatchesMap[String(line.productId)] = data;
          })
        );
        setBatchesMap(newBatchesMap);
      } catch (err) {
        console.error("Error fetching batches:", err);
      }
    };
    fetchAllBatches();
  }, [order, warehouseId]);

  // Populate packing list lines when order or batchesMap changes
  useEffect(() => {
    if (!order || Object.keys(batchesMap).length === 0) return;

    const newLines = order.lineItems.map((line) => {
      const productBatches = batchesMap[String(line.productId)] || [];
      const allocations = productBatches.map((b) => ({
        cartonId: b.available_inventory_id,
        batchNumber: b.batch_code,
        expiryDate: b.expiry_date || "—",
        cartonNumber: "BX-" + b.batch_code,
        packingUnit: (line as any).packingUnit || "Unit",
        baseUnit: line.unit || "Unit",
        unitsPerPackingUnit: (line as any).packSize || 1,
        availablePackingQty: b.available_qty,
        availableBaseQty: b.available_qty,
        inventoryType: "original" as const,
        suggestedPackingQty: 0,
        suggestedBaseQty: 0,
        allocatedPackingQty: 0,
        allocatedBaseQty: 0,
      }));

      // Auto-fill suggested allocations (FEFO)
      let remaining = line.quantity;
      const suggestedAllocations = allocations.map((alloc) => {
        if (remaining <= 0) return alloc;
        const take = Math.min(remaining, alloc.availableBaseQty);
        remaining -= take;
        const autoFillPacking = Math.floor(take / alloc.unitsPerPackingUnit);
        return {
          ...alloc,
          suggestedPackingQty: autoFillPacking,
          suggestedBaseQty: take,
          allocatedPackingQty: autoFillPacking,
          allocatedBaseQty: take,
        };
      });

      return {
        lineItemId: line.id,
        productId: line.productId as any,
        productCode: line.productCode || "",
        productName: line.productName || "",
        packingUnit: (line as any).packingUnit || "Unit",
        baseUnit: line.unit || "Unit",
        unitsPerPackingUnit: (line as any).packSize || 1,
        orderedBaseQty: line.quantity,
        hasPackingConfig: true,
        allocations: suggestedAllocations,
        quantityType: line.quantityType,
      };
    });

    setLines(newLines as any);

    const initialChecked: Record<string, boolean> = {};
    const initialExpanded: Record<string, boolean> = {};
    for (const line of newLines) {
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
  }, [order, batchesMap]);

  if (orderLoading) return <div className="p-8 text-sm text-muted-foreground">Loading order…</div>;
  if (!order) return <div className="p-8">Order not found.</div>;

  const selectWarehouse = (id: string, code: string, name: string) => {
    setWarehouseId(id);
    setWarehouseCode(code);
    setWarehouseName(name);
    setWhOpen(false);
    setError("");

    // Refetch batches for new warehouse selection
    const fetchAllBatches = async () => {
      const newBatchesMap: Record<string, any[]> = {};
      try {
        await Promise.all(
          order.lineItems.map(async (line) => {
            if (!line.productId) return;
            const data = await PackingListService.getBatches(String(line.productId), id, line.quantityType);
            newBatchesMap[String(line.productId)] = data;
          })
        );
        setBatchesMap(newBatchesMap);
      } catch (err) {
        console.error("Error fetching batches:", err);
      }
    };
    fetchAllBatches();
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
          const availBase = a.availableBaseQty;

          const takeBase = Math.min(pending, availBase);
          const takePacking = line.packingUnit === "Case" ? Math.floor(takeBase / a.unitsPerPackingUnit) : takeBase;

          return {
            ...a,
            allocatedPackingQty: takePacking,
            allocatedBaseQty: takeBase
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
    value: string,
  ) => {
    let numValue = parseInt(value, 10);
    if (isNaN(numValue)) numValue = 0;
    const key = `${lineItemId}-${cartonId}`;
    
    setLines(prev =>
      prev.map(line => {
        if (line.lineItemId !== lineItemId) return line;
        return {
          ...line,
          allocations: line.allocations.map(alloc => {
            if (alloc.cartonId !== cartonId) return alloc;
            
            const maxBaseQty = alloc.availableBaseQty;
            let newBaseQty = 0;
            
            if (line.packingUnit === "Case") {
              newBaseQty = Math.min(numValue * alloc.unitsPerPackingUnit, maxBaseQty);
            } else {
              newBaseQty = Math.min(numValue, maxBaseQty);
            }

            setCheckedAllocations(prevChecks => ({ ...prevChecks, [key]: newBaseQty > 0 }));

            return { ...alloc, allocatedPackingQty: numValue, allocatedBaseQty: newBaseQty };
          }),
        };
      }),
    );
    setError("");
  };


  const handleSave = async () => {
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
      if (productSelectedTotal !== line.orderedBaseQty) {
        setError(`Total allocated quantity for ${line.productName} must exactly match the ordered quantity (${line.orderedBaseQty}).`);
        return;
      }
    }

    const finalLines = lines.map(line => ({
      ...line,
      allocations: line.allocations.filter(alloc => checkedAllocations[`${line.lineItemId}-${alloc.cartonId}`])
    }));

    const postPayload = {
      source_type: "sample",
      source_id: orderId,
      warehouse_id: warehouseId,
      remarks: order.remarks || "",
      products: finalLines.flatMap((line) =>
        line.allocations.map((alloc) => ({
          source_item_id: line.lineItemId,
          batch_code: alloc.batchNumber,
          order_qty: alloc.allocatedBaseQty,
          available_inventory_id: alloc.cartonId,
          quantity_type: line.quantityType,
        }))
      ),
    };

    setIsSubmitting(true);
    try {
      await PackingListService.create(postPayload);
      router.push(`/sales/sample-order`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to generate packing list");
    } finally {
      setIsSubmitting(false);
    }
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

        {warehouseId && lines.map(line => {
          const visibleAllocations = line.allocations;

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
                      <span className="font-semibold">
                        {line.quantityType?.toUpperCase() === "CASE" 
                          ? `${Math.floor(line.orderedBaseQty / line.unitsPerPackingUnit)} Case` 
                          : `${line.orderedBaseQty} Unit`}
                      </span>
                      <span className="mx-3 text-muted-foreground">|</span>
                      <span className="text-muted-foreground">Allocated: </span>
                      <span className={cn("font-semibold", insufficient && "text-amber-600")}>
                        {line.quantityType?.toUpperCase() === "CASE" 
                          ? `${Math.floor(allocated / line.unitsPerPackingUnit)} Case` 
                          : `${allocated} Unit`}
                      </span>
                      {!isExpanded && selectedCount > 0 && (
                        <span className="ml-2 text-muted-foreground">({selectedCount} batch{selectedCount !== 1 ? "es" : ""} selected)</span>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="overflow-x-auto bg-white border-t border-border">
                  {visibleAllocations.length === 0 ? (
                    <div className="p-4 text-xs font-semibold text-amber-600 bg-amber-50/50 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      No sellable batches available for this product in the selected warehouse.
                    </div>
                  ) : (
                    <table className="w-full min-w-[900px]">
                      <thead>
                        <tr className="bg-muted/10 border-b border-border">
                          <th className="px-4 py-2.5 text-left w-12">Select</th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold">Quantity Type</th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold">Batch</th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold w-24">Available Qty</th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold w-32">Pack Qty</th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold w-20">Total (Base)</th>
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
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap bg-blue-100 text-blue-700">
                                  {line.packingUnit?.toUpperCase() || "PIECE"}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-xs font-mono text-brand-700">{alloc.batchNumber}</td>
                              <td className="px-3 py-2.5 text-xs text-left tabular-nums text-muted-foreground">
                                {line.packingUnit === "Case"
                                  ? Math.floor(alloc.availableBaseQty / alloc.unitsPerPackingUnit)
                                  : alloc.availableBaseQty}
                              </td>
                              <td className="px-3 py-2.5">
                                <Input
                                  type="number"
                                  min="0"
                                  max={line.packingUnit === "Case" ? Math.floor(alloc.availableBaseQty / alloc.unitsPerPackingUnit) : alloc.availableBaseQty}
                                  value={isChecked && alloc.allocatedPackingQty > 0 ? alloc.allocatedPackingQty : (isChecked ? 0 : "")}
                                  onChange={(e) => updateAllocation(line.lineItemId, alloc.cartonId, e.target.value)}
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
                  )}
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
            disabled={!warehouseCode || isSubmitting}
          >
            <Save className="w-4 h-4" /> {isSubmitting ? "Generating..." : "Save Packing List"}
          </Button>
        </div>
      </div>
    </div>
  );
}
