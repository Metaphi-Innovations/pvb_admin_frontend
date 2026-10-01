"use client";

import React from "react";
import { StockTransferQcListing } from "./StockTransferQcListing";
import { QcListingLayout } from "../shared/QcListingLayout";

export default function StockTransferQcRoutePage() {
  return (
    <QcListingLayout>
      <StockTransferQcListing />
    </QcListingLayout>
  );
}
