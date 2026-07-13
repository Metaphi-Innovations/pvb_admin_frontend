"use client";

import React from "react";
import { SampleReturnListing } from "./SampleReturnListing";
import { useSearchParams } from "next/navigation";
import { GrnListingLayout } from "../shared/GrnListingLayout";

export default function SampleReturnListingRoutePage() {
  const searchParams = useSearchParams();
  const destinationWarehouse = searchParams.get("destinationWarehouse") || "All";

  return (
    <GrnListingLayout>
      <SampleReturnListing destinationWarehouse={destinationWarehouse} />
    </GrnListingLayout>
  );
}
