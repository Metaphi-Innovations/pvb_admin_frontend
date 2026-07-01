"use client";

import React from "react";
import { SampleReturnQcListing } from "./SampleReturnQcListing";
import { QcListingLayout } from "../shared/QcListingLayout";

export default function SampleReturnQcRoutePage() {
  return (
    <QcListingLayout>
      <SampleReturnQcListing />
    </QcListingLayout>
  );
}
