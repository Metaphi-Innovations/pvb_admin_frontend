/**
 * Relative date helpers for Accounts demo/seed data.
 * All transaction dates are computed from the current system date at seed time
 * so default filters (Today, This Week, This Month) show records immediately.
 */

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today as YYYY-MM-DD */
export function demoToday(ref = new Date()): string {
  return toIsoDate(ref);
}

/** Date N calendar days before ref (0 = today) */
export function demoDaysAgo(days: number, ref = new Date()): string {
  const d = new Date(ref);
  d.setDate(d.getDate() - days);
  return toIsoDate(d);
}

/** Add days to an ISO date string */
export function demoAddDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/** Current calendar year (for document numbers) */
export function demoYear(ref = new Date()): number {
  return ref.getFullYear();
}

/** Document number: PREFIX-YYYY-NNNN (pad controls sequence width) */
export function demoDocNo(
  prefix: string,
  seq: number,
  ref = new Date(),
  pad = 4,
): string {
  return `${prefix}-${demoYear(ref)}-${String(seq).padStart(pad, "0")}`;
}

/** Indian FY opening date (Apr 1) for the FY containing ref */
export function demoFinancialYearStart(ref = new Date()): string {
  const month = ref.getMonth();
  const year = ref.getFullYear();
  const fyStartYear = month >= 3 ? year : year - 1;
  return `${fyStartYear}-04-01`;
}

/** A day in the previous calendar month */
export function demoLastMonthDay(dayOfMonth: number, ref = new Date()): string {
  const d = new Date(ref);
  d.setMonth(d.getMonth() - 1, dayOfMonth);
  return toIsoDate(d);
}

/**
 * Offsets spread across today, this week, this month, and last month.
 * Reused by seeds to distribute transaction dates.
 */
export const DEMO_TX_DATE_OFFSETS: readonly number[] = [
  0, 1, 2, 3, 5, 7, 10, 12, 14, 17, 20, 22, 25, 28, 32, 35, 38, 42, 45, 50, 55, 60, 65, 70, 75,
];

/** Pick a distributed demo date by index (wraps around DEMO_TX_DATE_OFFSETS). */
export function demoDateAt(index: number, ref = new Date()): string {
  return demoDaysAgo(DEMO_TX_DATE_OFFSETS[index % DEMO_TX_DATE_OFFSETS.length], ref);
}

/** ISO timestamp for activity/audit fields on a given date */
export function demoTimestamp(
  dateStr: string,
  time = "09:00:00",
): string {
  return `${dateStr}T${time}.000Z`;
}

/** Apply distributed dates to seed rows that omit `date` */
export function withDistributedDates<T extends Record<string, unknown>>(
  specs: T[],
  startIndex = 0,
  ref = new Date(),
): Array<T & { date: string }> {
  return specs.map((spec, i) => ({
    ...spec,
    date: demoDateAt(startIndex + i, ref),
  }));
}

/** Shift invoice/purchase seed rows to relative dates, preserving due-date span. */
export function applyRelativeInvoiceDates<
  T extends { id: number; invoiceNo: string; invoiceDate: string; dueDate: string },
>(
  specs: readonly T[],
  startIndex: number,
  docPrefix: string,
  ref = new Date(),
  docPad = 4,
): T[] {
  return specs.map((spec, i) => {
    const invoiceDate = demoDateAt(startIndex + i, ref);
    const dueSpan = Math.max(
      1,
      Math.round(
        (new Date(`${spec.dueDate}T12:00:00`).getTime() -
          new Date(`${spec.invoiceDate}T12:00:00`).getTime()) /
          86400000,
      ),
    );
    return {
      ...spec,
      invoiceNo: demoDocNo(docPrefix, spec.id, ref, docPad),
      invoiceDate,
      dueDate: demoAddDays(invoiceDate, dueSpan),
    };
  });
}

/** Purchase bills use `invoiceDate` only (no dueDate on all specs). */
export function applyRelativePurchaseDates<
  T extends { id: number; invoiceNo: string; invoiceDate: string },
>(specs: readonly T[], startIndex: number, ref = new Date(), docPad = 4): T[] {
  return specs.map((spec, i) => ({
    ...spec,
    invoiceNo: demoDocNo("PUR", spec.id, ref, docPad),
    invoiceDate: demoDateAt(startIndex + i, ref),
  }));
}
