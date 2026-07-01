/**
 * COA ↔ ERP master reference resolution.
 * Single source of truth: masters own profile data; COA owns accounting balances only.
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  loadChartOfAccounts,
  saveChartOfAccounts,
} from "@/app/(app)/accounts/data";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { resolveLedgerType } from "@/lib/accounts/ledger-detail-utils";
import {
  findErpPartyLink,
  findErpPartyLinkByLedgerId,
  upsertErpPartyLink,
  type ErpSourceModule,
} from "@/lib/accounts/erp-party-links";
import { formatBankAccountMaster } from "@/lib/accounts/bank-account-display";
import { loadBankAccountMasters } from "@/lib/accounts/bank-accounts-data";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { loadVendors } from "@/app/(app)/masters/vendors/vendor-data";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import { loadHrEmployees } from "@/app/(app)/hr/employees/employee-master-data";
import { ensureAssetRegisterFromCoa, findAssetByLedgerId } from "@/lib/accounts/asset-register-data";

export type CoaMasterLinkCategory =
  | "bank"
  | "customer"
  | "vendor"
  | "employee"
  | "inventory"
  | "fixed_asset";

export interface CoaMasterLink {
  category: CoaMasterLinkCategory;
  categoryLabel: string;
  sourceModule: ErpSourceModule;
  sourceId: number;
  sourceName: string;
  sourceCode: string;
  masterHref: string;
  masterListHref: string;
  isMasterOwned: boolean;
}

const CATEGORY_LABELS: Record<CoaMasterLinkCategory, string> = {
  bank: "Bank Accounts",
  customer: "Trade Receivables / Sundry Debtors",
  vendor: "Trade Payables / Sundry Creditors",
  employee: "Employee Related Ledgers",
  inventory: "Inventory Ledgers",
  fixed_asset: "Fixed Asset Ledgers",
};

const LIST_HREFS: Record<CoaMasterLinkCategory, string> = {
  bank: "/accounts/banking/bank-accounts",
  customer: "/masters/customers",
  vendor: "/masters/vendors",
  employee: "/hr/employees",
  inventory: "/masters/products",
  fixed_asset: "/assets/register",
};

function pathText(records: ChartOfAccount[], ledger: ChartOfAccount): string {
  return getAncestorPath(records, ledger.id)
    .map((p) => p.accountName.toLowerCase())
    .join(" ");
}

function inferCategory(
  ledger: ChartOfAccount,
  records: ChartOfAccount[],
): CoaMasterLinkCategory | null {
  const path = pathText(records, ledger);
  const type = resolveLedgerType(ledger, records);

  if (ledger.bankAccountFlag || type === "Bank") return "bank";
  if (type === "Customer" || path.includes("trade receivables") || path.includes("sundry debtors")) {
    return "customer";
  }
  if (type === "Vendor" || path.includes("trade payables") || path.includes("sundry creditors")) {
    return "vendor";
  }
  if (
    type === "Employee Payable" ||
    path.includes("salaries & wages") ||
    path.includes("employee costs") ||
    path.includes("expenses payable") ||
    path.includes("staff advance")
  ) {
    return "employee";
  }
  if (path.includes("inventory") || path.includes("stock-in-hand") || path.includes("stock in hand")) {
    return "inventory";
  }
  if (type === "Fixed Asset" || path.includes("fixed assets") || path.includes("plant & machinery") || path.includes("vehicles")) {
    return "fixed_asset";
  }
  return null;
}

function matchCustomerByLedgerName(name: string) {
  const q = name.trim().toLowerCase();
  return loadCustomers().find((c) => c.customerName.trim().toLowerCase() === q);
}

function matchVendorByLedgerName(name: string) {
  const q = name.trim().toLowerCase();
  return loadVendors().find((v) => v.vendorName.trim().toLowerCase() === q);
}

function matchEmployeeByLedgerName(name: string) {
  const q = name.trim().toLowerCase();
  return loadHrEmployees().find((e) => e.employeeName.trim().toLowerCase() === q);
}

function normalizeInventoryLedgerName(name: string): string {
  return name
    .replace(/\s+stock$/i, "")
    .replace(/\s+inventory$/i, "")
    .trim();
}

function matchProductForInventoryLedger(name: string) {
  const products = loadProducts().filter((p) => p.status === "active");
  const normalized = normalizeInventoryLedgerName(name).toLowerCase();
  const exact = products.find((p) => p.productName.toLowerCase() === normalized);
  if (exact) return exact;
  return products.find(
    (p) =>
      normalized.includes(p.productName.toLowerCase()) ||
      p.productName.toLowerCase().includes(normalized),
  );
}

function buildLink(
  category: CoaMasterLinkCategory,
  sourceModule: ErpSourceModule,
  sourceId: number,
  sourceName: string,
  sourceCode: string,
  masterHref: string,
): CoaMasterLink {
  return {
    category,
    categoryLabel: CATEGORY_LABELS[category],
    sourceModule,
    sourceId,
    sourceName,
    sourceCode,
    masterHref,
    masterListHref: LIST_HREFS[category],
    isMasterOwned: true,
  };
}

/** Resolve master link for a COA ledger (null = manual / general ledger). */
export function resolveCoaMasterLink(
  ledger: ChartOfAccount,
  records?: ChartOfAccount[],
): CoaMasterLink | null {
  if (ledger.nodeLevel !== "ledger") return null;

  const coa = records ?? loadChartOfAccounts();

  const partyLink = findErpPartyLinkByLedgerId(ledger.id);
  if (partyLink) {
    const category = moduleToCategory(partyLink.erpSourceModule);
    if (category) {
      return buildLink(
        category,
        partyLink.erpSourceModule,
        partyLink.erpSourceId,
        partyLink.partyName,
        partyLink.partyCode,
        hrefForModule(partyLink.erpSourceModule, partyLink.erpSourceId, ledger.id),
      );
    }
  }

  if (ledger.erpSourceModule && ledger.erpSourceId) {
    const category = moduleToCategory(ledger.erpSourceModule as ErpSourceModule);
    if (category) {
      return buildLink(
        category,
        ledger.erpSourceModule as ErpSourceModule,
        ledger.erpSourceId,
        ledger.accountName,
        "",
        hrefForModule(ledger.erpSourceModule as ErpSourceModule, ledger.erpSourceId, ledger.id),
      );
    }
  }

  const category = inferCategory(ledger, coa);
  if (!category) return null;

  if (category === "bank") {
    const bank = loadBankAccountMasters().find((b) => b.coaLedgerId === ledger.id);
    if (bank) {
      return buildLink(
        "bank",
        "bank_master",
        bank.id,
        formatBankAccountMaster(bank),
        bank.accountNumber,
        `/accounts/banking/bank-accounts/${bank.id}`,
      );
    }
    return null;
  }

  if (category === "customer") {
    const customer = matchCustomerByLedgerName(ledger.accountName);
    if (customer) {
      return buildLink(
        "customer",
        "customer_master",
        customer.id,
        customer.customerName,
        customer.customerCode,
        `/masters/customers/${customer.id}`,
      );
    }
  }

  if (category === "vendor") {
    const vendor = matchVendorByLedgerName(ledger.accountName);
    if (vendor) {
      return buildLink(
        "vendor",
        "vendor_master",
        vendor.id,
        vendor.vendorName,
        vendor.vendorCode,
        `/masters/vendors/${vendor.id}`,
      );
    }
  }

  if (category === "employee") {
    const employee = matchEmployeeByLedgerName(ledger.accountName);
    if (employee) {
      return buildLink(
        "employee",
        "employee_master",
        employee.id,
        employee.employeeName,
        employee.employeeCode,
        `/hr/employees/${employee.id}`,
      );
    }
  }

  if (category === "inventory") {
    const product = matchProductForInventoryLedger(ledger.accountName);
    if (product) {
      return buildLink(
        "inventory",
        "product_master",
        product.id,
        product.productName,
        product.sku,
        `/masters/products/${product.id}`,
      );
    }
  }

  if (category === "fixed_asset") {
    ensureAssetRegisterFromCoa();
    const asset = findAssetByLedgerId(ledger.id);
    if (asset) {
      return buildLink(
        "fixed_asset",
        "fixed_asset_master",
        asset.id,
        asset.assetName,
        asset.assetCode,
        `/assets/register/${asset.id}`,
      );
    }
  }

  return null;
}

function moduleToCategory(module: ErpSourceModule): CoaMasterLinkCategory | null {
  switch (module) {
    case "bank_master":
      return "bank";
    case "customer_master":
      return "customer";
    case "vendor_master":
      return "vendor";
    case "employee_master":
      return "employee";
    case "product_master":
      return "inventory";
    case "fixed_asset_master":
      return "fixed_asset";
    default:
      return null;
  }
}

function hrefForModule(module: ErpSourceModule, sourceId: number, ledgerId: number): string {
  switch (module) {
    case "bank_master":
      return `/accounts/banking/bank-accounts/${sourceId}`;
    case "customer_master":
      return `/masters/customers/${sourceId}`;
    case "vendor_master":
      return `/masters/vendors/${sourceId}`;
    case "employee_master":
      return `/hr/employees/${sourceId}`;
    case "product_master":
      return `/masters/products/${sourceId}`;
    case "fixed_asset_master":
      return `/assets/register/${sourceId}`;
    default:
      return `/accounts/masters/chart-of-accounts?node=${ledgerId}`;
  }
}

export function isMasterLinkedLedger(
  ledger: ChartOfAccount,
  records?: ChartOfAccount[],
): boolean {
  return resolveCoaMasterLink(ledger, records) != null;
}

export function coaHrefForLedger(ledgerId: number): string {
  return `/accounts/masters/chart-of-accounts?node=${ledgerId}`;
}

export function ledgerDetailHref(ledgerId: number): string {
  return `/accounts/masters/ledgers/${ledgerId}`;
}

/** Backfill party links + COA source refs for existing ledgers (non-destructive). */
export function backfillCoaMasterLinks(): void {
  if (typeof window === "undefined") return;

  const records = loadChartOfAccounts();
  let changed = false;

  const patchLedger = (ledgerId: number, patch: Partial<ChartOfAccount>) => {
    const idx = records.findIndex((r) => r.id === ledgerId);
    if (idx < 0) return;
    records[idx] = { ...records[idx], ...patch };
    changed = true;
  };

  for (const bank of loadBankAccountMasters()) {
    upsertErpPartyLink({
      ledgerId: bank.coaLedgerId,
      erpSourceModule: "bank_master",
      erpSourceId: bank.id,
      partyCode: bank.accountNumber || `BANK-${bank.id}`,
      partyName: formatBankAccountMaster(bank),
    });
    patchLedger(bank.coaLedgerId, {
      isSystemGenerated: true,
      erpSourceModule: "bank_master",
      erpSourceId: bank.id,
    });
  }

  for (const customer of loadCustomers()) {
    if (customer.status !== "active") continue;
    const link = findErpPartyLink("customer_master", customer.id);
    if (link) {
      patchLedger(link.ledgerId, {
        isSystemGenerated: true,
        erpSourceModule: "customer_master",
        erpSourceId: customer.id,
      });
    }
  }

  for (const vendor of loadVendors()) {
    if (vendor.status !== "active") continue;
    const link = findErpPartyLink("vendor_master", vendor.id);
    if (link) {
      patchLedger(link.ledgerId, {
        isSystemGenerated: true,
        erpSourceModule: "vendor_master",
        erpSourceId: vendor.id,
      });
    }
  }

  for (const ledger of records.filter((r) => r.nodeLevel === "ledger")) {
    const link = resolveCoaMasterLink(ledger, records);
    if (!link || findErpPartyLinkByLedgerId(ledger.id)) continue;

    upsertErpPartyLink({
      ledgerId: ledger.id,
      erpSourceModule: link.sourceModule,
      erpSourceId: link.sourceId,
      partyCode: link.sourceCode || String(link.sourceId),
      partyName: link.sourceName,
    });
    patchLedger(ledger.id, {
      isSystemGenerated: true,
      erpSourceModule: link.sourceModule,
      erpSourceId: link.sourceId,
    });
  }

  if (changed) saveChartOfAccounts(records);
}
