/**
 * Accounts module typography — use these classes/constants only under `/accounts/**`
 * and `components/accounts/**`. Do not use in other ERP modules.
 *
 * Compact scale (aligned with voucher entry forms):
 * - Page title: text-lg (18px)
 * - Section / card title: text-sm (14px)
 * - Tabs / sidebar: text-xs (12px)
 * - Form labels: text-xs (12px)
 * - Form inputs / body: text-[13px]
 * - Buttons / filters: h-8, text-xs / 13px
 * - Table header / data / badges / helper: text-xs (12px)
 * - Micro / balance hints: text-[11px]
 */

/** Page title — 18px semibold */
export const ACCOUNTS_PAGE_TITLE_CLASS = "accounts-page-title";

/** Page subtitle / description — 12px muted */
export const ACCOUNTS_PAGE_SUBTITLE_CLASS = "accounts-page-subtitle";

/** Section heading — 14px semibold */
export const ACCOUNTS_SECTION_HEADING_CLASS = "accounts-section-heading";

/** Card / panel title — 14px semibold */
export const ACCOUNTS_CARD_TITLE_CLASS = "accounts-card-title";

/** Tab labels — 12px medium */
export const ACCOUNTS_TAB_CLASS = "accounts-tab";

/** Form field labels — 12px medium */
export const ACCOUNTS_FORM_LABEL_CLASS = "accounts-form-label";

/** Form inputs — 13px */
export const ACCOUNTS_FORM_INPUT_CLASS = "accounts-form-input";

/** Helper text / breadcrumbs — 12px */
export const ACCOUNTS_HELPER_TEXT_CLASS = "accounts-helper-text";

/** Filter field labels — 12px medium muted gray */
export const ACCOUNTS_FILTER_LABEL_CLASS = "accounts-filter-label";

/** Filter inputs, selects, date fields — 13px, 32px height */
export const ACCOUNTS_FILTER_CONTROL_CLASS = "accounts-filter-control";

/** Radix Select trigger inside accounts filter bars */
export const ACCOUNTS_FILTER_SELECT_CLASS = "accounts-filter-select";

/** Fixed width for dd-mm-yyyy date pickers in filter rows */
export const ACCOUNTS_DATE_FILTER_WIDTH_CLASS =
  "accounts-date-filter-input w-[134px] min-w-[134px] max-w-[134px]";

/** Preset dropdown — fits "Custom Range" without truncation */
export const ACCOUNTS_PRESET_SELECT_WIDTH_CLASS = "min-w-[144px] w-[144px]";

/** Primary / outline action buttons in accounts listings */
export const ACCOUNTS_ACTION_BUTTON_CLASS = "accounts-action-button";

/** Breadcrumb nav row */
export const ACCOUNTS_BREADCRUMB_CLASS = "accounts-breadcrumb";

/** Current breadcrumb segment */
export const ACCOUNTS_BREADCRUMB_CURRENT_CLASS = "accounts-breadcrumb-current";

/** Sidebar nav group label */
export const ACCOUNTS_SIDEBAR_GROUP_CLASS = "accounts-sidebar-group-label";

/** Sidebar nav item (legacy compact) */
export const ACCOUNTS_SIDEBAR_ITEM_CLASS = "accounts-sidebar-item";

/** Contextual sidebar — active module title (18px bold) */
export const ACCOUNTS_SIDEBAR_MODULE_TITLE_CLASS = "accounts-sidebar-module-title";

/** Contextual sidebar — divider below module title */
export const ACCOUNTS_SIDEBAR_MODULE_DIVIDER_CLASS = "accounts-sidebar-module-divider";

/** Contextual sidebar — sticky header block (title + optional search) */
export const ACCOUNTS_SIDEBAR_STICKY_HEAD_CLASS = "accounts-sidebar-sticky-head";

/** Contextual sidebar — submenu link (14px medium) */
export const ACCOUNTS_SIDEBAR_NAV_ITEM_CLASS = "accounts-sidebar-nav-item";

/** Contextual sidebar — active submenu link */
export const ACCOUNTS_SIDEBAR_NAV_ITEM_ACTIVE_CLASS = "is-active";

/** Summary card label */
export const ACCOUNTS_SUMMARY_LABEL_CLASS = "accounts-summary-label";

/** Summary card value */
export const ACCOUNTS_SUMMARY_VALUE_CLASS = "accounts-summary-value";

/** Status / workflow badges */
export const ACCOUNTS_STATUS_BADGE_CLASS = "accounts-status-badge";

/** Table wrapper — pairs with globals.css `.accounts-table*` rules */
export const ACCOUNTS_TABLE_CLASS = "accounts-table";
