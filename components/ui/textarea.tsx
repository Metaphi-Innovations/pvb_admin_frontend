import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, style, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-input border border-input bg-white px-3 py-1.5 text-sm font-sans",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
        "disabled:cursor-not-allowed disabled:opacity-50 resize-y",
        className,
      )}
      style={{
        fontFamily:
          'var(--font-plus-jakarta, "Plus Jakarta Sans"), var(--font-inter, Inter), system-ui, sans-serif',
        ...style,
      }}
      ref={ref}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
