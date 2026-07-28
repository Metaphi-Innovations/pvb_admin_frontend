import { balanceSideLabel, type BalanceSide } from "@/lib/accounts/money-format";
import {
  resolveDrCrColumnSide,
  type DrCrColumnSideInput,
} from "@/lib/accounts/running-balance";
import {
  WORKFLOW_STATUS_LABELS,
  resolveWorkflowStatus,
  type AccountsDocumentWorkflow,
} from "@/lib/accounts/accounts-maker-checker";

/** Dr/Cr side shown in ledger Dr/Cr columns — matches DrCrSideBadge / balanceSideLabel. */
export function drCrSideFilterValue(
  input: DrCrColumnSideInput & { runningBalance?: number },
): string {
  if (input.runningBalance != null && input.runningBalance <= 0) return "";
  return balanceSideLabel(resolveDrCrColumnSide(input));
}

/** Status label shown in AccountsVoucherStatusBadge cells. */
export function voucherStatusFilterValue(
  legacyStatus?: string,
  workflow?: AccountsDocumentWorkflow,
): string {
  const status = resolveWorkflowStatus(workflow, legacyStatus);
  return WORKFLOW_STATUS_LABELS[status];
}

export function balanceSideFilterValue(side: BalanceSide | null | undefined): string {
  if (!side) return "";
  return balanceSideLabel(side);
}
