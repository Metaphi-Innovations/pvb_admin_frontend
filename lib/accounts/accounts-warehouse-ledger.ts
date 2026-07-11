/**
 * COA ledger creation for ERP Warehouse Master records under Land & Building.
 * Warehouse data is stored only in central Warehouse Master (`ds_warehouse_masters`).
 */

import type { WarehouseMaster } from "@/app/(app)/masters/warehouse/warehouse-data";
import {
  loadChartOfAccounts,
  nextId,
  saveChartOfAccounts,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import { generateLedgerCode } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import {
  isLandBuildingGroup,
  LAND_BUILDING_GROUP_NAME,
} from "@/lib/accounts/coa-add-ledger-policy";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import {
  findErpPartyLink,
  upsertErpPartyLink,
} from "@/lib/accounts/erp-party-links";

export { isLandBuildingGroup, LAND_BUILDING_GROUP_NAME };

export interface CreateWarehouseCoaLedgerResult {
  ledger: ChartOfAccount;
  created: boolean;
}

export function findLandBuildingGroup(
  records: ChartOfAccount[],
): ChartOfAccount | undefined {
  return records.find(
    (r) => r.nodeLevel === "account_group" && isLandBuildingGroup(r, records),
  );
}

export function findWarehouseCoaLedger(warehouseId: number): ChartOfAccount | undefined {
  const records = loadChartOfAccounts();
  const link = findErpPartyLink("warehouse_master", warehouseId);
  if (link) {
    return records.find((r) => r.id === link.ledgerId);
  }
  return records.find(
    (r) =>
      r.nodeLevel === "ledger" &&
      r.erpSourceModule === "warehouse_master" &&
      r.erpSourceId === warehouseId,
  );
}

/**
 * Create (or return existing) a fixed-asset ledger for a Warehouse Master record.
 */
export function createWarehouseCoaLedger(
  warehouse: WarehouseMaster,
  parentGroupId?: number | null,
): CreateWarehouseCoaLedgerResult {
  const existing = findWarehouseCoaLedger(warehouse.id);
  if (existing) {
    return { ledger: existing, created: false };
  }

  const records = loadChartOfAccounts();
  const parent =
    (parentGroupId != null
      ? records.find((r) => r.id === parentGroupId)
      : undefined) ?? findLandBuildingGroup(records);

  if (!parent || parent.nodeLevel !== "account_group") {
    throw new Error("Land & Building group was not found in Chart of Accounts.");
  }
  if (!isLandBuildingGroup(parent, records)) {
    throw new Error("Parent group must be Land & Building under Fixed Assets.");
  }

  const name = warehouse.warehouseName.trim();
  if (!name) {
    throw new Error("Warehouse name is required.");
  }

  const dup = records.find(
    (r) =>
      r.nodeLevel === "ledger" &&
      r.parentAccountId === parent.id &&
      r.accountName.toLowerCase() === name.toLowerCase(),
  );
  if (dup) {
    throw new Error("A ledger with this name already exists under Land & Building.");
  }

  const ledgerId = nextId(records);
  const ledger: ChartOfAccount = {
    id: ledgerId,
    accountCode: generateLedgerCode(records),
    accountName: name,
    alias: warehouse.warehouseCode,
    accountType: parent.accountType,
    nodeLevel: "ledger",
    parentAccountId: parent.id,
    parentAccount: parent.accountName,
    description: `Fixed asset ledger for warehouse ${warehouse.warehouseCode}`,
    status: warehouse.status === "active" ? "active" : "inactive",
    usedIn: ["procurement"],
    isSystem: false,
    openingBalance: 0,
    balanceType: "Debit",
    gstApplicable: warehouse.gstApplicable,
    tdsApplicable: false,
    costCenterApplicable: false,
    bankAccountFlag: false,
    isSystemGenerated: true,
    erpSourceModule: "warehouse_master",
    erpSourceId: warehouse.id,
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
  };

  saveChartOfAccounts([...records, ledger]);
  dispatchAccountsDataChanged("ledgers", {
    operation: "create",
    recordId: ledger.id,
  });

  upsertErpPartyLink({
    ledgerId,
    erpSourceModule: "warehouse_master",
    erpSourceId: warehouse.id,
    partyCode: warehouse.warehouseCode,
    partyName: warehouse.warehouseName,
  });

  return { ledger, created: true };
}
