"use client";

import React from "react";
import { PackingListingLayout } from "../shared/PackingListingLayout";
import { PackingListing } from "../shared/PackingListing";

export default function PurchaseReturnPackingPage() {
  return (
    <PackingListingLayout>
      <PackingListing sourceFilter="purchase_return" />
    </PackingListingLayout>
  );
}
