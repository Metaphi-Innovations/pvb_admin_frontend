import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * HRMS premium enterprise form layout
 * Single panel · section dividers · dense 2–3 col grid · 1100–1200px
 * Control chrome stays Design System / brand orange — do not invent new inputs.
 */

/* ─── Control chrome (Design System) ─────────────────────────────── */
export const HR_INPUT_CLASS = cn(
  "h-10 w-full text-sm rounded-lg border border-border bg-white",
  "placeholder:text-muted-foreground/70",
  "transition-colors duration-150",
  "hover:border-foreground/25",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/50 focus-visible:border-brand-500",
  "disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-70",
  "read-only:bg-muted/30 read-only:cursor-default",
);

export const HR_INPUT_ERROR_CLASS =
  "border-red-400 hover:border-red-400 focus-visible:ring-red-300/40 focus-visible:border-red-500";

export const HR_INPUT_SUCCESS_CLASS =
  "border-emerald-400 hover:border-emerald-400 focus-visible:ring-emerald-300/40 focus-visible:border-emerald-500";

export const HR_INPUT_SM_CLASS =
  "h-8 text-xs rounded-lg border border-border focus-visible:ring-2 focus-visible:ring-brand-300/50 focus-visible:border-brand-500";

export const HR_SELECT_CLASS = cn(
  HR_INPUT_CLASS,
  "justify-between [&>span]:line-clamp-1",
  "focus:ring-2 focus:ring-brand-300/50 focus:border-brand-500 focus:ring-offset-0",
);

export const HR_TEXTAREA_CLASS = cn(
  "min-h-[90px] w-full text-sm rounded-lg border border-border bg-white resize-none py-2.5 px-3",
  "placeholder:text-muted-foreground/70",
  "hover:border-foreground/25",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/50 focus-visible:border-brand-500",
  "disabled:bg-muted/50 disabled:cursor-not-allowed",
);

export const HR_BTN_CLASS = "h-9 px-4 text-sm rounded-lg w-auto";

export const HR_BTN_PRIMARY_CLASS =
  "h-9 px-4 text-sm rounded-lg w-auto bg-brand-600 hover:bg-brand-700 text-white shadow-sm";

export const HR_LABEL_CLASS = "text-[13px] font-medium text-foreground leading-none";

export const HR_HELPER_CLASS = "text-xs text-muted-foreground leading-snug";

export const HR_ERROR_CLASS = "text-xs text-red-500 leading-snug";

export const HR_SUCCESS_CLASS = "text-xs text-emerald-600 leading-snug";

/* ─── Page / form shells ─────────────────────────────────────────── */
export const HR_PAGE_MAX_CLASS = "max-w-[1400px]";

/** Usable form width ~1100–1200px with comfortable side margins */
export const HR_FORM_MAX_CLASS = "max-w-[1160px] w-full";

/** Single white surface — sections use dividers, not nested cards */
export const HR_FORM_PANEL_CLASS =
  "rounded-xl border border-border bg-white shadow-sm overflow-hidden";

/** Stack of divider sections inside the panel */
export const HR_FORM_STACK_CLASS = "divide-y divide-border";

export const HR_DRAWER_WIDTH_CLASS = "max-w-[480px] sm:max-w-[480px]";

/* ─── Section (inside panel — no separate card) ──────────────────── */
export const HR_SECTION_CLASS = "px-6 py-5";

export const HR_SECTION_HEAD_CLASS = "mb-3.5 pb-2.5 border-b border-border/70";

export const HR_SECTION_LABEL_CLASS = "text-sm font-semibold text-foreground";

export const HR_SECTION_DESC_CLASS = "text-xs text-muted-foreground mt-0.5";

export const HR_ICON_BOX_CLASS =
  "w-7 h-7 rounded-md bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0";

export const HR_ICON_CLASS = "w-3.5 h-3.5 text-brand-600";

/* ─── Dense responsive grid ──────────────────────────────────────── */
/** ~25–30% tighter than previous gap-y-5/6 */
export const HR_FORM_GRID_CLASS =
  "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3.5";

/**
 * Field column span within the 3-col grid (page forms).
 * Also includes w-full so drawer flex layouts still fill the panel.
 * sm/md = 1 col · lg = 2 cols · full = entire row
 */
export type HrFieldSize = "sm" | "md" | "lg" | "full";

export const HR_FIELD_SIZE: Record<HrFieldSize, string> = {
  sm: "col-span-1 w-full",
  md: "col-span-1 w-full",
  lg: "col-span-1 md:col-span-2 w-full",
  full: "col-span-full w-full",
};

/** Drawer / legacy flex helpers */
export const HR_SPAN = {
  3: "w-full sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-11px)]",
  4: "w-full sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-11px)]",
  6: "w-full sm:w-[calc(50%-10px)]",
  8: "w-full lg:w-[calc(66.666%-8px)]",
  12: "w-full",
} as const;

export type HrSpan = keyof typeof HR_SPAN;

export function hrInput(className?: string, state?: "error" | "success" | "default") {
  return cn(
    HR_INPUT_CLASS,
    state === "error" && HR_INPUT_ERROR_CLASS,
    state === "success" && HR_INPUT_SUCCESS_CLASS,
    className,
  );
}

export function hrSelect(className?: string, state?: "error" | "success" | "default") {
  return cn(
    HR_SELECT_CLASS,
    state === "error" && HR_INPUT_ERROR_CLASS,
    state === "success" && HR_INPUT_SUCCESS_CLASS,
    className,
  );
}

export function hrTextarea(className?: string, state?: "error" | "success" | "default") {
  return cn(
    HR_TEXTAREA_CLASS,
    state === "error" && HR_INPUT_ERROR_CLASS,
    state === "success" && HR_INPUT_SUCCESS_CLASS,
    className,
  );
}

export function hrBtn(className?: string, primary?: boolean) {
  return cn(primary ? HR_BTN_PRIMARY_CLASS : HR_BTN_CLASS, className);
}

export function hrSpan(span: HrSpan) {
  return HR_SPAN[span];
}

export function hrFieldSize(size: HrFieldSize = "md") {
  return HR_FIELD_SIZE[size];
}

export type { LucideIcon };
