/**
 * Dashboard mock data — operational command center only.
 * Swap getDashboardData(filters) for API later.
 */

import {
  COMPONENT_PERIOD_OPTIONS,
  formatDisplayDate,
  periodActivityScale,
  resolvePeriodRange,
  scaleCount,
  toIsoDate,
  DEMO_TODAY,
  type PeriodPreset,
} from "@/components/dashboard/dashboard-period";

export type { PeriodPreset };
export { COMPONENT_PERIOD_OPTIONS, formatDisplayDate, periodActivityScale, scaleCount };

export type DashboardTabId =
  | "overview"
  | "sales"
  | "procurement"
  | "warehouse"
  | "returns"
  | "accounts"
  | "banking";

export type DashboardRole = "admin" | "sales" | "procurement" | "warehouse" | "accounts";

export interface DashboardFiltersState {
  warehouseId: string;
  warehouse: string;
}

export interface DashboardFilterOptions {
  warehouses: string[];
}

export type KpiAccent =
  | "brand"
  | "navy"
  | "amber"
  | "leaf"
  | "sky"
  | "rose"
  | "violet"
  | "teal";

export interface SummaryKpi {
  id: string;
  label: string;
  value: number | string;
  accent: KpiAccent;
  /** For Overview: which tab to open. For module: workspace filter key */
  targetTab?: DashboardTabId;
  filterKey?: string;
}

export interface LatestDocRow {
  id: string;
  docNo: string;
  party: string;
  amount: string;
  status: string;
  date: string;
}

export interface DocumentTypeSection {
  id: string;
  module: Exclude<DashboardTabId, "overview">;
  title: string;
  stages: { id: string; label: string; count: number; actionHint: string }[];
  latestTitle: string;
  latestRows: LatestDocRow[];
  actionHint: string;
}

export interface PendingModuleCard {
  id: Exclude<DashboardTabId, "overview">;
  title: string;
  pending: number;
  accent: KpiAccent;
  hint: string;
}

export interface CriticalException {
  id: string;
  label: string;
  count: number;
  severity: "critical" | "warning" | "info";
  targetTab: DashboardTabId;
  hint: string;
}

export interface WorkspaceRow {
  id: string;
  type: string;
  docNo: string;
  party: string;
  warehouse: string;
  owner: string;
  amount: string;
  amountNumeric: number;
  status: string;
  date: string;
  daysPending: number;
  reason: string;
}

export interface DashboardData {
  filterOptions: DashboardFilterOptions;
  defaultFilters: DashboardFiltersState;
  overviewSummary: SummaryKpi[];
  pendingByModule: PendingModuleCard[];
  criticalExceptions: CriticalException[];
  /** Kept for Sales Orders Workspace mock rows */
  documentSections: DocumentTypeSection[];
  moduleSummaries: Record<Exclude<DashboardTabId, "overview">, SummaryKpi[]>;
  workspaces: Record<Exclude<DashboardTabId, "overview">, WorkspaceRow[]>;
}

export const DASHBOARD_TABS: { id: DashboardTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "sales", label: "Sales" },
  { id: "procurement", label: "Procurement" },
  { id: "warehouse", label: "Warehouse" },
  { id: "returns", label: "Returns" },
  { id: "accounts", label: "Accounts" },
  { id: "banking", label: "Banking" },
];

export const DASHBOARD_ROLES: { id: DashboardRole; label: string }[] = [
  { id: "admin", label: "Admin" },
  { id: "sales", label: "Sales" },
  { id: "procurement", label: "Procurement" },
  { id: "warehouse", label: "Warehouse" },
  { id: "accounts", label: "Accounts" },
];

export const ROLE_DEFAULT_TAB: Record<DashboardRole, DashboardTabId> = {
  admin: "overview",
  sales: "sales",
  procurement: "procurement",
  warehouse: "warehouse",
  accounts: "accounts",
};

export const ROLE_VISIBLE_TABS: Record<DashboardRole, DashboardTabId[]> = {
  admin: ["overview", "sales", "procurement", "warehouse", "returns", "accounts", "banking"],
  sales: ["overview", "sales", "returns", "accounts"],
  procurement: ["overview", "procurement", "returns", "warehouse"],
  warehouse: ["overview", "warehouse", "returns", "procurement"],
  accounts: ["overview", "accounts", "banking", "sales", "returns"],
};

const WAREHOUSES = ["All Warehouses", "Nashik WH", "Pune WH", "Nagpur WH", "Akola WH"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 2147483647;
  return h;
}

function fmtINR(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`.replace(".0Cr", "Cr");
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`.replace(".0L", "L");
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function docDate(offset: number) {
  const d = new Date(DEMO_TODAY);
  d.setDate(d.getDate() - offset);
  return `${String(d.getDate()).padStart(2, "0")} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]}`;
}

function buildSalesSections(): DocumentTypeSection[] {
  const soStatuses = ["Confirmed", "Pending", "Dispatched", "Confirmed", "Draft"];
  const stStatuses = ["In Transit", "Pending Dispatch", "Pending Receipt", "Completed", "Pending Dispatch"];
  const smStatuses = ["Pending Approval", "Pending Dispatch", "Dispatched", "Approved", "Draft"];
  const srStatuses = ["Pending", "Approved", "CN Pending", "Closed", "Pending"];
  const parties = ["Agro World Pvt Ltd", "Distributor Sample", "Deepak Traders", "Green Field Agro", "Krishi Mart"];
  const stParties = ["Nashik → Pune", "Pune → Nagpur", "Nagpur → Akola", "Nashik → Nagpur", "Pune → Akola"];
  const smParties = ["Field Demo — Ramesh", "Farmer Meet — Pune", "Intern Kit — Nashik", "ASM Sample — Akola", "FMO Demo — Nagpur"];

  const mk = (
    id: string,
    module: DocumentTypeSection["module"],
    title: string,
    prefix: string,
    partyList: string[],
    statuses: string[],
    amounts: string[],
  ): DocumentTypeSection => ({
    id,
    module,
    title,
    stages: [],
    latestTitle: title,
    actionHint: "",
    latestRows: partyList.map((party, i) => ({
      id: `${id}-${i}`,
      docNo: `${prefix}-${2400 + i}`,
      party,
      amount: amounts[i],
      status: statuses[i],
      date: docDate(i + 1),
    })),
  });

  return [
    mk("sales-orders", "sales", "Sales Orders", "SO", parties, soStatuses, ["₹1.2L", "₹84,000", "₹2.1L", "₹56,000", "₹1.5L"]),
    mk("stock-transfers", "sales", "Stock Transfers", "ST", stParties, stStatuses, ["120 bags", "80 bags", "200 bags", "40 bags", "150 bags"]),
    mk("sample-orders", "sales", "Sample Orders", "SMO", smParties, smStatuses, ["₹0", "₹0", "₹0", "₹0", "₹0"]),
    mk("sales-returns", "returns", "Sales Returns", "SR", parties, srStatuses, ["₹18,000", "₹42,000", "₹9,500", "₹0", "₹27,000"]),
  ];
}

function buildWorkspace(
  module: Exclude<DashboardTabId, "overview">,
  warehouse: string,
  scale: number,
): WorkspaceRow[] {
  const configs: Record<
    Exclude<DashboardTabId, "overview">,
    { types: string[]; parties: string[]; statuses: string[]; prefix: string }
  > = {
    sales: {
      types: ["Sales Order", "Sample Order", "Sales Return"],
      parties: ["Agro World Pvt Ltd", "Deepak Traders", "Green Field Agro", "Krishi Mart"],
      statuses: ["Pending Approval", "Pending Dispatch", "Pending Invoice", "Completed"],
      prefix: "SO",
    },
    procurement: {
      types: ["Purchase Order", "Purchase Indent", "GRN Link"],
      parties: ["SeedCorp India", "NutriChem Ltd", "Agro Inputs Co", "PackWell"],
      statuses: ["Pending Approval", "Approved", "Partial Receipt", "Closed"],
      prefix: "PO",
    },
    warehouse: {
      types: ["Stock", "GRN", "QC", "Dispatch", "Transfer"],
      parties: ["Nashik WH", "Pune WH", "Batch A-12", "SKU-UREA-45"],
      statuses: ["Low Stock", "Pending GRN", "Pending QC", "Ready Dispatch", "In Transit"],
      prefix: "WH",
    },
    returns: {
      types: ["Sales Return", "Purchase Return"],
      parties: ["Agro World Pvt Ltd", "SeedCorp India", "Deepak Traders"],
      statuses: ["Pending Approval", "CN Pending", "DN Pending", "Approved"],
      prefix: "RT",
    },
    accounts: {
      types: ["Payment", "Receipt", "Journal", "Credit Note"],
      parties: ["Agro World Pvt Ltd", "SeedCorp India", "GST Portal", "Bank HDFC"],
      statuses: ["Draft", "Pending Posting", "GST Pending", "Posted"],
      prefix: "AC",
    },
    banking: {
      types: ["Bank Entry", "Cheque", "Reconciliation"],
      parties: ["HDFC-OPS", "ICICI-COL", "Cash Counter"],
      statuses: ["Unreconciled", "Cleared", "Cheque Issued", "Pending Deposit"],
      prefix: "BK",
    },
  };

  const cfg = configs[module];
  const rows: WorkspaceRow[] = [];
  for (let i = 0; i < 12; i++) {
    const h = hash(`${module}-${warehouse}-${i}`);
    const type = cfg.types[h % cfg.types.length];
    const party = cfg.parties[h % cfg.parties.length];
    const status = cfg.statuses[h % cfg.statuses.length];
    const amt = scaleCount(25000 + (h % 40) * 3500, scale);
    const days = status.includes("Completed") || status.includes("Cleared") || status.includes("Posted") || status.includes("Closed")
      ? 0
      : 1 + (h % 14);
    const reasons = ["Awaiting Approval", "Credit Hold", "Stock Shortage", "Document Pending", "Vehicle Pending", "—"];
    rows.push({
      id: `${module}-${i}`,
      type,
      docNo: `${cfg.prefix}-${3100 + i}`,
      party,
      warehouse: warehouse === "All Warehouses" ? WAREHOUSES[1 + (h % 4)] : warehouse,
      owner: ["Ramesh Patil", "Suresh Kulkarni", "Accounts Desk", "WH Supervisor"][h % 4],
      amount: module === "warehouse" && type === "Stock" ? `${20 + (h % 80)} units` : fmtINR(amt),
      amountNumeric: amt,
      status,
      date: docDate(i % 10),
      daysPending: days,
      reason: days === 0 ? "—" : reasons[h % reasons.length],
    });
  }
  return rows;
}

export function getDashboardData(filters?: Partial<DashboardFiltersState>): DashboardData {
  const warehouseId = filters?.warehouseId ?? "All Warehouses";
  const warehouse = filters?.warehouse ?? warehouseId;
  const range = resolvePeriodRange("this_month");
  const scale = periodActivityScale(range.fromDate, range.toDate);
  const whFactor = warehouseId === "All Warehouses" ? 1 : 0.55;

  const sc = (n: number) => scaleCount(n * whFactor, scale);

  const overviewSummary: SummaryKpi[] = [
    { id: "open_so", label: "Open Sales Orders", value: sc(48), accent: "brand", targetTab: "sales", filterKey: "open" },
    { id: "pending_po", label: "Pending Purchase Orders", value: sc(22), accent: "navy", targetTab: "procurement", filterKey: "pending" },
    { id: "pending_grn", label: "Pending GRN", value: sc(14), accent: "amber", targetTab: "warehouse", filterKey: "grn" },
    { id: "pending_qc", label: "Pending QC", value: sc(9), accent: "violet", targetTab: "warehouse", filterKey: "qc" },
    { id: "pending_dispatch", label: "Pending Dispatch", value: sc(17), accent: "sky", targetTab: "warehouse", filterKey: "dispatch" },
    { id: "cust_os", label: "Customer Outstanding", value: fmtINR(sc(2_40_00_000)), accent: "rose", targetTab: "accounts", filterKey: "receivable" },
    { id: "vend_os", label: "Vendor Outstanding", value: fmtINR(sc(1_10_00_000)), accent: "teal", targetTab: "accounts", filterKey: "payable" },
    { id: "bank_bal", label: "Bank Balance", value: fmtINR(sc(3_85_00_000)), accent: "leaf", targetTab: "banking", filterKey: "balance" },
  ];

  const pendingByModule: PendingModuleCard[] = [
    { id: "sales", title: "Sales", pending: sc(41), accent: "brand", hint: "Orders awaiting approval / dispatch / invoice" },
    { id: "procurement", title: "Procurement", pending: sc(19), accent: "navy", hint: "POs and receipts needing action" },
    { id: "warehouse", title: "Warehouse", pending: sc(28), accent: "amber", hint: "GRN, QC, packing, dispatch queues" },
    { id: "returns", title: "Returns", pending: sc(11), accent: "rose", hint: "Sales & purchase returns pending" },
    { id: "accounts", title: "Accounts", pending: sc(16), accent: "violet", hint: "Vouchers, GST, settlement pending" },
    { id: "banking", title: "Banking", pending: sc(8), accent: "teal", hint: "Reconciliation & cheque queues" },
  ];

  const criticalExceptions: CriticalException[] = [
    { id: "credit_hold", label: "Credit Hold", count: sc(6), severity: "critical", targetTab: "sales", hint: "Orders blocked on credit" },
    { id: "low_stock", label: "Low Stock", count: sc(12), severity: "warning", targetTab: "warehouse", hint: "SKUs below reorder level" },
    { id: "near_expiry", label: "Near Expiry", count: sc(7), severity: "warning", targetTab: "warehouse", hint: "Batches nearing expiry" },
    { id: "pending_qc", label: "Pending QC", count: sc(9), severity: "info", targetTab: "warehouse", hint: "QC lots waiting" },
    { id: "dispatch_delay", label: "Dispatch Delays", count: sc(5), severity: "critical", targetTab: "warehouse", hint: "Packed but not dispatched" },
    { id: "overdue_ar", label: "Overdue Receivables", count: sc(14), severity: "critical", targetTab: "accounts", hint: "Customers past due" },
    { id: "bank_reco", label: "Pending Bank Reconciliation", count: sc(4), severity: "warning", targetTab: "banking", hint: "Unmatched bank lines" },
  ];

  const moduleSummaries: DashboardData["moduleSummaries"] = {
    sales: [
      { id: "open", label: "Open Orders", value: sc(48), accent: "brand", filterKey: "open" },
      { id: "dispatch", label: "Pending Dispatch", value: sc(17), accent: "sky", filterKey: "pending_dispatch" },
      { id: "invoice", label: "Pending Invoice", value: sc(11), accent: "violet", filterKey: "pending_invoice" },
      { id: "returns", label: "Sales Returns", value: sc(8), accent: "rose", filterKey: "sales_returns" },
      { id: "done", label: "Completed", value: sc(32), accent: "leaf", filterKey: "completed" },
    ],
    procurement: [
      { id: "open", label: "Open POs", value: sc(22), accent: "navy", filterKey: "open" },
      { id: "approval", label: "Pending Approval", value: sc(7), accent: "amber", filterKey: "pending_approval" },
      { id: "partial", label: "Partial Receipt", value: sc(5), accent: "sky", filterKey: "partial" },
      { id: "closed", label: "Closed", value: sc(18), accent: "leaf", filterKey: "closed" },
    ],
    warehouse: [
      { id: "grn", label: "Pending GRN", value: sc(14), accent: "amber", filterKey: "grn" },
      { id: "qc", label: "Pending QC", value: sc(9), accent: "violet", filterKey: "qc" },
      { id: "dispatch", label: "Pending Dispatch", value: sc(17), accent: "sky", filterKey: "dispatch" },
      { id: "low", label: "Low Stock", value: sc(12), accent: "rose", filterKey: "low" },
      { id: "transfer", label: "Open Transfers", value: sc(6), accent: "navy", filterKey: "transfer" },
    ],
    returns: [
      { id: "sales_ret", label: "Sales Returns", value: sc(8), accent: "rose", filterKey: "sales_return" },
      { id: "pur_ret", label: "Purchase Returns", value: sc(4), accent: "amber", filterKey: "purchase_return" },
      { id: "cn", label: "Pending CN", value: sc(5), accent: "violet", filterKey: "cn" },
      { id: "dn", label: "Pending DN", value: sc(3), accent: "navy", filterKey: "dn" },
    ],
    accounts: [
      { id: "draft", label: "Draft Vouchers", value: sc(9), accent: "amber", filterKey: "draft" },
      { id: "ar", label: "Receivable Focus", value: fmtINR(sc(2_40_00_000)), accent: "rose", filterKey: "receivable" },
      { id: "ap", label: "Payable Focus", value: fmtINR(sc(1_10_00_000)), accent: "navy", filterKey: "payable" },
      { id: "gst", label: "GST Pending", value: sc(6), accent: "violet", filterKey: "gst" },
    ],
    banking: [
      { id: "unrec", label: "Unreconciled", value: sc(8), accent: "amber", filterKey: "unreconciled" },
      { id: "cheque", label: "Open Cheques", value: sc(5), accent: "navy", filterKey: "cheque" },
      { id: "cash", label: "Cash Position", value: fmtINR(sc(12_50_000)), accent: "leaf", filterKey: "cash" },
      { id: "balance", label: "Bank Balance", value: fmtINR(sc(3_85_00_000)), accent: "teal", filterKey: "balance" },
    ],
  };

  const workspaces = {
    sales: buildWorkspace("sales", warehouse, scale),
    procurement: buildWorkspace("procurement", warehouse, scale),
    warehouse: buildWorkspace("warehouse", warehouse, scale),
    returns: buildWorkspace("returns", warehouse, scale),
    accounts: buildWorkspace("accounts", warehouse, scale),
    banking: buildWorkspace("banking", warehouse, scale),
  };

  return {
    filterOptions: { warehouses: WAREHOUSES },
    defaultFilters: { warehouseId: "All Warehouses", warehouse: "All Warehouses" },
    overviewSummary,
    pendingByModule,
    criticalExceptions,
    documentSections: buildSalesSections(),
    moduleSummaries,
    workspaces,
  };
}

/** Compatibility stubs used by older helper imports — safe no-ops for unused paths */
export function filterByTab<T extends { domains?: DashboardTabId[] }>(items: T[], _tab: DashboardTabId): T[] {
  return items;
}
export function kpisForTab(items: unknown[], _tab: DashboardTabId) {
  return items;
}
export function pipelinesForTab(items: unknown[], _tab: DashboardTabId) {
  return items;
}
export function documentSectionsForTab(sections: DocumentTypeSection[], tab: DashboardTabId) {
  if (tab === "overview") return sections;
  return sections.filter((s) => s.module === tab || (tab === "sales" && s.id.startsWith("sales")));
}
