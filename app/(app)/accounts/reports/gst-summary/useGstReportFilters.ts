"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ensureFinancialYearsCurrent, loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import type { DateRangePresetId } from "@/lib/accounts/report-date-presets";
import {
  buildGstPeriodOptions,
  buildGstReportFilterQuery,
  gstPeriodToDateRange,
  parseGstReportFiltersFromSearch,
  type GstReportFilters,
} from "@/lib/accounts/gst-report-filters";
import {
  isMultiFilterActive,
  normalizeMultiFilter,
} from "@/lib/accounts/report-multi-filter-utils";
import { useClientMounted } from "@/lib/use-client-mounted";

const PLACEHOLDER_DATE = "2025-04-01";

function defaultFyDateRange(): { from: string; to: string; fyId: string } {
  ensureFinancialYearsCurrent();
  const activeFyId = getActiveFinancialYearId();
  const fy = loadFinancialYears().find((f) => f.id === activeFyId);
  const today = new Date().toISOString().slice(0, 10);
  if (!fy) return { from: PLACEHOLDER_DATE, to: today, fyId: "all" };
  return {
    from: fy.startDate,
    to: today < fy.endDate ? today : fy.endDate,
    fyId: String(fy.id),
  };
}

export function useGstReportFilters() {
  const mounted = useClientMounted();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_DATE);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_DATE);
  const [datesReady, setDatesReady] = useState(false);
  const [financialYearId, setFinancialYearId] = useState("all");
  const [gstPeriod, setGstPeriod] = useState("all");
  const [branch, setBranch] = useState<string[]>([]);
  const [gstRegistration, setGstRegistration] = useState("all");

  useEffect(() => {
    const { from, to, fyId } = defaultFyDateRange();
    setDateFrom(from);
    setDateTo(to);
    setFinancialYearId(fyId);
    setDatesReady(true);
  }, []);

  useEffect(() => {
    if (!datesReady) return;
    const { from, to, fyId } = defaultFyDateRange();
    const defaults: GstReportFilters = {
      financialYearId: fyId,
      gstPeriod: "all",
      dateFrom: from,
      dateTo: to,
      branch: [],
      gstRegistration: "all",
    };
    const parsed = parseGstReportFiltersFromSearch(searchParams.toString(), defaults);
    setFinancialYearId(parsed.financialYearId);
    setGstPeriod(parsed.gstPeriod);
    setDateFrom(parsed.dateFrom);
    setDateTo(parsed.dateTo);
    setBranch(normalizeMultiFilter(parsed.branch));
    setGstRegistration(parsed.gstRegistration);
    setPreset("custom");
  }, [searchParams, datesReady]);

  const filters = useMemo(
    (): GstReportFilters => ({
      financialYearId,
      gstPeriod,
      dateFrom,
      dateTo,
      branch,
      gstRegistration,
    }),
    [financialYearId, gstPeriod, dateFrom, dateTo, branch, gstRegistration],
  );

  useEffect(() => {
    if (!mounted || !datesReady) return;
    const qs = buildGstReportFilterQuery(filters);
    const next = qs ? `${pathname}?${qs}` : pathname;
    const current = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    if (next !== current) {
      router.replace(next, { scroll: false });
    }
  }, [filters, mounted, datesReady, pathname, router, searchParams]);

  const handleFinancialYearChange = useCallback((fyId: string) => {
    setFinancialYearId(fyId);
    if (fyId !== "all") {
      const fy = loadFinancialYears().find((f) => String(f.id) === fyId);
      if (fy) {
        setDateFrom(fy.startDate);
        const today = new Date().toISOString().slice(0, 10);
        setDateTo(today < fy.endDate ? today : fy.endDate);
        setPreset("custom");
      }
    }
  }, []);

  const handleGstPeriodChange = useCallback(
    (period: string) => {
      setGstPeriod(period);
      if (period !== "all") {
        const range = gstPeriodToDateRange(period, { from: dateFrom, to: dateTo });
        setDateFrom(range.from);
        setDateTo(range.to);
        setPreset("custom");
      }
    },
    [dateFrom, dateTo],
  );

  const defaultFyRange = useMemo(() => defaultFyDateRange(), []);

  const hasFilters =
    datesReady &&
    (financialYearId !== defaultFyRange.fyId ||
      gstPeriod !== "all" ||
      dateFrom !== defaultFyRange.from ||
      dateTo !== defaultFyRange.to ||
      isMultiFilterActive(branch) ||
      gstRegistration !== "all");

  const resetFilters = useCallback(() => {
    const { from, to, fyId } = defaultFyDateRange();
    setPreset("custom");
    setDateFrom(from);
    setDateTo(to);
    setFinancialYearId(fyId);
    setGstPeriod("all");
    setBranch([]);
    setGstRegistration("all");
  }, []);

  const gstPeriodOptions = useMemo(
    () => buildGstPeriodOptions(financialYearId),
    [financialYearId],
  );

  return {
    mounted,
    datesReady,
    preset,
    setPreset,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    financialYearId,
    handleFinancialYearChange,
    gstPeriod,
    handleGstPeriodChange,
    gstPeriodOptions,
    branch,
    setBranch,
    gstRegistration,
    setGstRegistration,
    filters,
    hasFilters,
    resetFilters,
    defaultFyRange,
  };
}
