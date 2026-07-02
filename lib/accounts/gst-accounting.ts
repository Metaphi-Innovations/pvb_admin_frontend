/**
 * GST ledger resolution and tax component helpers.
 * All output/input GST posts to named ledgers under Duties & Taxes Payable.
 */

import {
  loadChartOfAccounts,
  nextId,
  saveChartOfAccounts,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import type { LedgerMappingKey } from "@/lib/accounts/ledger-mappings";
import { calcGstLineSplit } from "@/app/(app)/accounts/invoices/invoices-data";

export const GST_DUTIES_SUBGROUP = "Duties & Taxes Payable";

export const GST_LEDGER_NAMES = {
  cgstPayable: "CGST Payable",
  sgstPayable: "SGST Payable",
  igstPayable: "IGST Payable",
  cgstReceivable: "CGST Receivable",
  sgstReceivable: "SGST Receivable",
  igstReceivable: "IGST Receivable",
} as const;

const GST_LEDGER_SPECS: Array<{
  name: string;
  accountType: ChartOfAccount["accountType"];
  balanceType: ChartOfAccount["balanceType"];
}> = [
  { name: GST_LEDGER_NAMES.cgstPayable, accountType: "Liability", balanceType: "Credit" },
  { name: GST_LEDGER_NAMES.sgstPayable, accountType: "Liability", balanceType: "Credit" },
  { name: GST_LEDGER_NAMES.igstPayable, accountType: "Liability", balanceType: "Credit" },
  { name: GST_LEDGER_NAMES.cgstReceivable, accountType: "Asset", balanceType: "Debit" },
  { name: GST_LEDGER_NAMES.sgstReceivable, accountType: "Asset", balanceType: "Debit" },
  { name: GST_LEDGER_NAMES.igstReceivable, accountType: "Asset", balanceType: "Debit" },
];

export const GST_MAPPING_LEDGER_NAMES: Partial<Record<LedgerMappingKey, string>> = {
  sales_cgst: GST_LEDGER_NAMES.cgstPayable,
  sales_sgst: GST_LEDGER_NAMES.sgstPayable,
  sales_igst: GST_LEDGER_NAMES.igstPayable,
  purchase_cgst: GST_LEDGER_NAMES.cgstReceivable,
  purchase_sgst: GST_LEDGER_NAMES.sgstReceivable,
  purchase_igst: GST_LEDGER_NAMES.igstReceivable,
};

export interface GstComponentAmounts {
  cgst: number;
  sgst: number;
  igst: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function isGstMappingKey(key: LedgerMappingKey): boolean {
  return key in GST_MAPPING_LEDGER_NAMES;
}

/** Ensure CGST/SGST/IGST Payable & Receivable ledgers exist under Duties & Taxes Payable. */
export function ensureGstAccountingLedgers(): void {
  if (typeof window === "undefined") return;
  const records = loadChartOfAccounts();
  const subGroup = records.find(
    (r) => r.nodeLevel === "account_group" && r.accountName === GST_DUTIES_SUBGROUP,
  );
  if (!subGroup) return;

  let changed = false;
  const next = [...records];

  for (const spec of GST_LEDGER_SPECS) {
    const exists = next.some(
      (r) => r.nodeLevel === "ledger" && r.accountName === spec.name && r.status === "active",
    );
    if (exists) continue;

    const id = nextId(next);
    const ledger: ChartOfAccount = {
      id,
      accountCode: `LED-${String(id).padStart(4, "0")}`,
      accountName: spec.name,
      alias: "",
      accountType: spec.accountType,
      nodeLevel: "ledger",
      parentAccountId: subGroup.id,
      parentAccount: subGroup.accountName,
      description: `GST accounting — ${spec.name}`,
      status: "active",
      usedIn: ["journal", "sales", "procurement"],
      isSystem: false,
      isSystemGenerated: true,
      openingBalance: 0,
      balanceType: spec.balanceType,
      gstApplicable: true,
      tdsApplicable: false,
      costCenterApplicable: false,
      bankAccountFlag: false,
      createdBy: ACCOUNTS_CURRENT_USER,
      updatedBy: ACCOUNTS_CURRENT_USER,
    };
    next.push(ledger);
    changed = true;
  }

  if (changed) saveChartOfAccounts(next);
}

export function resolveGstLedger(mappingKey: LedgerMappingKey): ChartOfAccount | null {
  ensureGstAccountingLedgers();
  const ledgerName = GST_MAPPING_LEDGER_NAMES[mappingKey];
  if (!ledgerName) return null;
  return (
    loadChartOfAccounts().find(
      (r) => r.nodeLevel === "ledger" && r.accountName === ledgerName && r.status === "active",
    ) ?? null
  );
}

export function normalizeGstAmounts(taxAmount: number, interstate = false): GstComponentAmounts {
  if (taxAmount <= 0) return { cgst: 0, sgst: 0, igst: 0 };
  if (interstate) return { cgst: 0, sgst: 0, igst: round2(taxAmount) };
  const cgst = round2(taxAmount / 2);
  return { cgst, sgst: round2(taxAmount - cgst), igst: 0 };
}

export function aggregateLineGst(
  lines: Array<{
    qty: number;
    unitPrice: number;
    discountPct?: number;
    taxPct: number;
  }>,
  interstate = false,
): GstComponentAmounts {
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  for (const line of lines) {
    const split = calcGstLineSplit(
      {
        qty: line.qty,
        unitPrice: line.unitPrice,
        discountPct: line.discountPct ?? 0,
        taxPct: line.taxPct,
      },
      interstate,
    );
    cgst += split.cgst;
    sgst += split.sgst;
    igst += split.igst;
  }
  return { cgst: round2(cgst), sgst: round2(sgst), igst: round2(igst) };
}

export function inferInterstateFromPlaceOfSupply(
  placeOfSupply: string | undefined,
  companyState = "Maharashtra",
): boolean {
  if (!placeOfSupply?.trim()) return false;
  return placeOfSupply.trim().toLowerCase() !== companyState.trim().toLowerCase();
}
