"use client";

import React from "react";
import { Boxes } from "lucide-react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { useRouter, usePathname } from "next/navigation";
import { buildPackingListHref, type PackingSourceTab } from "../lib/packing-list-nav";
import { usePackingListingState } from "../packing-listing-state-context";

function pathnameToPackingSource(pathname: string): PackingSourceTab {
  if (pathname.includes("/warehouse/packing/purchase-return")) return "purchase_return";
  if (pathname.includes("/warehouse/packing/stock-transfer")) return "stock_transfer";
  if (pathname.includes("/warehouse/packing/sample")) return "sample";
  return "sales";
}

function packingSourceToPathSegment(source: PackingSourceTab): string {
  switch (source) {
    case "purchase_return":
      return "purchase-return";
    case "stock_transfer":
      return "stock-transfer";
    case "sample":
      return "sample";
    default:
      return "sales";
  }
}

function tabValueToSource(value: string): PackingSourceTab | null {
  if (value === "sales" || value === "sample") return value;
  if (value === "stock-transfer") return "stock_transfer";
  if (value === "purchase-return") return "purchase_return";
  return null;
}

export function PackingListingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { getStatusForSource } = usePackingListingState();

  const activeTab = pathnameToPackingSource(pathname);

  return (
    <ListingContainer
      title="Packing Management"
      titleIcon={Boxes}
      tabs={[
        { value: "sales", label: "Normal Sales" },
        { value: "sample", label: "Sample" },
        { value: "stock-transfer", label: "Stock Transfer" },
        { value: "purchase-return", label: "Purchase Return" },
      ]}
      activeTab={packingSourceToPathSegment(activeTab)}
      onTabChange={(val) => {
        const source = tabValueToSource(val);
        if (!source) return;
        // Each source keeps its own Ready / Packing Done selection.
        // Clear warehouse scope when switching source tabs (same as before).
        router.push(
          buildPackingListHref(`/warehouse/packing/${val}`, {
            tab: getStatusForSource(source),
            warehouse: null,
          }),
        );
      }}
    >
      <div className="space-y-4">{children}</div>
    </ListingContainer>
  );
}
