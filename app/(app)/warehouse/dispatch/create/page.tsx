"use client";

import React, { useEffect, useState } from "react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { Truck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getPreviewNumber, getPackingDoneList, createDispatch } from "../services";
import { invalidatePurchaseOrderModuleListingQueries } from "@/lib/procurement/invalidate-po-listing-queries";

export default function CreateDispatchPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const packingIdFromUrl = searchParams ? searchParams.get("packingId") : null;

  const [dispatchNumber, setDispatchNumber] = useState("");
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [availablePackings, setAvailablePackings] = useState<any[]>([]);
  const [selectedPackingId, setSelectedPackingId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPreviewNumber().then((num) => setDispatchNumber(num)).catch(console.error);

    getPackingDoneList({
      filters: { status: "Ready For Dispatch" },
      page: 1,
      page_size: 100,
    })
      .then((res) => {
        const items = res?.data?.items || res?.data || [];
        setAvailablePackings(items);
        if (packingIdFromUrl && items.some((p: any) => p.packing_done_id === packingIdFromUrl)) {
          setSelectedPackingId(packingIdFromUrl);
        }
      })
      .catch(console.error);
  }, [packingIdFromUrl]);

  const handleSubmit = async () => {
    if (!selectedPackingId) {
      alert("Please select a Packing Listing.");
      return;
    }
    if (!dispatchDate) {
      alert("Dispatch Date is required.");
      return;
    }

    setLoading(true);
    try {
      await createDispatch({
        packing_done_id: selectedPackingId,
        dispatch_date: new Date(dispatchDate).toISOString(),
      });
      await invalidatePurchaseOrderModuleListingQueries(queryClient);
      alert("Dispatch created successfully");
      router.push("/warehouse/dispatch");
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to create Dispatch");
    } finally {
      setLoading(false);
    }
  };

  const packingOptions = availablePackings.map((p) => ({
    value: p.packing_done_id,
    label: `${p.packing_done_no} - ${p.customer_name || p.source_type || ""}`.trim(),
  }));

  return (
    <FormContainer
      title="Create Dispatch"
      description="Record a new outbound shipment dispatch"
      onBack={() => router.push("/warehouse/dispatch")}
      onCancel={() => router.push("/warehouse/dispatch")}
      cancelLabel="Cancel"
      actions={
        <Button
          size="sm"
          disabled={!selectedPackingId || !dispatchDate || loading}
          onClick={handleSubmit}
          className="h-9 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
        >
          <Truck className="w-3.5 h-3.5" /> {loading ? "Dispatching..." : "Dispatch"}
        </Button>
      }
      noCard={false}
    >
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
          <Truck className="w-4 h-4 text-brand-600" /> Dispatch Header Details
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

          <div className="md:col-span-2">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              Packing Listing *
            </p>
            <AutocompleteSelect
              options={packingOptions}
              value={selectedPackingId}
              onChange={setSelectedPackingId}
              placeholder="Search and select Packing Listing..."
              searchPlaceholder="Search packing list..."
              className="h-8 text-xs mt-1.5 rounded-lg border-border bg-white"
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
    </FormContainer>
  );
}
