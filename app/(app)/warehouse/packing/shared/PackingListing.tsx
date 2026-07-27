"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ReadyPackingListing } from "./ReadyPackingListing";
import { DonePackingListing } from "./DonePackingListing";

type PackingStatusTab = "ready-for-packing" | "packing-done";
type PackingSourceTab = "sales" | "sample" | "stock_transfer" | "purchase_return";

export function PackingListing({ sourceFilter }: { sourceFilter: PackingSourceTab }) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<PackingStatusTab>(
    tabParam === "packing-done" ? "packing-done" : "ready-for-packing",
  );

  useEffect(() => {
    if (tabParam === "packing-done") {
      setActiveTab("packing-done");
    } else if (tabParam === "ready-for-packing") {
      setActiveTab("ready-for-packing");
    }
  }, [tabParam]);

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
        <ReadyPackingListing sourceFilter={sourceFilter} />
      ) : (
        <DonePackingListing sourceFilter={sourceFilter} />
      )}
    </div>
  );
}
