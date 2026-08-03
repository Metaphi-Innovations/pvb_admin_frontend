"use client";

import React from "react";
import { PurchaseCreate } from "../../PurchaseCreate";

export default function EditPurchaseGrnPage({ params }: { params: { id: string } }) {
  return <PurchaseCreate mode="edit" grnId={params.id} />;
}
