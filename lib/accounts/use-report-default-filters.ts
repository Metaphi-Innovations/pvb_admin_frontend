"use client";

import { useEffect, useState } from "react";
import {
  ensureFinancialYearsCurrent,
  loadFinancialYears,
} from "@/app/(app)/accounts/masters/masters-data";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import {
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";

/**
 * Standard report filter init: active FY + this-month date range.
 * Does NOT overwrite dates when FY changes — demo data uses relative dates
 * aligned with this_month / this_week presets.
 */
export function useReportDefaultFilters(preset: DateRangePresetId = "this_month") {
  const initialRange = resolveDateRangePreset(preset);
  const [financialYearId, setFinancialYearId] = useState("all");
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [datesReady, setDatesReady] = useState(false);

  useEffect(() => {
    ensureFinancialYearsCurrent();
    const { from, to } = resolveDateRangePreset(preset);
    const activeFyId = getActiveFinancialYearId();
    const years = loadFinancialYears();
    const activeFy =
      years.find((fy) => fy.id === activeFyId) ?? years.find((fy) => fy.status === "active");

    if (activeFy) {
      setFinancialYearId(String(activeFy.id));
    }
    setDateFrom(from);
    setDateTo(to);
    setDatesReady(true);
  }, [preset]);

  return {
    financialYearId,
    setFinancialYearId,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    datesReady,
  };
}
