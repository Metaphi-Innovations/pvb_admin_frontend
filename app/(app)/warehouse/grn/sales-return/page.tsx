"use client";

import React from "react";
import { SalesReturnListing } from "./SalesReturnListing";
import { useSearchParams } from "next/navigation";
import { GrnListingLayout } from "../shared/GrnListingLayout";

export default function SalesReturnListingRoutePage() {
  const searchParams = useSearchParams();
  const destinationWarehouse = searchParams.get("destinationWarehouse") || "All";

  return (
    <GrnListingLayout>
      <SalesReturnListing destinationWarehouse={destinationWarehouse} />
    </GrnListingLayout>
  );
}
