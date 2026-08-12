"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { Pencil, CheckSquare } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  getDispatchById,
  updateDispatch,
  getPackedOrdersDropdown,
  getPackingDoneById,
  type PackedOrderDropdownItem,
} from "../../services";
import { invalidatePurchaseOrderModuleListingQueries } from "@/lib/procurement/invalidate-po-listing-queries";
import {
  formatDateOnly,
  formatDisplayQty,
  getLatestPackingDate,
  getSnapshotField,
  resolveProductSku,
  toDateInputValue,
  validateDispatchDateAgainstPacking,
} from "../../dispatch-display-utils";
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

function mapPackingDoneDetailToOrderRow(
  detail: Record<string, any>,
  fallback?: {
    order_id?: string;
    order_number?: string;
    source_type?: string;
  },
): PackedOrderDropdownItem | null {
  const packingList = detail.packing_list;
  if (!packingList?.packing_list_id) return null;

  const orderId =
    String(detail.source_id || packingList.source_id || fallback?.order_id || "").trim();
  const orderNumber =
    String(
      detail.source_document_no ||
        packingList.customer_snapshot?.source_document_no ||
        fallback?.order_number ||
        "",
    ).trim() || orderId;

  const doneProducts: PackingDoneProductRow[] = Array.isArray(detail.products)
    ? detail.products.map((p: any) => {
        const unitPerPacking = Number(
          p.product?.unit_per_packing ??
            p.unit_per_packing ??
            getSnapshotField(p.product_snapshot, "unit_per_packing") ??
            0,
        );
        // Detail API sends this packing's qty as packed_base_qty / packed_qty / base_qty
        const thisPackingQty = Number(
          p.base_qty ?? p.packed_base_qty ?? p.packed_qty ?? 0,
        );
        return {
          packing_done_product_id: p.packing_done_product_id || p.product_id,
          packing_list_product_id:
            p.packing_list_product_id || p.packing_done_product_id || p.product_id,
          product_id: p.product_id,
          product_code: p.product_code || p.product?.product_code || null,
          sku: p.sku || p.product?.sku || getSnapshotField(p.product_snapshot, "sku", "SKU"),
          product_name: p.product_name || p.product?.product_name || null,
          product_snapshot: p.product_snapshot,
          batch_code: p.batch_code || null,
          batch_snapshot: p.batch_snapshot,
          base_qty: thisPackingQty,
          order_base_qty: Number(
            p.order_base_qty ??
              p.order_qty ??
              p.packing_list_product?.order_base_qty ??
              0,
          ),
          packed_base_qty: thisPackingQty,
          pending_base_qty: Number(
            p.pending_base_qty ??
              p.pending_qty ??
              p.packing_list_product?.pending_base_qty ??
              0,
          ),
          quantity_type:
            p.quantity_type || p.packing_list_product?.quantity_type || null,
          unit_per_packing:
            Number.isFinite(unitPerPacking) && unitPerPacking > 0 ? unitPerPacking : 1,
          remarks: p.remarks || null,
        };
      })
    : [];

  const listProducts = Array.isArray(packingList.products)
    ? packingList.products.map((p: any) => ({
        packing_list_product_id: p.packing_list_product_id,
        source_item_id: p.source_item_id || null,
        product_id: p.product_id,
        product_code: p.product_code || p.product?.product_code || null,
        product_name: p.product_name || p.product?.product_name || null,
        product_snapshot: p.product_snapshot,
        batch_code: p.batch_code || null,
        batch_snapshot: p.batch_snapshot,
        order_base_qty: Number(p.order_base_qty ?? 0),
        packed_base_qty: Number(p.packed_base_qty ?? 0),
        pending_base_qty: Number(p.pending_base_qty ?? 0),
        quantity_type: p.quantity_type || null,
        unit_per_packing: Number(p.product?.unit_per_packing || p.unit_per_packing || 0) || 1,
        remarks: p.remarks || null,
      }))
    : [];

  return {
    order_id: orderId,
    order_number: orderNumber,
    order_status: null,
    source_type: String(detail.source_type || packingList.source_type || fallback?.source_type || ""),
    label: orderNumber,
    packing_list: {
      packing_list_id: packingList.packing_list_id,
      packing_number: packingList.packing_number || "",
      status: packingList.status || "",
      warehouse_id: packingList.warehouse_id || detail.warehouse_id || "",
      warehouse_name:
        packingList.warehouse_name ||
        packingList.warehouse?.warehouse_name ||
        detail.warehouse_name ||
        "",
      customer_name: packingList.customer_name || detail.customer_name || "",
      order_amount: Number(packingList.order_amount ?? detail.order_amount ?? 0),
      order_date: packingList.order_date || null,
      expected_delivery_date: packingList.expected_delivery_date || null,
      customer_snapshot: packingList.customer_snapshot || detail.customer_snapshot || null,
      remarks: packingList.remarks || null,
      generated_at: packingList.generated_at || null,
      created_at: packingList.created_at || detail.created_at || new Date().toISOString(),
      packing_dones: [
        {
          packing_done_id: detail.packing_done_id,
          packing_done_no: detail.packing_done_no || "",
          status: detail.status || "",
          packing_date: detail.packing_date || null,
          warehouse_id: detail.warehouse_id || packingList.warehouse_id || null,
          products: doneProducts,
        },
      ],
      products: listProducts,
    },
  };
}

function sameIdList(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((id, i) => id === sortedB[i]);
}

function mergeOrderRows(
  available: PackedOrderDropdownItem[],
  current: PackedOrderDropdownItem | null,
): PackedOrderDropdownItem[] {
  if (!current?.order_id) return available;

  const byListId = new Map(
    available.map((row) => [row.packing_list.packing_list_id, row] as const),
  );
  const existing = byListId.get(current.packing_list.packing_list_id);

  if (!existing) {
    return [current, ...available];
  }

  const currentDone = current.packing_list.packing_dones?.[0];
  if (!currentDone) return available;

  const dones = [...(existing.packing_list.packing_dones || [])];
  const existingIdx = dones.findIndex((d) => d.packing_done_id === currentDone.packing_done_id);
  if (existingIdx >= 0) {
    const prev = dones[existingIdx];
    dones[existingIdx] = {
      ...prev,
      ...currentDone,
      products:
        Array.isArray(currentDone.products) && currentDone.products.length > 0
          ? currentDone.products
          : prev.products,
    };
  } else {
    dones.unshift(currentDone);
  }

  return available.map((row) =>
    row.packing_list.packing_list_id === existing.packing_list.packing_list_id
      ? {
          ...row,
          order_number: row.order_number || current.order_number,
          packing_list: {
            ...row.packing_list,
            products:
              row.packing_list.products?.length > 0
                ? row.packing_list.products
                : current.packing_list.products,
            packing_dones: dones,
          },
        }
      : row,
  );
}

export default function EditDispatchPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sourceType, setSourceType] = useState<DispatchSourceType>("normal_sales");
  const [dispatchNumber, setDispatchNumber] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");
  const [originalPackingDoneIds, setOriginalPackingDoneIds] = useState<string[]>([]);
  const [orderRows, setOrderRows] = useState<PackedOrderDropdownItem[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedPackingDoneIds, setSelectedPackingDoneIds] = useState<string[]>([]);

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

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setInitialLoading(true);
      try {
        const data = await getDispatchById(id);
        if (cancelled) return;

        const typedSource = normalizeSourceType(data.source_type);
        setSourceType(typedSource);
        setDispatchNumber(
          data.dispatch_no || data.dispatchNumber || data.dispatch_number || "",
        );

        if (data.dispatch_date || data.dispatchDate) {
          setDispatchDate(
            new Date(data.dispatch_date || data.dispatchDate).toISOString().split("T")[0],
          );
        }

        const packingDoneIds = Array.from(
          new Set(
            [
              ...(Array.isArray(data.packing_done_ids) ? data.packing_done_ids : []),
              ...(Array.isArray(data.packing_dones)
                ? data.packing_dones.map((pd: any) => pd.packing_done_id)
                : []),
              data.packing_done_id,
              data.packing_done?.packing_done_id,
            ]
              .map((v) => String(v || "").trim())
              .filter(Boolean),
          ),
        );
        const sourceId = String(data.source_id || "").trim();
        const sourceDocNo = String(data.source_document_no || "").trim();

        setOriginalPackingDoneIds(packingDoneIds);
        setSelectedOrderId(sourceId);
        setSelectedPackingDoneIds(packingDoneIds);

        const [availableRows, ...packingDetails] = await Promise.all([
          getPackedOrdersDropdown({ source_type: typedSource }).catch(
            () => [] as PackedOrderDropdownItem[],
          ),
          ...packingDoneIds.map((pdId) =>
            getPackingDoneById(pdId).catch(() => null),
          ),
        ]);
        if (cancelled) return;

        let merged = availableRows as PackedOrderDropdownItem[];
        for (const packingDetail of packingDetails) {
          if (!packingDetail) continue;
          const currentRow = mapPackingDoneDetailToOrderRow(
            packingDetail as Record<string, any>,
            {
              order_id: sourceId,
              order_number: sourceDocNo,
              source_type: typedSource,
            },
          );
          merged = mergeOrderRows(merged, currentRow);
        }
        setOrderRows(merged);

        const matchedOrderId =
          merged.find((r) =>
            (r.packing_list.packing_dones || []).some((pd) =>
              packingDoneIds.includes(pd.packing_done_id),
            ),
          )?.order_id || sourceId;
        setSelectedOrderId(matchedOrderId);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

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
        sublabel: `${packingCount} packing${packingCount === 1 ? "" : "s"}`,
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
        sublabel: `${p.packing_number}${p.customer_name ? ` · ${p.customer_name}` : ""}`,
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

  const handleOrderChange = (value: string) => {
    const next = typeof value === "string" ? value : "";
    setSelectedOrderId(next);
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
      showToast("Please select at least one Packing Listing.", "error");
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
      const payload: Record<string, unknown> = {
        dispatch_date: new Date(dispatchDate).toISOString(),
      };
      if (!sameIdList(selectedPackingDoneIds, originalPackingDoneIds)) {
        payload.packing_done_ids = selectedPackingDoneIds;
      }

      await updateDispatch(id, payload);
      await invalidatePurchaseOrderModuleListingQueries(queryClient);
      showToast("Dispatch updated successfully", "success");
      router.push(listHref);
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to update Dispatch", "error");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <FormContainer
        title="Edit Dispatch"
        description="Loading dispatch details..."
        onBack={() => router.push(listHref)}
        onCancel={() => router.push(listHref)}
        cancelLabel="Cancel"
      >
        <div className="h-40 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </FormContainer>
    );
  }

  return (
    <FormContainer
      title="Edit Dispatch"
      description={`Update ${orderField.noun.toLowerCase()}, packing(s) and dispatch details`}
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
          <Pencil className="w-3.5 h-3.5" /> {loading ? "Updating..." : "Update Dispatch"}
        </Button>
      }
      noCard={false}
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <Pencil className="w-4 h-4 text-brand-600" /> Dispatch Header Details
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
                      : "No packing available"
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
