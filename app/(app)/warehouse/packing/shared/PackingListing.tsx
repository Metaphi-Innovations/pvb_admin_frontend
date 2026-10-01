"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getSalesOrders, getPackingRecordsList } from "../services";
import { SalesOrderRecord, PackingRecord } from "../types";
import { ReadyPackingListing } from "./ReadyPackingListing";
import { DonePackingListing } from "./DonePackingListing";
import { useSearchParams } from "next/navigation";

type PackingStatusTab = "ready-for-packing" | "packing-done";
type PackingSourceTab = "sales" | "sample" | "stock_transfer" | "purchase_return";

export function PackingListing({ sourceFilter }: { sourceFilter: PackingSourceTab }) {
  const searchParams = useSearchParams();
  const selectedWarehouse = searchParams.get("warehouse") || "All";
  
  const [activeTab, setActiveTab] = useState<PackingStatusTab>("ready-for-packing");

  const [rawOrders, setRawOrders] = useState<SalesOrderRecord[]>([]);
  const [rawPackings, setRawPackings] = useState<PackingRecord[]>([]);

  useEffect(() => {
    const refresh = () => {
      setRawOrders(getSalesOrders("All"));
      setRawPackings(getPackingRecordsList("All"));
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [sourceFilter]);

  const ordersForWarehouse = useMemo(() => {
    if (selectedWarehouse === "All") return rawOrders;
    return rawOrders.filter((o) => o.warehouse === selectedWarehouse);
  }, [rawOrders, selectedWarehouse]);

  const packingsForWarehouse = useMemo(() => {
    if (selectedWarehouse === "All") return rawPackings;
    return rawPackings.filter((p) => p.warehouse === selectedWarehouse);
  }, [rawPackings, selectedWarehouse]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab("ready-for-packing")}
          className={`h-8 px-3 text-xs rounded-lg border transition-colors font-medium inline-flex items-center gap-1.5 ${
            activeTab === "ready-for-packing"
              ? "bg-brand-600 text-white border-brand-600"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          Ready For Packing
        </button>
        <button
          onClick={() => setActiveTab("packing-done")}
          className={`h-8 px-3 text-xs rounded-lg border transition-colors font-medium inline-flex items-center gap-1.5 ${
            activeTab === "packing-done"
              ? "bg-brand-600 text-white border-brand-600"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          Packing Done
        </button>
      </div>

      {activeTab === "ready-for-packing" ? (
        <ReadyPackingListing ordersForWarehouse={ordersForWarehouse} sourceFilter={sourceFilter} />
      ) : (
        <DonePackingListing packingsForWarehouse={packingsForWarehouse} sourceFilter={sourceFilter} />
      )}
    </div>
  );
}
