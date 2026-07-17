"use client";

import React, { Suspense } from "react";
import { PackingListingLayout } from "../shared/PackingListingLayout";
import { PackingListing } from "../shared/PackingListing";

export default function PurchaseReturnPackingPage() {
  return (
    <PackingListingLayout>
      <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
        <PackingListing sourceFilter="purchase_return" />
      </Suspense>
    </PackingListingLayout>
  );
}
