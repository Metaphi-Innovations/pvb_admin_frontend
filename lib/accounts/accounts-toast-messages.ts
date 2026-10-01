/** Standard Accounts toast copy — use via `useAccountsToast` helpers. */

export const ACCOUNTS_TOAST = {
  created: (entity: string) => `${entity} created successfully.`,
  updated: (entity: string) => `${entity} updated successfully.`,
  savedDraft: (entity: string) => `${entity} saved as draft.`,
  posted: (entity: string) => `${entity} posted successfully.`,
  cancelled: (entity: string) => `${entity} cancelled successfully.`,
  deleted: (entity: string) => `${entity} deleted successfully.`,
  exportStarted: "Export started.",
  exportCompleted: "Export completed.",
  validationError: "Changes could not be saved. Please review the highlighted fields.",
  saveFailed: "Unable to save. Please try again.",
  ledgerCreatedSelected: "Ledger created and selected.",
  noMatchingRecords: "No records match the selected filters.",
  noFilteredRecords: (entity: string) => `No ${entity} match the selected filters.`,
  ledgerCreated: "Ledger created successfully.",
} as const;
