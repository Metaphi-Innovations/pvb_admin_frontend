"use client";

import React, { useEffect, useState } from "react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { getDispatchById, updateDispatch } from "../../services";

export default function EditDispatchPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [dispatchNumber, setDispatchNumber] = useState("");
  const [packingListing, setPackingListing] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");

  useEffect(() => {
    if (!id) return;
    setInitialLoading(true);
    getDispatchById(id)
      .then((data) => {
        setDispatchNumber(data.dispatch_no || data.dispatchNumber || data.dispatch_number || "");
        setPackingListing(
          data.packing_done?.packing_done_no ||
            data.packingDoneNo ||
            data.packing_done_no ||
            "",
        );
        if (data.dispatch_date || data.dispatchDate) {
          setDispatchDate(
            new Date(data.dispatch_date || data.dispatchDate).toISOString().split("T")[0],
          );
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
              Packing Listing
            </p>
            <Input
              value={packingListing || "—"}
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
    </FormContainer>
  );
}
