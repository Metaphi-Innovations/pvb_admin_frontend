"use client";

import React from "react";
import { PurchaseView } from "../PurchaseView";

export default function ViewPurchaseGrnPage({ params }: { params: { id: string } }) {
  return <PurchaseView id={params.id} />;
}
