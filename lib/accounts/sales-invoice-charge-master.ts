/**
 * Frontend Sales Invoice Charge Master (Goods generate).
 * Not a backend API — stores charge → recovery Income ledger mapping.
 * Ledger IDs/codes are resolved from Chart of Accounts (created under
 * Other Operating Income when missing). Invoice generation must not
 * fuzzy-match ledgers by charge name.
 */

import {
  loadChartOfAccounts,
  nextId,
  saveChartOfAccounts,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";

export type SalesInvoiceChargeType = "recovery_income";

export interface SalesInvoiceChargeMasterDef {
  chargeId: string;
  chargeCode: string;
  chargeName: string;
  /** Exact COA ledger name to create/resolve (recovery/income). */
  configuredLedgerName: string;
  /** Preferred ledger code when creating the COA ledger. */
  preferredLedgerCode: string;
  /** Optional existing COA names to resolve before creating a new ledger. */
  alternateLedgerNames?: string[];
  gstApplicable: boolean;
  gstRate: number;
  chargeType: SalesInvoiceChargeType;
  status: "active" | "inactive";
}

/** Charge Master configuration — ledger mapping is by configuredLedgerName, not charge-name inference. */
export const SALES_INVOICE_CHARGE_MASTER_DEFS: SalesInvoiceChargeMasterDef[] = [
  {
    chargeId: "chg-frt",
    chargeCode: "CHG-FRT",
    chargeName: "Freight Charges",
    configuredLedgerName: "Freight Recovery",
    preferredLedgerCode: "FR-001",
    gstApplicable: true,
    gstRate: 18,
    chargeType: "recovery_income",
    status: "active",
  },
  {
    chargeId: "chg-trn",
    chargeCode: "CHG-TRN",
    chargeName: "Transportation",
    configuredLedgerName: "Transportation Recovery",
    preferredLedgerCode: "TRN-001",
    gstApplicable: true,
    gstRate: 18,
    chargeType: "recovery_income",
    status: "active",
  },
  {
    chargeId: "chg-pkg",
    chargeCode: "CHG-PKG",
    chargeName: "Packing Charges",
    configuredLedgerName: "Packing Charges Recovery",
    preferredLedgerCode: "PCR-001",
    gstApplicable: true,
    gstRate: 18,
    chargeType: "recovery_income",
    status: "active",
  },
  {
    chargeId: "chg-ldg",
    chargeCode: "CHG-LDG",
    chargeName: "Loading Charges",
    configuredLedgerName: "Loading Charges Recovery",
    preferredLedgerCode: "LCR-001",
    gstApplicable: true,
    gstRate: 18,
    chargeType: "recovery_income",
    status: "active",
  },
  {
    chargeId: "chg-uld",
    chargeCode: "CHG-ULD",
    chargeName: "Unloading Charges",
    configuredLedgerName: "Unloading Charges Recovery",
    preferredLedgerCode: "UCR-001",
    gstApplicable: true,
    gstRate: 18,
    chargeType: "recovery_income",
    status: "active",
  },
  {
    chargeId: "chg-ins",
    chargeCode: "CHG-INS",
    chargeName: "Insurance",
    configuredLedgerName: "Insurance Recovery",
    preferredLedgerCode: "INS-001",
    gstApplicable: true,
    gstRate: 18,
    chargeType: "recovery_income",
    status: "active",
  },
  {
    chargeId: "chg-hdl",
    chargeCode: "CHG-HDL",
    chargeName: "Handling Charges",
    configuredLedgerName: "Handling Charges Recovery",
    preferredLedgerCode: "HCR-001",
    /** Existing COA demo ledger name fallback */
    alternateLedgerNames: ["Handling Charges Recovered"],
    gstApplicable: true,
    gstRate: 18,
    chargeType: "recovery_income",
    status: "active",
  },
  {
    chargeId: "chg-doc",
    chargeCode: "CHG-DOC",
    chargeName: "Documentation Charges",
    configuredLedgerName: "Documentation Charges Recovery",
    preferredLedgerCode: "DCR-001",
    gstApplicable: true,
    gstRate: 18,
    chargeType: "recovery_income",
    status: "active",
  },
  {
    chargeId: "chg-cou",
    chargeCode: "CHG-COU",
    chargeName: "Courier Charges",
    configuredLedgerName: "Courier Charges Recovery",
    preferredLedgerCode: "CCR-001",
    gstApplicable: true,
    gstRate: 18,
    chargeType: "recovery_income",
    status: "active",
  },
];

export interface ResolvedSalesInvoiceCharge {
  chargeId: string;
  chargeCode: string;
  chargeName: string;
  ledgerId: number | null;
  ledgerCode: string;
  ledgerName: string;
  gstApplicable: boolean;
  gstRate: number;
  chargeType: SalesInvoiceChargeType;
  status: "active" | "inactive";
  /** True when a real COA ledger id was resolved. */
  isMapped: boolean;
}

const RECOVERY_PARENT_GROUP = "Other Operating Income";

function findLedgerByName(records: ChartOfAccount[], name: string): ChartOfAccount | undefined {
  const q = name.trim().toLowerCase();
  return records.find(
    (r) => r.nodeLevel === "ledger" && r.accountName.trim().toLowerCase() === q,
  );
}

function findLedgerByCode(records: ChartOfAccount[], code: string): ChartOfAccount | undefined {
  const q = code.trim().toLowerCase();
  return records.find(
    (r) => r.nodeLevel === "ledger" && r.accountCode.trim().toLowerCase() === q,
  );
}

/** Ensure recovery Income ledgers exist in COA for Charge Master mappings. */
export function ensureSalesInvoiceChargeRecoveryLedgers(): void {
  if (typeof window === "undefined") return;

  let records = loadChartOfAccounts();
  const parent = records.find(
    (r) =>
      r.nodeLevel === "account_group" &&
      r.accountName.trim().toLowerCase() === RECOVERY_PARENT_GROUP.toLowerCase(),
  );
  if (!parent) return;

  let changed = false;
  for (const def of SALES_INVOICE_CHARGE_MASTER_DEFS) {
    if (def.status !== "active") continue;
    const byName = findLedgerByName(records, def.configuredLedgerName);
    if (byName) continue;
    const byCode = findLedgerByCode(records, def.preferredLedgerCode);
    if (byCode) continue;

    const id = nextId(records);
    const ledger: ChartOfAccount = {
      id,
      accountCode: def.preferredLedgerCode,
      accountName: def.configuredLedgerName,
      alias: "",
      accountType: "Income",
      nodeLevel: "ledger",
      parentAccountId: parent.id,
      parentAccount: parent.accountName,
      description: `Sales Invoice charge recovery — ${def.chargeName}`,
      status: "active",
      usedIn: ["sales"],
      isSystem: false,
      openingBalance: 0,
      balanceType: "Credit",
      gstApplicable: def.gstApplicable,
      tdsApplicable: false,
      costCenterApplicable: false,
      billWiseAccounting: false,
      bankAccountFlag: false,
      ledgerKind: "GENERIC",
      isSystemGenerated: true,
      erpSourceModule: "sales",
      createdBy: ACCOUNTS_CURRENT_USER,
      updatedBy: ACCOUNTS_CURRENT_USER,
    };
    records = [...records, ledger];
    changed = true;
  }

  if (changed) {
    saveChartOfAccounts(records);
    dispatchAccountsDataChanged("ledgers", { operation: "create" });
  }
}

function resolveLedgerForDef(def: SalesInvoiceChargeMasterDef): {
  ledgerId: number | null;
  ledgerCode: string;
  ledgerName: string;
} {
  const records = loadChartOfAccounts();
  let hit =
    findLedgerByName(records, def.configuredLedgerName) ??
    findLedgerByCode(records, def.preferredLedgerCode);
  if (!hit && def.alternateLedgerNames?.length) {
    for (const alt of def.alternateLedgerNames) {
      hit = findLedgerByName(records, alt);
      if (hit) break;
    }
  }
  if (!hit) {
    return { ledgerId: null, ledgerCode: "", ledgerName: "" };
  }
  return {
    ledgerId: hit.id,
    ledgerCode: hit.accountCode,
    ledgerName: hit.accountName,
  };
}

/** Load active Charge Master options with resolved COA ledger ids. */
export function loadSalesInvoiceChargeMaster(): ResolvedSalesInvoiceCharge[] {
  if (typeof window !== "undefined") {
    ensureSalesInvoiceChargeRecoveryLedgers();
  }

  return SALES_INVOICE_CHARGE_MASTER_DEFS.filter((d) => d.status === "active").map((def) => {
    const ledger = typeof window !== "undefined"
      ? resolveLedgerForDef(def)
      : { ledgerId: null, ledgerCode: "", ledgerName: "" };
    return {
      chargeId: def.chargeId,
      chargeCode: def.chargeCode,
      chargeName: def.chargeName,
      ledgerId: ledger.ledgerId,
      ledgerCode: ledger.ledgerCode,
      ledgerName: ledger.ledgerName,
      gstApplicable: def.gstApplicable,
      gstRate: def.gstRate,
      chargeType: def.chargeType,
      status: def.status,
      isMapped:
        ledger.ledgerId != null &&
        Boolean(ledger.ledgerCode?.trim()) &&
        Boolean(ledger.ledgerName?.trim()),
    };
  });
}

export function formatChargeDropdownLabel(c: ResolvedSalesInvoiceCharge): string {
  if (c.isMapped) {
    return `${c.chargeName} — ${c.ledgerName} [${c.ledgerCode}]`;
  }
  return `${c.chargeName} — Ledger not mapped`;
}

export function formatMappedLedgerLine(c: {
  ledgerName?: string;
  ledgerCode?: string;
  coaLedgerName?: string;
  coaLedgerCode?: string;
}): string | null {
  const name = c.ledgerName || c.coaLedgerName || "";
  const code = c.ledgerCode || c.coaLedgerCode || "";
  if (!name && !code) return null;
  if (name && code) return `Mapped to: ${name} [${code}]`;
  if (name) return `Mapped to: ${name}`;
  return `Mapped to: [${code}]`;
}
