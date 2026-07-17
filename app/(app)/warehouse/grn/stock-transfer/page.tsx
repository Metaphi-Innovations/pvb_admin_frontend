"use client";

import React from "react";
import { StockTransferListing } from "./StockTransferListing";
import { useSearchParams } from "next/navigation";
import { GrnListingLayout } from "../shared/GrnListingLayout";

export default function StockTransferListingRoutePage() {
  const searchParams = useSearchParams();
  const destinationWarehouse = searchParams.get("destinationWarehouse") || "All";

  return (
    <GrnListingLayout>
      <StockTransferListing destinationWarehouse={destinationWarehouse} />
    </GrnListingLayout>
  );
}
