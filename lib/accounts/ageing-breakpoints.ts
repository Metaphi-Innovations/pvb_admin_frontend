/**
 * Shared ageing breakpoint utilities for Customer and Supplier/Vendor Ageing reports.
 */

export type AgeingBreakpoints = number[];

/**
 * Default breakpoints aligned with the receivables backend
 * (`DEFAULT_AGING_BREAKPOINTS` → labels 0-30, 31-60, 61-90, 91+).
 */
export const DEFAULT_AGEING_BREAKPOINTS: AgeingBreakpoints = [0, 31, 61, 91];

export interface GeneratedAgeingBucket {
  index: number;
  label: string;
  from: number;
  to: number | null;
}

export interface AgeingBucketRow {
  buckets: number[];
}

/**
 * API bucket keys matching backend `buildAgingBucketLabels`.
 * Example: [0, 31, 61, 91] → ["0-30", "31-60", "61-90", "91+"]
 */
export function getApiAgeingBucketKeys(breakpoints: AgeingBreakpoints): string[] {
  const labels: string[] = [];
  for (let i = 0; i < breakpoints.length; i++) {
    const start = breakpoints[i]!;
    const next = breakpoints[i + 1];
    if (next == null) {
      labels.push(`${start}+`);
    } else {
      labels.push(`${start}-${next - 1}`);
    }
  }
  return labels;
}

/** Human-readable column header for an API bucket key. */
export function formatApiAgeingBucketLabel(apiKey: string): string {
  if (apiKey.endsWith("+")) {
    const start = Number(apiKey.slice(0, -1));
    if (Number.isFinite(start) && start > 0) {
      return `Above ${start - 1} Days`;
    }
    return `${apiKey} Days`;
  }
  return `${apiKey.replace("-", "–")} Days`;
}

export function generateAgeingBucketsFromBreakpoints(
  breakpoints: AgeingBreakpoints,
): GeneratedAgeingBucket[] {
  const keys = getApiAgeingBucketKeys(breakpoints);
  return keys.map((key, index) => {
    if (key.endsWith("+")) {
      const from = Number(key.slice(0, -1));
      return {
        index,
        label: formatApiAgeingBucketLabel(key),
        from: Number.isFinite(from) ? from : breakpoints[index] ?? 0,
        to: null,
      };
    }
    const [fromStr, toStr] = key.split("-");
    const from = Number(fromStr);
    const to = Number(toStr);
    return {
      index,
      label: formatApiAgeingBucketLabel(key),
      from: Number.isFinite(from) ? from : 0,
      to: Number.isFinite(to) ? to : null,
    };
  });
}

export function getAgeingBucketLabels(breakpoints: AgeingBreakpoints): string[] {
  return generateAgeingBucketsFromBreakpoints(breakpoints).map((b) => b.label);
}

export function validateAgeingBreakpoints(breakpoints: AgeingBreakpoints): string | null {
  if (breakpoints.length < 2) {
    return "At least two breakpoints are required (starting with 0).";
  }
  if (breakpoints[0] !== 0) {
    return "First breakpoint must be 0.";
  }

  for (const value of breakpoints) {
    if (!Number.isFinite(value) || value < 0) {
      return "Breakpoints must be valid non-negative numbers.";
    }
  }

  for (let i = 1; i < breakpoints.length; i++) {
    if (breakpoints[i] <= breakpoints[i - 1]) {
      return "Breakpoints must be in strictly ascending order with no duplicates.";
    }
  }

  return null;
}

export function effectiveOverdueDays(daysOverdue: number, asOfDate: string, dueDate: string): number {
  const a = new Date(dueDate.length === 10 ? `${dueDate}T00:00:00` : dueDate);
  const b = new Date(asOfDate.length === 10 ? `${asOfDate}T00:00:00` : asOfDate);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return daysOverdue;
  if (Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) <= 0) return 0;
  return daysOverdue;
}

export function classifyAgeingBucketIndex(days: number, breakpoints: AgeingBreakpoints): number {
  if (days < 0) return -1;
  for (let i = breakpoints.length - 1; i >= 0; i--) {
    if (days >= breakpoints[i]!) return i;
  }
  return 0;
}

export function emptyAgeingBuckets(count: number): number[] {
  return Array.from({ length: count }, () => 0);
}

export function ageingBucketColumnKey(index: number): string {
  return `bucket-${index}`;
}

/** Bucket indices with at least one non-zero amount; always returns at least one index. */
export function getVisibleAgeingBucketIndices(
  rows: AgeingBucketRow[],
  bucketCount: number,
): number[] {
  const nonEmpty: number[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const hasAmount = rows.some((r) => (r.buckets[i] ?? 0) > 0.009);
    if (hasAmount) nonEmpty.push(i);
  }
  if (nonEmpty.length === 0 && bucketCount > 0) return [0];
  return nonEmpty;
}

export function breakpointsToDraft(breakpoints: AgeingBreakpoints): string[] {
  return breakpoints.map(String);
}

export function draftToBreakpoints(draft: string[]): AgeingBreakpoints {
  return draft.map((value) => Number(value));
}
