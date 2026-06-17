/**
 * Default ledger mapping keys for ERP auto-posting.
 * Maps source transactions to COA sub-group names; resolved to ledgers at runtime.
 */

import type { ErpUsageModule } from "@/app/(app)/accounts/data";
import {
  loadChartOfAccounts,
  nextId,
  saveChartOfAccounts,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import {
  getLedgersUnderSubGroupName,
  resolveHierarchyPath,
} from "@/lib/accounts/coa-hierarchy";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";

export type LedgerMappingKey =
  | "sales_revenue"
  | "sales_receivable"
  | "sales_cgst"
  | "sales_sgst"
  | "sales_igst"
  | "purchase_inventory"
  | "purchase_payable"
  | "purchase_cgst"
  | "purchase_sgst"
  | "purchase_igst"
  | "hr_claim_expense"
  | "hr_claim_payable"
  | "stock_adjustment"
  | "stock_inventory"
  | "cash_ledger"
  | "bank_ledger"
  | "round_off";

export interface LedgerMapping {
  id: number;
  module: ErpUsageModule;
  mappingKey: LedgerMappingKey;
  /** Target sub-group name — ledger resolved or auto-created under this group */
  subGroupName: string;
  coaAccountId: number | null;
  description: string;
  isActive: boolean;
}

/** Sub-group targets per mapping key */
export const DEFAULT_MAPPING_TARGETS: Record<
  LedgerMappingKey,
  { module: ErpUsageModule; subGroupName: string; description: string }
> = {
  sales_revenue: {
    module: "sales",
    subGroupName: "Sales",
    description: "Credit sales revenue on invoice posting",
  },
  sales_receivable: {
    module: "sales",
    subGroupName: "Trade Receivables / Sundry Debtors",
    description: "Debit customer receivable on sales invoice",
  },
  sales_cgst: { module: "sales", subGroupName: "Duties & Taxes Payable", description: "Output CGST" },
  sales_sgst: { module: "sales", subGroupName: "Duties & Taxes Payable", description: "Output SGST" },
  sales_igst: { module: "sales", subGroupName: "Duties & Taxes Payable", description: "Output IGST" },
  purchase_inventory: {
    module: "procurement",
    subGroupName: "Inventory / Stock-in-Hand",
    description: "Debit inventory on purchase invoice",
  },
  purchase_payable: {
    module: "procurement",
    subGroupName: "Trade Payables / Sundry Creditors",
    description: "Credit vendor payable on purchase invoice",
  },
  purchase_cgst: { module: "procurement", subGroupName: "GST Payable", description: "Input CGST" },
  purchase_sgst: { module: "procurement", subGroupName: "GST Payable", description: "Input SGST" },
  purchase_igst: { module: "procurement", subGroupName: "GST Payable", description: "Input IGST" },
  hr_claim_expense: {
    module: "tada_claims",
    subGroupName: "Business Development Expenses",
    description: "Debit employee claim expense",
  },
  hr_claim_payable: {
    module: "tada_claims",
    subGroupName: "Expenses Payable",
    description: "Credit employee claim payable",
  },
  stock_adjustment: {
    module: "journal",
    subGroupName: "Other Current Assets",
    description: "Stock adjustment gain/loss",
  },
  stock_inventory: {
    module: "journal",
    subGroupName: "Inventory / Stock-in-Hand",
    description: "Inventory asset on stock adjustment",
  },
  cash_ledger: { module: "payments", subGroupName: "Cash-in-Hand", description: "Default cash ledger" },
  bank_ledger: { module: "payments", subGroupName: "Bank Accounts", description: "Default bank ledger" },
  round_off: { module: "journal", subGroupName: "Miscellaneous Expenses", description: "Round-off differences" },
};

const STORAGE_KEY = "ds_accounts_ledger_mappings_v1";

function buildSeed(): LedgerMapping[] {
  return (Object.keys(DEFAULT_MAPPING_TARGETS) as LedgerMappingKey[]).map((key, i) => {
    const t = DEFAULT_MAPPING_TARGETS[key];
    return {
      id: i + 1,
      module: t.module,
      mappingKey: key,
      subGroupName: t.subGroupName,
      coaAccountId: null,
      description: t.description,
      isActive: true,
    };
  });
}

export function loadLedgerMappings(): LedgerMapping[] {
  if (typeof window === "undefined") return buildSeed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = buildSeed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as LedgerMapping[];
  } catch {
    return buildSeed();
  }
}

export function saveLedgerMappings(list: LedgerMapping[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** Find or create a party ledger under the mapped sub-group */
export function resolveMappingLedger(
  mappingKey: LedgerMappingKey,
  partyName: string,
  options?: { createIfMissing?: boolean; asSubLedger?: boolean },
): ChartOfAccount | null {
  const mappings = loadLedgerMappings();
  const mapping = mappings.find((m) => m.mappingKey === mappingKey && m.isActive);
  if (!mapping) return null;

  if (mapping.coaAccountId) {
    const fixed = loadChartOfAccounts().find((r) => r.id === mapping.coaAccountId);
    if (fixed) return fixed;
  }

  const candidates = getLedgersUnderSubGroupName(mapping.subGroupName);
  const normalized = partyName.trim().toLowerCase();
  const existing = candidates.find((l) => l.accountName.toLowerCase() === normalized);
  if (existing) return existing;

  if (!options?.createIfMissing) return candidates[0] ?? null;

  const records = loadChartOfAccounts();
  const subGroup = records.find(
    (r) =>
      r.nodeLevel === "sub_group" &&
      r.accountName.toLowerCase() === mapping.subGroupName.toLowerCase(),
  );
  if (!subGroup) return null;

  const parentLedger = candidates[0];
  if (options.asSubLedger && parentLedger) {
    const subId = nextId(records);
    const subLedger: ChartOfAccount = {
      id: subId,
      accountCode: `SLED-${String(subId).padStart(4, "0")}`,
      accountName: partyName.trim(),
      alias: "",
      accountType: parentLedger.accountType,
      nodeLevel: "sub_ledger",
      parentAccountId: parentLedger.id,
      parentAccount: parentLedger.accountName,
      description: `Auto-created for ${mappingKey}`,
      status: "active",
      usedIn: [mapping.module],
      isSystem: false,
      openingBalance: 0,
      balanceType: parentLedger.balanceType,
      gstApplicable: false,
      tdsApplicable: false,
      costCenterApplicable: false,
      bankAccountFlag: false,
      createdBy: ACCOUNTS_CURRENT_USER,
      updatedBy: ACCOUNTS_CURRENT_USER,
    };
    const updated = [...records, subLedger];
    saveChartOfAccounts(updated);
    return subLedger;
  }

  const id = nextId(records);
  const ledger: ChartOfAccount = {
    id,
    accountCode: `LED-${String(id).padStart(4, "0")}`,
    accountName: partyName.trim(),
    alias: "",
    accountType: subGroup.accountType,
    nodeLevel: "ledger",
    parentAccountId: subGroup.id,
    parentAccount: subGroup.accountName,
    description: `Auto-created for ${mappingKey}`,
    status: "active",
    usedIn: [mapping.module],
    isSystem: false,
    openingBalance: 0,
    balanceType:
      subGroup.accountType === "Liability" || subGroup.accountType === "Income"
        ? "Credit"
        : "Debit",
    gstApplicable: false,
    tdsApplicable: false,
    costCenterApplicable: false,
    bankAccountFlag: mappingKey === "bank_ledger",
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
  };
  saveChartOfAccounts([...records, ledger]);
  return ledger;
}

export function getMappingPath(mappingKey: LedgerMappingKey): string {
  const m = DEFAULT_MAPPING_TARGETS[mappingKey];
  return m ? `${m.module} › ${m.subGroupName}` : mappingKey;
}
