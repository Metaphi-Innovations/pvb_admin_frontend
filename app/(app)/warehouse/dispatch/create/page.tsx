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
import {
  formatDateOnly,
  formatDisplayQty,
  getLatestPackingDate,
  getSnapshotField,
  resolveProductSku,
  toDateInputValue,
  validateDispatchDateAgainstPacking,
} from "../dispatch-display-utils";
import { showToast } from "@/lib/toast";

type PackingDoneProductRow = NonNullable<
  PackedOrderDropdownItem["packing_list"]["packing_dones"][number]["products"]
>[number];

type PackingOption = {
  packing_done_id: string;
  packing_done_no: string;
  packing_date: string | null;
  packing_list_id: string;
  packing_number: string;
  packing_list_status: string;
  customer_name: string;
  warehouse_name: string;
  packing_list: PackedOrderDropdownItem["packing_list"];
  products: PackingDoneProductRow[];
};

type DispatchSourceType =
  | "normal_sales"
  | "sample"
  | "stock_transfer"
  | "purchase_return";

const SOURCE_FIELD_LABELS: Record<
  DispatchSourceType,
  { field: string; placeholder: string; search: string; noun: string }
> = {
  normal_sales: {
    field: "Sales Order",
    placeholder: "Select sales order...",
    search: "Search sales order...",
    noun: "Sales Order",
  },
  sample: {
    field: "Sample Order",
    placeholder: "Select sample order...",
    search: "Search sample order...",
    noun: "Sample Order",
  },
  stock_transfer: {
    field: "Stock Transfer",
    placeholder: "Select stock transfer...",
    search: "Search stock transfer...",
    noun: "Stock Transfer",
  },
  purchase_return: {
    field: "Purchase Return",
    placeholder: "Select purchase return...",
    search: "Search purchase return...",
    noun: "Purchase Return",
  },
};

function normalizeSourceType(value: string | null | undefined): DispatchSourceType {
  const raw = String(value || "").toLowerCase().trim();
  if (raw === "sample") return "sample";
  if (raw === "stock_transfer") return "stock_transfer";
  if (raw === "purchase_return") return "purchase_return";
  if (raw === "sales" || raw === "sales_order" || raw === "normal_sales") {
    return "normal_sales";
  }
  return "normal_sales";
}

function sameIdList(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((id, i) => id === b[i]);
}

export default function CreateDispatchPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const packingIdFromUrl = searchParams ? searchParams.get("packingId") : null;
  const sourceTypeFromUrl = searchParams ? searchParams.get("sourceType") : null;
  const sourceType = normalizeSourceType(sourceTypeFromUrl);
  const orderField = SOURCE_FIELD_LABELS[sourceType];
  const listTab =
    sourceType === "normal_sales"
      ? "sales_order"
      : sourceType === "sample"
        ? "sample"
        : sourceType === "stock_transfer"
          ? "stock_transfer"
          : "purchase_return";
  const listHref = `/warehouse/dispatch?tab=${listTab}`;

  const [dispatchNumber, setDispatchNumber] = useState("");
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [orderRows, setOrderRows] = useState<PackedOrderDropdownItem[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedPackingDoneIds, setSelectedPackingDoneIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPackedOrdersDropdown({ source_type: sourceType })
      .then((rows) => setOrderRows(rows))
      .catch(console.error);
  }, [sourceType]);

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
        sublabel: `${packingCount} ready packing${packingCount === 1 ? "" : "s"}`,
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
          packing_date: pd.packing_date || null,
          packing_list_id: row.packing_list.packing_list_id,
          packing_number: row.packing_list.packing_number,
          packing_list_status: row.packing_list.status,
          customer_name: row.packing_list.customer_name,
          warehouse_name: row.packing_list.warehouse_name,
          packing_list: row.packing_list,
          products: Array.isArray(pd.products) ? pd.products : [],
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

  const minDispatchDate = useMemo(() => {
    const latest = getLatestPackingDate(selectedPackings);
    return latest ? toDateInputValue(latest) : "";
  }, [selectedPackings]);

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
      showToast(`Please select a ${orderField.noun}.`, "error");
      return;
    }
    if (selectedPackingDoneIds.length === 0) {
      showToast("Please select at least one Packing Listing to dispatch.", "error");
      return;
    }
    if (!dispatchDate) {
      showToast("Dispatch Date is required.", "error");
      return;
    }

    const dateError = validateDispatchDateAgainstPacking(dispatchDate, selectedPackings);
    if (dateError) {
      showToast(dateError, "error");
      return;
    }

    setLoading(true);
    try {
      const dispatchDateIso = new Date(dispatchDate).toISOString();
      await createDispatch({
        packing_done_ids: selectedPackingDoneIds,
        status: "Ready for Dispatch",
        dispatch_date: dispatchDateIso,
      });
      await invalidatePurchaseOrderModuleListingQueries(queryClient);
      showToast("Dispatch created successfully", "success");
      router.push(listHref);
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to create Dispatch", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer
      title="Create Dispatch"
      description={`Select a ${orderField.noun.toLowerCase()}, then choose one or more packings for a single dispatch`}
      onBack={() => router.push(listHref)}
      onCancel={() => router.push(listHref)}
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
              ? `Create Dispatch (${selectedPackingDoneIds.length} packings)`
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
                {orderField.field} *
              </p>
              <AutocompleteSelect
                options={orderOptions}
                value={selectedOrderId}
                onChange={handleOrderChange}
                placeholder={orderField.placeholder}
                searchPlaceholder={orderField.search}
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
                    : `Select ${orderField.noun.toLowerCase()} first`
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
                min={minDispatchDate || undefined}
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
                className="w-full bg-white rounded-xl border border-border p-5 shadow-sm space-y-5"
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Packing Done No
                    </p>
                    <p className="text-sm font-bold text-foreground font-mono mt-1">
                      {selectedPacking.packing_done_no}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Packing Done Date
                    </p>
                    <p className="text-sm font-bold text-foreground mt-1">
                      {formatDateOnly(selectedPacking.packing_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Customer
                    </p>
                    <p className="text-sm font-bold text-foreground mt-1">
                      {selectedPacking.customer_name || "—"}
                    </p>
                  </div>
                </div>

                {selectedPacking.products.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Products
                    </p>
                    <div className="w-full overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-slate-50/50">
                            <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              Product
                            </th>
                            <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              SKU
                            </th>
                            <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              Batch
                            </th>
                            <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              Mfg Date
                            </th>
                            <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              Expiry Date
                            </th>
                            <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                              Order Qty
                            </th>
                            <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                              Packed Qty
                            </th>
                            <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                              Pending Qty
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPacking.products.map((product) => {
                            const sku = resolveProductSku(product);
                            const mfgDate = getSnapshotField(
                              product.batch_snapshot,
                              "manufacturing_date",
                              "mfg_date",
                              "mfgDate",
                            );
                            const expiryDate = getSnapshotField(
                              product.batch_snapshot,
                              "expiry_date",
                              "exp_date",
                              "expDate",
                            );
                            return (
                              <tr
                                key={`${selectedPacking.packing_done_id}-${product.packing_done_product_id}`}
                                className="border-b border-border/60 hover:bg-slate-50/40"
                              >
                                <td className="py-3 px-3 text-xs font-bold text-foreground">
                                  {product.product_name ||
                                    getSnapshotField(product.product_snapshot, "product_name") ||
                                    product.product_id}
                                </td>
                                <td className="py-3 px-3 text-xs font-mono font-bold text-brand-700">
                                  {sku}
                                </td>
                                <td className="py-3 px-3 text-xs font-mono text-foreground">
                                  {product.batch_code || "—"}
                                </td>
                                <td className="py-3 px-3 text-xs text-muted-foreground">
                                  {formatDateOnly(mfgDate)}
                                </td>
                                <td className="py-3 px-3 text-xs text-muted-foreground">
                                  {formatDateOnly(expiryDate)}
                                </td>
                                <td className="py-3 px-3 text-xs font-semibold text-center tabular-nums">
                                  {formatDisplayQty(Number(product.order_base_qty || 0), product)}
                                </td>
                                <td className="py-3 px-3 text-xs font-bold text-center text-emerald-600 tabular-nums">
                                  {formatDisplayQty(Number(product.base_qty || 0), product)}
                                </td>
                                <td className="py-3 px-3 text-xs font-bold text-center text-amber-600 tabular-nums">
                                  {formatDisplayQty(Number(product.pending_base_qty || 0), product)}
                                </td>
                              </tr>
                            );
                          })}
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
