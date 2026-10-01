"use client";

import React from "react";
import { useParams } from "next/navigation";
import { StockTransferReceive } from "../../StockTransferReceive";

export default function ReceiveStockTransferPage() {
  const params = useParams();
  const transferId = Number(params.transferId);

  return <StockTransferReceive transferId={transferId} />;
}
