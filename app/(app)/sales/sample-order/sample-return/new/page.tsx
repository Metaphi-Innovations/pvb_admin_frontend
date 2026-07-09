"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
const getDispatchRecords = (): any[] => [];
const saveDispatchRecords = (r: any): void => {};

import { DispatchDetailsPanel } from "../../../orders/components/DispatchDetailsPanel";
import {
  buildSalesReturnPackingGroups,
  flattenSelectedBatchReturns,
  getSalesReturnFormSummary,
  SalesReturnProductForm,
  type BatchReturnInput,
} from "../../../orders/components/SalesReturnProductForm";
import {
  getSampleReturnRecords,
  saveSampleReturnRecords,
} from "../../sample-return-data";
import {
  enrichDispatchForSampleReturn,
  getDeliveredSampleOrderDispatches,
  getSampleOrderNo,
} from "../../sample-return-utils";
import { PIECES_PER_CASE } from "../../../orders/sales-return-data";
import type { DispatchRecord } from "@/app/(app)/warehouse/dispatch/types";

function sanitizeNumericInput(value: string): string {
  return value.replace(/\D/g, "");
}

function parseQty(value?: string): number {
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export default function NewSampleReturnPage() {
  const router = useRouter();
  const [selectedSalesOrderNo, setSelectedSalesOrderNo] = useState("");
  const [selectedDispatchId, setSelectedDispatchId] = useState("");
  const [dispatch, setDispatch] = useState<ReturnType<typeof enrichDispatchForSampleReturn> | null>(null);
  const [returnEntries, setReturnEntries] = useState<Record<string, BatchReturnInput>>({});
  const [returnRemarks, setReturnRemarks] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const deliveredDispatches = useMemo(() => getDeliveredSampleOrderDispatches(), []);

  const salesOrderOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of deliveredDispatches) {
      const soNo = getSampleOrderNo(item);
      if (!soNo || seen.has(soNo)) continue;
      seen.set(soNo, item.customer || item.customer_name || "");
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
      .filter((item: DispatchRecord) => getSampleOrderNo(item) === selectedSalesOrderNo)
      .map((item: DispatchRecord) => ({
        value: item.id,
        label: `${item.dispatchNumber || item.dispatch_no}${item.customer || item.customer_name ? ` - ${item.customer || item.customer_name}` : ""}`,
      }));
  }, [deliveredDispatches, selectedSalesOrderNo]);

  useEffect(() => {
    if (!selectedDispatchId) {
      setDispatch(null);
      return;
    }

    const record = deliveredDispatches.find((item: DispatchRecord) => item.id === selectedDispatchId);
    if (record && getSampleOrderNo(record) === selectedSalesOrderNo) {
      setDispatch(enrichDispatchForSampleReturn(record));
      setReturnEntries({});
      setReturnRemarks("");
    }
  }, [deliveredDispatches, selectedDispatchId, selectedSalesOrderNo]);

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
        ...patch,
      },
    }));
  };

  const handleQuantityTypeChange = (batchKey: string, type: "Case" | "Piece") => {
    updateEntry(batchKey, { quantityType: type, returnLooseQty: type === "Case" ? "" : (returnEntries[batchKey]?.returnLooseQty || "") });
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

      const looseQty = parseQty(sanitized);
      const caseQty = parseQty(existing.returnCaseQty);
      if (looseQty >= PIECES_PER_CASE) {
        const totalPieces = caseQty * PIECES_PER_CASE + looseQty;
        return {
          ...current,
          [batchKey]: {
            ...existing,
            returnCaseQty: String(Math.floor(totalPieces / PIECES_PER_CASE)),
            returnLooseQty: String(totalPieces % PIECES_PER_CASE),
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

  const handleSave = () => {
    if (!dispatch) return;

    if (summary.invalidBatchCount > 0) {
      setToast({ msg: "Please fix batch quantity validation errors before saving.", type: "error" });
      return;
    }

    const flatReturns = flattenSelectedBatchReturns(packingGroups, returnEntries);
    if (flatReturns.length === 0) {
      setToast({ msg: "Please enter at least one batch return quantity.", type: "error" });
      return;
    }
    
    const productsToReturn = flatReturns.map(r => ({
       product: r.product,
       sku: r.sku,
       packedQty: r.packedQty ?? 0,
       dispatchQty: r.dispatchQty ?? 0,
       returnQty: r.returnTotalPieces,
       unitRate: r.unitRate ?? 0,
       batchNo: r.batchNo,
       lineAmount: r.lineAmount ?? 0,
    }));

    const existingReturns = getSampleReturnRecords();
    const returnNumber = `S-RET-${new Date().getFullYear()}-${String(existingReturns.length + 1).padStart(3, "0")}`;
    const newReturn = {
      id: `sret-${Date.now()}`,
      returnNumber,
      dispatchNumber: dispatch.dispatchNumber || dispatch.dispatch_no || "",
      salesOrderNumber: dispatch.salesOrderNumber || dispatch.source_document_no || "",
      customer: dispatch.customer || dispatch.customer_name || "",
      returnDate: new Date().toISOString().split("T")[0],
      warehouse: dispatch.warehouse || dispatch.source_warehouse_name || "",
      products: productsToReturn,
      totalAmount: summary.totalAmount,
      remarks: returnRemarks,
      status: "pending" as const,
    };

    saveSampleReturnRecords([...existingReturns, newReturn]);

    const allDispatches = getDispatchRecords();
    const dispatchIndex = allDispatches.findIndex((item) => item.id === dispatch.id);
    if (dispatchIndex !== -1) {
      allDispatches[dispatchIndex].deliveryStatus = "Returned";
      saveDispatchRecords(allDispatches);
    }

    setToast({ msg: `Sample return ${returnNumber} saved successfully.`, type: "success" });
    setTimeout(() => router.push(listHref), 800);
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
          disabled={!dispatch || summary.selectedBatchCount === 0 || summary.invalidBatchCount > 0}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Save Return
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
                placeholder={salesOrderOptions.length ? "Select sample order..." : "No delivered sample orders available"}
                searchPlaceholder="Search sample order or customer..."
                className="h-9 w-full text-xs"
                disabled={salesOrderOptions.length === 0}
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
