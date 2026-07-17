"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle, Package, Save,
  ChevronDown, ChevronUp, ArrowLeft
} from "lucide-react";
import {
  type PackingListLine,
  CartonAllocation,
  InventoryType,
} from "../../../../orders/packing-list-data";
import { useStockTransfer } from "@/hooks/sales/use-stock-transfers";
import { useCreatePackingList } from "@/hooks/sales/use-sales-orders";
import { SalesOrderService } from "@/services/sales-order.service";
import { StockTransferService } from "@/services/stock-transfer.service";

export default function TransferNewPackingListPage() {
  const params = useParams();
  const router = useRouter();
  const transferId = params.id as string;

  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [warehouseCode, setWarehouseCode] = useState("");
  const [warehouseName, setWarehouseName] = useState("");
  const [lines, setLines] = useState<PackingListLine[]>([]);
  const [error, setError] = useState("");
  const [checkedAllocations, setCheckedAllocations] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [loadingBatches, setLoadingBatches] = useState(false);

  const { data: transfer, isLoading } = useStockTransfer(transferId);
  const createPackingListMutation = useCreatePackingList();

  useEffect(() => {
    if (transfer) {
      setWarehouseId(transfer.sourceWarehouseId as any);
      setWarehouseCode(transfer.sourceWarehouseCode);
      setWarehouseName(transfer.sourceWarehouseName);
    }
  }, [transfer]);

  useEffect(() => {
    if (!transfer || !warehouseId) {
      setLines([]);
      setCheckedAllocations({});
      setExpandedSections({});
      return;
    }

    const fetchAllBatches = async () => {
      setLoadingBatches(true);
      setError("");
      try {
        const packingLines: PackingListLine[] = [];
        const initialChecked: Record<string, boolean> = {};
        const initialExpanded: Record<string, boolean> = {};

        for (const line of transfer.lineItems) {
          if (!line.productId || line.quantity <= 0) continue;

          // Fetch available inventory batches from the backend
          const batches = await StockTransferService.getBatches(line.productId, warehouseId, line.quantityType);

          const config = {
            packingUnit: line.packingUnit || "Unit",
            baseUnit: line.baseUnit || "Unit",
            unitsPerPackingUnit: line.unitsPerPackingUnit || line.packSize || 1,
          };

          let remaining = line.quantity;
          const unitsPerPacking = config.unitsPerPackingUnit;

          const allocations = batches.map((b: any) => {
            const availQty = Number(b.available_qty || 0);

            const neededBase = remaining;
            const takeBase = Math.min(neededBase, availQty);
            const takePacking = line.quantityType === "Case" ? Math.floor(takeBase / unitsPerPacking) : takeBase;

            if (takeBase > 0) {
              initialChecked[`${line.id}-${b.available_inventory_id}`] = true;
              remaining -= takeBase;
            }

            return {
              cartonId: b.available_inventory_id,
              batchNumber: b.batch_code || "N/A",
              expiryDate: b.expiry_date || "N/A",
              cartonNumber: b.batch_code || "N/A",
              packingUnit: config.packingUnit,
              baseUnit: config.baseUnit,
              unitsPerPackingUnit: unitsPerPacking,
              availablePackingQty: line.quantityType === "Case" ? Math.floor(availQty / unitsPerPacking) : availQty,
              availableBaseQty: availQty,
              inventoryType: "original" as InventoryType,
              suggestedPackingQty: takePacking,
              suggestedBaseQty: takeBase,
              allocatedPackingQty: takePacking,
              allocatedBaseQty: takeBase,
            };
          });

          initialExpanded[line.id] = true;

          packingLines.push({
            lineItemId: line.id.toString(),
            productId: Number(line.productId),
            productCode: line.productCode,
            productName: line.productName,
            orderedBaseQty: line.quantity,
            baseUnit: config.baseUnit,
            packingUnit: config.packingUnit,
            unitsPerPackingUnit: unitsPerPacking,
            hasPackingConfig: true,
            allocations,
            quantityType: line.quantityType,
          });
        }

        setLines(packingLines);
        setCheckedAllocations(initialChecked);
        setExpandedSections(initialExpanded);
      } catch (err: any) {
        setError(err.message || "Failed to load inventory batches.");
      } finally {
        setLoadingBatches(false);
      }
    };

    fetchAllBatches();
  }, [transfer, warehouseId]);

  if (isLoading || loadingBatches) return <div className="p-8">Loading stock transfer & batches...</div>;
  if (!transfer) return <div className="p-8">Stock Transfer not found.</div>;

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
          const takePacking = line.quantityType === "Case" ? Math.floor(takeBase / a.unitsPerPackingUnit) : takeBase;

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
            
            if (line.quantityType === "Case") {
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

  const handleSave = () => {
    if (!warehouseId) {
      setError("Warehouse is required");
      return;
    }

    const productsToSubmit: any[] = [];

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

          productsToSubmit.push({
            source_item_id: line.lineItemId,
            batch_code: alloc.batchNumber,
            order_qty: alloc.allocatedBaseQty,
            available_inventory_id: alloc.cartonId,
          });
        }
      }
      if (productSelectedTotal > line.orderedBaseQty) {
        setError(`Selected batch quantity cannot exceed pending product quantity for ${line.productName}.`);
        return;
      }
    }

    if (productsToSubmit.length === 0) {
      setError("At least one product and batch must be allocated for packing.");
      return;
    }

    createPackingListMutation.mutate(
      {
        source_type: "stock_transfer",
        source_id: transfer.id as unknown as string,
        warehouse_id: warehouseId as string,
        remarks: "Generate packing list from UI",
        products: productsToSubmit,
      },
      {
        onSuccess: () => {
          router.push(`/sales/stock-transfer`);
        },
        onError: (err: any) => {
          setError(err.response?.data?.message || "Failed to generate packing list.");
        },
      }
    );
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
        <Button variant="outline" size="icon" onClick={() => router.push(`/sales/stock-transfer`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-600" />
            Generate Packing List
          </h1>
          <p className="text-sm text-muted-foreground">Stock Transfer: {transfer.transferNumber}</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4 space-y-4">
        <div className="space-y-1">
          <Label className="text-xs font-medium">
            Source Warehouse
          </Label>
          <div className="h-8 px-2.5 text-xs border border-border rounded-lg bg-muted/40 flex items-center font-medium w-fit">
            {warehouseCode} — {warehouseName}
          </div>
        </div>

        {lines.map(line => {
          const visibleAllocations = line.allocations;

          if (visibleAllocations.length === 0) {
            return (
              <div key={line.lineItemId} className="border border-red-200 rounded-xl overflow-hidden shadow-sm bg-red-50 p-4 mt-4">
                <p className="text-sm font-semibold text-red-700">{line.productName}</p>
                <p className="text-[11px] text-red-500 font-semibold py-1">No batch cartons available in source warehouse</p>
              </div>
            );
          }

          const allocated = line.allocations.reduce((sum, a) => {
            const isChecked = !!checkedAllocations[`${line.lineItemId}-${a.cartonId}`];
            return sum + (isChecked ? a.allocatedBaseQty : 0);
          }, 0);
          const insufficient = allocated < line.orderedBaseQty;

          const isExpanded = !!expandedSections[line.lineItemId];
          const selectedCount = line.allocations.filter(a => !!checkedAllocations[`${line.lineItemId}-${a.cartonId}`]).length;

          return (
            <div key={line.lineItemId} className="border border-border rounded-xl overflow-hidden shadow-sm mt-4">
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
                      <span className="text-muted-foreground">Required: </span>
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
                                {line.quantityType?.toUpperCase() || "PIECE"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-xs font-mono text-brand-700">{alloc.batchNumber}</td>
                            <td className="px-3 py-2.5 text-xs text-left tabular-nums text-muted-foreground">
                              {line.quantityType === "Case"
                                ? Math.floor(alloc.availableBaseQty / alloc.unitsPerPackingUnit)
                                : alloc.availableBaseQty}
                            </td>
                            <td className="px-3 py-2.5">
                              <Input
                                type="number"
                                min="0"
                                max={line.quantityType === "Case" ? Math.floor(alloc.availableBaseQty / alloc.unitsPerPackingUnit) : alloc.availableBaseQty}
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
          <Button variant="outline" onClick={() => router.push(`/sales/stock-transfer`)}>
            Cancel
          </Button>
          <Button
            className="gap-2 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={handleSave}
            disabled={!warehouseId || createPackingListMutation.isPending}
          >
            <Save className="w-4 h-4" /> {createPackingListMutation.isPending ? "Generating..." : "Save Packing List"}
          </Button>
        </div>
      </div>
    </div>
  );
}
