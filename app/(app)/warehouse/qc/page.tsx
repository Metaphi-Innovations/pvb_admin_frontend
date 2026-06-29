"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { QcListing } from "./QcListing";

export default function QcPage() {
  return (
    <ListingContainer
      title="Quality Check (QC)"
      titleIcon={CheckCircle2}
    >
      <div className="space-y-3">
        <QcListing />
      </div>
    </ListingContainer>
  );
}
