"use client";

import React from "react";
import { SalesReturnQcListing } from "./SalesReturnQcListing";
import { QcListingLayout } from "../shared/QcListingLayout";

export default function SalesReturnQcRoutePage() {
  return (
    <QcListingLayout>
      <SalesReturnQcListing />
    </QcListingLayout>
  );
}
