/**
 * Maps backend Chart of Accounts tree DTOs into the flat ChartOfAccount records
 * used by the COA sidebar and ledger detail header.
 */

import type {
  AccountType,
  ChartOfAccount,
  CoaLedgerKind,
  CoaNodeId,
  CoaNodeLevel,
} from "@/app/(app)/accounts/data";
import type { CoaApiTreeNode } from "@/services/chart-of-accounts.service";
import type { BalanceSide } from "@/lib/accounts/money-format";

const PRIMARY_HEAD_ACCOUNT_TYPE: Record<string, AccountType> = {
  assets: "Asset",
  liabilities: "Liability",
  income: "Income",
  expenses: "Expense",
  equity: "Equity",
};

function mapNodeLevel(type: CoaApiTreeNode["type"]): CoaNodeLevel {
  if (type === "PRIMARY_HEAD") return "primary_head";
  if (type === "LEDGER") return "ledger";
  // ACCOUNT_GROUP + ACCOUNT_SUB_GROUP both use account_group;
  // sidebar visual levels are inferred from parent depth.
  return "account_group";
}

function mapStatus(status: string): "active" | "inactive" {
  return String(status).toUpperCase() === "INACTIVE" ? "inactive" : "active";
}

function mapBalanceType(raw: string | null | undefined): BalanceSide {
  const value = String(raw ?? "DEBIT").toUpperCase();
  return value === "CREDIT" || value === "CR" ? "Credit" : "Debit";
}

function mapAccountType(primaryHeadName: string): AccountType {
  return PRIMARY_HEAD_ACCOUNT_TYPE[primaryHeadName.trim().toLowerCase()] ?? "Asset";
}

function mapLedgerKind(node: CoaApiTreeNode): CoaLedgerKind | undefined {
  if (node.type !== "LEDGER") return undefined;
  if (node.isSystemDefined) return "SYSTEM";
  if (node.sourceType && node.sourceType !== "MANUAL") return "MASTER";
  return "GENERIC";
}

function parseOpeningAmount(raw: string | null | undefined): number {
  if (raw == null || raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function mapMasterType(sourceType: string | null | undefined): string | null {
  const t = String(sourceType ?? "").toUpperCase();
  if (t === "CUSTOMER") return "customer";
  if (t === "SUPPLIER") return "vendor";
  if (t === "WAREHOUSE") return "warehouse";
  return null;
}

function mapErpSourceModule(sourceType: string | null | undefined): string | undefined {
  const t = String(sourceType ?? "").toUpperCase();
  if (t === "CUSTOMER") return "customer_master";
  if (t === "SUPPLIER") return "vendor_master";
  if (t === "WAREHOUSE") return "warehouse_master";
  if (t === "SYSTEM") return "system";
  return sourceType ?? undefined;
}

function stableCoaNodeId(raw: string | null | undefined): CoaNodeId {
  const value = String(raw ?? "").trim();
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;

  // Deterministic positive 31-bit hash for UUID/string API ids.
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

function toChartOfAccount(
  node: CoaApiTreeNode,
  parent: ChartOfAccount | null,
  accountType: AccountType,
): ChartOfAccount {
  const isLedger = node.type === "LEDGER";
  const opening = node.openingBalance;
  const masterType = isLedger ? mapMasterType(node.sourceType) : null;
  const sourceEntityId = node.sourceEntityId ?? null;

  return {
    id: stableCoaNodeId(node.id),
    apiNodeId: node.id,
    accountCode: node.code,
    accountName: node.name,
    alias: "",
    accountType,
    nodeLevel: mapNodeLevel(node.type),
    parentAccountId:
      node.parentId != null
        ? stableCoaNodeId(node.parentId)
        : parent?.id ?? null,
    apiParentNodeId: node.parentId ?? parent?.apiNodeId ?? null,
    parentAccount: parent?.accountName ?? "",
    description: "",
    status: mapStatus(node.status),
    usedIn: [],
    isSystem: Boolean(node.isSystemDefined),
    openingBalance: isLedger ? parseOpeningAmount(opening?.amount) : 0,
    balanceType: isLedger ? mapBalanceType(opening?.balanceType) : "Debit",
    gstApplicable: false,
    tdsApplicable: false,
    costCenterApplicable: false,
    billWiseAccounting: false,
    bankAccountFlag: false,
    ledgerKind: mapLedgerKind(node),
    masterType,
    masterId: sourceEntityId,
    isSystemGenerated: Boolean(node.isSystemDefined && isLedger),
    erpSourceModule: isLedger ? mapErpSourceModule(node.sourceType) : undefined,
    erpSourceId: sourceEntityId ?? undefined,
    createdBy: "",
    updatedBy: "",
  };
}

/** Flatten nested API tree into the COA navigation record list. */
export function mapCoaApiTreeToRecords(tree: CoaApiTreeNode[]): ChartOfAccount[] {
  const records: ChartOfAccount[] = [];

  const walk = (
    nodes: CoaApiTreeNode[] | undefined,
    parent: ChartOfAccount | null,
    accountType: AccountType,
  ) => {
    if (!nodes?.length) return;
    for (const node of nodes) {
      const nextType =
        node.type === "PRIMARY_HEAD" ? mapAccountType(node.name) : accountType;
      const record = toChartOfAccount(node, parent, nextType);
      records.push(record);
      walk(node.children, record, nextType);
    }
  };

  walk(tree, null, "Asset");
  return records;
}
