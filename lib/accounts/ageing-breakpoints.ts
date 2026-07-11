/**
 * Shared ageing breakpoint utilities for Customer and Supplier/Vendor Ageing reports.
 */

export type AgeingBreakpoints = number[];

export const DEFAULT_AGEING_BREAKPOINTS: AgeingBreakpoints = [0, 90];

export interface GeneratedAgeingBucket {
  index: number;
  label: string;
  from: number;
  to: number | null;
}

export interface AgeingBucketRow {
  buckets: number[];
}

export function generateAgeingBucketsFromBreakpoints(
  breakpoints: AgeingBreakpoints,
): GeneratedAgeingBucket[] {
  const sorted = [...breakpoints];
  const buckets: GeneratedAgeingBucket[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i < sorted.length - 1) {
      const from = i === 0 ? sorted[i] : sorted[i] + 1;
      const to = sorted[i + 1];
      buckets.push({
        index: i,
        label: `${from}–${to} Days`,
        from,
        to,
      });
    } else {
      buckets.push({
        index: i,
        label: `Above ${sorted[i]} Days`,
        from: sorted[i] + 1,
        to: null,
      });
    }
  }

  return buckets;
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
  for (let i = 0; i < breakpoints.length - 1; i++) {
    const from = i === 0 ? breakpoints[i] : breakpoints[i] + 1;
    const to = breakpoints[i + 1];
    if (days >= from && days <= to) return i;
  }
  return breakpoints.length - 1;
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
