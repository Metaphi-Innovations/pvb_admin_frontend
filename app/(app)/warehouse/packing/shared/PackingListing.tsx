"use client";

import React, { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ReadyPackingListing } from "./ReadyPackingListing";
import { DonePackingListing } from "./DonePackingListing";
import {
  buildPackingListHref,
  getPackingStatusTab,
  type PackingStatusTab,
} from "../lib/packing-list-nav";

type PackingSourceTab = "sales" | "sample" | "stock_transfer" | "purchase_return";

export function PackingListing({ sourceFilter }: { sourceFilter: PackingSourceTab }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<PackingStatusTab>(() =>
    getPackingStatusTab(searchParams),
  );

  useEffect(() => {
    setActiveTab(getPackingStatusTab(searchParams));
  }, [searchParams]);

  const handleTabChange = useCallback(
    (tab: PackingStatusTab) => {
      setActiveTab(tab);
      router.replace(
        buildPackingListHref(pathname, {
          tab,
          searchParams,
        }),
      );
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleTabChange("ready-for-packing")}
          className={`h-8 px-3 text-xs rounded-lg border transition-colors font-medium inline-flex items-center gap-1.5 ${
            activeTab === "ready-for-packing"
              ? "bg-brand-600 text-white border-brand-600"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          Ready For Packing
        </button>
        <button
          onClick={() => handleTabChange("packing-done")}
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
