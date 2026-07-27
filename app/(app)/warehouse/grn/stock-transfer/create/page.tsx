"use client";

import React from "react";
import { StockTransferCreate } from "../StockTransferCreate";
import { useSearchParams } from "next/navigation";

export default function CreateStockTransferGrnRoutePage() {
  const searchParams = useSearchParams();
  const dispatchId = searchParams.get("dispatchId") || undefined;

  return <StockTransferCreate dispatchId={dispatchId} />;
}
