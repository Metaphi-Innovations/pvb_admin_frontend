import {
  loadChartOfAccounts,
  nextId,
  saveChartOfAccounts,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import { getActiveTDSMasters, getTdsSectionCode } from "@/app/(app)/masters/tds/tds-data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";

const TDS_PAYABLE_GROUP = "TDS Payable";

function findTdsPayableGroup(): ChartOfAccount | undefined {
  return loadChartOfAccounts().find(
    (r) => r.nodeLevel === "account_group" && r.accountName === TDS_PAYABLE_GROUP,
  );
}

function ledgerNameForSection(sectionCode: string, sectionName: string): string {
  return `TDS Payable - Sec ${sectionCode} (${sectionName})`;
}

function existingSectionLedger(
  records: ChartOfAccount[],
  sectionCode: string,
): ChartOfAccount | undefined {
  const code = sectionCode.toUpperCase();
  return records.find(
    (r) =>
      r.nodeLevel === "ledger" &&
      r.accountName.toUpperCase().includes(`SEC ${code}`),
  );
}

/** Ensure one posting ledger per active TDS master section under TDS Payable */
export function ensureTdsSectionLedgers(): void {
  if (typeof window === "undefined") return;

  const tdsPayable = findTdsPayableGroup();
  if (!tdsPayable) return;

  const masters = getActiveTDSMasters();
  let records = loadChartOfAccounts();
  let changed = false;

  for (const master of masters) {
    const sectionCode = getTdsSectionCode(master);
    if (!sectionCode) continue;
    if (existingSectionLedger(records, sectionCode)) continue;

    const id = nextId(records);
    const ledger: ChartOfAccount = {
      id,
      accountCode: `LED-${String(id).padStart(3, "0")}`,
      accountName: ledgerNameForSection(sectionCode, master.sectionName),
      alias: sectionCode,
      accountType: "Liability",
      nodeLevel: "ledger",
      parentAccountId: tdsPayable.id,
      parentAccount: tdsPayable.accountName,
      description: `TDS liability — Section ${sectionCode}`,
      status: "active",
      usedIn: [],
      isSystem: false,
      openingBalance: 0,
      balanceType: "Credit",
      gstApplicable: false,
      tdsApplicable: true,
      costCenterApplicable: false,
      bankAccountFlag: false,
      createdBy: ACCOUNTS_CURRENT_USER,
      updatedBy: ACCOUNTS_CURRENT_USER,
    };
    records = [...records, ledger];
    changed = true;
  }

  if (changed) saveChartOfAccounts(records);
}
