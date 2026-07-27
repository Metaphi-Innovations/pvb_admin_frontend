"use client";

import React from "react";
import { ReturnGrnCreate } from "../../../shared/ReturnGrnCreate";

export default function EditSalesReturnGrnPage({ params }: { params: { id: string } }) {
  return <ReturnGrnCreate sourceType="SALES_RETURN" mode="edit" grnId={params.id} />;
}
