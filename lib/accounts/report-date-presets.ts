export type DateRangePresetId =
  | "today"
  | "this_week"
  | "this_month"
  | "this_quarter"
  | "this_year"
  | "custom";

export const DATE_RANGE_PRESET_OPTIONS: { id: DateRangePresetId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "this_week", label: "This Week" },
  { id: "this_month", label: "This Month" },
  { id: "this_quarter", label: "This Quarter" },
  { id: "this_year", label: "This Year" },
  { id: "custom", label: "Custom Range" },
];

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function startOfQuarter(date: Date): Date {
  const d = new Date(date);
  const quarter = Math.floor(d.getMonth() / 3);
  d.setMonth(quarter * 3, 1);
  return d;
}

export function resolveDateRangePreset(
  preset: DateRangePresetId,
  refDate = new Date(),
): { from: string; to: string } {
  const to = formatIsoDate(refDate);

  switch (preset) {
    case "today":
      return { from: to, to };
    case "this_week":
      return { from: formatIsoDate(startOfWeek(refDate)), to };
    case "this_month": {
      const d = new Date(refDate);
      d.setDate(1);
      return { from: formatIsoDate(d), to };
    }
    case "this_quarter":
      return { from: formatIsoDate(startOfQuarter(refDate)), to };
    case "this_year": {
      const d = new Date(refDate);
      d.setMonth(0, 1);
      return { from: formatIsoDate(d), to };
    }
    case "custom":
    default:
      return { from: to, to };
  }
}

export function defaultDateRangeState(refDate = new Date()) {
  const preset: DateRangePresetId = "this_month";
  const { from, to } = resolveDateRangePreset(preset, refDate);
  return { preset, from, to };
}

export function defaultAsOnDate(refDate = new Date()): string {
  return formatIsoDate(refDate);
}
