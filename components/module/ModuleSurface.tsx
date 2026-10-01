"use client";

import React from "react";
import { cn } from "@/lib/utils";

/** Standard content card — soft shadow, minimal border */
export function ModuleSurface({
  children,
  className,
  padding = true,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div className={cn("page-shell overflow-hidden", padding && "p-0", className)}>
      {children}
    </div>
  );
}
