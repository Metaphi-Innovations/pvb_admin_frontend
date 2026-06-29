"use client";

import React, { useState, useEffect, useMemo } from "react";
import { FileText } from "lucide-react";
import { getGrnRecords } from "./mock-data";
import { GrnRecord } from "./types";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { GrnListing } from "./GrnListing";
import { computeGrnListingKpis } from "./grn-listing-kpis";
import { GrnListingKpiRow } from "./GrnListingKpiRow";
import { getGrnSourceType } from "@/lib/warehouse/grn-source";

export default function GrnPage() {
  const [grnList, setGrnList] = useState<GrnRecord[]>([]);

  useEffect(() => {
    setGrnList(getGrnRecords());
  }, []);

  const grnListingKpis = useMemo(
    () => computeGrnListingKpis(grnList.filter((g) => getGrnSourceType(g) === "purchase")),
    [grnList],
  );

  return (
    <ListingContainer
      title="Goods Receipt Note (GRN)"
      titleIcon={FileText}
      metrics={<GrnListingKpiRow kpis={grnListingKpis} />}
    >
      <GrnListing />
    </ListingContainer>
  );
}
