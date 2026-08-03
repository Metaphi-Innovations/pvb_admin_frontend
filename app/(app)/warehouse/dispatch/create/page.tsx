"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { Truck, CheckSquare } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  getPreviewNumber,
  createDispatch,
  getPackedOrdersDropdown,
  type PackedOrderDropdownItem,
} from "../services";
import { invalidatePurchaseOrderModuleListingQueries } from "@/lib/procurement/invalidate-po-listing-queries";

type PackingOption = {
  packing_done_id: string;
  packing_done_no: string;
  packing_list_id: string;
  packing_number: string;
  packing_list_status: string;
  customer_name: string;
  warehouse_name: string;
  packing_list: PackedOrderDropdownItem["packing_list"];
};

function sameIdList(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((id, i) => id === b[i]);
}

export default function CreateDispatchPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const packingIdFromUrl = searchParams ? searchParams.get("packingId") : null;

  const [dispatchNumber, setDispatchNumber] = useState("");
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [orderRows, setOrderRows] = useState<PackedOrderDropdownItem[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedPackingDoneIds, setSelectedPackingDoneIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPackedOrdersDropdown()
      .then((rows) => setOrderRows(rows))
      .catch(console.error);
  }, []);

  const orderOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { value: string; label: string; sublabel?: string }[] = [];
    for (const row of orderRows) {
      if (!row.order_id || seen.has(row.order_id)) continue;
      seen.add(row.order_id);
      const packingCount = orderRows
        .filter((r) => r.order_id === row.order_id)
        .reduce((sum, r) => sum + (r.packing_list.packing_dones?.length || 0), 0);
      options.push({
        value: row.order_id,
        label: row.order_number || row.label || row.order_id,
        sublabel: `${packingCount} ready packing${packingCount === 1 ? "" : "s"} · ${row.source_type}`,
      });
    }
    return options;
  }, [orderRows]);

  const packingOptionsForOrder = useMemo(() => {
    if (!selectedOrderId) return [] as PackingOption[];
    const options: PackingOption[] = [];
    for (const row of orderRows) {
      if (row.order_id !== selectedOrderId) continue;
      for (const pd of row.packing_list.packing_dones || []) {
        options.push({
          packing_done_id: pd.packing_done_id,
          packing_done_no: pd.packing_done_no,
          packing_list_id: row.packing_list.packing_list_id,
          packing_number: row.packing_list.packing_number,
          packing_list_status: row.packing_list.status,
          customer_name: row.packing_list.customer_name,
          warehouse_name: row.packing_list.warehouse_name,
          packing_list: row.packing_list,
        });
      }
    }
    return options;
  }, [orderRows, selectedOrderId]);

  const packingSelectOptions = useMemo(
    () =>
      packingOptionsForOrder.map((p) => ({
        value: p.packing_done_id,
        label: p.packing_done_no || p.packing_number,
        sublabel: `${p.packing_number} · ${p.packing_list_status}${
          p.customer_name ? ` · ${p.customer_name}` : ""
        }`,
      })),
    [packingOptionsForOrder],
  );

  const selectedPackings = useMemo(
    () =>
      packingOptionsForOrder.filter((p) =>
        selectedPackingDoneIds.includes(p.packing_done_id),
      ),
    [packingOptionsForOrder, selectedPackingDoneIds],
  );

  const previewWarehouseId = useMemo(() => {
    const first = selectedPackings[0];
    if (!first) return null;
    const fromDone = first.packing_list.packing_dones?.find(
      (pd) => pd.packing_done_id === first.packing_done_id,
    )?.warehouse_id;
    return fromDone || first.packing_list.warehouse_id || null;
  }, [selectedPackings]);

  // Default MH preview, then refetch when packing warehouse is known
  useEffect(() => {
    let cancelled = false;
    getPreviewNumber(previewWarehouseId)
      .then((num) => {
        if (!cancelled) setDispatchNumber(num);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [previewWarehouseId]);

  // Prefill from packingId URL (once when data is ready)
  useEffect(() => {
    if (!packingIdFromUrl || orderRows.length === 0) return;
    for (const row of orderRows) {
      const match = (row.packing_list.packing_dones || []).find(
        (pd) => pd.packing_done_id === packingIdFromUrl,
      );
      if (match) {
        setSelectedOrderId(row.order_id);
        setSelectedPackingDoneIds([match.packing_done_id]);
        break;
      }
    }
  }, [packingIdFromUrl, orderRows]);

  // Sync packing selection when order / available packings change
  useEffect(() => {
    setSelectedPackingDoneIds((prev) => {
      if (!selectedOrderId) {
        return prev.length === 0 ? prev : [];
      }

      const validIds = packingOptionsForOrder.map((p) => p.packing_done_id);
      const validSet = new Set(validIds);
      const filtered = prev.filter((id) => validSet.has(id));

      if (filtered.length === 0 && validIds.length === 1) {
        const next = [validIds[0]];
        return sameIdList(prev, next) ? prev : next;
      }

      return sameIdList(prev, filtered) ? prev : filtered;
    });
  }, [selectedOrderId, packingOptionsForOrder]);

  const handleOrderChange = (value: string) => {
    setSelectedOrderId(typeof value === "string" ? value : "");
    setSelectedPackingDoneIds([]);
  };

  const handlePackingChange = (value: string | string[]) => {
    setSelectedPackingDoneIds(Array.isArray(value) ? value : value ? [value] : []);
  };

  const handleSubmit = async () => {
    if (!selectedOrderId) {
      alert("Please select an Order.");
      return;
    }
    if (selectedPackingDoneIds.length === 0) {
      alert("Please select at least one Packing Listing to dispatch.");
      return;
    }
    if (!dispatchDate) {
      alert("Dispatch Date is required.");
      return;
    }

    setLoading(true);
    try {
      const dispatchDateIso = new Date(dispatchDate).toISOString();
      for (const packingDoneId of selectedPackingDoneIds) {
        await createDispatch({
          packing_done_id: packingDoneId,
          status: "Ready for Dispatch",
          dispatch_date: dispatchDateIso,
        });
      }
      await invalidatePurchaseOrderModuleListingQueries(queryClient);
      alert(
        selectedPackingDoneIds.length === 1
          ? "Dispatch created successfully"
          : `${selectedPackingDoneIds.length} dispatches created successfully`,
      );
      router.push("/warehouse/dispatch");
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to create Dispatch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer
      title="Create Dispatch"
      description="Select an order, then choose one or more packings to dispatch"
      onBack={() => router.push("/warehouse/dispatch")}
      onCancel={() => router.push("/warehouse/dispatch")}
      cancelLabel="Cancel"
      actions={
        <Button
          size="sm"
          disabled={
            !selectedOrderId ||
            selectedPackingDoneIds.length === 0 ||
            !dispatchDate ||
            loading
          }
          onClick={handleSubmit}
          className="h-9 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
        >
          <Truck className="w-3.5 h-3.5" />{" "}
          {loading
            ? "Dispatching..."
            : selectedPackingDoneIds.length > 1
              ? `Dispatch (${selectedPackingDoneIds.length})`
              : "Dispatch"}
        </Button>
      }
      noCard={false}
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-brand-600" /> Dispatch Header Details
          </h2>

          <div className="flex flex-nowrap items-end gap-3 overflow-x-auto pb-1">
            <div className="shrink-0 w-[160px]">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap">
                Dispatch Number
              </p>
              <Input
                value={dispatchNumber}
                disabled
                className="h-8 w-full text-xs bg-slate-50 font-mono font-bold mt-1.5"
              />
            </div>

            <div className="shrink-0 w-[220px]">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap">
                Order *
              </p>
              <AutocompleteSelect
                options={orderOptions}
                value={selectedOrderId}
                onChange={handleOrderChange}
                placeholder="Select order..."
                searchPlaceholder="Search order number..."
                className="h-8 w-full text-xs mt-1.5 rounded-lg border-border bg-white"
              />
            </div>

            <div className="shrink-0 w-[260px]">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap">
                Packing Listing *
              </p>
              <AutocompleteSelect
                multiple
                options={packingSelectOptions}
                value={selectedPackingDoneIds}
                onChange={handlePackingChange}
                placeholder={
                  selectedOrderId
                    ? packingSelectOptions.length
                      ? "Select packing(s)..."
                      : "No ready packing"
                    : "Select order first"
                }
                searchPlaceholder="Search packing..."
                className="h-8 w-full text-xs mt-1.5 rounded-lg border-border bg-white"
                disabled={!selectedOrderId || packingSelectOptions.length === 0}
              />
            </div>

            <div className="shrink-0 w-[160px]">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap">
                Dispatch Date *
              </p>
              <Input
                type="date"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                className="h-8 w-full text-xs mt-1.5"
              />
            </div>
          </div>
        </div>

        {selectedPackings.length > 0 && (
          <div className="border-t border-border/80 pt-6 space-y-4">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-brand-600" />{" "}
              Selected Packing{selectedPackings.length > 1 ? "s" : ""}
            </h2>

            {selectedPackings.map((selectedPacking) => (
              <div
                key={selectedPacking.packing_done_id}
                className="space-y-3 rounded-lg border border-border bg-slate-50/60 p-4"
              >
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <div className="w-fit">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Packing Done No
                    </p>
                    <p className="text-sm font-bold text-foreground font-mono">
                      {selectedPacking.packing_done_no}
                    </p>
                  </div>
                  <div className="w-fit">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Packing List
                    </p>
                    <p className="text-sm font-bold text-foreground font-mono">
                      {selectedPacking.packing_number}
                    </p>
                  </div>
                  <div className="w-fit">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Status
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {selectedPacking.packing_list_status}
                    </p>
                  </div>
                  <div className="w-fit">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Customer
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {selectedPacking.customer_name || "—"}
                    </p>
                  </div>
                </div>

                {selectedPacking.packing_list.products?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Products
                    </p>
                    <div className="border border-border rounded-lg overflow-hidden bg-white w-fit max-w-full">
                      <table className="text-left text-xs">
                        <thead className="bg-slate-50 border-b border-border">
                          <tr>
                            <th className="px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">
                              Product
                            </th>
                            <th className="px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">
                              Batch
                            </th>
                            <th className="px-3 py-2 font-semibold text-muted-foreground text-right whitespace-nowrap">
                              Order Qty
                            </th>
                            <th className="px-3 py-2 font-semibold text-muted-foreground text-right whitespace-nowrap">
                              Packed Qty
                            </th>
                            <th className="px-3 py-2 font-semibold text-muted-foreground text-right whitespace-nowrap">
                              Pending Qty
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {selectedPacking.packing_list.products.map((product) => (
                            <tr key={product.packing_list_product_id}>
                              <td className="px-3 py-2 font-medium whitespace-nowrap">
                                {product.product_name ||
                                  product.product_code ||
                                  product.product_id}
                              </td>
                              <td className="px-3 py-2 font-mono text-[10px] whitespace-nowrap">
                                {product.batch_code || "—"}
                              </td>
                              <td className="px-3 py-2 tabular-nums text-right font-mono whitespace-nowrap">
                                {product.order_base_qty}
                              </td>
                              <td className="px-3 py-2 tabular-nums text-right font-mono font-bold whitespace-nowrap">
                                {product.packed_base_qty}
                              </td>
                              <td className="px-3 py-2 tabular-nums text-right font-mono whitespace-nowrap">
                                {product.pending_base_qty}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </FormContainer>
  );
}
