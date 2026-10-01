"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { hrInput } from "./hr-org-form";

/** Compact leading-icon input — icon stays visible while typing (HR org forms). */
export function HrIconInput({
  icon: Icon,
  className,
  state = "default",
  readOnly,
  ...props
}: React.ComponentProps<typeof Input> & {
  icon: LucideIcon;
  state?: "error" | "success" | "default";
}) {
  return (
    <div className="relative min-w-0">
      <Icon
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        {...props}
        readOnly={readOnly}
        className={cn(
          hrInput("pl-8", state),
          readOnly && "bg-muted/30 cursor-default",
          className,
        )}
      />
    </div>
  );
}
