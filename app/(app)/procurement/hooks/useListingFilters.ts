"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type SortDir = "asc" | "desc";

export interface BaseFilterState {
  search: string;
  sortCol: string;
  sortDir: SortDir;
  filters: Record<string, string | string[]>;
}

function parseArrayParam(v: string | null): string[] {
  if (!v) return [];
  return v.split(",").filter(Boolean);
}

export function useListingFilters<T extends BaseFilterState>(
  defaults: T,
  filterKeys: string[],
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [state, setState] = useState<T>(() => {
    const filters: Record<string, string | string[]> = { ...defaults.filters };
    filterKeys.forEach((k) => {
      const multi = ["status", "requestedBy", "supplier", "prReference", "territory"].includes(k);
      if (multi) filters[k] = parseArrayParam(searchParams.get(k));
      else filters[k] = searchParams.get(k) ?? (defaults.filters[k] as string) ?? "";
    });
    return {
      ...defaults,
      search: searchParams.get("search") ?? defaults.search,
      sortCol: searchParams.get("sortCol") ?? defaults.sortCol,
      sortDir: (searchParams.get("sortDir") as SortDir) ?? defaults.sortDir,
      filters,
    } as T;
  });

  const syncUrl = useCallback(
    (next: T) => {
      const p = new URLSearchParams();
      if (next.search) p.set("search", next.search);
      if (next.sortCol !== defaults.sortCol) p.set("sortCol", next.sortCol);
      if (next.sortDir !== defaults.sortDir) p.set("sortDir", next.sortDir);
      filterKeys.forEach((k) => {
        const v = next.filters[k];
        if (Array.isArray(v) && v.length) p.set(k, v.join(","));
        else if (typeof v === "string" && v) p.set(k, v);
      });
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, filterKeys, defaults.sortCol, defaults.sortDir],
  );

  const update = useCallback(
    (patch: Partial<T> | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
        syncUrl(next);
        return next;
      });
    },
    [syncUrl],
  );

  const setFilter = useCallback(
    (key: string, value: string | string[]) => {
      update((prev) => ({ ...prev, filters: { ...prev.filters, [key]: value } }));
    },
    [update],
  );

  const clearAllFilters = useCallback(() => {
    const emptyFilters: Record<string, string | string[]> = {};
    filterKeys.forEach((k) => {
      emptyFilters[k] = ["status", "requestedBy", "supplier", "prReference", "territory"].includes(k) ? [] : "";
    });
    update({ ...defaults, filters: emptyFilters } as T);
  }, [update, filterKeys, defaults]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    filterKeys.forEach((k) => {
      const v = state.filters[k];
      if (Array.isArray(v) && v.length) n += 1;
      else if (typeof v === "string" && v) n += 1;
    });
    return n;
  }, [state.filters, filterKeys]);

  return { state, update, setFilter, clearAllFilters, activeFilterCount };
}

export function sortRows<T>(
  rows: T[],
  sortCol: string,
  sortDir: SortDir,
  accessors: Record<string, (r: T) => string | number>,
): T[] {
  const acc = accessors[sortCol];
  if (!acc) return rows;
  return [...rows].sort((a, b) => {
    const av = acc(a);
    const bv = acc(b);
    if (typeof av === "number" && typeof bv === "number") {
      return sortDir === "asc" ? av - bv : bv - av;
    }
    const as = String(av);
    const bs = String(bv);
    if (sortCol.includes("Date") || sortCol === "prDate" || sortCol === "poDate") {
      const ad = new Date(as).getTime();
      const bd = new Date(bs).getTime();
      return sortDir === "asc" ? ad - bd : bd - ad;
    }
    return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
  });
}

export function applySearch<T>(rows: T[], query: string, fields: (r: T) => string[]): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => fields(r).some((f) => f.toLowerCase().includes(q)));
}
