/**
 * Accounts UI density tokens — single source for form/control sizing.
 * Scoped to `/accounts/**` and `components/accounts/**` only.
 *
 * Spec: docs/accounts-ui-standard.md
 * Typography class names: lib/accounts/accounts-typography.ts
 */

import { cn } from "@/lib/utils";
import {
  ACCOUNTS_CARD_TITLE_CLASS,
  ACCOUNTS_FORM_INPUT_CLASS,
  ACCOUNTS_FORM_LABEL_CLASS,
  ACCOUNTS_HELPER_TEXT_CLASS,
  ACCOUNTS_PAGE_SUBTITLE_CLASS,
  ACCOUNTS_PAGE_TITLE_CLASS,
  ACCOUNTS_SECTION_HEADING_CLASS,
} from "@/lib/accounts/accounts-typography";

/** Form input / select / date — 32px */
export const ACCOUNTS_UI_INPUT_CLASS = cn(
  "h-8 min-h-8 max-h-8 w-full min-w-0 rounded-md border border-border bg-white px-2",
  "text-[13px] accounts-form-input",
  "focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-400",
);

/** Money / amount inputs — right-aligned tabular */
export const ACCOUNTS_UI_MONEY_INPUT_CLASS = cn(
  ACCOUNTS_UI_INPUT_CLASS,
  "text-right tabular-nums",
);

/** Narrow amount column width */
export const ACCOUNTS_UI_AMOUNT_WIDTH = "w-[112px] min-w-[112px] max-w-[112px]";

/** GST % field width */
export const ACCOUNTS_UI_GST_PCT_WIDTH = "w-[64px] min-w-[64px] max-w-[64px]";

/** Date / voucher number compact width */
export const ACCOUNTS_UI_DATE_WIDTH = "w-[136px] min-w-[136px] max-w-[136px]";
export const ACCOUNTS_UI_VOUCHER_NO_WIDTH = "w-[136px] min-w-[136px] max-w-[136px]";

/** Field label */
export const ACCOUNTS_UI_LABEL_CLASS = ACCOUNTS_FORM_LABEL_CLASS;

/** Helper under fields */
export const ACCOUNTS_UI_HELPER_CLASS = ACCOUNTS_HELPER_TEXT_CLASS;

/** Page title / subtitle aliases */
export const ACCOUNTS_UI_PAGE_TITLE_CLASS = ACCOUNTS_PAGE_TITLE_CLASS;
export const ACCOUNTS_UI_PAGE_SUBTITLE_CLASS = ACCOUNTS_PAGE_SUBTITLE_CLASS;

/** Section / card headings */
export const ACCOUNTS_UI_SECTION_TITLE_CLASS = cn(ACCOUNTS_CARD_TITLE_CLASS, "text-navy-700");
export const ACCOUNTS_UI_SECTION_HEADING_CLASS = ACCOUNTS_SECTION_HEADING_CLASS;

/** Action buttons in forms / footers */
export const ACCOUNTS_UI_BUTTON_CLASS = "h-8 min-h-8 text-xs gap-1.5 accounts-action-button";

/** Primary CTA */
export const ACCOUNTS_UI_PRIMARY_BUTTON_CLASS = cn(
  ACCOUNTS_UI_BUTTON_CLASS,
  "bg-brand-600 hover:bg-brand-700 text-white",
);

/** Section card shell */
export const ACCOUNTS_UI_SECTION_CARD_CLASS =
  "rounded-xl border border-border bg-white shadow-sm overflow-hidden";

/** Section card header strip */
export const ACCOUNTS_UI_SECTION_CARD_HEADER_CLASS =
  "border-b border-border bg-muted/40 px-4 py-2 flex items-center justify-between gap-3";

/** Section card body */
export const ACCOUNTS_UI_SECTION_CARD_BODY_CLASS = "px-4 py-3";

/** Form body stack between section cards */
export const ACCOUNTS_UI_FORM_STACK_CLASS = "space-y-3";

/** Compact 3–4 column meta grid */
export const ACCOUNTS_UI_FORM_GRID_CLASS =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-2.5";

/** Two-column wide grid */
export const ACCOUNTS_UI_FORM_GRID_2_CLASS =
  "grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-2.5";

/** Read-only value display (not a disabled input) */
export const ACCOUNTS_UI_READONLY_VALUE_CLASS =
  "text-[13px] text-foreground leading-snug min-h-8 flex items-center";

/** Narration textarea */
export const ACCOUNTS_UI_NARRATION_CLASS = cn(
  "min-h-[64px] max-h-28 h-auto py-2 resize-y rounded-lg border border-border text-[13px]",
  "focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-400",
);

/** Grand total emphasis — use sparingly */
export const ACCOUNTS_UI_GRAND_TOTAL_CLASS =
  "text-sm font-semibold tabular-nums text-foreground";

/** Summary row (label + amount) */
export const ACCOUNTS_UI_SUMMARY_ROW_CLASS =
  "flex items-center justify-between gap-3 text-xs py-0.5";

export const ACCOUNTS_UI_SUMMARY_LABEL_CLASS = "text-muted-foreground font-medium";

export const ACCOUNTS_UI_SUMMARY_AMOUNT_CLASS =
  "tabular-nums text-foreground text-right min-w-[5.5rem]";

/** Sticky form footer chrome */
export const ACCOUNTS_UI_STICKY_FOOTER_CLASS =
  "flex-shrink-0 bg-white border-t border-border px-5 py-1.5 z-20 shadow-[0_-2px_8px_rgba(15,23,42,0.05)]";

/** Form sticky header chrome */
export const ACCOUNTS_UI_STICKY_HEADER_CLASS =
  "bg-white border-b border-border px-5 py-2 flex-shrink-0 sticky top-0 z-20 shadow-sm";

/** Back button in form header */
export const ACCOUNTS_UI_BACK_BUTTON_CLASS =
  "w-7 h-7 flex items-center justify-center rounded-md border border-border/70 hover:bg-muted/40 flex-shrink-0";

/** Re-export form input text token for callers that only need typography */
export { ACCOUNTS_FORM_INPUT_CLASS };
