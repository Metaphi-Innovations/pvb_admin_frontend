/**
 * Accounts-only vendor ledger profiles.
 * Created from COA → Sundry Creditors → Add Ledger using the Supplier Master form UI.
 * Never reads/writes ERP Supplier Master storage (`ds_vendors`).
 */

import type { Vendor, VendorContact } from "@/app/(app)/masters/vendors/vendor-data";
import {
  generateVendorCodeForType,
  todayStr,
} from "@/app/(app)/masters/vendors/vendor-data";
import {
  loadChartOfAccounts,
  nextId,
  saveChartOfAccounts,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import { generateLedgerCode } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import {
  isSundryCreditorsGroup,
  SUNDRY_CREDITORS_GROUP_NAME,
} from "@/lib/accounts/coa-add-ledger-policy";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import {
  loadLedgerMeta,
  saveLedgerMeta,
  type LedgerExtendedMeta,
} from "@/lib/accounts/ledger-metadata";

export { isSundryCreditorsGroup, SUNDRY_CREDITORS_GROUP_NAME };

const STORAGE_KEY = "ds_accounts_vendor_ledgers_v1";

export interface AccountsVendorLedgerRecord {
  /** Stable Accounts-local id (not a Supplier Master id). */
  id: number;
  ledgerId: number;
  vendor: Vendor;
  createdAt: string;
  updatedAt: string;
}

function readAll(): AccountsVendorLedgerRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AccountsVendorLedgerRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: AccountsVendorLedgerRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function loadAccountsVendorLedgers(): AccountsVendorLedgerRecord[] {
  return readAll();
}

export function getAccountsVendorByLedgerId(
  ledgerId: number,
): AccountsVendorLedgerRecord | undefined {
  return readAll().find((r) => r.ledgerId === ledgerId);
}

export function nextAccountsVendorId(list: AccountsVendorLedgerRecord[]): number {
  return Math.max(0, ...list.map((r) => r.id), ...list.map((r) => r.vendor.id)) + 1;
}

export function findSundryCreditorsGroup(
  records: ChartOfAccount[],
): ChartOfAccount | undefined {
  return records.find(
    (r) => r.nodeLevel === "account_group" && isSundryCreditorsGroup(r, records),
  );
}

function getPrimaryContact(v: Vendor): VendorContact | undefined {
  return v.contacts?.[0];
}

function vendorAddress(v: Vendor): string {
  const addr = v.billingAddress;
  return [addr?.line1, addr?.line2, addr?.city, addr?.state, addr?.pincode]
    .filter(Boolean)
    .join(", ");
}

/**
 * COA ledger uses supplier name only; profile keeps primary contact only.
 * Additional contacts stay on the form for reference but are not persisted to Accounts.
 */
export function vendorForAccountsLedger(vendor: Vendor): Vendor {
  const primary = getPrimaryContact(vendor);
  const contacts = primary ? [{ ...primary }] : [];

  return {
    ...vendor,
    vendorName: vendor.vendorName.trim(),
    contacts,
    contactPerson: primary?.name?.trim() || vendor.contactPerson?.trim() || "",
    mobileCountryCode: primary?.countryCode || vendor.mobileCountryCode || "+91",
    mobile: primary?.mobile?.trim() || vendor.mobile?.trim() || "",
    email: primary?.email?.trim() || vendor.email?.trim() || "",
  };
}

function applyAccountsVendorMeta(ledgerId: number, v: Vendor) {
  const address = vendorAddress(v);
  const meta: LedgerExtendedMeta = {
    ...loadLedgerMeta(ledgerId),
    ledgerType: "Vendor",
    vendorCode: v.vendorCode,
    customerCode: "",
    gstin: v.gstApplicable ? v.gstNumber : "",
    pan: v.panNumber ?? "",
    creditDays: v.creditPeriodValue != null ? String(v.creditPeriodValue) : "",
    billingAddress: address,
    shippingAddress: address,
    contactPerson: v.contactPerson ?? "",
    mobile: v.mobile ? `${v.mobileCountryCode ?? ""} ${v.mobile}`.trim() : "",
    email: v.email ?? "",
    paymentTerms: v.paymentTerms ?? "",
    address,
    gstApplicableMeta: v.gstApplicable,
    tdsApplicableMeta: v.tdsApplicable,
  };
  saveLedgerMeta(ledgerId, meta);
}

export function generateAccountsVendorCode(vendorType: string): string {
  const existing = readAll().map((r) => r.vendor);
  return generateVendorCodeForType(vendorType, existing);
}

export interface CreateAccountsVendorLedgerResult {
  ledger: ChartOfAccount;
  record: AccountsVendorLedgerRecord;
}

/**
 * Persist a vendor ledger under Sundry Creditors from an already-built Vendor record.
 * Writes only Accounts COA + Accounts vendor storage — never Supplier Master.
 */
export function createAccountsVendorLedger(
  vendor: Vendor,
  parentGroupId?: number | null,
): CreateAccountsVendorLedgerResult {
  const records = loadChartOfAccounts();
  const parent =
    (parentGroupId != null
      ? records.find((r) => r.id === parentGroupId)
      : undefined) ?? findSundryCreditorsGroup(records);

  if (!parent || parent.nodeLevel !== "account_group") {
    throw new Error("Sundry Creditors group was not found in Chart of Accounts.");
  }
  if (!isSundryCreditorsGroup(parent, records)) {
    throw new Error("Parent group must be Sundry Creditors.");
  }

  const list = readAll();
  const localId = vendor.id > 0 ? vendor.id : nextAccountsVendorId(list);
  const vendorRecord: Vendor = vendorForAccountsLedger({
    ...vendor,
    id: localId,
  });

  const name = vendorRecord.vendorName.trim();
  if (!name) {
    throw new Error("Supplier name is required.");
  }

  const dup = records.find(
    (r) =>
      r.nodeLevel === "ledger" &&
      r.parentAccountId === parent.id &&
      r.accountName.toLowerCase() === name.toLowerCase(),
  );
  if (dup) {
    throw new Error("A ledger with this name already exists under Sundry Creditors.");
  }

  const ledgerId = nextId(records);
  const ledger: ChartOfAccount = {
    id: ledgerId,
    accountCode: generateLedgerCode(records),
    accountName: name,
    alias: "",
    accountType: parent.accountType,
    nodeLevel: "ledger",
    parentAccountId: parent.id,
    parentAccount: parent.accountName,
    description: "",
    status: vendorRecord.status === "active" ? "active" : "inactive",
    usedIn: ["procurement"],
    isSystem: false,
    openingBalance: 0,
    balanceType: "Credit",
    gstApplicable: vendorRecord.gstApplicable,
    tdsApplicable: vendorRecord.tdsApplicable,
    costCenterApplicable: false,
    billWiseAccounting: true,
    bankAccountFlag: false,
    ledgerKind: "MASTER",
    masterType: "vendor",
    masterId: vendorRecord.id,
    isSystemGenerated: false,
    erpSourceModule: "vendor_master",
    erpSourceId: vendorRecord.id,
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
  };

  saveChartOfAccounts([...records, ledger]);
  dispatchAccountsDataChanged("ledgers", {
    operation: "create",
    recordId: ledger.id,
  });
  applyAccountsVendorMeta(ledgerId, vendorRecord);

  const now = new Date().toISOString();
  const record: AccountsVendorLedgerRecord = {
    id: localId,
    ledgerId,
    vendor: vendorRecord,
    createdAt: now,
    updatedAt: now,
  };
  writeAll([...list, record]);

  return { ledger, record };
}

export { todayStr };
