"use client";

import React from "react";
import { PurchaseQcListing } from "./PurchaseQcListing";
import { QcListingLayout } from "../shared/QcListingLayout";

export default function PurchaseQcRoutePage() {
  return (
    <QcListingLayout>
      <PurchaseQcListing />
    </QcListingLayout>
  );
}
