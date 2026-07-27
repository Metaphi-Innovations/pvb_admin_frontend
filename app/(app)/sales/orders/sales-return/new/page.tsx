"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";

import { getDispatches, getDispatchById } from "@/app/(app)/warehouse/dispatch/services";
import { SalesReturnService } from "@/services/sales-return.service";

import { DispatchDetailsPanel } from "../../components/DispatchDetailsPanel";
import {
  buildSalesReturnPackingGroups,
  flattenSelectedBatchReturns,
  getSalesReturnFormSummary,
  SalesReturnProductForm,
  type BatchReturnInput,
} from "../../components/SalesReturnProductForm";
import {
  PIECES_PER_CASE,
} from "../../sales-return-data";
import {
  getSalesOrderNo,
  enrichDispatchForReturn,
} from "../../sales-return-utils";
import type { DispatchRecord } from "@/app/(app)/warehouse/dispatch/types";

function sanitizeNumericInput(value: string): string {
  return value.replace(/\D/g, "");
}

function parseQty(value?: string): number {
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function mapBackendDispatchToFrontend(backendDispatch: any): DispatchRecord {
  const packingNo = backendDispatch.packing_done?.packing_done_no || backendDispatch.packing_done_no || "PKG-2026-001";
  
  const products = (backendDispatch.items || []).map((item: any) => {
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
    salesOrderNumber: backendDispatch.sales_order?.so_number || backendDispatch.source_document_no || "",
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

export default function NewSalesReturnPage() {
  const router = useRouter();
  const [selectedSalesOrderNo, setSelectedSalesOrderNo] = useState("");
  const [selectedDispatchId, setSelectedDispatchId] = useState("");
  const [dispatch, setDispatch] = useState<ReturnType<typeof enrichDispatchForReturn> | null>(null);
  const [rawDispatchDetails, setRawDispatchDetails] = useState<any>(null);
  const [returnEntries, setReturnEntries] = useState<Record<string, BatchReturnInput>>({});
  const [returnRemarks, setReturnRemarks] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [deliveredDispatches, setDeliveredDispatches] = useState<any[]>([]);
  const [loadingDispatches, setLoadingDispatches] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchDispatches() {
      try {
        setLoadingDispatches(true);
        const res = await getDispatches({
          filters: { source_type: "normal_sales" },
          page: 1,
          page_size: 1000
        });
        const allDispatches = res?.data || [];
        const eligible = allDispatches.filter((d: any) => d.status === "DELIVERED" || d.status === "DISPATCHED");
        setDeliveredDispatches(eligible);
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
      const soNo = getSalesOrderNo(item);
      if (!soNo || seen.has(soNo)) continue;
      const customerName = item.customer?.customer_name || item.customer_name || (typeof item.customer === 'string' ? item.customer : "");
      seen.set(soNo, customerName);
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
      .filter((item: DispatchRecord) => getSalesOrderNo(item) === selectedSalesOrderNo)
      .map((item: DispatchRecord) => ({
        value: item.id,
        label: `${item.dispatchNumber || item.dispatch_no || item.dispatch_number}${item.customer || item.customer_name ? ` - ${item.customer || item.customer_name}` : ""}`,
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

  const listHref = "/sales/orders?tab=sales_return";

  const updateEntry = (batchKey: string, patch: Partial<BatchReturnInput>) => {
    setReturnEntries((current) => ({
      ...current,
      [batchKey]: {
        returnCaseQty: current[batchKey]?.returnCaseQty ?? "",
        returnLooseQty: current[batchKey]?.returnLooseQty ?? "",
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
    updateEntry(batchKey, { returnCaseQty: sanitizeNumericInput(value) });
  };

  const handleLooseQtyChange = (batchKey: string, value: string) => {
    const sanitized = sanitizeNumericInput(value);
    setReturnEntries((current) => {
      const existing = current[batchKey] ?? { returnCaseQty: "", returnLooseQty: "" };
      if (!sanitized) {
        return { ...current, [batchKey]: { ...existing, returnLooseQty: "" } };
      }

      const sku = batchKey.split("::")[1];
      const prod = dispatch?.products.find((p: any) => p.sku === sku);
      const uKey = prod?.unitPerPacking || 10;

      const looseQty = parseQty(sanitized);
      const caseQty = parseQty(existing.returnCaseQty);
      if (looseQty >= uKey) {
        const totalPieces = caseQty * uKey + looseQty;
        return {
          ...current,
          [batchKey]: {
            ...existing,
            returnCaseQty: String(Math.floor(totalPieces / uKey)),
            returnLooseQty: String(totalPieces % uKey),
          },
        };
      }

      return {
        ...current,
        [batchKey]: {
          ...existing,
          returnLooseQty: sanitized,
        },
      };
    });
  };

  const handleSave = async () => {
    if (!dispatch || !rawDispatchDetails) return;

    if (summary.invalidBatchCount > 0) {
      setToast({ msg: "Please fix batch quantity validation errors before saving.", type: "error" });
      return;
    }

    const productsToReturn = flattenSelectedBatchReturns(packingGroups, returnEntries);
    if (productsToReturn.length === 0) {
      setToast({ msg: "Please enter at least one batch return quantity.", type: "error" });
      return;
    }

    try {
      setSaving(true);

      const items = productsToReturn.map((retItem) => {
        const matchedItem = rawDispatchDetails.items?.find((di: any) => {
          const diSku = di.product?.sku || di.product?.product_code || "";
          const diBatch = di.inventory_batch?.batch_no || di.batch_code || "";
          return diSku === retItem.sku && diBatch === retItem.batchNo;
        });

        if (!matchedItem) {
          throw new Error(`Could not find dispatch item for SKU: ${retItem.sku}, Batch: ${retItem.batchNo}`);
        }

        let batchKey = "";
        for (const pg of packingGroups) {
          if (pg.packingNumber === retItem.packingNumber) {
            for (const prod of pg.products) {
              if (prod.sku === retItem.sku) {
                const matchedBatch = prod.batches.find((b) => b.batchNo === retItem.batchNo);
                if (matchedBatch) {
                  batchKey = matchedBatch.key;
                  break;
                }
              }
            }
          }
        }
        const qtyType = returnEntries[batchKey]?.quantityType || "Piece";

        return {
          product_id: matchedItem.product_id,
          dispatch_item_id: matchedItem.id,
          batch_code: retItem.batchNo,
          dispatched_qty: retItem.dispatchQty,
          total_return_pieces: retItem.returnTotalPieces,
          amount: retItem.lineAmount,
          status: "Returned",
          qty: retItem.returnCaseQty || 0,
          base_qty: retItem.returnTotalPieces,
          reason: returnRemarks || "Sales Return",
          remarks: returnRemarks || "",
          quantity_type: qtyType,
          cases: retItem.returnCaseQty || 0,
          pieces: retItem.returnLooseQty || 0,
        };
      });

      const payload = {
        sales_order_id: dispatch.source_document_id,
        customer_id: dispatch.customer_id,
        warehouse_id: dispatch.warehouse_id,
        dispatch_id: dispatch.id,
        packing_list_id: dispatch.packing_list_id || null,
        return_date: new Date().toISOString(),
        remarks: returnRemarks,
        vehicle_number: dispatch.vehicleNumber || null,
        driver_name: dispatch.driverName || null,
        transporter_name: dispatch.transporterName || null,
        delivery_date: dispatch.dispatchDate || new Date().toISOString(),
        received_by: "Vikram Mehta",
        items,
      };

      const result = await SalesReturnService.create(payload);

      setToast({
        msg: `Sales return ${result?.data?.return_number || ""} saved successfully.`,
        type: "success",
      });
      setTimeout(() => router.push(listHref), 800);
    } catch (err: any) {
      console.error("Failed to create sales return:", err);
      const errMsg = err?.response?.data?.message || err?.message || "Failed to save return.";
      setToast({ msg: errMsg, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormContainer
      title="Process Sales Return"
      description="Sales -> Orders -> Sales Return -> New"
      onBack={() => router.push(listHref)}
      onCancel={() => router.push(listHref)}
      cancelLabel="Discard"
      noCard
      actions={
        <Button
          size="sm"
          className="h-8 gap-1.5 bg-red-600 text-xs text-white hover:bg-red-700"
          onClick={handleSave}
          disabled={saving || !dispatch || summary.selectedBatchCount === 0 || summary.totalAmount <= 0 || summary.invalidBatchCount > 0}
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
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sales Order No *</p>
              <AutocompleteSelect
                options={salesOrderOptions}
                value={selectedSalesOrderNo}
                onChange={(soNo) => {
                  setSelectedSalesOrderNo(soNo);
                  setSelectedDispatchId("");
                }}
                placeholder={loadingDispatches ? "Loading..." : salesOrderOptions.length ? "Select sales order..." : "No delivered sales orders available"}
                searchPlaceholder="Search sales order or customer..."
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
                placeholder={!selectedSalesOrderNo ? "Select sales order first" : dispatchOptions.length ? "Select dispatch..." : "No delivered dispatches for this order"}
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
            <p className="text-sm text-muted-foreground">Select a sales order and dispatch to view packing list products.</p>
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
