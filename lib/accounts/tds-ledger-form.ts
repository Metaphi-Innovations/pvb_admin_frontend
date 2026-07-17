import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  DEFAULT_LEDGER_FORM,
  generateLedgerCode,
  ledgerHasVoucherPostings,
  type LedgerFormValues,
} from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import {
  getTdsSectionCode,
  loadTDSMasters,
  type TDSMaster,
} from "@/app/(app)/masters/tds/tds-data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import {
  inferTdsLedgerKind,
  type TdsLedgerKind,
} from "@/lib/accounts/coa-specialized-groups";
import {
  formatTdsSectionLedgerName,
  TDS_ERP_SOURCE,
  tdsLedgerKindAlias,
} from "@/lib/accounts/tds-coa-sync";
import { parseTdsSectionCode } from "@/lib/accounts/tds-coa-utils";
import {
  DEFAULT_LEDGER_META,
  saveLedgerMeta,
  type LedgerExtendedMeta,
} from "@/lib/accounts/ledger-metadata";

export interface TdsLedgerFormValues {
  tdsMasterId: number | null;
  ledgerName: string;
  parentGroupId: number | null;
  openingBalance: string;
  balanceType: "Debit" | "Credit";
  status: "active" | "inactive";
  tdsKind: TdsLedgerKind;
}

export const DEFAULT_TDS_LEDGER_FORM: TdsLedgerFormValues = {
  tdsMasterId: null,
  ledgerName: "",
  parentGroupId: null,
  openingBalance: "0",
  balanceType: "Credit",
  status: "active",
  tdsKind: "payable",
};

export function buildDefaultTdsLedgerForm(
  parentGroupId: number,
  records: ChartOfAccount[],
): TdsLedgerFormValues {
  const parent = records.find((r) => r.id === parentGroupId);
  const kind = parent ? inferTdsLedgerKind(parent, records) : "payable";
  return {
    ...DEFAULT_TDS_LEDGER_FORM,
    parentGroupId,
    tdsKind: kind,
    balanceType: kind === "receivable" ? "Debit" : "Credit",
  };
}

export function tdsMasterToFormPatch(
  master: TDSMaster,
  kind: TdsLedgerKind,
): Partial<TdsLedgerFormValues> {
  const sectionCode = getTdsSectionCode(master);
  return {
    tdsMasterId: master.id,
    ledgerName: formatTdsSectionLedgerName(sectionCode, master.sectionName),
    status: master.status === "inactive" ? "inactive" : "active",
    tdsKind: kind,
    balanceType: kind === "receivable" ? "Debit" : "Credit",
  };
}

export function findExistingTdsSectionLedger(
  records: ChartOfAccount[],
  masterId: number,
  kind: TdsLedgerKind,
  parentGroupId?: number | null,
): ChartOfAccount | undefined {
  return records.find((r) => {
    if (r.nodeLevel !== "ledger") return false;
    if (r.erpSourceModule === TDS_ERP_SOURCE && r.erpSourceId === masterId) {
      return r.alias === tdsLedgerKindAlias(kind);
    }
    if (parentGroupId != null && r.parentAccountId !== parentGroupId) return false;
    const master = loadTDSMasters().find((m) => m.id === masterId);
    if (!master) return false;
    const code = getTdsSectionCode(master).toUpperCase();
    const parsed = parseTdsSectionCode(r.accountName);
    return parsed === code && r.alias === tdsLedgerKindAlias(kind);
  });
}

export function validateTdsLedgerForm(
  form: TdsLedgerFormValues,
  records: ChartOfAccount[],
): string | null {
  if (!form.parentGroupId) return "Parent group is required.";
  if (!form.tdsMasterId) return "Please select a TDS section from TDS Master.";
  if (!form.ledgerName.trim()) return "Ledger name is required.";

  const masters = loadTDSMasters();
  const master = masters.find((m) => m.id === form.tdsMasterId);
  if (!master) return "Selected TDS section is no longer available. Refresh and try again.";
  if (master.status === "inactive") {
    return "Selected TDS section is inactive in TDS Master. Activate it first or choose another section.";
  }

  const parent = records.find((r) => r.id === form.parentGroupId);
  if (!parent || parent.nodeLevel !== "account_group") {
    return "TDS ledgers must be created under a valid TDS group.";
  }

  const existing = findExistingTdsSectionLedger(
    records,
    form.tdsMasterId,
    form.tdsKind,
    form.parentGroupId,
  );
  if (existing) {
    const code = getTdsSectionCode(master);
    return `A ${form.tdsKind === "payable" ? "TDS Payable" : "TDS Receivable"} ledger for section ${code} already exists under this group (${existing.accountName}).`;
  }

  const dupName = records.find(
    (r) =>
      r.nodeLevel === "ledger" &&
      r.parentAccountId === form.parentGroupId &&
      r.accountName.toLowerCase() === form.ledgerName.trim().toLowerCase(),
  );
  if (dupName) return "A ledger with this name already exists under this parent.";

  const opening = parseFloat(form.openingBalance);
  if (form.openingBalance.trim() && Number.isNaN(opening)) {
    return "Opening balance must be a valid number.";
  }

  return null;
}

export function tdsFormToLedgerMeta(
  master: TDSMaster,
  kind: TdsLedgerKind,
): LedgerExtendedMeta {
  return {
    ...DEFAULT_LEDGER_META,
    ledgerType: "TDS",
    taxType: "TDS",
    taxRate: master.tdsRate,
    taxUsage: kind === "payable" ? "Purchase" : "Sales",
    tdsApplicableMeta: true,
    description: master.description ?? "",
  };
}

export function tdsFormToLedger(
  form: TdsLedgerFormValues,
  id: number,
  code: string,
  records: ChartOfAccount[],
): ChartOfAccount {
  const parent = records.find((r) => r.id === form.parentGroupId)!;
  const master = loadTDSMasters().find((m) => m.id === form.tdsMasterId)!;
  const sectionCode = getTdsSectionCode(master).toUpperCase();
  const opening = parseFloat(form.openingBalance) || 0;
  const kind = form.tdsKind;

  return {
    id,
    accountCode: code,
    accountName: form.ledgerName.trim(),
    alias: tdsLedgerKindAlias(kind),
    accountType: kind === "receivable" ? "Asset" : "Liability",
    nodeLevel: "ledger",
    parentAccountId: parent.id,
    parentAccount: parent.accountName,
    description: `TDS Section ${sectionCode} — ${master.sectionName}`,
    status: form.status,
    usedIn: kind === "receivable" ? ["payments", "journal"] : ["procurement", "payments", "journal"],
    isSystem: false,
    isSystemGenerated: true,
    ledgerKind: "MASTER",
    masterType: TDS_ERP_SOURCE,
    masterId: master.id,
    erpSourceModule: TDS_ERP_SOURCE,
    erpSourceId: master.id,
    openingBalance: opening,
    balanceType: form.balanceType,
    gstApplicable: false,
    tdsApplicable: true,
    costCenterApplicable: false,
    billWiseAccounting: false,
    bankAccountFlag: false,
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
  };
}

export function createTdsLedgerFromForm(
  form: TdsLedgerFormValues,
  records: ChartOfAccount[],
): { ledger: ChartOfAccount; records: ChartOfAccount[] } {
  const err = validateTdsLedgerForm(form, records);
  if (err) throw new Error(err);

  const list = [...records];
  const code = generateLedgerCode(list);
  const id = Math.max(0, ...list.map((r) => r.id)) + 1;
  const ledger = tdsFormToLedger(form, id, code, list);
  list.push(ledger);

  const master = loadTDSMasters().find((m) => m.id === form.tdsMasterId)!;
  saveLedgerMeta(ledger.id, tdsFormToLedgerMeta(master, form.tdsKind));

  return { ledger, records: list };
}

export function canDeleteTdsLedger(ledger: ChartOfAccount): boolean {
  if (ledgerHasVoucherPostings(ledger.id)) return false;
  return true;
}

export function canChangeTdsLedgerParent(
  ledger: ChartOfAccount,
  newParentId: number,
  records: ChartOfAccount[],
): string | null {
  const newParent = records.find((r) => r.id === newParentId);
  if (!newParent) return "Invalid parent group.";
  const kind = ledger.alias === tdsLedgerKindAlias("receivable") ? "receivable" : "payable";
  const expectedType = kind === "receivable" ? "Asset" : "Liability";
  if (newParent.accountType !== expectedType && newParent.nodeLevel === "primary_head") {
    return `TDS ${kind} ledgers must remain under ${expectedType} groups.`;
  }
  const path = getAncestorPathSafe(records, newParentId);
  const validRoot =
    kind === "receivable"
      ? path.some((p) => p.accountName === "Assets")
      : path.some((p) => p.accountName === "Liabilities");
  if (!validRoot) {
    return `TDS ${kind} ledgers must stay under ${kind === "receivable" ? "Assets" : "Liabilities"}.`;
  }
  return null;
}

function getAncestorPathSafe(records: ChartOfAccount[], nodeId: number): ChartOfAccount[] {
  const byId = new Map(records.map((r) => [r.id, r]));
  const path: ChartOfAccount[] = [];
  let current = byId.get(nodeId);
  while (current) {
    path.unshift(current);
    current =
      current.parentAccountId != null ? byId.get(current.parentAccountId) : undefined;
  }
  return path;
}

/** @deprecated bridge to generic ledger form values if needed */
export function tdsFormToLegacyLedgerForm(form: TdsLedgerFormValues): LedgerFormValues {
  return {
    ...DEFAULT_LEDGER_FORM,
    ledgerName: form.ledgerName,
    parentGroupId: form.parentGroupId,
    openingBalance: form.openingBalance,
    balanceType: form.balanceType,
    tdsApplicable: true,
    status: form.status,
  };
}
