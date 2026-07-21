"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PartyCrossNavItem } from "@/lib/accounts/party-cross-nav";

/**
 * Compact cross-module navigation — links only, no duplicated report/dashboard UI.
 */
export function PartyCrossNavButtons({
  items,
  className,
  label = "Related",
}: {
  items: PartyCrossNavItem[];
  className?: string;
  label?: string;
}) {
  if (!items.length) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-0.5">
        {label}
      </span>
      {items.map((item) => (
        <Button
          key={`${item.label}-${item.href}`}
          asChild
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-[11px] px-2.5"
        >
          <Link href={item.href}>{item.label}</Link>
        </Button>
      ))}
    </div>
  );
}
