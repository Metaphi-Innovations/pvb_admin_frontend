import type { PurchaseRequest } from "../purchase-requests/pr-data";
import type { PurchaseOrder } from "../purchase-orders/po-data";
import { applySearch } from "../hooks/useListingFilters";
import { getPRPoConversionStatus } from "../purchase-requests/pr-listing-utils";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function daysSince(dateStr: string, ref = new Date()): number {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.floor((ref.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function prSubmittedAt(pr: PurchaseRequest): string {
  const entry = pr.activity.find((a) => a.action.toLowerCase().includes("submit"));
  return entry?.date ?? pr.updatedDate ?? pr.prDate;
}

export function monthlyTrendFromDates(
  dates: string[],
  months = 6,
): { month: string; count: number; key: string }[] {
  const now = new Date();
  const buckets: { month: string; count: number; key: string }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({ month: MONTH_LABELS[d.getMonth()], count: 0, key });
  }
  for (const raw of dates) {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const b = buckets.find((x) => x.key === key);
    if (b) b.count += 1;
  }
  return buckets;
}

export function topCounts<T>(
  items: T[],
  keyFn: (item: T) => string,
  limit: number,
): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = keyFn(item).trim();
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export type PRAnalyticsFilters = {
  status: string[];
  requestedBy: string[];
  dateFrom: string;
  dateTo: string;
  search: string;
};

export function filterPRsForAnalytics(
  records: PurchaseRequest[],
  filters: PRAnalyticsFilters,
): PurchaseRequest[] {
  let r = [...records];
  if (filters.status.length) r = r.filter((x) => filters.status.includes(x.status));
  if (filters.requestedBy.length) r = r.filter((x) => filters.requestedBy.includes(x.requestedBy));
  if (filters.dateFrom) r = r.filter((x) => x.prDate >= filters.dateFrom);
  if (filters.dateTo) r = r.filter((x) => x.prDate <= filters.dateTo);
  r = applySearch(r, filters.search, (x) => [x.prNumber, x.requestedBy, x.remarks, x.createdBy]);
  return r;
}

export type POAnalyticsFilters = {
  status: string[];
  supplier: string[];
  dateFrom: string;
  dateTo: string;
  search: string;
};

export function filterPOsForAnalytics(
  records: PurchaseOrder[],
  filters: POAnalyticsFilters,
): PurchaseOrder[] {
  let r = [...records];
  if (filters.status.length) r = r.filter((x) => filters.status.includes(x.status));
  if (filters.supplier.length) r = r.filter((x) => filters.supplier.includes(x.supplierName));
  if (filters.dateFrom) r = r.filter((x) => x.poDate >= filters.dateFrom);
  if (filters.dateTo) r = r.filter((x) => x.poDate <= filters.dateTo);
  r = applySearch(r, filters.search, (x) => [x.poNumber, x.sourcePrNumber, x.supplierName]);
  return r;
}

export function isPRConverted(pr: PurchaseRequest): boolean {
  const c = getPRPoConversionStatus(pr);
  return c === "partially_converted" || c === "fully_converted";
}

export const CHART_COLORS = ["#D96A10", "#1A3A96", "#267A2E", "#F59E0B", "#3A6DD8", "#7C3AED", "#EF4444", "#6B7280"];
