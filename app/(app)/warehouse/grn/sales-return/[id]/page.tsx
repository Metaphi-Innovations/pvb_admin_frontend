"use client";

import React from "react";
import { SalesReturnView } from "../SalesReturnView";

export default function ViewSalesReturnGrnRoutePage({ params }: { params: { id: string } }) {
  return <SalesReturnView id={params.id} />;
}
