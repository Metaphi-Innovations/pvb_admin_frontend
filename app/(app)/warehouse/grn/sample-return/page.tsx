"use client";

import React from "react";
import { SampleReturnListing } from "./SampleReturnListing";
import { useSearchParams } from "next/navigation";
import { DEFAULT_DESTINATION_WAREHOUSE } from "@/lib/warehouse/grn-source";
import { GrnListingLayout } from "../shared/GrnListingLayout";

export default function SampleReturnListingRoutePage() {
  const searchParams = useSearchParams();
  const destinationWarehouse = searchParams.get("destinationWarehouse") || DEFAULT_DESTINATION_WAREHOUSE;

  return (
    <GrnListingLayout>
      <SampleReturnListing destinationWarehouse={destinationWarehouse} />
    </GrnListingLayout>
  );
}
