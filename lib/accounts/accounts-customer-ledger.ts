/**
 * Accounts-only customer ledger profiles.
 * Created from COA → Sundry Debtors → Add Ledger using the Customer Master form UI.
 * Never reads/writes ERP Customer Master storage (`ds_customers_*`).
 */

import type { Customer } from "@/app/(app)/masters/customers/customer-data";
import {
  generateCustomerCodeForType,
  todayStr,
} from "@/app/(app)/masters/customers/customer-data";
import {
  loadChartOfAccounts,
  nextId,
  saveChartOfAccounts,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import { generateLedgerCode } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import {
  isSundryDebtorsGroup,
  SUNDRY_DEBTORS_GROUP_NAME,
} from "@/lib/accounts/coa-add-ledger-policy";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import {
  loadLedgerMeta,
  saveLedgerMeta,
  type LedgerExtendedMeta,
} from "@/lib/accounts/ledger-metadata";

export { isSundryDebtorsGroup, SUNDRY_DEBTORS_GROUP_NAME };

const STORAGE_KEY = "ds_accounts_customer_ledgers_v1";

export interface AccountsCustomerLedgerRecord {
  /** Stable Accounts-local id (not a Customer Master id). */
  id: number;
  ledgerId: number;
  customer: Customer;
  createdAt: string;
  updatedAt: string;
}

function readAll(): AccountsCustomerLedgerRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AccountsCustomerLedgerRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: AccountsCustomerLedgerRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function loadAccountsCustomerLedgers(): AccountsCustomerLedgerRecord[] {
  return readAll();
}

export function getAccountsCustomerByLedgerId(
  ledgerId: number,
): AccountsCustomerLedgerRecord | undefined {
  return readAll().find((r) => r.ledgerId === ledgerId);
}

export function nextAccountsCustomerId(list: AccountsCustomerLedgerRecord[]): number {
  return Math.max(0, ...list.map((r) => r.id), ...list.map((r) => r.customer.id)) + 1;
}

export function findSundryDebtorsGroup(
  records: ChartOfAccount[],
): ChartOfAccount | undefined {
  return records.find(
    (r) => r.nodeLevel === "account_group" && isSundryDebtorsGroup(r, records),
  );
}

function creditDaysFromTerms(terms: string): string {
  const m = terms.match(/(\d+)/);
  return m ? m[1] : "30";
}

function getMainBranch(c: Customer) {
  return (
    c.branches?.find((b) => b.isMain) ??
    c.branches?.find((b) => b.branchName === "Main Branch") ??
    c.branches?.[0]
  );
}

/**
 * COA ledger uses customer name only; profile keeps main branch data only.
 * Additional branches stay on the form for reference but are not persisted to Accounts.
 */
export function customerForAccountsLedger(customer: Customer): Customer {
  const mainBranch = getMainBranch(customer);
  const branches = mainBranch ? [{ ...mainBranch, isMain: true }] : [];

  return {
    ...customer,
    customerName: customer.customerName.trim(),
    branches,
    salesManId:
      mainBranch?.salesManId != null
        ? Number(mainBranch.salesManId)
        : customer.salesManId,
    salesManName: mainBranch?.salesManName ?? customer.salesManName ?? "",
    address: mainBranch?.billingAddress?.address?.trim() || customer.address || "",
    stateName: mainBranch?.billingAddress?.state?.trim() || customer.stateName || "",
    districtName:
      mainBranch?.billingAddress?.district?.trim() ||
      mainBranch?.billingAddress?.city?.trim() ||
      customer.districtName ||
      "",
    pincode: mainBranch?.billingAddress?.pincode?.trim() || customer.pincode || "",
  };
}

function customerAddress(c: Customer): string {
  return [c.address, c.districtName, c.stateName, c.pincode].filter(Boolean).join(", ");
}

function customerShipping(c: Customer): string {
  const main = getMainBranch(c);
  if (!main) return customerAddress(c);
  const s = main.shippingAddress;
  return [s.address, s.city, s.state, s.pincode].filter(Boolean).join(", ");
}

function applyAccountsCustomerMeta(ledgerId: number, c: Customer) {
  const meta: LedgerExtendedMeta = {
    ...loadLedgerMeta(ledgerId),
    ledgerType: "Customer",
    customerCode: c.customerCode,
    vendorCode: "",
    gstin: c.gstApplicable ? c.gstin : "",
    pan: c.pan ?? "",
    creditLimit: c.creditLimit != null ? String(c.creditLimit) : "",
    creditDays: creditDaysFromTerms(c.paymentTerms ?? ""),
    billingAddress: customerAddress(c),
    shippingAddress: customerShipping(c),
    contactPerson: c.salesManName ?? "",
    mobile: c.mobile ? `${c.countryCode ?? ""} ${c.mobile}`.trim() : "",
    email: c.email ?? "",
    paymentTerms: c.paymentTerms ?? "",
    address: customerAddress(c),
    gstApplicableMeta: c.gstApplicable,
    tdsApplicableMeta: c.tdsApplicable,
  };
  saveLedgerMeta(ledgerId, meta);
}

export function generateAccountsCustomerCode(customerType: string): string {
  const existing = readAll().map((r) => r.customer);
  return generateCustomerCodeForType(customerType, existing);
}

export interface CreateAccountsCustomerLedgerResult {
  ledger: ChartOfAccount;
  record: AccountsCustomerLedgerRecord;
}

/**
 * Persist a customer ledger under Sundry Debtors from an already-built Customer record.
 * Writes only Accounts COA + Accounts customer storage — never Customer Master.
 */
export function createAccountsCustomerLedger(
  customer: Customer,
  parentGroupId?: number | null,
): CreateAccountsCustomerLedgerResult {
  const records = loadChartOfAccounts();
  const parent =
    (parentGroupId != null
      ? records.find((r) => r.id === parentGroupId)
      : undefined) ?? findSundryDebtorsGroup(records);

  if (!parent || parent.nodeLevel !== "account_group") {
    throw new Error("Sundry Debtors group was not found in Chart of Accounts.");
  }
  if (!isSundryDebtorsGroup(parent, records)) {
    throw new Error("Parent group must be Trade Receivables / Sundry Debtors.");
  }

  const list = readAll();
  const localId = customer.id > 0 ? customer.id : nextAccountsCustomerId(list);
  const customerRecord: Customer = customerForAccountsLedger({
    ...customer,
    id: localId,
  });

  const name = customerRecord.customerName.trim();
  if (!name) {
    throw new Error("Customer name is required.");
  }

  const dup = records.find(
    (r) =>
      r.nodeLevel === "ledger" &&
      r.parentAccountId === parent.id &&
      r.accountName.toLowerCase() === name.toLowerCase(),
  );
  if (dup) {
    throw new Error("A ledger with this name already exists under Sundry Debtors.");
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
    status: customerRecord.status === "active" ? "active" : "inactive",
    usedIn: ["sales"],
    isSystem: false,
    openingBalance: 0,
    balanceType: "Debit",
    gstApplicable: customerRecord.gstApplicable,
    tdsApplicable: customerRecord.tdsApplicable,
    costCenterApplicable: false,
    bankAccountFlag: false,
    isSystemGenerated: false,
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
  };

  saveChartOfAccounts([...records, ledger]);
  applyAccountsCustomerMeta(ledgerId, customerRecord);

  const now = new Date().toISOString();
  const record: AccountsCustomerLedgerRecord = {
    id: localId,
    ledgerId,
    customer: customerRecord,
    createdAt: now,
    updatedAt: now,
  };
  writeAll([...list, record]);

  return { ledger, record };
}

/** @deprecated Use createAccountsCustomerLedger */
export function createAccountsCustomerLedgerFromForm(
  customer: Customer,
  _customerCode: string,
  parentGroupId?: number | null,
): CreateAccountsCustomerLedgerResult {
  return createAccountsCustomerLedger(customer, parentGroupId);
}

export { todayStr };
