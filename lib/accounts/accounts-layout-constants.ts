/** 56px TopNavbar + 48px AppHeader — matches app chrome per CLAUDE-NAVBAR.md */
export const APP_CHROME_HEIGHT_PX = 104;

export const ACCOUNTS_VIEWPORT_HEIGHT = `calc(100vh - ${APP_CHROME_HEIGHT_PX}px)`;

/** Contextual left sidebar widths (px) */
export const ACCOUNTS_SIDEBAR_EXPANDED_WIDTH_PX = 232;
export const ACCOUNTS_SIDEBAR_COA_EXPANDED_WIDTH_PX = 272;
export const ACCOUNTS_SIDEBAR_COLLAPSED_WIDTH_PX = 62;

/** Use on scroll panes inside Accounts to prevent scroll chaining to the document */
export const ACCOUNTS_SCROLL_PANEL_CLASS =
  "flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain";

/** Main accounts content panel — no outer horizontal scroll; tables scroll internally */
export const ACCOUNTS_MAIN_PANEL_CLASS =
  "flex-1 min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain";
