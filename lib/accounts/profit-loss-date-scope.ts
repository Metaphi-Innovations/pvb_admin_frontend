import {
  DATE_RANGE_PRESET_OPTIONS,
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";

export interface FyDateBounds {
  start: string;
  end: string;
}

export interface ProfitLossDateState {
  from: string;
  to: string;
  preset: DateRangePresetId;
  /** True when supplied dates were outside the financial year and were replaced. */
  normalized: boolean;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function dateInsideFy(date: string, bounds: FyDateBounds): boolean {
  return isIsoDate(date) && date >= bounds.start && date <= bounds.end;
}

export function rangeInsideFy(from: string, to: string, bounds: FyDateBounds): boolean {
  return dateInsideFy(from, bounds) && dateInsideFy(to, bounds) && from <= to;
}

/** Approved default: FY start through today, or the full FY when today is outside it. */
export function defaultProfitLossRange(bounds: FyDateBounds, today: string): { from: string; to: string } {
  if (!isIsoDate(today) || today < bounds.start || today > bounds.end) {
    return { from: bounds.start, to: bounds.end };
  }
  return { from: bounds.start, to: today };
}

export function presetFitsFinancialYear(
  preset: DateRangePresetId,
  bounds: FyDateBounds,
  refDate = new Date(),
): boolean {
  if (preset === "custom") return true;
  if (preset === "all_transactions") return false;
  const { from, to } = resolveDateRangePreset(preset, refDate);
  return rangeInsideFy(from, to, bounds);
}

export function disabledProfitLossPresets(
  bounds: FyDateBounds,
  refDate = new Date(),
  options: { id: DateRangePresetId }[] = DATE_RANGE_PRESET_OPTIONS,
): DateRangePresetId[] {
  return options
    .map((option) => option.id)
    .filter((preset) => preset !== "custom" && !presetFitsFinancialYear(preset, bounds, refDate));
}

/**
 * Keep a valid in-FY range. Replace an out-of-FY range with the approved default.
 * Does not invent a midpoint or clamp one side independently.
 */
export function resolveProfitLossDates(input: {
  from: string;
  to: string;
  preset: DateRangePresetId;
  bounds: FyDateBounds;
  today: string;
  refDate?: Date;
}): ProfitLossDateState {
  const refDate = input.refDate ?? new Date(`${input.today}T12:00:00`);
  const valid = rangeInsideFy(input.from, input.to, input.bounds);
  if (valid) {
    const preset =
      input.preset !== "custom" && !presetFitsFinancialYear(input.preset, input.bounds, refDate)
        ? "custom"
        : input.preset;
    return {
      from: input.from,
      to: input.to,
      preset,
      normalized: false,
    };
  }
  const fallback = defaultProfitLossRange(input.bounds, input.today);
  return {
    from: fallback.from,
    to: fallback.to,
    preset: "custom",
    normalized: true,
  };
}

export function canRequestProfitLoss(input: {
  financialYearId: string;
  from: string;
  to: string;
  bounds: FyDateBounds | null;
}): boolean {
  if (!input.financialYearId || input.financialYearId === "all" || !input.bounds) return false;
  return rangeInsideFy(input.from, input.to, input.bounds);
}
