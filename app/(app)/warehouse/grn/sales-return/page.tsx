"use client";

import React from "react";
import { SalesReturnListing } from "./SalesReturnListing";
import { useSearchParams } from "next/navigation";
import { DEFAULT_DESTINATION_WAREHOUSE } from "@/lib/warehouse/grn-source";
import { GrnListingLayout } from "../shared/GrnListingLayout";

export default function SalesReturnListingRoutePage() {
  const searchParams = useSearchParams();
  const destinationWarehouse = searchParams.get("destinationWarehouse") || DEFAULT_DESTINATION_WAREHOUSE;

  return (
    <GrnListingLayout>
      <SalesReturnListing destinationWarehouse={destinationWarehouse} />
    </GrnListingLayout>
  );
}
