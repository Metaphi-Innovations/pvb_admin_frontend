"use client";

import React from "react";
import { ReturnGrnCreate } from "../../../shared/ReturnGrnCreate";

export default function EditSampleReturnGrnPage({ params }: { params: { id: string } }) {
  return <ReturnGrnCreate sourceType="SAMPLE_RETURN" mode="edit" grnId={params.id} />;
}
