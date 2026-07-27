"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, CheckSquare } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import {
  getDispatchById,
  updateDispatch,
  getPackedOrdersDropdown,
  type PackedOrderDropdownItem,
} from "../../services";

export default function EditDispatchPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [dispatchNumber, setDispatchNumber] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [orderId, setOrderId] = useState("");
  const [packingListing, setPackingListing] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");
  const [packingList, setPackingList] = useState<PackedOrderDropdownItem["packing_list"] | null>(null);

  useEffect(() => {
    if (!id) return;
    setInitialLoading(true);

    Promise.all([getDispatchById(id), getPackedOrdersDropdown().catch(() => [] as PackedOrderDropdownItem[])])
      .then(([data, orderRows]) => {
        setDispatchNumber(data.dispatch_no || data.dispatchNumber || data.dispatch_number || "");
        const packingDoneNo =
          data.packing_done?.packing_done_no ||
          data.packingDoneNo ||
          data.packing_done_no ||
          "";
        setPackingListing(packingDoneNo);
        if (data.dispatch_date || data.dispatchDate) {
          setDispatchDate(
            new Date(data.dispatch_date || data.dispatchDate).toISOString().split("T")[0],
          );
        }

        const sourceId = data.source_id || "";
        const sourceDocNo = data.source_document_no || "";
        setOrderId(sourceId);
        setOrderNumber(sourceDocNo);

        const packingListId =
          data.packing_done?.packing_list_id ||
          data.packing_list_id ||
          null;

        const matched =
          orderRows.find((r) => packingListId && r.packing_list.packing_list_id === packingListId) ||
          orderRows.find((r) => sourceId && r.order_id === sourceId) ||
          null;

        if (matched) {
          setOrderNumber(matched.order_number || sourceDocNo);
          setOrderId(matched.order_id || sourceId);
          setPackingList(matched.packing_list);
          if (!packingDoneNo && matched.packing_list.packing_number) {
            setPackingListing(matched.packing_list.packing_number);
          }
        }
      })
      .catch(console.error)
      .finally(() => setInitialLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (!dispatchDate) {
      alert("Dispatch Date is required.");
      return;
    }

    setLoading(true);
    try {
      await updateDispatch(id, {
        dispatch_date: new Date(dispatchDate).toISOString(),
      });
      alert("Dispatch updated successfully");
      router.push("/warehouse/dispatch");
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to update Dispatch");
    } finally {
      setLoading(false);
    }
  };

  const products = useMemo(() => packingList?.products || [], [packingList]);

  if (initialLoading) {
    return (
      <FormContainer
        title="Edit Dispatch"
        description="Loading dispatch details..."
        onBack={() => router.push("/warehouse/dispatch")}
        onCancel={() => router.push("/warehouse/dispatch")}
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
      description={`Update dispatch: ${dispatchNumber}`}
      onBack={() => router.push("/warehouse/dispatch")}
      onCancel={() => router.push("/warehouse/dispatch")}
      cancelLabel="Cancel"
      actions={
        <Button
          size="sm"
          disabled={!dispatchDate || loading}
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
            <Pencil className="w-4 h-4 text-brand-600" /> Dispatch Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Dispatch Number
              </p>
              <Input
                value={dispatchNumber}
                disabled
                className="h-8 text-xs bg-slate-50 font-mono font-bold mt-1.5"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Order
              </p>
              <Input
                value={orderNumber || orderId || "—"}
                disabled
                className="h-8 text-xs bg-slate-50 font-mono mt-1.5"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Packing Listing
              </p>
              <Input
                value={
                  packingList?.packing_number
                    ? `${packingList.packing_number}${packingListing ? ` → ${packingListing}` : ""}`
                    : packingListing || "—"
                }
                disabled
                className="h-8 text-xs bg-slate-50 font-mono mt-1.5"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Dispatch Date *
              </p>
              <Input
                type="date"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                className="h-8 text-xs mt-1.5"
              />
            </div>
          </div>
        </div>

        {packingList && (
          <div className="border-t border-border/80 pt-6 space-y-4">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-brand-600" /> Related Packing List
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-border">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Packing Number
                </p>
                <p className="text-sm font-bold text-foreground font-mono">
                  {packingList.packing_number}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Status
                </p>
                <p className="text-sm font-bold text-foreground">{packingList.status}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Customer
                </p>
                <p className="text-sm font-bold text-foreground">
                  {packingList.customer_name || "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Warehouse
                </p>
                <p className="text-sm font-bold text-foreground">
                  {packingList.warehouse_name || "—"}
                </p>
              </div>
            </div>

            {products.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Packing List Products
                </p>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-border">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-muted-foreground">Product</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground">Batch</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Order Qty</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Packed Qty</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Pending Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {products.map((product) => (
                        <tr key={product.packing_list_product_id}>
                          <td className="px-3 py-2 font-medium">
                            {product.product_name || product.product_code || product.product_id}
                          </td>
                          <td className="px-3 py-2 font-mono text-[10px]">
                            {product.batch_code || "—"}
                          </td>
                          <td className="px-3 py-2 tabular-nums text-right font-mono">
                            {product.order_base_qty}
                          </td>
                          <td className="px-3 py-2 tabular-nums text-right font-mono font-bold">
                            {product.packed_base_qty}
                          </td>
                          <td className="px-3 py-2 tabular-nums text-right font-mono">
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
        )}
      </div>
    </FormContainer>
  );
}
