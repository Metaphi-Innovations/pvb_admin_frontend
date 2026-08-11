"use client";

import React from "react";
import { StockTransferListing } from "./StockTransferListing";
import { GrnListingLayout } from "../shared/GrnListingLayout";

export default function StockTransferListingRoutePage() {
  return (
    <GrnListingLayout>
      <StockTransferListing />
    </GrnListingLayout>
  );
}
