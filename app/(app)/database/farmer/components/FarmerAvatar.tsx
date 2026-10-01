"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { farmerInitials } from "../farmer-utils";

const AVATAR_COLORS = [
  "bg-brand-600",
  "bg-navy-600",
  "bg-leaf-600",
  "bg-amber-600",
  "bg-emerald-600",
];

export function FarmerAvatar({
  name,
  size = "md",
  variant = "brand",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  /** muted = neutral listing/table style; brand = profile header */
  variant?: "brand" | "muted";
  className?: string;
}) {
  const colorIndex =
    name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    AVATAR_COLORS.length;

  const sizeCls = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-xs",
    lg: "h-14 w-14 text-sm",
    xl: "h-24 w-24 text-xl",
  }[size];

  return (
    <div
      className={cn(
        "flex flex-shrink-0 items-center justify-center rounded-full",
        variant === "muted"
          ? "border border-border bg-muted/50 text-xs font-medium text-muted-foreground"
          : cn("font-bold text-white shadow-sm", AVATAR_COLORS[colorIndex]),
        sizeCls,
        className,
      )}
      aria-hidden
    >
      {farmerInitials(name)}
    </div>
  );
}
