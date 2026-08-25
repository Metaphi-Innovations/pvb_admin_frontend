"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";

import {
  getDispatchDropdown,
  getDispatchById,
  type DispatchDropdownItem,
} from "@/app/(app)/warehouse/dispatch/services";
import { SampleReturnService } from "@/services/sample-return.service";

import { DispatchDetailsPanel } from "../../../orders/components/DispatchDetailsPanel";
import {
  buildSalesReturnPackingGroups,
  flattenSelectedBatchReturns,
  getSalesReturnFormSummary,
  SalesReturnProductForm,
  type BatchReturnInput,
} from "../../../orders/components/SalesReturnProductForm";
import type { DispatchRecord } from "@/app/(app)/warehouse/dispatch/types";

function sanitizeNumericInput(value: string): string {
  return value.replace(/\D/g, "");
}

function mapBackendDispatchToFrontend(backendDispatch: any): DispatchRecord {
  const packingNo = backendDispatch.packing_done?.packing_done_no || backendDispatch.packing_done_no || "PKG-2026-001";
  
  const products = (backendDispatch.items || []).map((item: any) => {
    const snap = {
      ...(item.product_snapshot || {}),
      ...(item.product || {}),
    };
    const unitPerPacking = Number(
      item.product?.conversion_qty ||
      item.product?.unit_per_packing ||
      item.product_snapshot?.conversion_qty ||
      item.product_snapshot?.unit_per_packing ||
      10
    );
    const baseQty = Number(item.dispatched_base_qty || 0);
    const cases = baseQty / unitPerPacking;
    
    const unitRate = Number(item.unit_price || item.unit_rate || item.product?.unit_price || 0);

    return {
      product: item.product?.product_name || "Unknown Product",
      sku: item.product?.sku || item.product?.product_code || "",
      packedQty: cases,
      dispatchQty: cases,
      unitRate: unitRate,
      batchNo: item.inventory_batch?.batch_no || item.batch_code || "",
      batchExpiryDate: item.inventory_batch?.expiry_date || null,
      returnedQtyPieces: Number(item.returned_base_qty || 0),
      unitPerPacking: unitPerPacking,
      quantityType: item.quantity_type || "Case",
      uom: snap.base_unit || snap.unit || item.product?.unit || null,
      unitPackSize: snap.pack_size || snap.unit_size || null,
      netWeight: snap.net_weight || snap.netWeight || null,
      productSnapshot: snap,
      batchAllocations: [
        {
          batchNumber: item.inventory_batch?.batch_no || item.batch_code || "",
          expiryDate: item.inventory_batch?.expiry_date || null,
          allocatedQty: cases,
          returnedQtyPieces: Number(item.returned_base_qty || 0),
          unitPerPacking: unitPerPacking,
        }
      ]
    };
  });

  return {
    id: backendDispatch.id,
    dispatchNumber: backendDispatch.dispatch_number,
    salesOrderNumber: backendDispatch.sample_order?.sample_order_no || backendDispatch.source_document_no || "",
    customer: backendDispatch.customer?.customer_name || backendDispatch.customer_name || "",
    vehicleNumber: backendDispatch.vehicle_number || "",
    driverName: backendDispatch.driver_name || "",
    transporterName: backendDispatch.transporter || "",
    dispatchDate: backendDispatch.dispatch_date || backendDispatch.created_at || "",
    deliveryStatus: "Delivered",
    warehouse: backendDispatch.warehouse?.warehouse_name || "",
    packingNumbers: [packingNo],
    products: products,
    customer_id: backendDispatch.customer_id,
    warehouse_id: backendDispatch.warehouse_id,
    packing_list_id: backendDispatch.packing_done?.packing_list_id || null,
    source_document_id: backendDispatch.source_id,
    deliveryDetails: {
      deliveryDate: backendDispatch.dispatch_date 
        ? new Date(backendDispatch.dispatch_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      receiverName: "Vikram Mehta",
      remarks: "Delivered in good condition.",
    }
  };
}

export default function NewSampleReturnPage() {
  const router = useRouter();
  const [selectedSalesOrderNo, setSelectedSalesOrderNo] = useState("");
  const [selectedDispatchId, setSelectedDispatchId] = useState("");
  const [dispatch, setDispatch] = useState<ReturnType<typeof mapBackendDispatchToFrontend> | null>(null);
  const [rawDispatchDetails, setRawDispatchDetails] = useState<any>(null);
  const [returnEntries, setReturnEntries] = useState<Record<string, BatchReturnInput>>({});
  const [returnRemarks, setReturnRemarks] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [deliveredDispatches, setDeliveredDispatches] = useState<DispatchDropdownItem[]>([]);
  const [loadingDispatches, setLoadingDispatches] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchDispatches() {
      try {
        setLoadingDispatches(true);
        const rows = await getDispatchDropdown({
          source_type: "sample",
          status: "DISPATCHED,DELIVERED",
        });
        setDeliveredDispatches(rows);
      } catch (err) {
        console.error("Failed to fetch delivered dispatches:", err);
      } finally {
        setLoadingDispatches(false);
      }
    }
    fetchDispatches();
  }, []);

  const salesOrderOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of deliveredDispatches) {
      const soNo = item.source_document_no || "";
      if (!soNo || seen.has(soNo)) continue;
      seen.set(soNo, item.customer_name || "");
    }
    return Array.from(seen.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([soNo, customer]) => ({
        value: soNo,
        label: customer ? `${soNo} - ${customer}` : soNo,
      }));
  }, [deliveredDispatches]);

  const dispatchOptions = useMemo(() => {
    if (!selectedSalesOrderNo) return [];
    return deliveredDispatches
      .filter((item) => item.source_document_no === selectedSalesOrderNo)
      .map((item) => ({
        value: item.id,
        label: item.label || item.dispatch_number,
      }));
  }, [deliveredDispatches, selectedSalesOrderNo]);

  useEffect(() => {
    if (!selectedDispatchId) {
      setDispatch(null);
      setRawDispatchDetails(null);
      return;
    }

    async function fetchDispatchDetails() {
      try {
        const rawDispatch = await getDispatchById(selectedDispatchId);
        if (rawDispatch) {
          setRawDispatchDetails(rawDispatch);
          const mapped = mapBackendDispatchToFrontend(rawDispatch);
          setDispatch(mapped);
          setReturnEntries({});
          setReturnRemarks("");
        }
      } catch (err) {
        console.error("Failed to fetch dispatch details:", err);
        setToast({ msg: "Failed to fetch dispatch details.", type: "error" });
      }
    }

    fetchDispatchDetails();
  }, [selectedDispatchId]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const packingGroups = useMemo(
    () => (dispatch ? buildSalesReturnPackingGroups(dispatch) : []),
    [dispatch],
  );

  const summary = useMemo(
    () => getSalesReturnFormSummary(packingGroups, returnEntries),
    [packingGroups, returnEntries],
  );

  const listHref = "/sales/sample-order?tab=sales_return";

  const updateEntry = (batchKey: string, patch: Partial<BatchReturnInput>) => {
    setReturnEntries((current) => ({
      ...current,
      [batchKey]: {
        returnCaseQty: current[batchKey]?.returnCaseQty ?? "",
        returnLooseQty: current[batchKey]?.returnLooseQty ?? "",
        quantityType: current[batchKey]?.quantityType ?? "Piece",
        ...patch,
      },
    }));
  };

  const handleQuantityTypeChange = (batchKey: string, type: "Case" | "Piece") => {
    updateEntry(batchKey, {
      quantityType: type,
      returnCaseQty: type === "Piece" ? "" : (returnEntries[batchKey]?.returnCaseQty || ""),
      returnLooseQty: type === "Case" ? "" : (returnEntries[batchKey]?.returnLooseQty || "")
    });
  };

  const handleCaseQtyChange = (batchKey: string, value: string) => {
    updateEntry(batchKey, {
      quantityType: "Case",
      returnCaseQty: sanitizeNumericInput(value),
      returnLooseQty: "",
    });
  };

  const handleLooseQtyChange = (batchKey: string, value: string) => {
    updateEntry(batchKey, {
      quantityType: "Piece",
      returnCaseQty: "",
      returnLooseQty: sanitizeNumericInput(value),
    });
  };

  const handleSave = async () => {
    if (!dispatch || !rawDispatchDetails) return;

    if (summary.invalidBatchCount > 0) {
      setToast({ msg: "Please fix batch quantity validation errors before saving.", type: "error" });
      return;
    }

    const flatReturns = flattenSelectedBatchReturns(packingGroups, returnEntries);
    if (flatReturns.length === 0) {
      setToast({ msg: "Please enter at least one batch return quantity.", type: "error" });
      return;
    }

    try {
      setSaving(true);

      const items = flatReturns.map((retItem) => {
        const matchedItem = rawDispatchDetails.items?.find((di: any) => {
          const diSku = di.product?.sku || di.product?.product_code || "";
          const diBatch = di.inventory_batch?.batch_no || di.batch_code || "";
          return diSku === retItem.sku && diBatch === retItem.batchNo;
        });

        if (!matchedItem) {
          throw new Error(`Could not find dispatch item for SKU: ${retItem.sku}, Batch: ${retItem.batchNo}`);
        }

        const returnedQty = retItem.quantityType === "Piece"
          ? retItem.returnTotalPieces
          : retItem.returnCaseQty || 0;

        const baseQty = Number(matchedItem.dispatched_qty || matchedItem.dispatched_base_qty || 0);

        return {
          sample_order_item_id: matchedItem.source_item_id || null,
          product_id: matchedItem.product_id,
          dispatch_item_id: matchedItem.id,
          packed_qty: baseQty,
          dispatch_qty: baseQty,
          returned_qty: returnedQty,
          unit_price: matchedItem.unit_price || matchedItem.unit_rate || matchedItem.product?.unit_price || 0,
          return_amount: retItem.lineAmount,
          remarks: returnRemarks || "",
          quantity_type: retItem.quantityType,
        };
      });

      const payload = {
        sample_order_id: dispatch.source_document_id,
        customer_id: dispatch.customer_id,
        warehouse_id: dispatch.warehouse_id,
        dispatch_id: dispatch.id,
        return_date: new Date().toISOString(),
        remarks: returnRemarks,
        items,
      };

      const result = await SampleReturnService.create(payload);

      setToast({ msg: `Sample return ${result?.data?.return_no || ""} saved successfully.`, type: "success" });
      setTimeout(() => router.push(listHref), 800);
    } catch (err: any) {
      console.error("Failed to create sample return:", err);
      const errMsg = err?.response?.data?.message || err?.message || "Failed to save return.";
      setToast({ msg: errMsg, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormContainer
      title="Process Sample Return"
      description="Sales -> Sample Orders -> Sample Return -> New"
      onBack={() => router.push(listHref)}
      onCancel={() => router.push(listHref)}
      cancelLabel="Discard"
      noCard
      actions={
        <Button
          size="sm"
          className="h-8 gap-1.5 bg-red-600 text-xs text-white hover:bg-red-700"
          onClick={handleSave}
          disabled={saving || !dispatch || summary.selectedBatchCount === 0 || summary.invalidBatchCount > 0}
        >
          <RotateCcw className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save Return"}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="space-y-3 rounded-xl border border-border bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Select Delivered Dispatch</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sample Order No *</p>
              <AutocompleteSelect
                options={salesOrderOptions}
                value={selectedSalesOrderNo}
                onChange={(soNo) => {
                  setSelectedSalesOrderNo(soNo);
                  setSelectedDispatchId("");
                }}
                placeholder={loadingDispatches ? "Loading..." : salesOrderOptions.length ? "Select sample order..." : "No delivered sample orders available"}
                searchPlaceholder="Search sample order or customer..."
                className="h-9 w-full text-xs"
                disabled={loadingDispatches || salesOrderOptions.length === 0}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Dispatch *</p>
              <AutocompleteSelect
                options={dispatchOptions}
                value={selectedDispatchId}
                onChange={setSelectedDispatchId}
                placeholder={!selectedSalesOrderNo ? "Select sample order first" : dispatchOptions.length ? "Select dispatch..." : "No delivered dispatches for this order"}
                searchPlaceholder="Search dispatch number..."
                className="h-9 w-full text-xs"
                disabled={!selectedSalesOrderNo || dispatchOptions.length === 0}
              />
            </div>
          </div>
        </div>

        {dispatch ? (
          <>
            <DispatchDetailsPanel dispatch={dispatch} />
            <SalesReturnProductForm
              key={dispatch.id}
              packingGroups={packingGroups}
              returnEntries={returnEntries}
              returnRemarks={returnRemarks}
              summary={summary}
              onQuantityTypeChange={handleQuantityTypeChange}
              onCaseQtyChange={handleCaseQtyChange}
              onLooseQtyChange={handleLooseQtyChange}
              onRemarksChange={setReturnRemarks}
            />
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
            <p className="text-sm text-muted-foreground">Select a sample order and dispatch to view products.</p>
          </div>
        )}
      </div>

      {toast ? (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
          )}
        >
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      ) : null}
    </FormContainer>
  );
}

