"use client";

import React from "react";
import { PackingListingLayout } from "../shared/PackingListingLayout";
import { PackingListing } from "../shared/PackingListing";

export default function StockTransferPackingPage() {
  return (
    <PackingListingLayout>
      <PackingListing sourceFilter="stock_transfer" />
    </PackingListingLayout>
  );
}
