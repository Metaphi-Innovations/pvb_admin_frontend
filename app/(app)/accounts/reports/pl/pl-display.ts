/** Indian DD-MM-YYYY period formatting for Profit & Loss report headers. */

export function formatPlReportDate(iso: string): string {
  if (!iso) return "—";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [year, month, day] = parts;
  return `${day}-${month}-${year}`;
}

export function formatPlReportPeriod(dateFrom: string, dateTo: string): string {
  return `${formatPlReportDate(dateFrom)} to ${formatPlReportDate(dateTo)}`;
}

/** Hierarchy indent — level 1: 8px, level 2: 20px, level 3: 36px, level 4+: 52px */
export function plRowIndentPx(depth: number): number {
  if (depth <= 0) return 8;
  if (depth === 1) return 20;
  if (depth === 2) return 36;
  return 52;
}
