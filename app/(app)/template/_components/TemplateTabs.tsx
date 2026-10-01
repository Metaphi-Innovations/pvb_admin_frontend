"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/**
 * Template-only tab primitives for /template previews.
 * Does NOT replace components/ui/tabs — production modules stay unchanged.
 */

const TplTabs = TabsPrimitive.Root;

const TplTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    variant?: "underline" | "pill" | "segment";
  }
>(({ className, variant = "underline", ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-stretch gap-0 overflow-x-auto",
      variant === "underline" && "border-b border-border w-full",
      variant === "pill" && "gap-1 p-1 bg-muted/40 rounded-[10px]",
      variant === "segment" && "gap-0 border border-border rounded-[10px] overflow-hidden bg-white",
      className,
    )}
    {...props}
  />
));
TplTabsList.displayName = "TplTabsList";

const TplTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    count?: number;
    variant?: "underline" | "pill" | "segment";
  }
>(({ className, count, variant = "underline", children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "group relative shrink-0 inline-flex items-center justify-center gap-2 whitespace-nowrap",
      "h-10 sm:h-11 px-4 sm:px-5 text-sm font-medium rounded-[10px]",
      "text-muted-foreground transition-colors duration-150",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
      "disabled:pointer-events-none disabled:opacity-50",
      "hover:text-foreground",
      "data-[state=active]:[&>span]:bg-brand-600 data-[state=active]:[&>span]:text-white",
      variant === "underline" && [
        "rounded-none bg-transparent",
        "data-[state=active]:text-brand-700 data-[state=active]:bg-brand-50/60",
        "data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0",
        "data-[state=active]:after:w-full data-[state=active]:after:h-0.5",
        "data-[state=active]:after:bg-brand-600",
      ],
      variant === "pill" && [
        "data-[state=active]:bg-white data-[state=active]:text-brand-700 data-[state=active]:shadow-sm",
      ],
      variant === "segment" && [
        "rounded-none border-r border-border last:border-r-0",
        "data-[state=active]:bg-brand-50 data-[state=active]:text-brand-700",
      ],
      className,
    )}
    {...props}
  >
    {children}
    {typeof count === "number" && (
      <span
        className={cn(
          "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold inline-flex items-center justify-center",
          "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    )}
  </TabsPrimitive.Trigger>
));
TplTabsTrigger.displayName = "TplTabsTrigger";

const TplTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 rounded-[10px]",
      className,
    )}
    {...props}
  />
));
TplTabsContent.displayName = "TplTabsContent";

export { TplTabs, TplTabsList, TplTabsTrigger, TplTabsContent };
