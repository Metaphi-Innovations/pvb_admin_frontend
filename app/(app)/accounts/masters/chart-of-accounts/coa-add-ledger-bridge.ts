/** Lets the COA sidebar tree open the add-ledger drawer owned by CoaAddLedgerHost. */

import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import {
  isLandBuildingGroup,
  isSundryCreditorsGroup,
  isSundryDebtorsGroup,
  landBuildingAddWarehouseHref,
  sundryCreditorsAddLedgerHref,
  sundryDebtorsAddLedgerHref,
} from "@/lib/accounts/coa-add-ledger-policy";
import { requestSundryDebtorCustomerForm } from "./coa-sundry-debtor-form-bridge";
import { requestSundryCreditorVendorForm } from "./coa-sundry-creditor-form-bridge";
import { requestWarehouseForm } from "./coa-warehouse-form-bridge";

const CHART_OF_ACCOUNTS_PATH = "/accounts/masters/chart-of-accounts";

type CoaAddLedgerHandlers = {
  addUnderParent: ((parentGroupId: number) => void) | null;
  openGlobal: ((preferredParentId?: number | null) => void) | null;
};

let handlers: CoaAddLedgerHandlers = {
  addUnderParent: null,
  openGlobal: null,
};

export function registerCoaAddLedgerHandlers(next: CoaAddLedgerHandlers): void {
  handlers = next;
}

/** @deprecated Use registerCoaAddLedgerHandlers */
export function registerCoaAddLedgerHandler(
  handler: ((parentGroupId: number) => void) | null,
): void {
  handlers = { ...handlers, addUnderParent: handler };
}

function openSundryDebtorsForm(parentId: number): void {
  if (requestSundryDebtorCustomerForm(parentId)) return;
  if (typeof window !== "undefined") {
    window.location.assign(sundryDebtorsAddLedgerHref(parentId));
  }
}

function openSundryCreditorsForm(parentId: number): void {
  if (requestSundryCreditorVendorForm(parentId)) return;
  if (typeof window !== "undefined") {
    window.location.assign(sundryCreditorsAddLedgerHref(parentId));
  }
}

function openLandBuildingWarehouseForm(parentId: number): void {
  if (requestWarehouseForm(parentId)) return;
  if (typeof window !== "undefined") {
    window.location.assign(landBuildingAddWarehouseHref(parentId));
  }
}

function navigateToCoaAddLedger(parentId: number | "global"): void {
  if (typeof window === "undefined") return;
  if (typeof parentId === "number") {
    const records = loadChartOfAccounts();
    const parent = records.find((r) => r.id === parentId);
    if (parent && isSundryDebtorsGroup(parent, records)) {
      openSundryDebtorsForm(parentId);
      return;
    }
    if (parent && isSundryCreditorsGroup(parent, records)) {
      openSundryCreditorsForm(parentId);
      return;
    }
    if (parent && isLandBuildingGroup(parent, records)) {
      openLandBuildingWarehouseForm(parentId);
      return;
    }
  }
  const url =
    parentId === "global"
      ? `${CHART_OF_ACCOUNTS_PATH}?addLedger=global`
      : `${CHART_OF_ACCOUNTS_PATH}?addLedger=${parentId}`;
  window.location.assign(url);
}

export function requestCoaAddLedger(parentGroupId: number): void {
  if (typeof window !== "undefined") {
    const records = loadChartOfAccounts();
    const parent = records.find((r) => r.id === parentGroupId);
    if (parent && isSundryDebtorsGroup(parent, records)) {
      openSundryDebtorsForm(parentGroupId);
      return;
    }
    if (parent && isSundryCreditorsGroup(parent, records)) {
      openSundryCreditorsForm(parentGroupId);
      return;
    }
    if (parent && isLandBuildingGroup(parent, records)) {
      openLandBuildingWarehouseForm(parentGroupId);
      return;
    }
  }
  if (handlers.addUnderParent) {
    handlers.addUnderParent(parentGroupId);
    return;
  }
  navigateToCoaAddLedger(parentGroupId);
}

export function requestCoaGlobalAddLedger(preferredParentId?: number | null): void {
  if (preferredParentId != null && typeof window !== "undefined") {
    const records = loadChartOfAccounts();
    const parent = records.find((r) => r.id === preferredParentId);
    if (parent && isSundryDebtorsGroup(parent, records)) {
      openSundryDebtorsForm(preferredParentId);
      return;
    }
    if (parent && isSundryCreditorsGroup(parent, records)) {
      openSundryCreditorsForm(preferredParentId);
      return;
    }
    if (parent && isLandBuildingGroup(parent, records)) {
      openLandBuildingWarehouseForm(preferredParentId);
      return;
    }
  }
  if (handlers.openGlobal) {
    handlers.openGlobal(preferredParentId);
    return;
  }
  if (preferredParentId != null) {
    navigateToCoaAddLedger(preferredParentId);
  } else {
    navigateToCoaAddLedger("global");
  }
}
