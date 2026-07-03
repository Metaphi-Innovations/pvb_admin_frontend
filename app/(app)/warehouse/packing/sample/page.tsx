"use client";

import React from "react";
import { PackingListingLayout } from "../shared/PackingListingLayout";
import { PackingListing } from "../shared/PackingListing";

export default function SamplePackingPage() {
  return (
    <PackingListingLayout>
      <PackingListing sourceFilter="sample" />
    </PackingListingLayout>
  );
}
