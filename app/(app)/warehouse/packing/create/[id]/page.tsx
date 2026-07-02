"use client";

import React, { useEffect, useState } from "react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building, Layers, Info, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSalesOrderById, createPackingRecord } from "../../services";
import { getSellableQcPassedStockList } from "../../../stockoverview/services";
import { SalesOrderRecord } from "../../types";
import { buildDispatchNearExpiryEntries } from "../../../dispatch/near-expiry-dispatch";
import { PackingAllocationSummaryDialog } from "../../components/PackingAllocationSummaryDialog";
import { PackingProductLinesSection } from "../../components/PackingProductLinesSection";
import {
  buildBatchAllocationMap,
  buildFefoRecommendedSelections,
  buildPackingSummaryLines,
  getPackingBatchInventoryRows,
  getSelectedPackingQty,
  isBatchAllocationComplete,
  validateBatchSelectionsForPacking,
  validateSelectedPackingLines,
  type PackingSummaryLine,
} from "../../lib/packing-batch-allocation";

function buildInitialSelection(products: SalesOrderRecord["products"]): Record<string, boolean> {
  return products.reduce<Record<string, boolean>>((acc, p) => {
    acc[p.sku] = p.pendingQty > 0;
    return acc;
  }, {});
}

export default function CreatePackingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<SalesOrderRecord | null>(null);
  const [packingNo, setPackingNo] = useState("");
  const [packingDate, setPackingDate] = useState("");
  const [packingQty, setPackingQty] = useState<Record<string, number>>({});
  const [selectedSkus, setSelectedSkus] = useState<Record<string, boolean>>({});
  const [batchSelections, setBatchSelections] = useState<Record<string, Record<string, number>>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [batchErrors, setBatchErrors] = useState<Record<string, string>>({});
  const [availableStock, setAvailableStock] = useState<Record<string, number>>({});

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLines, setSummaryLines] = useState<PackingSummaryLine[]>([]);
  const [createdPackingNo, setCreatedPackingNo] = useState("");

  const warehouseName = order
    ? order.sourceDocumentType === "Stock Transfer"
      ? order.sourceWarehouse ?? order.warehouse
      : order.warehouse
    : "";
  const customerName = order
    ? order.sourceDocumentType === "Stock Transfer"
      ? order.targetWarehouse ?? order.customer
      : order.customer
    : "";

  const applyFefoPreselect = (sku: string, productName: string, qty: number) => {
    if (qty <= 0) {
      setBatchSelections((prev) => {
        const next = { ...prev };
        delete next[sku];
        return next;
      });
      return;
    }
    const rows = getPackingBatchInventoryRows(productName, warehouseName, undefined, sku);
    const recommended = buildFefoRecommendedSelections(rows, qty);
    setBatchSelections((prev) => ({ ...prev, [sku]: recommended }));
  };

  useEffect(() => {
    const record = getSalesOrderById(params.id);
    if (record) {
      setOrder(record);
      setPackingNo(`PKG-2026-${Math.floor(100 + Math.random() * 900)}`);
      setPackingDate(new Date().toISOString().split("T")[0]);

      const initialQty: Record<string, number> = {};
      const initialSelections: Record<string, Record<string, number>> = {};
      record.products.forEach((p) => {
        initialQty[p.sku] = p.pendingQty;
        if (p.pendingQty > 0) {
          const wh =
            record.sourceDocumentType === "Stock Transfer"
              ? record.sourceWarehouse ?? record.warehouse
              : record.warehouse;
          const rows = getPackingBatchInventoryRows(p.product, wh, undefined, p.sku);
          initialSelections[p.sku] = buildFefoRecommendedSelections(rows, p.pendingQty);
        }
      });
      setPackingQty(initialQty);
      setSelectedSkus(buildInitialSelection(record.products));
      setBatchSelections(initialSelections);

      try {
        const stocks = getSellableQcPassedStockList();
        const stockMap: Record<string, number> = {};
        record.products.forEach((p) => {
          const matched = stocks.filter(
            (s) => s.product === p.product && s.warehouse === record.warehouse,
          );
          stockMap[p.sku] = matched.reduce((sum, row) => sum + row.availableQuantity, 0) || 350;
        });
        setAvailableStock(stockMap);
      } catch {
        const stockMap: Record<string, number> = {};
        record.products.forEach((p) => {
          stockMap[p.sku] = p.pendingQty + 50;
        });
        setAvailableStock(stockMap);
      }
    }
  }, [params.id]);

  const finalizePacking = () => {
    if (!order) return;

    const batchAllocationMap = buildBatchAllocationMap(
      order.products,
      selectedSkus,
      batchSelections,
      warehouseName,
    );

    const qtyMap: Record<string, number> = {};
    order.products.forEach((p) => {
      if (selectedSkus[p.sku]) {
        qtyMap[p.sku] = packingQty[p.sku] ?? 0;
      }
    });

    const nearExpirySchemeEntries: ReturnType<typeof buildDispatchNearExpiryEntries> = [];
    order.products.forEach((p) => {
      if (!selectedSkus[p.sku]) return;
      const qty = packingQty[p.sku] ?? 0;
      if (qty <= 0) return;
      const allocations = batchAllocationMap[p.sku] ?? [];
      if (!allocations.length) return;
      nearExpirySchemeEntries.push(
        ...buildDispatchNearExpiryEntries({
          productName: p.product,
          sku: p.sku,
          warehouse: warehouseName,
          customerName: customerName ?? "",
          quantity: qty,
          batchAllocations: allocations,
        }),
      );
    });

    const record = createPackingRecord(
      order.id,
      qtyMap,
      "Rahul S.",
      false,
      batchAllocationMap,
      nearExpirySchemeEntries,
    );

    if (!record) {
      return;
    }

    setSummaryLines(
      buildPackingSummaryLines(order.products, selectedSkus, packingQty, batchAllocationMap),
    );
    setCreatedPackingNo(record.packingNo);
    setSummaryOpen(true);
  };

  const proceedWithPacking = () => {
    if (!order) return;
    setBatchErrors({});

    const validation = validateSelectedPackingLines(
      order.products,
      selectedSkus,
      packingQty,
      availableStock,
    );
    setValidationErrors(validation.errors);
    if (!validation.valid) {
      return;
    }

    const batchValidation = validateBatchSelectionsForPacking(
      order.products,
      selectedSkus,
      packingQty,
      batchSelections,
      warehouseName,
    );
    setBatchErrors(batchValidation.batchErrors);
    if (!batchValidation.valid) {
      return;
    }

    finalizePacking();
  };

  const handleToggleProduct = (sku: string, checked: boolean) => {
    setSelectedSkus((prev) => ({ ...prev, [sku]: checked }));
    if (!checked) {
      setPackingQty((prev) => ({ ...prev, [sku]: 0 }));
      setBatchSelections((prev) => {
        const next = { ...prev };
        delete next[sku];
        return next;
      });
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[sku];
        return next;
      });
      setBatchErrors((prev) => {
        const next = { ...prev };
        delete next[sku];
        return next;
      });
    } else {
      const product = order?.products.find((p) => p.sku === sku);
      if (product) {
        setPackingQty((prev) => ({ ...prev, [sku]: product.pendingQty }));
        applyFefoPreselect(sku, product.product, product.pendingQty);
      }
    }
  };

  const handleToggleAll = (checked: boolean) => {
    if (!order) return;
    const next: Record<string, boolean> = {};
    const nextQty = { ...packingQty };
    const nextBatch: Record<string, Record<string, number>> = {};

    order.products.forEach((p) => {
      next[p.sku] = checked;
      nextQty[p.sku] = checked ? p.pendingQty : 0;
      if (checked && p.pendingQty > 0) {
        const rows = getPackingBatchInventoryRows(p.product, warehouseName, undefined, p.sku);
        nextBatch[p.sku] = buildFefoRecommendedSelections(rows, p.pendingQty);
      }
    });

    setSelectedSkus(next);
    setPackingQty(nextQty);
    setBatchSelections(checked ? nextBatch : {});
    if (checked) {
      setValidationErrors({});
      setBatchErrors({});
    }
  };

  const handleQtyChange = (sku: string, value: string, pendingQty: number, maxAvailable: number) => {
    const val = parseInt(value, 10);
    const num = Number.isNaN(val) ? 0 : val;

    setPackingQty((prev) => ({ ...prev, [sku]: num }));

    let err = "";
    if (!selectedSkus[sku]) err = "";
    else if (num < 0) err = "Quantity cannot be negative";
    else if (num > pendingQty) err = `Cannot exceed pending quantity of ${pendingQty}`;
    else if (num > maxAvailable) err = `Cannot exceed available warehouse stock of ${maxAvailable}`;

    setValidationErrors((prev) => ({ ...prev, [sku]: err }));

    const product = order?.products.find((p) => p.sku === sku);
    if (product && selectedSkus[sku]) {
      applyFefoPreselect(sku, product.product, num);
    }

    if (batchErrors[sku]) {
      setBatchErrors((prev) => {
        const next = { ...prev };
        delete next[sku];
        return next;
      });
    }
  };

  const hasErrors = Object.values(validationErrors).some((err) => err !== "");
  const totalQtyToPack = order ? getSelectedPackingQty(order.products, selectedSkus, packingQty) : 0;

  const allBatchAllocationsComplete = order
    ? order.products.every((p) => {
        if (!selectedSkus[p.sku]) return true;
        const qty = packingQty[p.sku] ?? 0;
        if (qty <= 0) return false;
        return isBatchAllocationComplete(batchSelections[p.sku] ?? {}, qty);
      })
    : false;

  const canStartPacking =
    !hasErrors && totalQtyToPack > 0 && allBatchAllocationsComplete;

  if (!order) {
    return (
      <FormContainer title="Sales Order" onBack={() => router.push("/warehouse/packing")}>
        <div className="max-w-[800px] mx-auto text-center py-12 space-y-4">
          <Info className="w-12 h-12 text-blue-500 mx-auto" />
          <h1 className="text-base font-bold text-foreground">Sales Order Not Found</h1>
          <p className="text-xs text-muted-foreground">
            The sales order record you requested for packing does not exist.
          </p>
          <Button variant="outline" size="sm" onClick={() => router.push("/warehouse/packing")}>
            Go Back
          </Button>
        </div>
      </FormContainer>
    );
  }

  return (
    <>
      <FormContainer
        title="Create Packing List"
        description={`Generate packing allocations for ${order.salesOrderNo}`}
        onBack={() => router.push("/warehouse/packing")}
        onCancel={() => router.push("/warehouse/packing")}
        cancelLabel="Cancel"
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!canStartPacking}
              onClick={proceedWithPacking}
              className="h-9 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Start Packing
            </Button>
          </div>
        }
        noCard={false}
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-brand-600" />
              Packing Header Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Packing No
                </p>
                <Input
                  value={packingNo}
                  disabled
                  className="h-8 text-xs bg-slate-50 font-mono font-bold mt-1.5"
                />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  {order.sourceDocumentType === "Stock Transfer"
                    ? "Source Document No."
                    : order.sourceDocumentType === "Sample Order"
                      ? "Sample Order No"
                      : "Sales Order No"}
                </p>
                <Input
                  value={
                    order.sourceDocumentType === "Stock Transfer"
                      ? order.sourceDocumentNo
                      : order.salesOrderNo
                  }
                  disabled
                  className="h-8 text-xs bg-slate-50 font-mono font-bold mt-1.5"
                />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  {order.sourceDocumentType === "Stock Transfer"
                    ? "Target Warehouse"
                    : order.sourceDocumentType === "Sample Order"
                      ? "Issued To Employee"
                      : "Customer"}
                </p>
                <Input
                  value={
                    order.sourceDocumentType === "Stock Transfer"
                      ? order.targetWarehouse
                      : order.customer
                  }
                  disabled
                  className="h-8 text-xs bg-slate-50 font-medium mt-1.5"
                />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  {order.sourceDocumentType === "Stock Transfer" ||
                  order.sourceDocumentType === "Sample Order"
                    ? "Source Warehouse"
                    : "Warehouse"}
                </p>
                <div className="flex items-center gap-1.5 h-8 border border-input px-3 rounded-md bg-slate-50 text-xs text-muted-foreground font-medium mt-1.5">
                  <Building className="w-3.5 h-3.5 text-muted-foreground/60" />
                  {order.sourceDocumentType === "Stock Transfer"
                    ? order.sourceWarehouse
                    : order.sourceWarehouse || order.warehouse}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Packing Date *
                </p>
                <div className="relative mt-1.5">
                  <Input
                    type="date"
                    value={packingDate}
                    onChange={(e) => setPackingDate(e.target.value)}
                    className="h-8 text-xs focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <PackingProductLinesSection
            order={order}
            warehouseName={warehouseName}
            selectedSkus={selectedSkus}
            packingQty={packingQty}
            batchSelections={batchSelections}
            validationErrors={validationErrors}
            availableStock={availableStock}
            onToggleProduct={handleToggleProduct}
            onToggleAll={handleToggleAll}
            onQtyChange={handleQtyChange}
            onBatchSelectionsChange={(sku, selections) => {
              setBatchSelections((prev) => ({ ...prev, [sku]: selections }));
              
              const totalAllocated = Object.values(selections).reduce((a, b) => a + b, 0);
              setPackingQty((prev) => ({ ...prev, [sku]: totalAllocated }));
              
              if (batchErrors[sku]) {
                setBatchErrors((prev) => {
                  const next = { ...prev };
                  delete next[sku];
                  return next;
                });
              }
              if (validationErrors[sku]) {
                setValidationErrors((prev) => {
                  const next = { ...prev };
                  delete next[sku];
                  return next;
                });
              }
            }}
          />
        </div>
      </FormContainer>

      <PackingAllocationSummaryDialog
        open={summaryOpen}
        packingNo={createdPackingNo}
        orderNo={order.salesOrderNo}
        lines={summaryLines}
        onClose={() => {
          setSummaryOpen(false);
          router.push("/warehouse/packing");
        }}
      />
    </>
  );
}

