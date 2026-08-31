/**
 * Phase 1 transactions: approval UI hidden; draft save/post remain available.
 * Set to true when the approval workflow is enabled in production.
 */
export const TRANSACTIONS_SUBMIT_FOR_APPROVAL_ENABLED = false;

/** Whether tenant approval config should affect save/post behaviour in the UI. */
export function transactionsApprovalActive(approvalRequired: boolean): boolean {
  return approvalRequired && TRANSACTIONS_SUBMIT_FOR_APPROVAL_ENABLED;
}

/** Shared red Cancel button styling for transaction module forms. */
export const TRANSACTION_FORM_CANCEL_BTN_CLASS =
  "h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50";
