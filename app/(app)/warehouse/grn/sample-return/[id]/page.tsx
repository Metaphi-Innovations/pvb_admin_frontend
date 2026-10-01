"use client";

import React from "react";
import { SampleReturnView } from "../SampleReturnView";

export default function ViewSampleReturnGrnRoutePage({ params }: { params: { id: string } }) {
  return <SampleReturnView id={params.id} />;
}
