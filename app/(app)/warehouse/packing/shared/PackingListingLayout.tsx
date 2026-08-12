"use client";

import React from "react";
import { Boxes } from "lucide-react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function PackingListingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = pathname.includes("/warehouse/packing/purchase-return")
    ? "purchase-return"
    : pathname.includes("/warehouse/packing/stock-transfer")
      ? "stock-transfer"
      : pathname.includes("/warehouse/packing/sample")
        ? "sample"
        : "sales";

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
      activeTab={activeTab}
      onTabChange={(val) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("warehouse");
        const qs = params.toString();
        router.push(qs ? `/warehouse/packing/${val}?${qs}` : `/warehouse/packing/${val}`);
      }}
    >
      <div className="space-y-4">{children}</div>
    </ListingContainer>
  );
}
