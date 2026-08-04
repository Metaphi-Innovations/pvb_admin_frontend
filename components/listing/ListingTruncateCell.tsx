"use client";

import React, { useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ListingTruncateCellProps = {
  children: React.ReactNode;
  /** Full value shown in the tooltip. Falls back to the cell's text content. */
  text?: string | null;
  className?: string;
  /** Use for multi-line clamped cells (line-clamp-*). */
  multiline?: boolean;
};

function resolveTooltipText(explicit: string | null | undefined, el: HTMLElement | null): string {
  const fromProp = (explicit ?? "").trim();
  if (fromProp) return fromProp;
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function isOverflowing(el: HTMLElement, multiline: boolean): boolean {
  if (multiline) {
    return el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
  }
  if (el.scrollWidth > el.clientWidth + 1) return true;
  return Array.from(el.querySelectorAll("*")).some(
    (node) =>
      node instanceof HTMLElement && node.scrollWidth > node.clientWidth + 1,
  );
}

/**
 * Truncates overflowing listing-cell text and shows the full value in a tooltip
 * only when the content actually overflows the column width.
 */
export function ListingTruncateCell({
  children,
  text,
  className,
  multiline = false,
}: ListingTruncateCellProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [tooltipText, setTooltipText] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setOpen(false);
      return;
    }
    const el = ref.current;
    if (!el) {
      setOpen(false);
      return;
    }
    const overflowed = isOverflowing(el, multiline);
    const resolved = resolveTooltipText(text, el);
    if (overflowed && resolved && resolved !== "—") {
      setTooltipText(resolved);
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip open={open} onOpenChange={handleOpenChange}>
        <TooltipTrigger asChild>
          <span
            ref={ref}
            className={cn(
              "block min-w-0 max-w-full align-middle",
              multiline
                ? "overflow-hidden"
                : "overflow-hidden text-ellipsis whitespace-nowrap",
              !multiline &&
                "[&_a]:inline-block [&_a]:min-w-0 [&_a]:max-w-full [&_a]:overflow-hidden [&_a]:text-ellipsis [&_a]:whitespace-nowrap",
              !multiline && "[&_button]:max-w-full",
              !multiline &&
                "[&_p]:min-w-0 [&_p]:max-w-full [&_p]:overflow-hidden [&_p]:text-ellipsis [&_p]:whitespace-nowrap",
              className,
            )}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-sm whitespace-normal break-words text-left"
        >
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
