/** Accounts module date display helpers — not for use outside `/accounts`. */

const ISO_DATE_PREFIX_RE = /^(\d{4})-(\d{2})-(\d{2})/;
const DISPLAY_DATE_RE = /^(\d{2})[-/](\d{2})[-/](\d{4})$/;

/**
 * Extract a calendar date as YYYY-MM-DD without timezone shift.
 * Accepts ISO date strings, ISO datetimes, Date objects, and DD/MM/YYYY input.
 */
export function toIsoDateOnly(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const raw = String(value).trim();
  if (!raw || raw === "—") return "";

  const isoMatch = ISO_DATE_PREFIX_RE.exec(raw);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const displayMatch = DISPLAY_DATE_RE.exec(raw);
  if (displayMatch) {
    return `${displayMatch[3]}-${displayMatch[2]}-${displayMatch[1]}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  if (raw.includes("T")) return parsed.toISOString().slice(0, 10);
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Format any date-like value for human display as DD/MM/YYYY. */
export function formatDisplayDate(value: unknown, fallback = "—"): string {
  if (value == null || value === "" || value === "—") return fallback;
  const raw = String(value).trim();
  if (!raw) return fallback;

  const displayMatch = DISPLAY_DATE_RE.exec(raw);
  if (displayMatch) {
    return `${displayMatch[1]}/${displayMatch[2]}/${displayMatch[3]}`;
  }

  const iso = toIsoDateOnly(raw);
  if (!iso || !ISO_DATE_PREFIX_RE.test(iso)) return fallback;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** ISO date (yyyy-mm-dd) or ISO datetime → display (dd/mm/yyyy) */
export function isoToDisplayDate(iso: string): string {
  return formatDisplayDate(iso, "");
}

/** Display date (dd/mm/yyyy or dd-mm-yyyy) → ISO (yyyy-mm-dd) */
export function displayToIsoDate(display: string): string {
  const trimmed = display.trim();
  if (!trimmed) return "";
  const match = DISPLAY_DATE_RE.exec(trimmed);
  if (!match) return "";
  const [, d, m, y] = match;
  return `${y}-${m}-${d}`;
}

/** For native `<input type="date">` values — returns YYYY-MM-DD. */
export function formatDateInput(value: unknown): string {
  return toIsoDateOnly(value);
}

/** Today as YYYY-MM-DD in local calendar. */
export function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Alias used by listing/export code paths. */
export function formatDateOnly(value: unknown, fallback = "—"): string {
  return formatDisplayDate(value, fallback);
}

/** Format a date range for display: `01/09/2026 - 30/09/2026`. */
export function formatDisplayDateRange(
  from: unknown,
  to: unknown,
  fallback = "—",
): string {
  const fromLabel = formatDisplayDate(from, "");
  const toLabel = formatDisplayDate(to, "");
  if (fromLabel && toLabel) return `${fromLabel} - ${toLabel}`;
  if (fromLabel) return fromLabel;
  if (toLabel) return toLabel;
  return fallback;
}

/** Datetime for audit/history — date as DD/MM/YYYY with time in en-IN. */
export function formatDisplayDateTime(value: unknown, fallback = "—"): string {
  if (value == null || value === "" || value === "—") return fallback;
  const raw = String(value).trim();
  if (!raw) return fallback;

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    const dateOnly = formatDisplayDate(raw, "");
    return dateOnly || fallback;
  }

  const datePart = formatDisplayDate(raw, "");
  const timePart = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  return `${datePart}, ${timePart}`;
}
