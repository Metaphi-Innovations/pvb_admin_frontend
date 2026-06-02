"use client";

import React from "react";
import { SkeletonRow } from "@/components/ui/Loaders";

interface LoadingStateProps {
  cols: number;
  rowCount?: number;
}

export function LoadingState({ cols, rowCount = 5 }: LoadingStateProps) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </>
  );
}
