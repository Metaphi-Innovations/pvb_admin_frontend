/**
 * Chart of Accounts — display-only TDS/TCS section projections.
 *
 * Source of truth remains Masters (TDS / TCS). COA never persists these
 * section ledgers; they are injected into the in-memory tree for browsing.
 * Voucher posting continues to use the canonical TDS Payable / TCS Payable ledgers.
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  getActiveTDSMasters,
  getTdsSectionCode,
} from "@/app/(app)/masters/tds/tds-data";
import {
  getActiveTCSMasters,
  getTcsSectionCode,
} from "@/app/(app)/masters/tcs/tcs-data";
import {
  TDS_PAYABLE_GROUP,
  TDS_ERP_SOURCE,
} from "@/lib/accounts/tds-coa-sync";

export const TCS_PAYABLE_GROUP = "TCS Payable";
export const TCS_ERP_SOURCE = "tcs_master";

/** Stable negative ID space so projections never collide with stored COA ids. */
export const TDS_SECTION_COA_ID_BASE = -1_000_000;
export const TCS_SECTION_COA_ID_BASE = -2_000_000;

export function formatTdsSectionCoaName(sectionCode: string): string {
  return `TDS - ${sectionCode.trim().toUpperCase()}`;
}

export function formatTcsSectionCoaName(sectionCode: string): string {
  return `TCS - ${sectionCode.trim()}`;
}

export function isTdsPayableParentNode(node: Pick<ChartOfAccount, "accountName" | "alias" | "nodeLevel">): boolean {
  if (node.accountName === TDS_PAYABLE_GROUP) return true;
  return node.alias === "tds:payable";
}

export function isTcsPayableParentNode(node: Pick<ChartOfAccount, "accountName" | "alias" | "nodeLevel">): boolean {
  if (node.accountName === TCS_PAYABLE_GROUP) return true;
  return node.alias === "tcs:payable";
}

export function isStatutoryTaxPayableParent(
  node: Pick<ChartOfAccount, "accountName" | "alias" | "nodeLevel">,
): boolean {
  return isTdsPayableParentNode(node) || isTcsPayableParentNode(node);
}

export function isStatutoryTaxSectionProjection(
  node: Pick<ChartOfAccount, "id" | "erpSourceModule" | "accountName" | "isSystemGenerated">,
): boolean {
  if (node.id < 0) {
    if (node.id <= TCS_SECTION_COA_ID_BASE) return true;
    if (node.id <= TDS_SECTION_COA_ID_BASE) return true;
  }
  if (node.erpSourceModule === TDS_ERP_SOURCE && /^TDS\s*-/i.test(node.accountName ?? "")) {
    return true;
  }
  if (node.erpSourceModule === TCS_ERP_SOURCE && /^TCS\s*-/i.test(node.accountName ?? "")) {
    return true;
  }
  return false;
}

/** Locked display names for TDS/TCS section projections (and legacy variants). */
export function isStatutoryTaxSectionLedgerName(name: string): boolean {
  const n = name.trim();
  if (/^TDS\s*-\s*.+/i.test(n)) return true;
  if (/^TCS\s*-\s*.+/i.test(n)) return true;
  return false;
}

function buildProjectionNode(input: {
  id: number;
  code: string;
  name: string;
  parent: ChartOfAccount;
  erpSourceModule: string;
  erpSourceId: number;
  masterType: "tds" | "tcs";
}): ChartOfAccount {
  return {
    id: input.id,
    accountCode: input.code,
    accountName: input.name,
    alias: `${input.masterType}:section:${input.erpSourceId}`,
    accountType: input.parent.accountType,
    nodeLevel: "ledger",
    parentAccountId: input.parent.id,
    parentAccount: input.parent.accountName,
    description: "System ledger — locked (from master)",
    status: "active",
    usedIn: [],
    isSystem: true,
    openingBalance: 0,
    balanceType: "Credit",
    gstApplicable: false,
    tdsApplicable: input.masterType === "tds",
    costCenterApplicable: false,
    tcsApplicable: input.masterType === "tcs",
    bankAccountFlag: false,
    ledgerKind: "SYSTEM",
    masterType: input.masterType,
    masterId: input.erpSourceId,
    isSystemGenerated: true,
    erpSourceModule: input.erpSourceModule,
    erpSourceId: input.erpSourceId,
    createdBy: "System",
    updatedBy: "System",
  };
}

function buildTdsSectionProjections(parent: ChartOfAccount): ChartOfAccount[] {
  const baseCode = parent.accountCode || "23112";
  return getActiveTDSMasters()
    .map((master) => {
      const code = getTdsSectionCode(master);
      if (!code) return null;
      return buildProjectionNode({
        id: TDS_SECTION_COA_ID_BASE - master.id,
        code: `${baseCode}-${code}`,
        name: formatTdsSectionCoaName(code),
        parent,
        erpSourceModule: TDS_ERP_SOURCE,
        erpSourceId: master.id,
        masterType: "tds",
      });
    })
    .filter((n): n is ChartOfAccount => n != null)
    .sort((a, b) => a.accountName.localeCompare(b.accountName));
}

function buildTcsSectionProjections(parent: ChartOfAccount): ChartOfAccount[] {
  const baseCode = parent.accountCode || "23113";
  return getActiveTCSMasters()
    .map((master) => {
      const code = getTcsSectionCode(master);
      if (!code) return null;
      return buildProjectionNode({
        id: TCS_SECTION_COA_ID_BASE - master.id,
        code: `${baseCode}-${code.replace(/[()]/g, "")}`,
        name: formatTcsSectionCoaName(code),
        parent,
        erpSourceModule: TCS_ERP_SOURCE,
        erpSourceId: master.id,
        masterType: "tcs",
      });
    })
    .filter((n): n is ChartOfAccount => n != null)
    .sort((a, b) => a.accountName.localeCompare(b.accountName));
}

/** Strip any prior projection rows, then append fresh master-driven children. */
export function enrichCoaRecordsWithStatutoryTaxSections(
  records: ChartOfAccount[],
): ChartOfAccount[] {
  const base = records.filter((r) => !isStatutoryTaxSectionProjection(r));
  const projections: ChartOfAccount[] = [];

  for (const node of base) {
    if (isTdsPayableParentNode(node)) {
      projections.push(...buildTdsSectionProjections(node));
    } else if (isTcsPayableParentNode(node)) {
      projections.push(...buildTcsSectionProjections(node));
    }
  }

  if (projections.length === 0) return base;
  return [...base, ...projections];
}
