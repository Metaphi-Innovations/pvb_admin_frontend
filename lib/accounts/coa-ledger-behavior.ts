import type {
  ChartOfAccount,
  CoaSpecializedGroupType,
} from "@/app/(app)/accounts/data";

export type CoaLedgerFormKind =
  | "customer"
  | "vendor"
  | "bank"
  | "cash"
  | "product"
  | "warehouse"
  | "gst"
  | "tds"
  | "employee"
  | "generic";

export interface CoaLedgerBehavior {
  kind: CoaLedgerFormKind;
  label: string;
  source: string | null;
  specializedAncestor: ChartOfAccount | null;
}

interface CoaLedgerBehaviorRule {
  kind: Exclude<CoaLedgerFormKind, "generic">;
  label: string;
  source: string;
  metadata: CoaSpecializedGroupType[];
  stableCodes: string[];
  aliases: string[];
}

/**
 * The only mapping table used to choose a ledger-creation form.
 * Add future specialized forms here; the COA hierarchy does not need to change.
 */
export const COA_LEDGER_BEHAVIOR_RULES: readonly CoaLedgerBehaviorRule[] = [
  {
    kind: "customer",
    label: "Customer Ledger",
    source: "ERP Customer Master",
    metadata: ["sundry_debtors"],
    stableCodes: ["1212"],
    aliases: ["sundry debtors", "trade receivables / sundry debtors"],
  },
  {
    kind: "vendor",
    label: "Vendor Ledger",
    source: "ERP Vendor Master",
    metadata: ["sundry_creditors"],
    stableCodes: ["2310"],
    aliases: ["sundry creditors", "trade payables / sundry creditors"],
  },
  {
    kind: "bank",
    label: "Bank Ledger",
    source: "Bank Account Master",
    metadata: ["bank_accounts"],
    stableCodes: ["1211"],
    aliases: ["bank accounts"],
  },
  {
    kind: "cash",
    label: "Cash Ledger",
    source: "Chart of Accounts",
    metadata: ["cash_in_hand"],
    stableCodes: ["1210"],
    aliases: ["cash in hand", "cash-in-hand"],
  },
  {
    kind: "product",
    label: "Product Ledger",
    source: "ERP Product Master",
    metadata: ["inventory"],
    stableCodes: ["1213"],
    aliases: [
      "inventory",
      "inventory / stock-in-hand",
      "stock in hand",
      "stock-in-hand",
      "finished goods",
      "raw material",
      "raw materials",
      "trading goods",
      "stores",
      "consumables",
    ],
  },
  {
    kind: "warehouse",
    label: "Warehouse Ledger",
    source: "Warehouse Master",
    metadata: ["warehouse"],
    stableCodes: ["1110"],
    aliases: ["warehouse", "warehouses", "land & building"],
  },
  {
    kind: "gst",
    label: "GST Ledger",
    source: "GST Master",
    metadata: ["gst_input", "gst_output", "gst_payable", "gst_receivable", "gst_duties"],
    stableCodes: ["23110", "23111"],
    aliases: ["gst input", "gst input credit", "gst output", "gst payable", "gst receivable"],
  },
  {
    kind: "tds",
    label: "TDS Ledger",
    source: "TDS Master",
    metadata: ["tds_payable", "tds_receivable"],
    stableCodes: ["1219", "23112"],
    aliases: ["tds payable", "tds receivable"],
  },
  {
    kind: "employee",
    label: "Employee Ledger",
    source: "HR Employee Master",
    metadata: ["employee_payable"],
    stableCodes: ["2315"],
    aliases: ["employee payable", "salary payable"],
  },
] as const;

function ancestorPath(records: ChartOfAccount[], nodeId: number): ChartOfAccount[] {
  const byId = new Map(records.map((record) => [record.id, record]));
  const path: ChartOfAccount[] = [];
  const visited = new Set<number>();
  let current = byId.get(nodeId);

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current);
    current =
      current.parentAccountId == null ? undefined : byId.get(current.parentAccountId);
  }

  return path;
}

function normalizedName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function matchingRule(node: ChartOfAccount): CoaLedgerBehaviorRule | null {
  const name = normalizedName(node.accountName);
  return (
    COA_LEDGER_BEHAVIOR_RULES.find(
      (rule) =>
        (node.specializedGroupType != null &&
          rule.metadata.includes(node.specializedGroupType)) ||
        rule.stableCodes.includes(node.accountCode) ||
        rule.aliases.some((alias) => name === alias || name.includes(alias)),
    ) ?? null
  );
}

/**
 * Resolves from the selected group toward the root, so a user-created group
 * inherits the nearest specialized ancestor. Metadata wins, with stable codes
 * and aliases retained only for migration of older saved charts.
 */
export function resolveCoaLedgerBehavior(
  parent: ChartOfAccount,
  records: ChartOfAccount[],
): CoaLedgerBehavior {
  const path = ancestorPath(records, parent.id);

  for (let index = path.length - 1; index >= 0; index -= 1) {
    const node = path[index];
    const rule = matchingRule(node);
    if (rule) {
      return {
        kind: rule.kind,
        label: rule.label,
        source: rule.source,
        specializedAncestor: node,
      };
    }
  }

  return {
    kind: "generic",
    label: "Generic Ledger",
    source: null,
    specializedAncestor: null,
  };
}

export function resolveCoaLedgerBehaviorById(
  parentGroupId: number,
  records: ChartOfAccount[],
): CoaLedgerBehavior {
  const parent = records.find((record) => record.id === parentGroupId);
  if (!parent) {
    return {
      kind: "generic",
      label: "Generic Ledger",
      source: null,
      specializedAncestor: null,
    };
  }
  return resolveCoaLedgerBehavior(parent, records);
}
