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
import { PackingListService } from "@/services/packing-list.service";
import { PackingDoneService } from "@/services/packing-done.service";
import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import {
  buildBatchAllocationMap,
  buildFefoRecommendedSelections,
  buildPackingSummaryLines,
  buildPurchaseReturnBatchSelections,
  getPackingBatchInventoryRows,
  getSelectedPackingQty,
  isBatchAllocationComplete,
  validateBatchSelectionsForPacking,
  validateSelectedPackingLines,
  type PackingSummaryLine,
} from "../../lib/packing-batch-allocation";
import {
  getPackingDocumentNo,
  getPackingDocumentNoLabel,
  getPackingPartyLabel,
  getPackingPartyValue,
  getPackingWarehouseLabel,
  getPackingWarehouseValue,
  isPurchaseReturnDoc,
} from "../../lib/packing-document-labels";

function buildInitialSelection(products: SalesOrderRecord["products"]): Record<string, boolean> {
  return products.reduce<Record<string, boolean>>((acc, p) => {
    acc[p.sku] = p.pendingQty > 0;
    return acc;
  }, {});
}

export default function CreatePackingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
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
    ? order.sourceDocumentType === "Stock Transfer" || isPurchaseReturnDoc(order)
      ? order.sourceWarehouse ?? order.warehouse
      : order.warehouse
    : "";
  const customerName = order ? getPackingPartyValue(order) : "";

  const applyBatchPreselect = (sku: string, productName: string, qty: number, product?: SalesOrderRecord["products"][number]) => {
    if (qty <= 0) {
      setBatchSelections((prev) => {
        const next = { ...prev };
        delete next[sku];
        return next;
      });
      return;
    }
    if (order && isPurchaseReturnDoc(order) && product?.batchNumber) {
      setBatchSelections((prev) => ({
        ...prev,
        [sku]: buildPurchaseReturnBatchSelections(product, qty),
      }));
      return;
    }
    const rows = getPackingBatchInventoryRows(productName, warehouseName, undefined, sku);
    const recommended = buildFefoRecommendedSelections(rows, qty);
    setBatchSelections((prev) => ({ ...prev, [sku]: recommended }));
  };

  useEffect(() => {
    let active = true;
    async function loadRecord() {
      setLoading(true);
      try {
        const record = await PackingListService.getById(params.id);
        if (!active) return;
        setOrder(record);
        
        try {
          const previewResponse = await axiosInstance.get(API_ENDPOINTS.WAREHOUSE.PACKING_DONE.PREVIEW_NUMBER);
          const previewNo = previewResponse.data?.data?.next_number || previewResponse.data?.data || `PKG-2026-${Math.floor(100 + Math.random() * 900)}`;
          setPackingNo(previewNo);
        } catch {
          setPackingNo(`PKG-2026-${Math.floor(100 + Math.random() * 900)}`);
        }
        
        setPackingDate(new Date().toISOString().split("T")[0]);

        const initialQty: Record<string, number> = {};
        const initialSelections: Record<string, Record<string, number>> = {};
        record.products.forEach((p) => {
          initialQty[p.sku] = p.pendingQty;
          if (p.pendingQty > 0) {
            if (p.batchNumber) {
              initialSelections[p.sku] = { [p.batchNumber]: p.pendingQty };
            } else {
              const wh =
                record.sourceDocumentType === "Stock Transfer" || isPurchaseReturnDoc(record)
                  ? record.sourceWarehouse ?? record.warehouse
                  : record.warehouse;
              const rows = getPackingBatchInventoryRows(p.product, wh, undefined, p.sku);
              initialSelections[p.sku] = buildFefoRecommendedSelections(rows, p.pendingQty);
            }
          }
        });
        setPackingQty(initialQty);
        setSelectedSkus(buildInitialSelection(record.products));
        setBatchSelections(initialSelections);

        try {
          const stocks = getSellableQcPassedStockList();
          const stockMap: Record<string, number> = {};
          record.products.forEach((p) => {
            if (isPurchaseReturnDoc(record)) {
              stockMap[p.sku] = p.pendingQty;
              return;
            }
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
      } catch (err) {
        console.error("API loading failed, falling back to static mock data:", err);
        const record = getSalesOrderById(params.id);
        if (record && active) {
          setOrder(record);
          setPackingNo(`PKG-2026-${Math.floor(100 + Math.random() * 900)}`);
          setPackingDate(new Date().toISOString().split("T")[0]);

          const initialQty: Record<string, number> = {};
          const initialSelections: Record<string, Record<string, number>> = {};
          record.products.forEach((p) => {
            initialQty[p.sku] = p.pendingQty;
            if (p.pendingQty > 0) {
              if (isPurchaseReturnDoc(record) && p.batchNumber) {
                initialSelections[p.sku] = buildPurchaseReturnBatchSelections(p, p.pendingQty);
              } else {
                const wh =
                  record.sourceDocumentType === "Stock Transfer" || isPurchaseReturnDoc(record)
                    ? record.sourceWarehouse ?? record.warehouse
                    : record.warehouse;
                const rows = getPackingBatchInventoryRows(p.product, wh, undefined, p.sku);
                initialSelections[p.sku] = buildFefoRecommendedSelections(rows, p.pendingQty);
              }
            }
          });
          setPackingQty(initialQty);
          setSelectedSkus(buildInitialSelection(record.products));
          setBatchSelections(initialSelections);

          const stockMap: Record<string, number> = {};
          record.products.forEach((p) => {
            stockMap[p.sku] = p.pendingQty + 50;
          });
          setAvailableStock(stockMap);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadRecord();
    return () => {
      active = false;
    };
  }, [params.id]);

  const finalizePacking = async () => {
    if (!order) return;

    // Build the packed products payload for the creation API
    const productsPayload = order.products
      .filter((p) => selectedSkus[p.sku] && (packingQty[p.sku] ?? 0) > 0)
      .map((p) => ({
        packing_list_product_id: p.lineId || "",
        packed_qty: packingQty[p.sku] ?? 0,
      }));

    if (productsPayload.length === 0) {
      alert("At least one product must be specified for packing");
      return;
    }

    try {
      const response = await PackingDoneService.create({
        packing_list_id: order.id,
        packing_done_no: packingNo || undefined,
        packing_date: packingDate || undefined,
        products: productsPayload,
      });

      const nextPackingNo = response.data?.packing_done_no || response.packing_done_no || packingNo;

      const batchAllocationMap = buildBatchAllocationMap(
        order.products,
        selectedSkus,
        batchSelections,
        warehouseName,
        order.sourceDocumentType,
      );

      const summary = buildPackingSummaryLines(
        order.products,
        selectedSkus,
        packingQty,
        batchAllocationMap,
      );

      setSummaryLines(summary);
      setCreatedPackingNo(nextPackingNo);
      setSummaryOpen(true);
    } catch (err: any) {
      console.error("Error creating packing done:", err);
      // Fallback for offline usage
      alert("Offline Fallback: Simulated packing creation successfully!");
      const batchAllocationMap = buildBatchAllocationMap(
        order.products,
        selectedSkus,
        batchSelections,
        warehouseName,
        order.sourceDocumentType,
      );

      createPackingRecord(order.id, packingQty, "System", false, batchAllocationMap);

      setSummaryLines(
        buildPackingSummaryLines(order.products, selectedSkus, packingQty, batchAllocationMap),
      );
      setCreatedPackingNo(packingNo);
      setSummaryOpen(true);
    }
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
      order.sourceDocumentType,
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
        applyBatchPreselect(sku, product.product, product.pendingQty, product);
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
        if (isPurchaseReturnDoc(order) && p.batchNumber) {
          nextBatch[p.sku] = buildPurchaseReturnBatchSelections(p, p.pendingQty);
        } else {
          const rows = getPackingBatchInventoryRows(p.product, warehouseName, undefined, p.sku);
          nextBatch[p.sku] = buildFefoRecommendedSelections(rows, p.pendingQty);
        }
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
      applyBatchPreselect(sku, product.product, num, product);
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

  if (loading) {
    return (
      <FormContainer title="Create Packing List" onBack={() => router.push("/warehouse/packing")}>
        <div className="max-w-[800px] mx-auto text-center py-24 space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto" />
          <p className="text-xs text-muted-foreground">Loading packing details...</p>
        </div>
      </FormContainer>
    );
  }

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
                  {getPackingDocumentNoLabel(order.sourceDocumentType)}
                </p>
                <Input
                  value={getPackingDocumentNo(order)}
                  disabled
                  className="h-8 text-xs bg-slate-50 font-mono font-bold mt-1.5"
                />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  {getPackingPartyLabel(order.sourceDocumentType)}
                </p>
                <Input
                  value={getPackingPartyValue(order)}
                  disabled
                  className="h-8 text-xs bg-slate-50 font-medium mt-1.5"
                />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  {getPackingWarehouseLabel(order.sourceDocumentType)}
                </p>
                <div className="flex items-center gap-1.5 h-8 border border-input px-3 rounded-md bg-slate-50 text-xs text-muted-foreground font-medium mt-1.5">
                  <Building className="w-3.5 h-3.5 text-muted-foreground/60" />
                  {getPackingWarehouseValue(order)}
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

            {isPurchaseReturnDoc(order) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Reference PO No.
                  </p>
                  <Input
                    value={order.poNumber ?? "—"}
                    disabled
                    className="h-8 text-xs bg-slate-50 font-mono font-bold mt-1.5"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Supplier Code
                  </p>
                  <Input
                    value={order.supplierCode ?? "—"}
                    disabled
                    className="h-8 text-xs bg-slate-50 font-mono font-medium mt-1.5"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Return Date
                  </p>
                  <Input
                    value={order.orderDate}
                    disabled
                    className="h-8 text-xs bg-slate-50 font-medium mt-1.5"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Initiated By
                  </p>
                  <Input
                    value={order.initiatedBy ?? "—"}
                    disabled
                    className="h-8 text-xs bg-slate-50 font-medium mt-1.5"
                  />
                </div>
              </div>
            )}
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

              if (order && isPurchaseReturnDoc(order)) {
                const product = order.products.find((p) => p.sku === sku);
                const pendingQty = product?.pendingQty ?? 0;
                let err = "";
                if (totalAllocated > pendingQty) {
                  err = `Cannot exceed return quantity of ${pendingQty}`;
                }
                setValidationErrors((prev) => ({ ...prev, [sku]: err }));
              }
              
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
          if (order.sourceDocumentType === "Purchase Return") {
            router.push("/warehouse/packing/purchase-return");
          } else {
            router.push("/warehouse/packing");
          }
        }}
      />
    </>
  );
}
