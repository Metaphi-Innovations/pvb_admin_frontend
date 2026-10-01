/** Chart of Accounts hierarchy constants — no imports (safe for tree/visual modules). */

export const COA_MAX_HIERARCHY_LEVEL = 5;

export const COA_HIERARCHY_LEVEL_LABELS: Record<number, string> = {
  1: "Primary Head",
  2: "Account Group",
  3: "Sub Group",
  4: "Ledger",
  5: "Sub Ledger",
};

export const COA_MAX_HIERARCHY_MESSAGE =
  "Maximum hierarchy level reached. No further subgroup or ledger can be created.";
