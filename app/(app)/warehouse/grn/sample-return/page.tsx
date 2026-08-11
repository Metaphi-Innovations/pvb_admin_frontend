"use client";

import React from "react";
import { SampleReturnListing } from "./SampleReturnListing";
import { GrnListingLayout } from "../shared/GrnListingLayout";

export default function SampleReturnListingRoutePage() {
  return (
    <GrnListingLayout>
      <SampleReturnListing />
    </GrnListingLayout>
  );
}
