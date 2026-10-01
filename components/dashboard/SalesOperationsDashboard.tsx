"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Check,
  ChevronDown,
  Eye,
  Filter,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashPanel } from "@/components/dashboard/DashPrimitives";
import { useDashboardFilters } from "@/components/dashboard/DashboardFilterContext";
import type { DocumentTypeSection } from "@/components/dashboard/mock-data";
import { periodActivityScale, scaleCount } from "@/components/dashboard/dashboard-period";
import {
  AsOnPeriodSelect,
  ComponentPeriodSelect,
  useAsOnPeriod,
  useComponentPeriod,
} from "@/components/dashboard/DashboardShared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type OrderTypeKey = "all" | "sales_order" | "stock_transfer" | "sample_order" | "sales_return";
type QuickStatusKey =
  | "all"
  | "pending_approval"
  | "pending_packing"
  | "pending_dispatch"
  | "pending_invoice"
  | "completed"
  | "cancelled"
  | "sales_return";

type KpiFilterKey = "open" | "pending_dispatch" | "pending_invoice" | "sales_returns" | "completed" | null;
type CreditStatusKey = "within" | "near" | "exceeded" | "hold";
type SchemeTypeKey =
  | "none"
  | "product_discount"
  | "cash_discount"
  | "near_expiry"
  | "turnover"
  | "special_discount";

type WaitReason =
  | "—"
  | "Credit Hold"
  | "Packing Pending"
  | "Awaiting Dispatch"
  | "Awaiting Invoice"
  | "Partial Dispatch"
  | "Customer Approval"
  | "Vehicle Pending"
  | "Validation Hold"
  | "Return Approval"
  | "CN Pending";

type ColKey =
  | "type"
  | "orderNo"
  | "customer"
  | "warehouse"
  | "salesman"
  | "amount"
  | "status"
  | "days"
  | "reason"
  | "date";

type SortKey = ColKey;

const ORDER_TYPE_CFG: { value: OrderTypeKey; label: string }[] = [
  { value: "all", label: "All" },
  { value: "sales_order", label: "Sales Order" },
  { value: "stock_transfer", label: "Stock Transfer" },
  { value: "sample_order", label: "Sample Order" },
  { value: "sales_return", label: "Sales Return" },
];

const QUICK_FILTERS: { id: QuickStatusKey; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending_approval", label: "Pending Approval" },
  { id: "pending_packing", label: "Pending Packing" },
  { id: "pending_dispatch", label: "Pending Dispatch" },
  { id: "pending_invoice", label: "Pending Invoice" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "sales_return", label: "Sales Returns" },
];

const SALESPEOPLE = [
  "Ramesh Patil",
  "Suresh Kulkarni",
  "Vikram Joshi",
  "Prakash Desai",
  "Manoj Naik",
];

const SCHEME_LABEL: Record<Exclude<SchemeTypeKey, "none">, string> = {
  product_discount: "Product Discount",
  cash_discount: "Cash Discount",
  near_expiry: "Near Expiry",
  turnover: "Turnover",
  special_discount: "Special Discount",
};

const CONTROL = cn(
  "h-8 px-2 text-xs rounded-lg border border-border bg-background",
  "focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400",
);

/** Premium SaaS table chrome — soft separators, readable density, no Excel look */
const DASH_TABLE_WRAP = "overflow-auto rounded-xl bg-muted/10";
const DASH_TABLE = "w-full border-collapse";
const DASH_TH = "sticky top-0 z-10 bg-white/95 backdrop-blur-sm text-[11px] font-semibold text-muted-foreground tracking-wide border-b border-border/50 whitespace-nowrap";
const DASH_TH_PAD = "px-4 py-3";
const DASH_TD = "px-4 py-2.5 text-xs";
const DASH_TR = "border-b border-border/40 last:border-b-0 transition-colors hover:bg-muted/30";
const DASH_TR_ACTIVE = "bg-brand-50/50 hover:bg-brand-50/70";

function findSection(sections: DocumentTypeSection[], id: string) {
  return sections.find((s) => s.id === id);
}

function parseFromTo(party: string) {
  const parts = party.split("→").map((p) => p.trim());
  if (parts.length >= 2) return { from: parts[0], to: parts[1] };
  return {};
}

function hashToIndex(s: string, mod: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 2147483647;
  return h % mod;
}

function parseAmount(amount: string): number {
  const m = amount.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

function formatINR(value: number): string {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(1)}Cr`.replace(".0Cr", "Cr");
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)}L`.replace(".0L", "L");
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function statusToQuick(typeKey: Exclude<OrderTypeKey, "all">, status: string) {
  const s = status.toLowerCase();
  if (s.includes("cancel")) return "cancelled" as const;
  if (
    s.includes("completed") ||
    s.includes("closed") ||
    s.includes("posted") ||
    (s.includes("approved") && !s.includes("pending"))
  )
    return "completed" as const;

  if (typeKey === "stock_transfer") {
    if (s.includes("pending dispatch")) return "pending_dispatch" as const;
    if (s.includes("in transit")) return "pending_packing" as const;
    if (s.includes("pending receipt")) return "pending_invoice" as const;
    return "pending_dispatch" as const;
  }
  if (typeKey === "sample_order") {
    if (s.includes("pending approval") || s.includes("draft")) return "pending_approval" as const;
    if (s.includes("pending dispatch") || s.includes("dispatched")) return "pending_dispatch" as const;
    return "pending_approval" as const;
  }
  if (typeKey === "sales_return") {
    if (s.includes("cn pending")) return "pending_invoice" as const;
    return "pending_approval" as const;
  }
  if (s.includes("dispatched")) return "pending_dispatch" as const;
  if (s.includes("confirmed")) return "pending_invoice" as const;
  if (s.includes("pending") || s.includes("draft")) return "pending_approval" as const;
  return "pending_approval" as const;
}

function typeBadge(typeKey: Exclude<OrderTypeKey, "all">) {
  const map = {
    sales_order: "bg-brand-50 border-brand-200 text-brand-700",
    stock_transfer: "bg-amber-50 border-amber-200 text-amber-700",
    sample_order: "bg-sky-50 border-sky-200 text-sky-700",
    sales_return: "bg-rose-50 border-rose-200 text-rose-700",
  };
  return map[typeKey];
}

function deriveScheme(
  typeKey: Exclude<OrderTypeKey, "all">,
  seed: string,
): { schemeType: SchemeTypeKey; schemeName: string; schemeIssue: boolean } {
  if (typeKey === "stock_transfer" || typeKey === "sample_order") {
    return { schemeType: "none", schemeName: "", schemeIssue: false };
  }
  const idx = hashToIndex(seed, 12);
  if (typeKey === "sales_return") {
    return idx % 4 === 0
      ? { schemeType: "product_discount", schemeName: "Monsoon Discount", schemeIssue: false }
      : { schemeType: "none", schemeName: "", schemeIssue: false };
  }
  const map: SchemeTypeKey[] = [
    "none",
    "none",
    "none",
    "product_discount",
    "product_discount",
    "cash_discount",
    "near_expiry",
    "turnover",
    "special_discount",
    "none",
    "product_discount",
    "near_expiry",
  ];
  const schemeType = map[idx];
  const schemeIssue = schemeType !== "none" && idx % 5 === 0;
  const schemeName =
    schemeType === "none"
      ? ""
      : schemeType === "product_discount"
        ? "Monsoon Discount"
        : schemeType === "cash_discount"
          ? "Cash Discount"
          : schemeType === "near_expiry"
            ? "Near Expiry"
            : schemeType === "turnover"
              ? "Turnover Q1"
              : "Special Discount";
  return { schemeType, schemeName, schemeIssue };
}

function deriveReason(
  typeKey: Exclude<OrderTypeKey, "all">,
  quickStatus: QuickStatusKey | "cancelled" | "completed",
  creditHold: boolean,
  schemeIssue: boolean,
  seed: string,
): WaitReason {
  if (quickStatus === "completed" || quickStatus === "cancelled") return "—";
  if (creditHold) return "Credit Hold";
  if (schemeIssue) return "Validation Hold";
  if (typeKey === "sales_return") {
    return quickStatus === "pending_invoice" ? "CN Pending" : "Return Approval";
  }
  if (quickStatus === "pending_approval") return "Customer Approval";
  if (quickStatus === "pending_packing") return "Packing Pending";
  if (quickStatus === "pending_dispatch") {
    return hashToIndex(seed, 3) === 0
      ? "Vehicle Pending"
      : hashToIndex(seed, 3) === 1
        ? "Partial Dispatch"
        : "Awaiting Dispatch";
  }
  if (quickStatus === "pending_invoice") return "Awaiting Invoice";
  return "—";
}

type SalesRow = {
  id: string;
  typeKey: Exclude<OrderTypeKey, "all">;
  typeLabel: string;
  orderNo: string;
  customerName: string;
  warehouse: string;
  salesmanName: string;
  amountOrQty: string;
  amountNumeric: number;
  statusText: string;
  quickStatus: QuickStatusKey | "cancelled" | "completed";
  dateLabel: string;
  daysPending: number;
  reason: WaitReason;
  creditHold: boolean;
  urgent: boolean;
  schemeType: SchemeTypeKey;
  schemeName: string;
  schemeIssue: boolean;
  searchHaystack: string;
};

function buildRows(
  section: DocumentTypeSection | undefined,
  typeKey: Exclude<OrderTypeKey, "all">,
  wh: string,
): SalesRow[] {
  if (!section) return [];
  const typeLabel =
    typeKey === "sales_order"
      ? "Sales Order"
      : typeKey === "stock_transfer"
        ? "Stock Transfer"
        : typeKey === "sample_order"
          ? "Sample Order"
          : "Sales Return";

  return section.latestRows.flatMap((r) => {
    const { from, to } = parseFromTo(r.party);
    const customer = typeKey === "stock_transfer" ? to ?? r.party : r.party;
    const warehouse = typeKey === "stock_transfer" && from && to ? `${from} → ${to}` : wh;
    const salesman = SALESPEOPLE[hashToIndex(r.docNo, SALESPEOPLE.length)];
    const quickStatus = statusToQuick(typeKey, r.status);
    const idx = hashToIndex(r.docNo, 100);
    const daysPending =
      quickStatus === "completed" || quickStatus === "cancelled" ? 0 : 1 + (idx % 18);
    const creditHold =
      typeKey === "sales_order" && (idx % 7 === 0 || idx % 11 === 0) && quickStatus !== "completed";
    const urgent = daysPending >= 10 && quickStatus !== "completed" && quickStatus !== "cancelled";
    const { schemeType, schemeName, schemeIssue } = deriveScheme(typeKey, r.docNo);
    const reason = deriveReason(typeKey, quickStatus, creditHold, schemeIssue, r.docNo);

    const base = {
      typeKey,
      typeLabel,
      orderNo: r.docNo,
      customerName: customer,
      warehouse,
      salesmanName: salesman,
      amountOrQty: r.amount,
      amountNumeric: parseAmount(r.amount),
      statusText: r.status,
      quickStatus,
      dateLabel: r.date,
      daysPending,
      reason,
      creditHold,
      urgent,
      schemeType,
      schemeName,
      schemeIssue,
      searchHaystack: [r.docNo, r.party, from, to, customer, salesman]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    };

    return Array.from({ length: 3 }, (_, copy) => {
      const orderNo = copy === 0 ? r.docNo : `${r.docNo}-${copy + 1}`;
      const copySeed = `${r.docNo}-${copy}`;
      const copyScheme = deriveScheme(typeKey, copySeed);
      const copyCreditHold =
        typeKey === "sales_order" && hashToIndex(copySeed, 7) === 0 && quickStatus !== "completed";
      const copyDays =
        quickStatus === "completed" || quickStatus === "cancelled" ? 0 : 1 + hashToIndex(copySeed, 18);
      const copyUrgent = copyDays >= 10 && quickStatus !== "completed" && quickStatus !== "cancelled";
      const copyReason = deriveReason(
        typeKey,
        quickStatus,
        copyCreditHold,
        copyScheme.schemeIssue,
        copySeed,
      );
      return {
        ...base,
        id: `${typeKey}-${r.id}-${copy}`,
        orderNo,
        daysPending: copyDays,
        creditHold: copyCreditHold,
        urgent: copyUrgent,
        schemeType: copyScheme.schemeType,
        schemeName: copyScheme.schemeName,
        schemeIssue: copyScheme.schemeIssue,
        reason: copyReason,
        searchHaystack: [orderNo, r.party, from, to, customer, salesman]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      };
    });
  });
}

type CreditInfo = {
  creditLimit: number;
  outstanding: number;
  overdue: number;
  dueInvoices: number;
  status: CreditStatusKey;
  overdueDays: number;
  oldestDueLabel: string;
  lastPaymentLabel: string;
};

function buildCreditMap(customers: string[], scale: number): Map<string, CreditInfo> {
  const out = new Map<string, CreditInfo>();
  for (const c of customers) {
    const idx = hashToIndex(c, 1000);
    const creditLimit = 1_800_000 + idx * 65_000;
    const outstanding = Math.round(
      (0.35 + (idx % 45) / 100) * creditLimit * (scale <= 1 ? 1 : Math.min(5, scale) / 2.2),
    );
    const overdue = scaleCount(30_000 + (idx % 7) * 12_000, scale);
    const dueInvoices = scaleCount(1 + (idx % 5), scale);
    const available = creditLimit - outstanding;
    const ratio = creditLimit > 0 ? available / creditLimit : 0;
    const status: CreditStatusKey =
      idx % 11 === 0 ? "hold" : available < 0 ? "exceeded" : ratio <= 0.2 ? "near" : "within";
    const overdueDays = [15, 45, 75, 0, 25, 90, 10][idx % 7];
    const oldestDueLabel = overdueDays <= 0 ? "—" : `${overdueDays}d ago`;
    const lastPaymentLabel = ["12 Jul", "5 Jul", "28 Jun", "18 Jun", "2 Jul"][idx % 5];
    out.set(c, {
      creditLimit,
      outstanding,
      overdue,
      dueInvoices,
      status,
      overdueDays,
      oldestDueLabel,
      lastPaymentLabel,
    });
  }
  return out;
}

function CompactBadge({
  label,
  className,
  title,
}: {
  label: string;
  className: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border whitespace-nowrap",
        className,
      )}
    >
      {label}
    </span>
  );
}

/** Operational badges only — no scheme labels in Orders Workspace */
function RowBadges({ row }: { row: SalesRow }) {
  const badges: React.ReactNode[] = [];

  if (row.creditHold) {
    badges.push(
      <CompactBadge key="credit" label="Credit Hold" className="bg-red-50 text-red-700 border-red-200" />,
    );
  }
  if (row.urgent) {
    badges.push(
      <CompactBadge key="urgent" label="Urgent" className="bg-orange-50 text-orange-700 border-orange-200" />,
    );
  }
  if (row.typeKey === "sales_return") {
    badges.push(
      <CompactBadge key="ret" label="Returns" className="bg-rose-50 text-rose-700 border-rose-200" />,
    );
  }

  if (badges.length === 0) return <span className="text-[11px] text-muted-foreground">—</span>;
  return <div className="flex flex-wrap gap-1">{badges}</div>;
}

function cellValue(row: SalesRow, key: ColKey): string {
  switch (key) {
    case "type":
      return row.typeLabel;
    case "orderNo":
      return row.orderNo;
    case "customer":
      return row.customerName;
    case "warehouse":
      return row.warehouse;
    case "salesman":
      return row.salesmanName;
    case "amount":
      return row.amountOrQty;
    case "status":
      return row.statusText;
    case "days":
      return row.daysPending > 0 ? String(row.daysPending) : "—";
    case "reason":
      return row.reason;
    case "date":
      return row.dateLabel;
  }
}

function compareRows(a: SalesRow, b: SalesRow, key: SortKey, dir: "asc" | "desc") {
  let cmp = 0;
  if (key === "amount") cmp = a.amountNumeric - b.amountNumeric;
  else if (key === "days") cmp = a.daysPending - b.daysPending;
  else cmp = cellValue(a, key).localeCompare(cellValue(b, key), undefined, { numeric: true });
  return dir === "asc" ? cmp : -cmp;
}

/** Excel-style column filter popover — search, multi-select, sort */
function ExcelColFilter({
  label,
  colKey,
  options,
  selected,
  sort,
  align = "left",
  onApply,
  onSort,
  onClear,
}: {
  label: string;
  colKey: ColKey;
  options: string[];
  selected: Set<string> | null;
  sort: { key: SortKey; dir: "asc" | "desc" };
  align?: "left" | "right" | "center";
  onApply: (values: Set<string> | null) => void;
  onSort: (dir: "asc" | "desc") => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Set<string>>(new Set());

  const isActive = selected != null && selected.size > 0 && selected.size < options.length;
  const isSorted = sort.key === colKey;

  const filteredOpts = useMemo(() => {
    const list = [...options].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (!q.trim()) return list;
    const needle = q.trim().toLowerCase();
    return list.filter((v) => v.toLowerCase().includes(needle));
  }, [options, q]);

  const openPopover = (next: boolean) => {
    if (next) {
      setQ("");
      setDraft(selected ? new Set(selected) : new Set(options));
    }
    setOpen(next);
  };

  const allVisibleSelected =
    filteredOpts.length > 0 && filteredOpts.every((v) => draft.has(v));

  const toggleAllVisible = () => {
    const next = new Set(draft);
    if (allVisibleSelected) filteredOpts.forEach((v) => next.delete(v));
    else filteredOpts.forEach((v) => next.add(v));
    setDraft(next);
  };

  const toggleOne = (v: string) => {
    const next = new Set(draft);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setDraft(next);
  };

  const apply = () => {
    if (draft.size === 0 || draft.size === options.length) onApply(null);
    else onApply(new Set(draft));
    setOpen(false);
  };

  return (
    <div
      className={cn(
        "group/filter inline-flex items-center gap-1 whitespace-nowrap",
        align === "right" && "justify-end w-full",
        align === "center" && "justify-center w-full",
      )}
    >
      <span className={cn("text-[11px] font-semibold tracking-wide", isSorted ? "text-brand-700" : "text-muted-foreground")}>
        {label}
      </span>
      <Popover open={open} onOpenChange={openPopover}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "p-0.5 rounded-md transition-opacity",
              isActive || isSorted || open
                ? "opacity-100 text-brand-600"
                : "opacity-0 group-hover/filter:opacity-60 text-muted-foreground hover:opacity-100 hover:bg-muted/60",
            )}
            aria-label={`Filter ${label}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Filter className="w-2.5 h-2.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-0" onClick={(e) => e.stopPropagation()}>
          <div className="px-2.5 py-2 border-b border-border space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => {
                  onSort("asc");
                  setOpen(false);
                }}
                className="flex-1 h-7 px-1.5 text-[11px] rounded-md border border-border hover:bg-muted inline-flex items-center justify-center gap-1"
              >
                <ArrowUpAZ className="w-3 h-3" /> Asc
              </button>
              <button
                type="button"
                onClick={() => {
                  onSort("desc");
                  setOpen(false);
                }}
                className="flex-1 h-7 px-1.5 text-[11px] rounded-md border border-border hover:bg-muted inline-flex items-center justify-center gap-1"
              >
                <ArrowDownAZ className="w-3 h-3" /> Desc
              </button>
            </div>
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-[7px] text-muted-foreground pointer-events-none" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search values…"
                className="w-full h-7 pl-7 pr-2 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-brand-300"
              />
            </div>
          </div>

          <div className="px-2.5 py-1.5 border-b border-border">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleAllVisible}
                className="w-3.5 h-3.5 rounded accent-brand-600"
              />
              <span className="font-medium">Select All</span>
            </label>
          </div>

          <div className="max-h-44 overflow-y-auto px-2.5 py-1.5 space-y-1">
            {filteredOpts.length === 0 ? (
              <p className="text-[11px] text-muted-foreground py-2 text-center">No values</p>
            ) : (
              filteredOpts.map((v) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer text-xs py-0.5">
                  <input
                    type="checkbox"
                    checked={draft.has(v)}
                    onChange={() => toggleOne(v)}
                    className="w-3.5 h-3.5 rounded accent-brand-600 flex-shrink-0"
                  />
                  <span className="truncate">{v}</span>
                  {draft.has(v) && <Check className="w-3 h-3 text-brand-600 ml-auto flex-shrink-0" />}
                </label>
              ))
            )}
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-2 border-t border-border bg-muted/20">
            <button
              type="button"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className="h-7 px-2 text-[11px] text-brand-600 hover:underline"
            >
              Clear Filter
            </button>
            <button
              type="button"
              onClick={apply}
              className="ml-auto h-7 px-2.5 text-[11px] font-medium rounded-md bg-brand-600 hover:bg-brand-700 text-white"
            >
              Apply
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function SalesOperationsDashboard() {
  const { filters, data } = useDashboardFilters();
  const workspacePeriod = useComponentPeriod("this_month");
  const scale = periodActivityScale(workspacePeriod.fromDate, workspacePeriod.toDate);

  const [search, setSearch] = useState("");
  const [orderType, setOrderType] = useState<OrderTypeKey>("all");
  const [quickFilter, setQuickFilter] = useState<QuickStatusKey>("all");
  const [kpiFilter, setKpiFilter] = useState<KpiFilterKey>(null);
  const [salesmanFilter, setSalesmanFilter] = useState<string | null>(null);
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [schemeFilter, setSchemeFilter] = useState<string | null>(null);
  const [viewRow, setViewRow] = useState<SalesRow | null>(null);

  const [colFilters, setColFilters] = useState<Partial<Record<ColKey, Set<string> | null>>>({});
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "days", dir: "desc" });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const allRows = useMemo(() => {
    const wh = filters.warehouseId === "All Warehouses" ? "All Warehouses" : filters.warehouse;
    return [
      ...buildRows(findSection(data.documentSections, "sales-orders"), "sales_order", wh),
      ...buildRows(findSection(data.documentSections, "stock-transfers"), "stock_transfer", wh),
      ...buildRows(findSection(data.documentSections, "sample-orders"), "sample_order", wh),
      ...buildRows(findSection(data.documentSections, "sales-returns"), "sales_return", wh),
    ];
  }, [data.documentSections, filters.warehouse, filters.warehouseId]);

  const creditMap = useMemo(() => {
    const customers = [
      ...new Set(allRows.filter((r) => r.typeKey !== "stock_transfer").map((r) => r.customerName)),
    ];
    return buildCreditMap(customers, scale);
  }, [allRows, scale]);

  const resetPage = useCallback(() => setPage(1), []);

  const contextFiltered = useMemo(() => {
    let rows = allRows;

    if (filters.warehouseId !== "All Warehouses") {
      rows = rows.filter((r) => r.warehouse.includes(filters.warehouse) || r.warehouse === filters.warehouse);
    }
    if (orderType !== "all") rows = rows.filter((r) => r.typeKey === orderType);

    const kw = search.trim().toLowerCase();
    if (kw) rows = rows.filter((r) => r.searchHaystack.includes(kw));

    if (quickFilter !== "all") {
      if (quickFilter === "sales_return") rows = rows.filter((r) => r.typeKey === "sales_return");
      else if (quickFilter === "cancelled") rows = rows.filter((r) => r.quickStatus === "cancelled");
      else rows = rows.filter((r) => r.quickStatus === quickFilter);
    }

    if (kpiFilter === "open") rows = rows.filter((r) => r.quickStatus !== "completed");
    else if (kpiFilter === "pending_dispatch") rows = rows.filter((r) => r.quickStatus === "pending_dispatch");
    else if (kpiFilter === "pending_invoice") rows = rows.filter((r) => r.quickStatus === "pending_invoice");
    else if (kpiFilter === "sales_returns")
      rows = rows.filter((r) => r.typeKey === "sales_return" && r.quickStatus !== "completed");
    else if (kpiFilter === "completed") rows = rows.filter((r) => r.quickStatus === "completed");

    if (salesmanFilter) rows = rows.filter((r) => r.salesmanName === salesmanFilter);
    if (customerFilter) rows = rows.filter((r) => r.customerName === customerFilter);
    if (schemeFilter) rows = rows.filter((r) => r.schemeName === schemeFilter);

    return rows;
  }, [
    allRows,
    filters.warehouse,
    filters.warehouseId,
    orderType,
    search,
    quickFilter,
    kpiFilter,
    salesmanFilter,
    customerFilter,
    schemeFilter,
  ]);

  const colOptions = useMemo(() => {
    const keys: ColKey[] = [
      "type",
      "orderNo",
      "customer",
      "warehouse",
      "salesman",
      "amount",
      "status",
      "days",
      "reason",
      "date",
    ];
    const map = {} as Record<ColKey, string[]>;
    for (const k of keys) {
      map[k] = [...new Set(contextFiltered.map((r) => cellValue(r, k)))];
    }
    return map;
  }, [contextFiltered]);

  const baseFiltered = useMemo(() => {
    let rows = contextFiltered;
    (Object.keys(colFilters) as ColKey[]).forEach((key) => {
      const sel = colFilters[key];
      if (sel && sel.size > 0) {
        rows = rows.filter((r) => sel.has(cellValue(r, key)));
      }
    });
    return rows;
  }, [contextFiltered, colFilters]);

  const kpiCounts = useMemo(() => {
    let rows = allRows;
    if (filters.warehouseId !== "All Warehouses") {
      rows = rows.filter((r) => r.warehouse.includes(filters.warehouse) || r.warehouse === filters.warehouse);
    }
    if (orderType !== "all") rows = rows.filter((r) => r.typeKey === orderType);
    const kw = search.trim().toLowerCase();
    if (kw) rows = rows.filter((r) => r.searchHaystack.includes(kw));

    return {
      open: rows.filter((r) => r.quickStatus !== "completed").length,
      pendingDispatch: rows.filter((r) => r.quickStatus === "pending_dispatch").length,
      pendingInvoice: rows.filter((r) => r.quickStatus === "pending_invoice").length,
      salesReturns: rows.filter((r) => r.typeKey === "sales_return" && r.quickStatus !== "completed").length,
      completed: rows.filter((r) => r.quickStatus === "completed").length,
    };
  }, [allRows, filters.warehouse, filters.warehouseId, orderType, search]);

  const sortedRows = useMemo(() => {
    const out = [...baseFiltered];
    out.sort((a, b) => compareRows(a, b, sort.key, sort.dir));
    return out;
  }, [baseFiltered, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const applyKpi = (key: KpiFilterKey) => {
    setKpiFilter((cur) => (cur === key ? null : key));
    setQuickFilter("all");
    resetPage();
  };

  const setColFilter = (key: ColKey, values: Set<string> | null) => {
    setColFilters((prev) => ({ ...prev, [key]: values }));
    resetPage();
  };

  const clearColFilter = (key: ColKey) => {
    setColFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    resetPage();
  };

  const activeChips = useMemo(() => {
    const chips: { label: string; clear: () => void }[] = [];
    if (salesmanFilter)
      chips.push({ label: `Salesman: ${salesmanFilter}`, clear: () => setSalesmanFilter(null) });
    if (customerFilter)
      chips.push({ label: `Customer: ${customerFilter}`, clear: () => setCustomerFilter(null) });
    if (schemeFilter)
      chips.push({ label: `Scheme: ${schemeFilter}`, clear: () => setSchemeFilter(null) });
    if (kpiFilter) {
      const labels: Record<NonNullable<KpiFilterKey>, string> = {
        open: "Open Orders",
        pending_dispatch: "Pending Dispatch",
        pending_invoice: "Pending Invoice",
        sales_returns: "Sales Returns",
        completed: "Completed",
      };
      chips.push({ label: labels[kpiFilter], clear: () => setKpiFilter(null) });
    }
    (Object.keys(colFilters) as ColKey[]).forEach((key) => {
      const sel = colFilters[key];
      if (sel && sel.size > 0) {
        chips.push({
          label: `${key}: ${sel.size}`,
          clear: () => clearColFilter(key),
        });
      }
    });
    return chips;
  }, [salesmanFilter, customerFilter, schemeFilter, kpiFilter, colFilters]);

  const th = (label: string, colKey: ColKey, align: "left" | "right" | "center" = "left") => (
    <th
      className={cn(
        DASH_TH,
        DASH_TH_PAD,
        "group/filter",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
      )}
    >
      <ExcelColFilter
        label={label}
        colKey={colKey}
        options={colOptions[colKey]}
        selected={colFilters[colKey] ?? null}
        sort={sort}
        align={align}
        onApply={(v) => setColFilter(colKey, v)}
        onSort={(dir) => {
          setSort({ key: colKey, dir });
          resetPage();
        }}
        onClear={() => clearColFilter(colKey)}
      />
    </th>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        {/* Operational Summary — compact */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
          {(
            [
              { key: "open" as const, label: "Open Orders", value: kpiCounts.open, accent: "border-l-brand-600" },
              {
                key: "pending_dispatch" as const,
                label: "Pending Dispatch",
                value: kpiCounts.pendingDispatch,
                accent: "border-l-sky-500",
              },
              {
                key: "pending_invoice" as const,
                label: "Pending Invoice",
                value: kpiCounts.pendingInvoice,
                accent: "border-l-violet-600",
              },
              {
                key: "sales_returns" as const,
                label: "Sales Returns",
                value: kpiCounts.salesReturns,
                accent: "border-l-rose-500",
              },
              {
                key: "completed" as const,
                label: "Completed",
                value: kpiCounts.completed,
                accent: "border-l-leaf-600",
              },
            ] as const
          ).map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => applyKpi(k.key)}
              className={cn(
                "h-[60px] rounded-xl border border-border bg-white shadow-sm border-l-[3px] px-2.5 py-2 text-left transition-colors",
                k.accent,
                kpiFilter === k.key ? "ring-2 ring-brand-300 bg-brand-50/40" : "hover:bg-muted/30",
              )}
            >
              <p className="text-[11px] font-medium text-muted-foreground truncate">{k.label}</p>
              <p className="text-lg font-bold text-foreground tabular-nums leading-none mt-1">{k.value}</p>
            </button>
          ))}
        </div>

        {/* Orders Workspace — primary */}
        <DashPanel
          title="Orders Workspace"
          subtitle="Search · type · status · column filters"
          className="min-h-[min(62vh,680px)] flex flex-col shadow-card"
          bodyClassName="p-2.5 space-y-2 flex-1 flex flex-col min-h-0"
          action={
            <ComponentPeriodSelect
              preset={workspacePeriod.preset}
              fromDate={workspacePeriod.fromDate}
              toDate={workspacePeriod.toDate}
              onPreset={workspacePeriod.applyPreset}
              onFrom={workspacePeriod.setFromDate}
              onTo={workspacePeriod.setToDate}
              onApplyCustom={workspacePeriod.applyCustom}
            />
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-[9px]" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  resetPage();
                }}
                placeholder="Search orders…"
                className={cn(CONTROL, "w-full h-8 pl-8")}
                aria-label="Global search"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {ORDER_TYPE_CFG.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setOrderType(opt.value);
                    setQuickFilter("all");
                    setKpiFilter(null);
                    resetPage();
                  }}
                  className={cn(
                    "h-7 px-2.5 text-xs rounded-lg border font-medium whitespace-nowrap transition-colors",
                    orderType === opt.value
                      ? "bg-brand-600 text-white border-brand-600"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {QUICK_FILTERS.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  setQuickFilter(q.id);
                  setKpiFilter(null);
                  resetPage();
                }}
                className={cn(
                  "h-7 px-2.5 text-xs rounded-lg border font-medium whitespace-nowrap transition-colors",
                  quickFilter === q.id
                    ? "bg-brand-600 text-white border-brand-600"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {q.label}
              </button>
            ))}
          </div>

          {activeChips.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {activeChips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    chip.clear();
                    resetPage();
                  }}
                  className="inline-flex items-center gap-1 h-6 px-1.5 text-[10px] font-medium rounded-md bg-brand-50 border border-brand-200 text-brand-700"
                >
                  {chip.label}
                  <X className="w-2.5 h-2.5" />
                </button>
              ))}
            </div>
          )}

          <div className={cn(DASH_TABLE_WRAP, "flex-1 min-h-[360px]")}>
            <table className={cn(DASH_TABLE, "min-w-[1080px]")}>
              <thead>
                <tr>
                  {th("Type", "type")}
                  {th("Order Number", "orderNo")}
                  {th("Customer / Destination", "customer")}
                  {th("Warehouse", "warehouse")}
                  {th("Salesman", "salesman")}
                  {th("Amount / Qty", "amount", "right")}
                  {th("Status", "status", "center")}
                  {th("Days Pending", "days", "right")}
                  {th("Reason", "reason")}
                  <th className={cn(DASH_TH, DASH_TH_PAD, "text-left")}>Badges</th>
                  {th("Date", "date")}
                  <th className={cn(DASH_TH, DASH_TH_PAD, "text-center w-12")}>View</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className={cn(DASH_TD, "py-12 text-muted-foreground text-center")}>
                      No orders match the current filters.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setViewRow(row)}
                      className={cn(DASH_TR, "cursor-pointer group")}
                    >
                      <td className={DASH_TD}>
                        <span
                          className={cn(
                            "inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border",
                            typeBadge(row.typeKey),
                          )}
                        >
                          {row.typeLabel}
                        </span>
                      </td>
                      <td className={cn(DASH_TD, "font-mono font-semibold text-brand-700")}>{row.orderNo}</td>
                      <td className={cn(DASH_TD, "max-w-[180px] truncate text-left font-medium")}>{row.customerName}</td>
                      <td className={cn(DASH_TD, "max-w-[130px] truncate text-muted-foreground")}>{row.warehouse}</td>
                      <td className={cn(DASH_TD, "max-w-[120px] truncate text-left")}>{row.salesmanName}</td>
                      <td className={cn(DASH_TD, "text-right font-semibold tabular-nums")}>{row.amountOrQty}</td>
                      <td className={cn(DASH_TD, "text-center")}>
                        <span className="inline-flex text-[11px] px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground">
                          {row.statusText}
                        </span>
                      </td>
                      <td className={cn(DASH_TD, "text-right tabular-nums")}>
                        {row.daysPending > 0 ? (
                          <span
                            className={cn(
                              "font-semibold",
                              row.daysPending >= 10
                                ? "text-red-600"
                                : row.daysPending >= 5
                                  ? "text-amber-700"
                                  : "text-foreground",
                            )}
                          >
                            {row.daysPending}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className={cn(DASH_TD, "text-muted-foreground max-w-[140px] truncate")}>
                        {row.reason}
                      </td>
                      <td className={DASH_TD} onClick={(e) => e.stopPropagation()}>
                        <RowBadges row={row} />
                      </td>
                      <td className={cn(DASH_TD, "text-muted-foreground whitespace-nowrap")}>{row.dateLabel}</td>
                      <td className={cn(DASH_TD, "text-center")} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          title="View"
                          onClick={() => setViewRow(row)}
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-muted-foreground">
              Showing <span className="font-medium text-foreground">{pageRows.length}</span> of{" "}
              <span className="font-medium text-foreground">{sortedRows.length}</span>
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-7 px-2 text-xs rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {safePage}/{totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 px-2 text-xs rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </DashPanel>

        {/* Scheme Utilization — separate from Orders Workspace */}
        <SchemeUtilizationWidget
          rows={allRows}
          activeScheme={schemeFilter}
          onSelect={(schemeName) => {
            setSchemeFilter((c) => (c === schemeName ? null : schemeName));
            setKpiFilter(null);
            resetPage();
          }}
        />

        {/* Supporting widgets — lower visual weight */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
          <SalesmanWidget
            rows={allRows}
            activeSalesman={salesmanFilter}
            onSelect={(name) => {
              setSalesmanFilter((c) => (c === name ? null : name));
              setKpiFilter(null);
              resetPage();
            }}
          />
          <CustomerCreditWidget
            creditMap={creditMap}
            activeCustomer={customerFilter}
            onSelectCustomer={(name) => {
              setCustomerFilter((c) => (c === name ? null : name));
              setKpiFilter(null);
              resetPage();
            }}
          />
        </div>

        <Dialog open={!!viewRow} onOpenChange={(open) => !open && setViewRow(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">
                <span className="font-mono text-brand-700">{viewRow?.orderNo}</span>
              </DialogTitle>
              <DialogDescription className="text-[11px]">
                Dashboard peek only — does not open the Sales module.
              </DialogDescription>
            </DialogHeader>
            {viewRow && (
              <div className="space-y-3 text-xs">
                <div className="flex flex-wrap gap-1">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                      typeBadge(viewRow.typeKey),
                    )}
                  >
                    {viewRow.typeLabel}
                  </span>
                  <RowBadges row={viewRow} />
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/20 p-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Party</p>
                    <p className="font-semibold mt-0.5">{viewRow.customerName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Salesman</p>
                    <p className="font-semibold mt-0.5">{viewRow.salesmanName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Warehouse</p>
                    <p className="font-semibold mt-0.5">{viewRow.warehouse}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Amount / Qty</p>
                    <p className="font-semibold mt-0.5 tabular-nums">{viewRow.amountOrQty}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</p>
                    <p className="font-semibold mt-0.5">{viewRow.statusText}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Days Pending</p>
                    <p className="font-semibold mt-0.5">{viewRow.daysPending || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Reason waiting</p>
                    <p className="font-semibold mt-0.5">{viewRow.reason}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Date</p>
                    <p className="font-semibold mt-0.5">{viewRow.dateLabel}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

type SchemeUtilStatus = "active" | "running" | "pending";

type SchemeUtilRow = {
  schemeName: string;
  schemeType: Exclude<SchemeTypeKey, "none">;
  typeLabel: string;
  activeOrders: number;
  eligibleCustomers: number;
  pendingSettlement: number;
  status: SchemeUtilStatus;
};

function buildSchemeUtilization(rows: SalesRow[]): SchemeUtilRow[] {
  const map = new Map<
    string,
    {
      schemeName: string;
      schemeType: Exclude<SchemeTypeKey, "none">;
      orderIds: Set<string>;
      customers: Set<string>;
      pendingSettlement: number;
    }
  >();

  for (const r of rows) {
    if (r.typeKey !== "sales_order" && r.typeKey !== "sales_return") continue;
    if (r.schemeType === "none" || !r.schemeName) continue;
    const cur = map.get(r.schemeName) ?? {
      schemeName: r.schemeName,
      schemeType: r.schemeType,
      orderIds: new Set<string>(),
      customers: new Set<string>(),
      pendingSettlement: 0,
    };
    cur.orderIds.add(r.id);
    cur.customers.add(r.customerName);
    if (
      r.schemeType !== "product_discount" &&
      r.quickStatus !== "completed" &&
      r.quickStatus !== "cancelled"
    ) {
      cur.pendingSettlement += 1;
    }
    map.set(r.schemeName, cur);
  }

  return Array.from(map.values()).map((x) => {
    let status: SchemeUtilStatus = "active";
    if (x.schemeType === "turnover" && x.pendingSettlement > 0) status = "running";
    else if (x.pendingSettlement > 0 && x.schemeType !== "product_discount") status = "pending";

    return {
      schemeName: x.schemeName,
      schemeType: x.schemeType,
      typeLabel: SCHEME_LABEL[x.schemeType],
      activeOrders: x.orderIds.size,
      eligibleCustomers: x.customers.size,
      pendingSettlement: x.pendingSettlement,
      status,
    };
  });
}

function SchemeUtilizationWidget({
  rows,
  activeScheme,
  onSelect,
}: {
  rows: SalesRow[];
  activeScheme: string | null;
  onSelect: (schemeName: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | Exclude<SchemeTypeKey, "none">>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | SchemeUtilStatus>("all");
  const [period, setPeriod] = useState<"all" | "week" | "month" | "quarter">("all");
  const [viewScheme, setViewScheme] = useState<SchemeUtilRow | null>(null);

  const allSchemeRows = useMemo(() => buildSchemeUtilization(rows), [rows]);

  const list = useMemo(() => {
    let items = allSchemeRows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (x) => x.schemeName.toLowerCase().includes(q) || x.typeLabel.toLowerCase().includes(q),
      );
    }
    if (typeFilter !== "all") items = items.filter((x) => x.schemeType === typeFilter);
    if (statusFilter !== "all") items = items.filter((x) => x.status === statusFilter);
    if (period === "week") items = items.filter((x) => x.activeOrders >= 1);
    if (period === "month") items = items.filter((x) => x.activeOrders >= 1);
    if (period === "quarter") items = items.filter((x) => x.activeOrders >= 2 || x.pendingSettlement > 0);
    items.sort((a, b) => b.activeOrders - a.activeOrders);
    return items;
  }, [allSchemeRows, search, typeFilter, statusFilter, period]);

  const statusBadgeCls = (s: SchemeUtilStatus) =>
    s === "active"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : s === "running"
        ? "bg-sky-50 text-sky-700 border-sky-200"
        : "bg-amber-50 text-amber-700 border-amber-200";

  const statusLabel = (s: SchemeUtilStatus) =>
    s === "active" ? "Active" : s === "running" ? "Running" : "Pending";

  return (
    <>
      <DashPanel
        title="Scheme Utilization"
        subtitle="Operational summary — click a row to filter Orders Workspace"
        className="shadow-sm"
        bodyClassName="p-2.5 space-y-2"
      >
        <div className="flex flex-wrap gap-1.5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search scheme…"
            className={cn(CONTROL, "h-7 flex-1 min-w-[140px] max-w-xs")}
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className={cn(CONTROL, "h-7 max-w-[10rem]")}
            aria-label="Scheme type"
          >
            <option value="all">All Types</option>
            <option value="product_discount">Product Discount</option>
            <option value="cash_discount">Cash Discount</option>
            <option value="near_expiry">Near Expiry</option>
            <option value="turnover">Turnover</option>
            <option value="special_discount">Special Discount</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className={cn(CONTROL, "h-7 max-w-[9rem]")}
            aria-label="Scheme status"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="running">Running</option>
            <option value="pending">Pending</option>
          </select>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as typeof period)}
            className={cn(CONTROL, "h-7 max-w-[8rem]")}
            aria-label="Date period"
          >
            <option value="all">All Period</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
        </div>

        <div className={cn(DASH_TABLE_WRAP, "max-h-[240px]")}>
          <table className={cn(DASH_TABLE, "min-w-[720px]")}>
            <thead>
              <tr>
                <th className={cn(DASH_TH, DASH_TH_PAD, "text-left")}>Scheme Name</th>
                <th className={cn(DASH_TH, DASH_TH_PAD, "text-left")}>Scheme Type</th>
                <th className={cn(DASH_TH, DASH_TH_PAD, "text-right")}>Active Orders</th>
                <th className={cn(DASH_TH, DASH_TH_PAD, "text-right")}>Eligible Customers</th>
                <th className={cn(DASH_TH, DASH_TH_PAD, "text-right")}>Pending Settlement</th>
                <th className={cn(DASH_TH, DASH_TH_PAD, "text-center")}>Status</th>
                <th className={cn(DASH_TH, DASH_TH_PAD, "text-center w-12")}>View</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={7} className={cn(DASH_TD, "py-10 text-muted-foreground text-center")}>
                    No schemes match the current filters.
                  </td>
                </tr>
              ) : (
                list.map((s) => (
                  <tr
                    key={s.schemeName}
                    onClick={() => onSelect(s.schemeName)}
                    className={cn(DASH_TR, "cursor-pointer group", activeScheme === s.schemeName && DASH_TR_ACTIVE)}
                  >
                    <td className={cn(DASH_TD, "font-semibold text-brand-700 text-left")}>{s.schemeName}</td>
                    <td className={cn(DASH_TD, "text-muted-foreground text-left")}>{s.typeLabel}</td>
                    <td className={cn(DASH_TD, "text-right font-semibold tabular-nums")}>{s.activeOrders}</td>
                    <td className={cn(DASH_TD, "text-right tabular-nums")}>{s.eligibleCustomers}</td>
                    <td className={cn(DASH_TD, "text-right tabular-nums")}>{s.pendingSettlement}</td>
                    <td className={cn(DASH_TD, "text-center")}>
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border",
                          statusBadgeCls(s.status),
                        )}
                      >
                        {statusLabel(s.status)}
                      </span>
                    </td>
                    <td className={cn(DASH_TD, "text-center")} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        title="View scheme summary"
                        onClick={() => setViewScheme(s)}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DashPanel>

      <Dialog open={!!viewScheme} onOpenChange={(open) => !open && setViewScheme(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">{viewScheme?.schemeName}</DialogTitle>
            <DialogDescription className="text-[11px]">
              Operational summary only — does not open Scheme Management.
            </DialogDescription>
          </DialogHeader>
          {viewScheme && (
            <div className="grid grid-cols-2 gap-2 text-xs rounded-xl border border-border bg-muted/20 p-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Type</p>
                <p className="font-semibold mt-0.5">{viewScheme.typeLabel}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</p>
                <p className="font-semibold mt-0.5">{statusLabel(viewScheme.status)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Active Orders</p>
                <p className="font-semibold mt-0.5 tabular-nums">{viewScheme.activeOrders}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Eligible Customers</p>
                <p className="font-semibold mt-0.5 tabular-nums">{viewScheme.eligibleCustomers}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pending Settlement</p>
                <p className="font-semibold mt-0.5 tabular-nums">{viewScheme.pendingSettlement}</p>
              </div>
              <div className="col-span-2 pt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelect(viewScheme.schemeName);
                    setViewScheme(null);
                  }}
                  className="h-8 px-3 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-700 text-white"
                >
                  Filter Orders Workspace
                </button>
                <button
                  type="button"
                  disabled
                  title="Scheme Management link will be available later"
                  className="h-8 px-3 text-xs font-medium rounded-lg border border-border text-muted-foreground opacity-60 cursor-not-allowed"
                >
                  Open Scheme Management
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

type NumRange = { min: number | null; max: number | null };

function matchesNumRange(value: number, range: NumRange | null): boolean {
  if (!range) return true;
  if (range.min != null && !Number.isNaN(range.min) && value < range.min) return false;
  if (range.max != null && !Number.isNaN(range.max) && value > range.max) return false;
  return true;
}

/** Generic Excel-style value filter for widget tables */
function ExcelValueFilter({
  label,
  options,
  selected,
  isSorted,
  align = "left",
  onApply,
  onSort,
  onClear,
}: {
  label: string;
  options: string[];
  selected: Set<string> | null;
  isSorted: boolean;
  align?: "left" | "right" | "center";
  onApply: (values: Set<string> | null) => void;
  onSort: (dir: "asc" | "desc") => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Set<string>>(new Set());

  const isActive = selected != null && selected.size > 0 && selected.size < options.length;

  const filteredOpts = useMemo(() => {
    const list = [...options].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (!q.trim()) return list;
    const needle = q.trim().toLowerCase();
    return list.filter((v) => v.toLowerCase().includes(needle));
  }, [options, q]);

  const openPopover = (next: boolean) => {
    if (next) {
      setQ("");
      setDraft(selected ? new Set(selected) : new Set(options));
    }
    setOpen(next);
  };

  const allVisibleSelected = filteredOpts.length > 0 && filteredOpts.every((v) => draft.has(v));

  const toggleAllVisible = () => {
    const next = new Set(draft);
    if (allVisibleSelected) filteredOpts.forEach((v) => next.delete(v));
    else filteredOpts.forEach((v) => next.add(v));
    setDraft(next);
  };

  const toggleOne = (v: string) => {
    const next = new Set(draft);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setDraft(next);
  };

  const apply = () => {
    if (draft.size === 0 || draft.size === options.length) onApply(null);
    else onApply(new Set(draft));
    setOpen(false);
  };

  return (
    <div
      className={cn(
        "group/filter inline-flex items-center gap-1 whitespace-nowrap",
        align === "right" && "justify-end w-full",
        align === "center" && "justify-center w-full",
      )}
    >
      <span className={cn("text-[11px] font-semibold tracking-wide", isSorted ? "text-brand-700" : "text-muted-foreground")}>
        {label}
      </span>
      <Popover open={open} onOpenChange={openPopover}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "p-0.5 rounded-md transition-opacity",
              isActive || isSorted || open
                ? "opacity-100 text-brand-600"
                : "opacity-0 group-hover/filter:opacity-60 text-muted-foreground hover:opacity-100 hover:bg-muted/60",
            )}
            aria-label={`Filter ${label}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Filter className="w-2.5 h-2.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-0" onClick={(e) => e.stopPropagation()}>
          <div className="px-2.5 py-2 border-b border-border space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => {
                  onSort("asc");
                  setOpen(false);
                }}
                className="flex-1 h-7 px-1.5 text-[11px] rounded-md border border-border hover:bg-muted inline-flex items-center justify-center gap-1"
              >
                <ArrowUpAZ className="w-3 h-3" /> Asc
              </button>
              <button
                type="button"
                onClick={() => {
                  onSort("desc");
                  setOpen(false);
                }}
                className="flex-1 h-7 px-1.5 text-[11px] rounded-md border border-border hover:bg-muted inline-flex items-center justify-center gap-1"
              >
                <ArrowDownAZ className="w-3 h-3" /> Desc
              </button>
            </div>
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-[7px] text-muted-foreground pointer-events-none" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search values…"
                className="w-full h-7 pl-7 pr-2 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-brand-300"
              />
            </div>
          </div>
          <div className="px-2.5 py-1.5 border-b border-border">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleAllVisible}
                className="w-3.5 h-3.5 rounded accent-brand-600"
              />
              <span className="font-medium">Select All</span>
            </label>
          </div>
          <div className="max-h-40 overflow-y-auto px-2.5 py-1.5 space-y-1">
            {filteredOpts.length === 0 ? (
              <p className="text-[11px] text-muted-foreground py-2 text-center">No values</p>
            ) : (
              filteredOpts.map((v) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer text-xs py-0.5">
                  <input
                    type="checkbox"
                    checked={draft.has(v)}
                    onChange={() => toggleOne(v)}
                    className="w-3.5 h-3.5 rounded accent-brand-600 flex-shrink-0"
                  />
                  <span className="truncate">{v}</span>
                </label>
              ))
            )}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-2 border-t border-border bg-muted/20">
            <button
              type="button"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className="h-7 px-2 text-[11px] text-brand-600 hover:underline"
            >
              Clear Filter
            </button>
            <button
              type="button"
              onClick={apply}
              className="ml-auto h-7 px-2.5 text-[11px] font-medium rounded-md bg-brand-600 hover:bg-brand-700 text-white"
            >
              Apply
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Excel-style numeric range filter for widget tables */
function ExcelNumericFilter({
  label,
  range,
  isSorted,
  align = "right",
  minPlaceholder = "Min",
  maxPlaceholder = "Max",
  onApply,
  onSort,
  onClear,
}: {
  label: string;
  range: NumRange | null;
  isSorted: boolean;
  align?: "left" | "right";
  minPlaceholder?: string;
  maxPlaceholder?: string;
  onApply: (range: NumRange | null) => void;
  onSort: (dir: "asc" | "desc") => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const isActive = !!(range && (range.min != null || range.max != null));

  const openPopover = (next: boolean) => {
    if (next) {
      setMin(range?.min != null ? String(range.min) : "");
      setMax(range?.max != null ? String(range.max) : "");
    }
    setOpen(next);
  };

  const apply = () => {
    const minN = min.trim() === "" ? null : Number(min);
    const maxN = max.trim() === "" ? null : Number(max);
    if ((minN == null || Number.isNaN(minN)) && (maxN == null || Number.isNaN(maxN))) onApply(null);
    else
      onApply({
        min: minN != null && !Number.isNaN(minN) ? minN : null,
        max: maxN != null && !Number.isNaN(maxN) ? maxN : null,
      });
    setOpen(false);
  };

  return (
    <div
      className={cn(
        "group/filter inline-flex items-center gap-1 whitespace-nowrap",
        align === "right" && "justify-end w-full",
      )}
    >
      <span className={cn("text-[11px] font-semibold tracking-wide", isSorted ? "text-brand-700" : "text-muted-foreground")}>
        {label}
      </span>
      <Popover open={open} onOpenChange={openPopover}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "p-0.5 rounded-md transition-opacity",
              isActive || isSorted || open
                ? "opacity-100 text-brand-600"
                : "opacity-0 group-hover/filter:opacity-60 text-muted-foreground hover:opacity-100 hover:bg-muted/60",
            )}
            aria-label={`Filter ${label}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Filter className="w-2.5 h-2.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-52 p-0" onClick={(e) => e.stopPropagation()}>
          <div className="px-2.5 py-2 border-b border-border space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => {
                  onSort("asc");
                  setOpen(false);
                }}
                className="flex-1 h-7 px-1.5 text-[11px] rounded-md border border-border hover:bg-muted"
              >
                Low → High
              </button>
              <button
                type="button"
                onClick={() => {
                  onSort("desc");
                  setOpen(false);
                }}
                className="flex-1 h-7 px-1.5 text-[11px] rounded-md border border-border hover:bg-muted"
              >
                High → Low
              </button>
            </div>
            <div className="flex gap-1.5">
              <input
                value={min}
                onChange={(e) => setMin(e.target.value)}
                placeholder={minPlaceholder}
                inputMode="decimal"
                className="w-1/2 h-7 px-2 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-brand-300"
              />
              <input
                value={max}
                onChange={(e) => setMax(e.target.value)}
                placeholder={maxPlaceholder}
                inputMode="decimal"
                className="w-1/2 h-7 px-2 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-brand-300"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-2 bg-muted/20">
            <button
              type="button"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className="h-7 px-2 text-[11px] text-brand-600 hover:underline"
            >
              Clear Filter
            </button>
            <button
              type="button"
              onClick={apply}
              className="ml-auto h-7 px-2.5 text-[11px] font-medium rounded-md bg-brand-600 hover:bg-brand-700 text-white"
            >
              Apply
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

type SalesmanPerfRow = {
  name: string;
  openOrders: number;
  pendingApproval: number;
  pendingDispatch: number;
  pendingInvoice: number;
  completedOrders: number;
  salesReturns: number;
  salesValue: number;
};

type SalesmanColKey =
  | "name"
  | "openOrders"
  | "pending"
  | "completedOrders"
  | "salesReturns"
  | "salesValue";

function SalesmanWidget({
  rows,
  activeSalesman,
  onSelect,
}: {
  rows: SalesRow[];
  activeSalesman: string | null;
  onSelect: (name: string) => void;
}) {
  const [nameFilter, setNameFilter] = useState<Set<string> | null>(null);
  const [numFilters, setNumFilters] = useState<Partial<Record<SalesmanColKey, NumRange | null>>>({});
  const [sort, setSort] = useState<{ key: SalesmanColKey; dir: "asc" | "desc" }>({
    key: "openOrders",
    dir: "desc",
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  const baseRows = useMemo(() => {
    const map = new Map<string, SalesmanPerfRow>();
    for (const r of rows) {
      // Stock Transfer has no salesman assignment — exclude
      if (r.typeKey === "stock_transfer") continue;
      const cur = map.get(r.salesmanName) ?? {
        name: r.salesmanName,
        openOrders: 0,
        pendingApproval: 0,
        pendingDispatch: 0,
        pendingInvoice: 0,
        completedOrders: 0,
        salesReturns: 0,
        salesValue: 0,
      };
      if (r.typeKey === "sales_order" || r.typeKey === "sample_order") {
        cur.salesValue += r.amountNumeric;
      }
      if (r.typeKey === "sales_return") cur.salesReturns += 1;
      if (r.quickStatus === "completed") cur.completedOrders += 1;
      else if (r.quickStatus !== "cancelled") {
        cur.openOrders += 1;
        if (r.quickStatus === "pending_approval") cur.pendingApproval += 1;
        if (r.quickStatus === "pending_dispatch") cur.pendingDispatch += 1;
        if (r.quickStatus === "pending_invoice") cur.pendingInvoice += 1;
      }
      map.set(r.salesmanName, cur);
    }
    return Array.from(map.values()).map((r) => ({
      ...r,
      pending: r.pendingApproval + r.pendingDispatch + r.pendingInvoice,
    }));
  }, [rows]);

  const nameOptions = useMemo(() => baseRows.map((r) => r.name).sort(), [baseRows]);

  const filtered = useMemo(() => {
    let list = baseRows;
    if (nameFilter && nameFilter.size > 0) list = list.filter((r) => nameFilter.has(r.name));
    (Object.keys(numFilters) as SalesmanColKey[]).forEach((key) => {
      const range = numFilters[key];
      if (!range) return;
      list = list.filter((r) => matchesNumRange(r[key] as number, range));
    });
    list = [...list].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [baseRows, nameFilter, numFilters, sort]);

  const thNum = (label: string, key: Exclude<SalesmanColKey, "name">) => (
    <th className={cn(DASH_TH, DASH_TH_PAD, "text-right group/filter")}>
      <ExcelNumericFilter
        label={label}
        range={numFilters[key] ?? null}
        isSorted={sort.key === key}
        onApply={(range) => setNumFilters((prev) => ({ ...prev, [key]: range }))}
        onSort={(dir) => setSort({ key, dir })}
        onClear={() =>
          setNumFilters((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          })
        }
      />
    </th>
  );

  return (
    <DashPanel
      title="Salesman Performance"
      subtitle="Click a row to filter Orders Workspace · expand for pending breakdown"
      className="shadow-sm"
      bodyClassName="p-2.5"
    >
      <div className={cn(DASH_TABLE_WRAP, "max-h-[280px]")}>
        <table className={cn(DASH_TABLE, "min-w-[560px]")}>
          <thead>
            <tr>
              <th className={cn(DASH_TH, DASH_TH_PAD, "text-left min-w-[140px] group/filter")}>
                <ExcelValueFilter
                  label="Salesman"
                  options={nameOptions}
                  selected={nameFilter}
                  isSorted={sort.key === "name"}
                  onApply={setNameFilter}
                  onSort={(dir) => setSort({ key: "name", dir })}
                  onClear={() => setNameFilter(null)}
                />
              </th>
              {thNum("Open Orders", "openOrders")}
              {thNum("Pending", "pending")}
              {thNum("Completed", "completedOrders")}
              {thNum("Sales Returns", "salesReturns")}
              {thNum("Sales Value", "salesValue")}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className={cn(DASH_TD, "py-10 text-muted-foreground text-center")}>
                  No salesman rows match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const isOpen = expanded === r.name;
                return (
                  <React.Fragment key={r.name}>
                    <tr
                      onClick={() => onSelect(r.name)}
                      className={cn(DASH_TR, "cursor-pointer", activeSalesman === r.name && DASH_TR_ACTIVE)}
                    >
                      <td className={cn(DASH_TD, "text-left font-semibold whitespace-nowrap")}>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 text-left hover:text-brand-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpanded((cur) => (cur === r.name ? null : r.name));
                          }}
                          aria-expanded={isOpen}
                          title="Show pending breakdown"
                        >
                          <ChevronDown
                            className={cn(
                              "w-3 h-3 text-muted-foreground transition-transform",
                              isOpen && "rotate-180",
                            )}
                          />
                          {r.name}
                        </button>
                      </td>
                      <td className={cn(DASH_TD, "text-right tabular-nums font-medium")}>{r.openOrders}</td>
                      <td className={cn(DASH_TD, "text-right tabular-nums font-semibold text-amber-700")}>
                        {r.pending}
                      </td>
                      <td className={cn(DASH_TD, "text-right tabular-nums")}>{r.completedOrders}</td>
                      <td className={cn(DASH_TD, "text-right tabular-nums")}>{r.salesReturns}</td>
                      <td className={cn(DASH_TD, "text-right tabular-nums text-muted-foreground")}>
                        {formatINR(r.salesValue)}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-muted/20">
                        <td colSpan={6} className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-3 text-[11px]">
                            <span className="text-muted-foreground">Pending breakdown:</span>
                            <span>
                              Approval <strong className="tabular-nums">{r.pendingApproval}</strong>
                            </span>
                            <span>
                              Dispatch <strong className="tabular-nums">{r.pendingDispatch}</strong>
                            </span>
                            <span>
                              Invoice <strong className="tabular-nums">{r.pendingInvoice}</strong>
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </DashPanel>
  );
}

type CreditColKey = "name" | "outstanding" | "overdue" | "status";

const CREDIT_STATUS_LABEL: Record<CreditStatusKey, string> = {
  within: "Within Limit",
  near: "Near Limit",
  exceeded: "Exceeded",
  hold: "Credit Hold",
};

function CustomerCreditWidget({
  creditMap,
  activeCustomer,
  onSelectCustomer,
}: {
  creditMap: Map<string, CreditInfo>;
  activeCustomer: string | null;
  onSelectCustomer: (name: string) => void;
}) {
  const asOn = useAsOnPeriod("as_on_today");
  const [nameFilter, setNameFilter] = useState<Set<string> | null>(null);
  const [statusFilter, setStatusFilter] = useState<Set<string> | null>(null);
  const [numFilters, setNumFilters] = useState<Partial<Record<CreditColKey, NumRange | null>>>({});
  const [sort, setSort] = useState<{ key: CreditColKey; dir: "asc" | "desc" }>({
    key: "outstanding",
    dir: "desc",
  });

  const baseRows = useMemo(
    () => Array.from(creditMap.entries()).map(([name, c]) => ({ name, ...c })),
    [creditMap],
  );

  const nameOptions = useMemo(() => baseRows.map((r) => r.name).sort(), [baseRows]);
  const statusOptions = useMemo(() => Object.values(CREDIT_STATUS_LABEL), []);

  const filtered = useMemo(() => {
    let list = baseRows;
    if (nameFilter && nameFilter.size > 0) list = list.filter((r) => nameFilter.has(r.name));
    if (statusFilter && statusFilter.size > 0) {
      list = list.filter((r) => statusFilter.has(CREDIT_STATUS_LABEL[r.status]));
    }
    if (numFilters.outstanding) list = list.filter((r) => matchesNumRange(r.outstanding, numFilters.outstanding!));
    if (numFilters.overdue) list = list.filter((r) => matchesNumRange(r.overdue, numFilters.overdue!));

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sort.key === "name") cmp = a.name.localeCompare(b.name);
      else if (sort.key === "status")
        cmp = CREDIT_STATUS_LABEL[a.status].localeCompare(CREDIT_STATUS_LABEL[b.status]);
      else cmp = (a[sort.key] as number) - (b[sort.key] as number);
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [baseRows, nameFilter, statusFilter, numFilters, sort]);

  const statusBadge = (s: CreditStatusKey) =>
    s === "within"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : s === "near"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : s === "hold"
          ? "bg-orange-50 text-orange-700 border-orange-200"
          : "bg-red-50 text-red-700 border-red-200";

  const setNum = (key: CreditColKey, range: NumRange | null) =>
    setNumFilters((prev) => ({ ...prev, [key]: range }));

  const clearNum = (key: CreditColKey) =>
    setNumFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  return (
    <DashPanel
      title="Customer Credit & Collection Risk"
      subtitle="Hover a customer for limit & aging detail · click to filter Orders"
      className="shadow-sm"
      bodyClassName="p-2.5 space-y-2"
      action={
        <AsOnPeriodSelect
          preset={asOn.preset}
          asOnDate={asOn.asOnDate}
          onPreset={asOn.applyPreset}
          onDate={asOn.setAsOnDate}
        />
      }
    >
      <div className={cn(DASH_TABLE_WRAP, "max-h-[280px]")}>
        <table className={cn(DASH_TABLE, "min-w-[480px] table-fixed")}>
          <colgroup>
            <col className="w-[42%]" />
            <col className="w-[20%]" />
            <col className="w-[20%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead>
            <tr>
              <th className={cn(DASH_TH, DASH_TH_PAD, "text-left group/filter")}>
                <ExcelValueFilter
                  label="Customer"
                  options={nameOptions}
                  selected={nameFilter}
                  isSorted={sort.key === "name"}
                  onApply={setNameFilter}
                  onSort={(dir) => setSort({ key: "name", dir })}
                  onClear={() => setNameFilter(null)}
                />
              </th>
              <th className={cn(DASH_TH, DASH_TH_PAD, "text-right group/filter")}>
                <ExcelNumericFilter
                  label="Outstanding"
                  range={numFilters.outstanding ?? null}
                  isSorted={sort.key === "outstanding"}
                  minPlaceholder="Min ₹"
                  maxPlaceholder="Max ₹"
                  onApply={(r) => setNum("outstanding", r)}
                  onSort={(dir) => setSort({ key: "outstanding", dir })}
                  onClear={() => clearNum("outstanding")}
                />
              </th>
              <th className={cn(DASH_TH, DASH_TH_PAD, "text-right group/filter")}>
                <ExcelNumericFilter
                  label="Overdue"
                  range={numFilters.overdue ?? null}
                  isSorted={sort.key === "overdue"}
                  minPlaceholder="Min ₹"
                  maxPlaceholder="Max ₹"
                  onApply={(r) => setNum("overdue", r)}
                  onSort={(dir) => setSort({ key: "overdue", dir })}
                  onClear={() => clearNum("overdue")}
                />
              </th>
              <th className={cn(DASH_TH, DASH_TH_PAD, "text-center group/filter")}>
                <ExcelValueFilter
                  label="Status"
                  options={statusOptions}
                  selected={statusFilter}
                  isSorted={sort.key === "status"}
                  align="center"
                  onApply={setStatusFilter}
                  onSort={(dir) => setSort({ key: "status", dir })}
                  onClear={() => setStatusFilter(null)}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className={cn(DASH_TD, "py-10 text-muted-foreground text-center")}>
                  No customers match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr
                  key={c.name}
                  onClick={() => onSelectCustomer(c.name)}
                  className={cn(DASH_TR, "cursor-pointer", activeCustomer === c.name && DASH_TR_ACTIVE)}
                >
                  <td className={cn(DASH_TD, "text-left font-semibold text-brand-700 truncate")}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="block truncate cursor-help">{c.name}</span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs space-y-1 p-2.5">
                        <p className="font-semibold text-foreground">{c.name}</p>
                        <p className="text-muted-foreground">
                          Credit Limit: <span className="font-medium text-foreground tabular-nums">{formatINR(c.creditLimit)}</span>
                        </p>
                        <p className="text-muted-foreground">
                          Due Invoices: <span className="font-medium text-foreground tabular-nums">{c.dueInvoices}</span>
                        </p>
                        <p className="text-muted-foreground">
                          Oldest Due: <span className="font-medium text-foreground">{c.oldestDueLabel}</span>
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  <td className={cn(DASH_TD, "text-right font-semibold tabular-nums")}>
                    {formatINR(c.outstanding)}
                  </td>
                  <td className={cn(DASH_TD, "text-right tabular-nums")}>
                    <span className={cn(c.overdue > 0 && "text-red-600 font-semibold")}>
                      {formatINR(c.overdue)}
                    </span>
                  </td>
                  <td className={cn(DASH_TD, "text-center")}>
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border whitespace-nowrap",
                        statusBadge(c.status),
                      )}
                    >
                      {CREDIT_STATUS_LABEL[c.status]}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashPanel>
  );
}
