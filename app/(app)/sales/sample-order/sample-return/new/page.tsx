"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { getDispatchRecords, saveDispatchRecords } from "@/app/(app)/warehouse/dispatch/mock-data";
import { DispatchDetailsPanel } from "../../../orders/components/DispatchDetailsPanel";
import {
  SampleReturnProductForm,
  getSampleReturnFormSummary,
} from "../../components/SampleReturnProductForm";
import {
  getSampleReturnRecords,
  saveSampleReturnRecords,
} from "../../sample-return-data";
import {
  enrichDispatchForSampleReturn,
  calcReturnLineAmount,
  getDeliveredSampleOrderDispatches,
  getSampleOrderNo,
} from "../../sample-return-utils";
import type { DispatchRecord, DispatchProduct } from "@/app/(app)/warehouse/dispatch/types";
import type { PRLineItem } from "@/app/(app)/procurement/purchase-requests/pr-data";

export default function NewSampleReturnPage() {
  const router = useRouter();
  const [selectedSalesOrderNo, setSelectedSalesOrderNo] = useState("");
  const [selectedDispatchId, setSelectedDispatchId] = useState("");
  const [dispatch, setDispatch] = useState<ReturnType<typeof enrichDispatchForSampleReturn> | null>(null);
  const [checkedProducts, setCheckedProducts] = useState<Record<string, boolean>>({});
  const [returnQuantities, setReturnQuantities] = useState<Record<string, string>>({});
  const [productRemarks, setProductRemarks] = useState<Record<string, string>>({});
  const [selectedDispatchedProductId, setSelectedDispatchedProductId] = useState<string[]>([]);
  const [returnQuantity, setReturnQuantity] = useState("1");
  const [returnProductRemarks, setReturnProductRemarks] = useState("");
  const [returnRemarks, setReturnRemarks] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const deliveredDispatches = useMemo(() => getDeliveredSampleOrderDispatches(), []);

  const salesOrderOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const d of deliveredDispatches) {
      const soNo = getSampleOrderNo(d);
      if (!soNo || seen.has(soNo)) continue;
      seen.set(soNo, d.customer || d.customer_name || "");
    }
    return Array.from(seen.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([soNo, customer]) => ({
        value: soNo,
        label: customer ? `${soNo} — ${customer}` : soNo,
      }));
  }, [deliveredDispatches]);

  const dispatchOptions = useMemo(() => {
    if (!selectedSalesOrderNo) return [];
    return deliveredDispatches
      .filter((d: DispatchRecord) => getSampleOrderNo(d) === selectedSalesOrderNo)
      .map((d: DispatchRecord) => ({
        value: d.id,
        label: `${d.dispatchNumber || d.dispatch_no}${d.customer || d.customer_name ? ` — ${d.customer || d.customer_name}` : ""}`,
      }));
  }, [deliveredDispatches, selectedSalesOrderNo]);

  useEffect(() => {
    if (!selectedDispatchId) {
      setDispatch(null);
      return;
    }
    const record = deliveredDispatches.find((d: DispatchRecord) => d.id === selectedDispatchId);
    if (record && getSampleOrderNo(record) === selectedSalesOrderNo) {
      setDispatch(enrichDispatchForSampleReturn(record));
      setCheckedProducts({});
      setReturnQuantities({});
      setProductRemarks({});
      setSelectedDispatchedProductId([]);
      setReturnQuantity("1");
      setReturnProductRemarks("");
      setReturnRemarks("");
    }
  }, [selectedDispatchId, selectedSalesOrderNo, deliveredDispatches]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const summary = dispatch
    ? getSampleReturnFormSummary(dispatch, checkedProducts, returnQuantities)
    : { totalQty: 0, totalAmount: 0, selectedCount: 0 };

  const handleDispatchedProductChange = (val: string[]) => {
    setSelectedDispatchedProductId(val);
  };

  const handleReturnQuantityChangeQuickAdd = (val: string) => {
    setReturnQuantity(val);
  };

  const handleReturnProductRemarksChangeQuickAdd = (val: string) => {
    setReturnProductRemarks(val);
  };

  const handleAddReturnProduct = (productIds: string[], qty: number, remarks: string) => {
    if (!dispatch) return;
    for (const sku of productIds) {
      const p = dispatch.products.find((x) => x.sku === sku);
      if (!p) continue;
      if (qty <= 0) {
        setToast({ msg: "Unit Qty must be greater than 0.", type: "error" });
        return;
      }
      if (qty > p.dispatchQty * 10) {
        setToast({
          msg: `Unit Qty cannot exceed ${p.dispatchQty * 10} pieces.`,
          type: "error",
        });
        return;
      }
      setCheckedProducts((prev) => ({ ...prev, [sku]: true }));
      setReturnQuantities((prev) => ({ ...prev, [sku]: String(qty) }));
      setProductRemarks((prev) => ({ ...prev, [sku]: remarks || "" }));
    }
    setSelectedDispatchedProductId([]);
    setReturnQuantity("1");
    setReturnProductRemarks("");
  };

  const handleRemoveReturnProduct = (uid: string) => {
    setCheckedProducts((prev) => ({ ...prev, [uid]: false }));
    setReturnQuantities((prev) => {
      const next = { ...prev };
      delete next[uid];
      return next;
    });
    setProductRemarks((prev) => {
      const next = { ...prev };
      delete next[uid];
      return next;
    });
  };

  const handleUpdateReturnProduct = (uid: string, patch: Partial<PRLineItem>) => {
    if (patch.requestedQty !== undefined) {
      const qty = patch.requestedQty;
      const p = dispatch?.products.find((x) => x.sku === uid);
      if (!p) return;
      if (qty <= 0) {
        setToast({ msg: "Unit Qty must be greater than 0.", type: "error" });
        return;
      }
      if (qty > p.dispatchQty * 10) {
        setToast({
          msg: `Unit Qty cannot exceed ${p.dispatchQty * 10} pieces.`,
          type: "error",
        });
        return;
      }
      setReturnQuantities((prev) => ({ ...prev, [uid]: String(qty) }));
    }
    if (patch.remarks !== undefined) {
      setProductRemarks((prev) => ({ ...prev, [uid]: patch.remarks || "" }));
    }
  };

  const listHref = "/sales/sample-order?tab=sales_return";

  const handleSave = () => {
    if (!dispatch) return;

    const productsToReturn = dispatch.products
      .filter((p: DispatchProduct) => checkedProducts[p.sku])
      .map((p: DispatchProduct) => {
        const returnQty = parseFloat(returnQuantities[p.sku]) || 0;
        const unitRate = p.unitRate ?? 0;
        return {
          product: p.product,
          sku: p.sku,
          packedQty: p.packedQty,
          dispatchQty: p.dispatchQty,
          returnQty,
          unitRate,
          batchNo: p.batchNo,
          lineAmount: calcReturnLineAmount(returnQty, unitRate),
          remarks: productRemarks[p.sku] || "",
        };
      });

    if (productsToReturn.length === 0) {
      setToast({ msg: "Please select at least one product to return.", type: "error" });
      return;
    }

    for (const p of productsToReturn) {
      if (p.returnQty <= 0) {
        setToast({ msg: `Please enter a valid return quantity for ${p.product}.`, type: "error" });
        return;
      }
      if (p.returnQty > p.dispatchQty * 10) {
        setToast({
          msg: `Unit Qty cannot exceed ${p.dispatchQty * 10} pieces.`,
          type: "error",
        });
        return;
      }
    }

    const totalAmount = productsToReturn.reduce((sum: number, p) => sum + p.lineAmount, 0);
    const existingReturns = getSampleReturnRecords();
    const returnNumber = `SR-2026-${String(existingReturns.length + 1).padStart(3, "0")}`;

    const newReturn = {
      id: `ret-${Date.now()}`,
      returnNumber,
      dispatchNumber: dispatch.dispatchNumber,
      salesOrderNumber: dispatch.salesOrderNumber || dispatch.source_document_no || "",
      customer: dispatch.customer || dispatch.customer_name || "",
      returnDate: new Date().toISOString().split("T")[0],
      warehouse: dispatch.warehouse,
      products: productsToReturn,
      totalAmount,
      remarks: returnRemarks,
      status: "pending" as const,
    };

    saveSampleReturnRecords([...existingReturns, newReturn]);

    const allDispatches = getDispatchRecords();
    const dIdx = allDispatches.findIndex((d) => d.id === dispatch.id);
    if (dIdx !== -1) {
      allDispatches[dIdx].deliveryStatus = "Returned";
      saveDispatchRecords(allDispatches);
    }

    setToast({ msg: `Sample return ${returnNumber} saved successfully.`, type: "success" });
    setTimeout(() => router.push(listHref), 800);
  };

  return (
    <FormContainer
      title="Process Sample Return"
      description="Sales → Sample Orders → Sample Return → New"
      onBack={() => router.push(listHref)}
      onCancel={() => router.push(listHref)}
      cancelLabel="Discard"
      noCard
      actions={
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-white"
          onClick={handleSave}
          disabled={!dispatch || summary.selectedCount === 0 || summary.totalAmount <= 0}
        >
          <RotateCcw className="w-3.5 h-3.5" /> Save Return
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Select Delivered Dispatch
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Sample Order No *</p>
              <AutocompleteSelect
                options={salesOrderOptions}
                value={selectedSalesOrderNo}
                onChange={(soNo) => {
                  setSelectedSalesOrderNo(soNo);
                  setSelectedDispatchId("");
                }}
                placeholder={salesOrderOptions.length ? "Select sample order…" : "No delivered sample orders available"}
                searchPlaceholder="Search sample order or recipient…"
                className="h-9 w-full text-xs"
                disabled={salesOrderOptions.length === 0}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Dispatch *</p>
              <AutocompleteSelect
                options={dispatchOptions}
                value={selectedDispatchId}
                onChange={setSelectedDispatchId}
                placeholder={
                  !selectedSalesOrderNo
                    ? "Select sample order first"
                    : dispatchOptions.length
                      ? "Select dispatch…"
                      : "No delivered dispatches for this order"
                }
                searchPlaceholder="Search dispatch number…"
                className="h-9 w-full text-xs"
                disabled={!selectedSalesOrderNo || dispatchOptions.length === 0}
              />
            </div>
          </div>
        </div>

        {dispatch ? (
          <>
            <DispatchDetailsPanel dispatch={dispatch} />
            <SampleReturnProductForm
              dispatch={dispatch}
              checkedProducts={checkedProducts}
              returnQuantities={returnQuantities}
              returnRemarks={returnRemarks}
              onCheckedChange={(sku: string, checked: boolean, defaultQty: number) => {
                setCheckedProducts((prev) => ({ ...prev, [sku]: checked }));
                if (checked && !returnQuantities[sku]) {
                  setReturnQuantities((prev) => ({ ...prev, [sku]: String(defaultQty) }));
                }
              }}
              onQuantityChange={(sku: string, value: string) => {
                setReturnQuantities((prev) => ({ ...prev, [sku]: value }));
              }}
              onRemarksChange={setReturnRemarks}
              selectedDispatchedProductId={selectedDispatchedProductId}
              returnQuantity={returnQuantity}
              returnProductRemarks={returnProductRemarks}
              onProductChange={handleDispatchedProductChange}
              onQuantityChangeQuickAdd={handleReturnQuantityChangeQuickAdd}
              onRemarksChangeQuickAdd={handleReturnProductRemarksChangeQuickAdd}
              onAddItem={handleAddReturnProduct}
              onRemoveItem={handleRemoveReturnProduct}
              onUpdateItem={handleUpdateReturnProduct}
              productRemarks={productRemarks}
              onProductRemarksChange={(sku, val) => setProductRemarks((prev) => ({ ...prev, [sku]: val }))}
            />
          </>
        ) : (
          <div className="bg-muted/20 border border-dashed border-border rounded-xl p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Select a sample order and dispatch above to view details and process the return.
            </p>
          </div>
        )}
      </div>

      {toast && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
          )}
        >
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </FormContainer>
  );
}
