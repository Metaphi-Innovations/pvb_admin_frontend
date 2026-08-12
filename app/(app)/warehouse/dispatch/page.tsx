"use client";

import React from "react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { Truck } from "lucide-react";
import { DispatchListing } from "./DispatchListing";

export default function DispatchManagementPage() {
  return (
    <ListingContainer title="Dispatch Management" titleIcon={Truck}>
      <DispatchListing />
    </ListingContainer>
  );
}
