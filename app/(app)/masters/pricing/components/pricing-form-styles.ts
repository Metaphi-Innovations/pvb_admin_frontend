import { cn } from "@/lib/utils";
import { compactInput } from "@/components/masters/MasterModule";

/** Interactive pricing inputs — visible border + hover/focus feedback. */
export function pricingInput(className?: string) {
  return cn(
    compactInput(),
    "rounded-md border border-border bg-white px-2.5 shadow-sm",
    "transition-[border-color,background-color,box-shadow]",
    "hover:border-brand-400 hover:bg-brand-50/30",
    "focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200",
    className,
  );
}

/** Read-only / system-filled values. */
export function pricingReadonly(className?: string) {
  return cn(
    compactInput(),
    "rounded-md border border-dashed border-border bg-muted/25 px-2.5 text-foreground",
    "cursor-default shadow-none",
    className,
  );
}

export const pricingSectionClass = "border-border bg-white shadow-sm";

export const pricingSectionBodyClass = "p-2.5";

export const pricingFormShellClass = "space-y-3";

export const pricingMetaPanelClass =
  "rounded-lg border border-border bg-muted/20 p-2.5";

export const pricingMetaItemClass =
  "rounded-md border border-transparent px-2 py-1.5 transition-colors hover:border-border hover:bg-white hover:shadow-sm";
