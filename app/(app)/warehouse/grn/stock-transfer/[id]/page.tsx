"use client";

import React from "react";
import { StockTransferView } from "../StockTransferView";

export default function ViewStockTransferGrnPage({ params }: { params: { id: string } }) {
  return <StockTransferView id={params.id} />;
}
