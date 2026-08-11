"use client";

import React from "react";
import { SalesReturnListing } from "./SalesReturnListing";
import { GrnListingLayout } from "../shared/GrnListingLayout";

export default function SalesReturnListingRoutePage() {
  return (
    <GrnListingLayout>
      <SalesReturnListing />
    </GrnListingLayout>
  );
}
