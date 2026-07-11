/** Lets the COA sidebar tree open the add-ledger drawer owned by CoaAddLedgerHost. */

import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import {
  landBuildingAddWarehouseHref,
  sundryCreditorsAddLedgerHref,
  sundryDebtorsAddLedgerHref,
  tdsAddLedgerHref,
} from "@/lib/accounts/coa-add-ledger-policy";
import { requestSundryDebtorCustomerForm } from "./coa-sundry-debtor-form-bridge";
import { requestSundryCreditorVendorForm } from "./coa-sundry-creditor-form-bridge";
import { requestWarehouseForm } from "./coa-warehouse-form-bridge";
import { requestTdsLedgerForm } from "./coa-tds-form-bridge";
import { resolveCoaLedgerBehavior } from "@/lib/accounts/coa-ledger-behavior";
import { requestCoaMasterLinkedForm } from "./coa-master-linked-form-bridge";
import { requestCoaBankForm } from "./coa-bank-form-bridge";

type CoaAddLedgerHandlers = {
  addUnderParent: ((parentGroupId: number) => void) | null;
  openGlobal: ((preferredParentId?: number | null) => void) | null;
};

let handlers: CoaAddLedgerHandlers = {
  addUnderParent: null,
  openGlobal: null,
};

type PendingAddLedger =
  | { kind: "under"; parentGroupId: number }
  | { kind: "global"; preferredParentId?: number | null };

let pending: PendingAddLedger | null = null;

function flushPendingAddLedger(): void {
  if (!pending) return;
  if (pending.kind === "under" && handlers.addUnderParent) {
    handlers.addUnderParent(pending.parentGroupId);
    pending = null;
    return;
  }
  if (pending.kind === "global" && handlers.openGlobal) {
    handlers.openGlobal(pending.preferredParentId);
    pending = null;
  }
}

export function registerCoaAddLedgerHandlers(next: CoaAddLedgerHandlers): void {
  handlers = next;
  flushPendingAddLedger();
}

/** @deprecated Use registerCoaAddLedgerHandlers */
export function registerCoaAddLedgerHandler(
  handler: ((parentGroupId: number) => void) | null,
): void {
  handlers = { ...handlers, addUnderParent: handler };
  flushPendingAddLedger();
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

function openTdsLedgerForm(parentId: number): void {
  if (requestTdsLedgerForm(parentId)) return;
  if (typeof window !== "undefined") {
    window.location.assign(tdsAddLedgerHref(parentId));
  }
}

/** Routes every specialized group through the single inherited behavior resolver. */
export function requestCoaSpecializedLedgerForm(parentId: number): boolean {
  if (typeof window === "undefined") return false;
  const records = loadChartOfAccounts();
  const parent = records.find((record) => record.id === parentId);
  if (!parent) return false;

  switch (resolveCoaLedgerBehavior(parent, records).kind) {
    case "customer":
      openSundryDebtorsForm(parentId);
      return true;
    case "vendor":
      openSundryCreditorsForm(parentId);
      return true;
    case "warehouse":
      openLandBuildingWarehouseForm(parentId);
      return true;
    case "tds":
      openTdsLedgerForm(parentId);
      return true;
    case "bank":
      if (requestCoaBankForm(parentId)) return true;
      window.location.assign(
        `/accounts/banking/bank-accounts/new?bankGroupId=${parentId}`,
      );
      return true;
    case "product":
      if (requestCoaMasterLinkedForm("product", parentId)) return true;
      window.location.assign(`/masters/products/add?coaParent=${parentId}`);
      return true;
    case "gst":
      if (requestCoaMasterLinkedForm("gst", parentId)) return true;
      window.location.assign(`/masters/gst?coaParent=${parentId}`);
      return true;
    case "employee":
      if (requestCoaMasterLinkedForm("employee", parentId)) return true;
      window.location.assign(`/hr/employees/new?coaParent=${parentId}`);
      return true;
    case "cash":
    case "generic":
      return false;
  }
}

export function requestCoaAddLedger(parentGroupId: number): void {
  if (requestCoaSpecializedLedgerForm(parentGroupId)) return;
  if (handlers.addUnderParent) {
    handlers.addUnderParent(parentGroupId);
    return;
  }
  pending = { kind: "under", parentGroupId };
  flushPendingAddLedger();
}

export function requestCoaGlobalAddLedger(preferredParentId?: number | null): void {
  if (preferredParentId != null && requestCoaSpecializedLedgerForm(preferredParentId)) return;
  if (handlers.openGlobal) {
    handlers.openGlobal(preferredParentId);
    return;
  }
  pending = { kind: "global", preferredParentId };
  flushPendingAddLedger();
}
