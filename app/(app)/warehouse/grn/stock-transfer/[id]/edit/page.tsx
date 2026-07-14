"use client";

import React from "react";
import { StockTransferCreate } from "../../StockTransferCreate";

export default function EditStockTransferGrnPage({ params }: { params: { id: string } }) {
  return <StockTransferCreate mode="edit" grnId={params.id} />;
}
