import { cn } from "@/lib/utils";
import { compactInput } from "@/components/masters/MasterModule";

/** Interactive pricing inputs — visible border + hover/focus feedback. */
export function pricingInput(className?: string) {
  return cn(
    compactInput(),
    "rounded-md border border-slate-300 bg-white px-2.5 shadow-sm",
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
    "rounded-md border border-dashed border-slate-300 bg-slate-100/80 px-2.5 text-foreground",
    "cursor-default shadow-none",
    className,
  );
}

export const pricingSectionClass =
  "border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100/80";

export const pricingSectionBodyClass = "bg-slate-50/50 p-2.5";

export const pricingFormShellClass =
  "space-y-3 rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-100/80 to-slate-50/40 p-3";

export const pricingMetaPanelClass =
  "rounded-lg border border-slate-200/90 bg-gradient-to-br from-white to-slate-50 p-2.5 shadow-inner";

export const pricingMetaItemClass =
  "rounded-md border border-transparent px-2 py-1.5 transition-colors hover:border-slate-200 hover:bg-white hover:shadow-sm";
