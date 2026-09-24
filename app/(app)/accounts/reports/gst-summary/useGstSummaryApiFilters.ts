"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DateRangePresetId } from "@/lib/accounts/report-date-presets";
import {
  buildGstReportFilterQuery,
  gstPeriodToDateRange,
  parseGstReportFiltersFromSearch,
  type GstReportFilters,
} from "@/lib/accounts/gst-report-filters";
import {
  isMultiFilterActive,
  normalizeMultiFilter,
  type ReportMultiSelectOption,
} from "@/lib/accounts/report-multi-filter-utils";
import { useClientMounted } from "@/lib/use-client-mounted";
import {
  GstSummaryApiError,
  GstSummaryApiService,
} from "@/services/gst-summary.service";
import type {
  GstSummaryFiltersConfig,
  GstSummaryQueryParams,
} from "@/types/gst-summary.types";
import { buildGstPeriodOptionsForRange } from "./gst-summary-action-gating";

const PLACEHOLDER_DATE = "2025-04-01";

/**
 * API-backed GST Summary filters for Overview, GSTR-1, GSTR-2A, GSTR-2B, GSTR-3B,
 * and Annual GST Compliance Summary.
 * Leaves the local/demo `useGstReportFilters` intact for any remaining legacy paths.
 */
export function useGstSummaryApiFilters() {
  const mounted = useClientMounted();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filtersConfig, setFiltersConfig] =
    useState<GstSummaryFiltersConfig | null>(null);
  const [filtersError, setFiltersError] = useState<string | null>(null);
  const [filtersLoading, setFiltersLoading] = useState(true);

  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_DATE);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_DATE);
  const [datesReady, setDatesReady] = useState(false);
  const [financialYearId, setFinancialYearId] = useState("");
  const [gstPeriod, setGstPeriod] = useState("all");
  const [branch, setBranch] = useState<string[]>([]);
  const [gstRegistration, setGstRegistration] = useState("all");
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setFiltersLoading(true);
    setFiltersError(null);
    void GstSummaryApiService.getFilters(controller.signal)
      .then((config) => {
        setFiltersConfig(config);
        setFiltersLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const message =
          err instanceof GstSummaryApiError
            ? err.message
            : "Failed to load GST Summary filters.";
        setFiltersError(message);
        setFiltersLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!filtersConfig || defaultsApplied) return;

    const defaults: GstReportFilters = {
      financialYearId: filtersConfig.defaults.financial_year_id ?? "",
      gstPeriod: "all",
      dateFrom: filtersConfig.defaults.from_date ?? PLACEHOLDER_DATE,
      dateTo: filtersConfig.defaults.to_date ?? PLACEHOLDER_DATE,
      branch: [],
      gstRegistration: "all",
    };
    const parsed = parseGstReportFiltersFromSearch(
      searchParams.toString(),
      defaults,
    );

    setFinancialYearId(parsed.financialYearId || defaults.financialYearId);
    setGstPeriod(parsed.gstPeriod);
    setDateFrom(parsed.dateFrom);
    setDateTo(parsed.dateTo);
    setBranch(normalizeMultiFilter(parsed.branch));
    setGstRegistration(parsed.gstRegistration);
    setPreset("custom");
    setDatesReady(true);
    setDefaultsApplied(true);
  }, [filtersConfig, defaultsApplied, searchParams]);

  // Drop a selected GSTIN that is not in the live API registration list.
  useEffect(() => {
    if (!filtersConfig || !defaultsApplied) return;
    if (gstRegistration === "all") return;
    const valid = new Set(
      (filtersConfig.gst_registrations ?? []).map((r) => r.gstin),
    );
    if (!valid.has(gstRegistration)) {
      setGstRegistration("all");
    }
  }, [filtersConfig, defaultsApplied, gstRegistration]);

  useEffect(() => {
    if (!mounted || !datesReady || !defaultsApplied) return;
    const filters: GstReportFilters = {
      financialYearId,
      gstPeriod,
      dateFrom,
      dateTo,
      branch,
      gstRegistration,
    };
    const qs = buildGstReportFilterQuery(filters);
    const next = qs ? `${pathname}?${qs}` : pathname;
    const current = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    if (next !== current) {
      router.replace(next, { scroll: false });
    }
  }, [
    financialYearId,
    gstPeriod,
    dateFrom,
    dateTo,
    branch,
    gstRegistration,
    mounted,
    datesReady,
    defaultsApplied,
    pathname,
    router,
    searchParams,
  ]);

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

  const handleFinancialYearChange = useCallback(
    (fyId: string) => {
      setFinancialYearId(fyId);
      const fy = filtersConfig?.financial_years.find(
        (f) => f.financial_year_id === fyId,
      );
      if (fy) {
        setDateFrom(fy.start_date);
        const today = new Date().toISOString().slice(0, 10);
        setDateTo(today < fy.end_date ? today : fy.end_date);
        setGstPeriod("all");
        setPreset("custom");
      }
    },
    [filtersConfig],
  );

  const handleGstPeriodChange = useCallback(
    (period: string) => {
      setGstPeriod(period);
      if (period !== "all") {
        const range = gstPeriodToDateRange(period, {
          from: dateFrom,
          to: dateTo,
        });
        setDateFrom(range.from);
        setDateTo(range.to);
        setPreset("custom");
      }
    },
    [dateFrom, dateTo],
  );

  const defaultFyRange = useMemo(() => {
    if (!filtersConfig) {
      return { from: PLACEHOLDER_DATE, to: PLACEHOLDER_DATE, fyId: "" };
    }
    return {
      from: filtersConfig.defaults.from_date ?? PLACEHOLDER_DATE,
      to: filtersConfig.defaults.to_date ?? PLACEHOLDER_DATE,
      fyId: filtersConfig.defaults.financial_year_id ?? "",
    };
  }, [filtersConfig]);

  const hasFilters =
    datesReady &&
    (financialYearId !== defaultFyRange.fyId ||
      gstPeriod !== "all" ||
      dateFrom !== defaultFyRange.from ||
      dateTo !== defaultFyRange.to ||
      isMultiFilterActive(branch) ||
      gstRegistration !== "all");

  const resetFilters = useCallback(() => {
    setPreset("custom");
    setDateFrom(defaultFyRange.from);
    setDateTo(defaultFyRange.to);
    setFinancialYearId(defaultFyRange.fyId);
    setGstPeriod("all");
    setBranch([]);
    setGstRegistration("all");
  }, [defaultFyRange]);

  const gstPeriodOptions = useMemo(() => {
    const all = { value: "all", label: "All months" };
    const fy = filtersConfig?.financial_years.find(
      (f) => f.financial_year_id === financialYearId,
    );
    if (fy?.start_date && fy?.end_date) {
      return [
        all,
        ...buildGstPeriodOptionsForRange(fy.start_date, fy.end_date),
      ];
    }
    if (filtersConfig?.gst_periods?.length) {
      return [all, ...filtersConfig.gst_periods];
    }
    return [all];
  }, [filtersConfig, financialYearId]);

  const branchLabeledOptions = useMemo((): ReportMultiSelectOption[] => {
    return (filtersConfig?.branches ?? []).map((b) => ({
      value: b.warehouse_id,
      label: b.warehouse_name,
    }));
  }, [filtersConfig]);

  const gstRegistrationOptions = useMemo(() => {
    const regs = (filtersConfig?.gst_registrations ?? []).map((r) => ({
      value: r.gstin,
      label: r.label || r.gstin,
    }));
    return [{ value: "all", label: "All registrations" }, ...regs];
  }, [filtersConfig]);

  const queryParams = useMemo((): GstSummaryQueryParams | null => {
    if (!datesReady || !financialYearId || !dateFrom || !dateTo) return null;
    return {
      financial_year_id: financialYearId,
      from_date: dateFrom,
      to_date: dateTo,
      gst_period: gstPeriod !== "all" ? gstPeriod : undefined,
      warehouse_ids: branch,
      branch_ids: branch,
      gstin: gstRegistration !== "all" ? gstRegistration : undefined,
    };
  }, [
    datesReady,
    financialYearId,
    dateFrom,
    dateTo,
    gstPeriod,
    branch,
    gstRegistration,
  ]);

  return {
    mounted,
    datesReady: datesReady && !!filtersConfig,
    filtersLoading,
    filtersError,
    filtersConfig,
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
    branchLabeledOptions,
    gstRegistration,
    setGstRegistration,
    gstRegistrationOptions,
    filters,
    queryParams,
    hasFilters,
    resetFilters,
    defaultFyRange,
  };
}
