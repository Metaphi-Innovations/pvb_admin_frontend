"use client";

import React, { useEffect, useState } from "react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building, Layers, Info, Check, AlertCircle, CheckCircle2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { SalesOrderRecord, SalesOrderProduct } from "../../types";
import { PackingAllocationSummaryDialog } from "../../components/PackingAllocationSummaryDialog";
import { PackingProductLinesSection } from "../../components/PackingProductLinesSection";
import { PackingListService } from "@/services/packing-list.service";
import { PackingDoneService } from "@/services/packing-done.service";
import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import { invalidatePurchaseOrderModuleListingQueries } from "@/lib/procurement/invalidate-po-listing-queries";
import {
  getPackingDocumentNo,
  getPackingDocumentNoLabel,
  getPackingPartyLabel,
  getPackingPartyValue,
  getPackingWarehouseLabel,
  getPackingWarehouseValue,
  isPurchaseReturnDoc,
  isStockTransferDoc,
} from "../../lib/packing-document-labels";

function getLineKey(p: SalesOrderProduct): string {
  return p.lineId || p.sku;
}

function buildInitialSelection(products: SalesOrderRecord["products"]): Record<string, boolean> {
  return products.reduce<Record<string, boolean>>((acc, p) => {
    acc[getLineKey(p)] = p.pendingBaseQty > 0;
    return acc;
  }, {});
}

export default function CreatePackingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<SalesOrderRecord | null>(null);
  const [packingNo, setPackingNo] = useState("");
  const [packingDate, setPackingDate] = useState("");
  const [packingQty, setPackingQty] = useState<Record<string, number>>({});
  const [selectedLines, setSelectedLines] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLines, setSummaryLines] = useState<any[]>([]);
  const [createdPackingNo, setCreatedPackingNo] = useState("");

  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  const showToast = (message: string, type: "error" | "success" = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const warehouseName = order
    ? order.sourceDocumentType === "Stock Transfer" || isPurchaseReturnDoc(order)
      ? order.sourceWarehouse ?? order.warehouse
      : order.warehouse
    : "";

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
        record.products.forEach((p) => {
          initialQty[getLineKey(p)] = p.pendingBaseQty;
        });

        setPackingQty(initialQty);
        setSelectedLines(buildInitialSelection(record.products));

      } catch (err) {
        console.error("API loading failed:", err);
        showToast("Failed to load packing list details.", "error");
        setTimeout(() => {
          if (active) router.push("/warehouse/packing");
        }, 2000);
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

    const productsPayload = order.products
      .filter((p) => selectedLines[getLineKey(p)] && (packingQty[getLineKey(p)] ?? 0) > 0)
      .map((p) => ({
        packing_list_product_id: p.lineId || "",
        base_qty: packingQty[getLineKey(p)] ?? 0,
      }));

    if (productsPayload.length === 0) {
      showToast("At least one product line must be specified for packing", "error");
      return;
    }

    try {
      await PackingDoneService.create({
        packing_list_id: order.id,
        packing_done_no: packingNo || undefined,
        packing_date: packingDate || undefined,
        products: productsPayload,
      });

      await invalidatePurchaseOrderModuleListingQueries(queryClient);
      showToast("Packing created successfully!", "success");
      setTimeout(() => {
        if (order.sourceDocumentType === "Purchase Return") {
          router.push("/warehouse/packing/purchase-return?tab=packing-done");
        } else {
          router.push("/warehouse/packing");
        }
      }, 1000);
    } catch (err: any) {
      console.error("Error creating packing done:", err);
      showToast(err.response?.data?.message || err.message || "Failed to create packing", "error");
    }
  };

  const proceedWithPacking = () => {
    if (!order) return;

    let hasErrors = false;
    const newErrors: Record<string, string> = {};

    order.products.forEach(p => {
      const key = getLineKey(p);
      if (selectedLines[key]) {
        const qty = packingQty[key] ?? 0;
        if (qty <= 0) {
          newErrors[key] = "Quantity must be greater than zero";
          hasErrors = true;
        } else if (qty > p.pendingBaseQty) {
          newErrors[key] = `Cannot exceed pending base quantity of ${p.pendingBaseQty}`;
          hasErrors = true;
        }
      }
    });

    setValidationErrors(newErrors);

    if (hasErrors) {
      showToast("Please fix the validation errors before proceeding.", "error");
      return;
    }

    finalizePacking();
  };

  const handleToggleProduct = (key: string, checked: boolean) => {
    setSelectedLines((prev) => ({ ...prev, [key]: checked }));
    if (!checked) {
      setPackingQty((prev) => ({ ...prev, [key]: 0 }));
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } else {
      const product = order?.products.find((p) => getLineKey(p) === key);
      if (product) {
        setPackingQty((prev) => ({ ...prev, [key]: product.pendingBaseQty }));
      }
    }
  };

  const handleToggleAll = (checked: boolean) => {
    if (!order) return;
    const next: Record<string, boolean> = {};
    const nextQty = { ...packingQty };

    order.products.forEach((p) => {
      const key = getLineKey(p);
      next[key] = checked;
      nextQty[key] = checked ? p.pendingBaseQty : 0;
    });

    setSelectedLines(next);
    setPackingQty(nextQty);
    if (checked) {
      setValidationErrors({});
    }
  };

  const handleQtyChange = (key: string, value: number, maxBaseQty: number) => {
    const num = Number.isNaN(value) ? 0 : value;

    setPackingQty((prev) => ({ ...prev, [key]: num }));

    let err = "";
    if (!selectedLines[key]) err = "";
    else if (num < 0) err = "Quantity cannot be negative";
    else if (num > maxBaseQty) err = `Cannot exceed pending quantity`;

    setValidationErrors((prev) => ({ ...prev, [key]: err }));
  };

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
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] p-4 rounded-lg shadow-lg flex items-center gap-3 border animate-in slide-in-from-top-2 fade-in duration-300 ${
          toast.type === "error" ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"
        }`}>
          {toast.type === "error" ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
          <p className="text-sm font-semibold">{toast.message}</p>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
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
              {!isStockTransferDoc(order) && (
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
              )}
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
            selectedLines={selectedLines}
            packingQty={packingQty}
            validationErrors={validationErrors}
            onToggleProduct={handleToggleProduct}
            onToggleAll={handleToggleAll}
            onQtyChange={handleQtyChange}
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
