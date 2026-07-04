/**
 * Accounts module typography — use these classes/constants only under `/accounts/**`
 * and `components/accounts/**`. Do not use in other ERP modules.
 *
 * Standard:
 * - Page title: text-xl (20px)
 * - Section / card title: text-base (16px)
 * - Tabs: text-sm (14px)
 * - Form labels: text-xs (12px)
 * - Form inputs / buttons: text-sm (14px)
 * - Table header / data / badges / helper: text-xs (12–13px)
 */

/** Page title — 20px semibold */
export const ACCOUNTS_PAGE_TITLE_CLASS = "accounts-page-title";

/** Page subtitle / description — 12px muted */
export const ACCOUNTS_PAGE_SUBTITLE_CLASS = "accounts-page-subtitle";

/** Section heading — 16px semibold */
export const ACCOUNTS_SECTION_HEADING_CLASS = "accounts-section-heading";

/** Card / panel title — 16px semibold */
export const ACCOUNTS_CARD_TITLE_CLASS = "accounts-card-title";

/** Tab labels — 14px medium */
export const ACCOUNTS_TAB_CLASS = "accounts-tab";

/** Form field labels — 12px medium */
export const ACCOUNTS_FORM_LABEL_CLASS = "accounts-form-label";

/** Form inputs — 14px */
export const ACCOUNTS_FORM_INPUT_CLASS = "accounts-form-input";

/** Helper text / breadcrumbs — 12px */
export const ACCOUNTS_HELPER_TEXT_CLASS = "accounts-helper-text";

/** Filter field labels — 12px medium muted gray */
export const ACCOUNTS_FILTER_LABEL_CLASS = "accounts-filter-label";

/** Filter inputs, selects, date fields — 14px, 32px height */
export const ACCOUNTS_FILTER_CONTROL_CLASS = "accounts-filter-control";

/** Radix Select trigger inside accounts filter bars */
export const ACCOUNTS_FILTER_SELECT_CLASS = "accounts-filter-select";

/** Fixed width for dd-mm-yyyy date pickers in filter rows (14px text + calendar icon) */
export const ACCOUNTS_DATE_FILTER_WIDTH_CLASS = "accounts-date-filter-input w-[134px] min-w-[134px] max-w-[134px]";

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

/** Sidebar nav item */
export const ACCOUNTS_SIDEBAR_ITEM_CLASS = "accounts-sidebar-item";

/** Summary card label */
export const ACCOUNTS_SUMMARY_LABEL_CLASS = "accounts-summary-label";

/** Summary card value */
export const ACCOUNTS_SUMMARY_VALUE_CLASS = "accounts-summary-value";

/** Status / workflow badges */
export const ACCOUNTS_STATUS_BADGE_CLASS = "accounts-status-badge";

/** Table wrapper — pairs with globals.css `.accounts-table*` rules */
export const ACCOUNTS_TABLE_CLASS = "accounts-table";
