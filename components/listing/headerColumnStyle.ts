import type { CSSProperties } from "react";

/** Approximate min width so a header label + sort/filter icons stay on one line. */
export function headerContentMinWidthPx(
  header: string,
  opts?: { sortable?: boolean; filterable?: boolean },
): number {
  const padX = 32; // px-4 left + right
  const charPx = 7.4; // text-xs
  const sortIcon = opts?.sortable ? 14 : 0;
  const filterIcon = opts?.filterable ? 20 : 0;
  const gaps =
    (opts?.sortable ? 2 : 0) + (opts?.filterable ? 2 : 0);
  return Math.ceil(padX + header.length * charPx + sortIcon + filterIcon + gaps);
}

export function parseCssPx(value?: string): number | null {
  if (!value) return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

/** Keep configured width, but never shrink below what the header needs. */
export function listingHeaderCellStyle(opts: {
  width?: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
}): CSSProperties {
  const contentMin = headerContentMinWidthPx(opts.header, {
    sortable: opts.sortable,
    filterable: opts.filterable,
  });
  const configured = parseCssPx(opts.width);
  const minWidth = Math.max(configured ?? 0, contentMin);

  if (!opts.width) {
    return { minWidth };
  }

  return {
    width: opts.width,
    minWidth,
  };
}

/**
 * Body cell width: never shrink below the configured column width.
 * Only cap with maxWidth when truncating (long text + tooltip).
 * Non-truncating cells (e.g. amounts) can grow so the last digits are not clipped.
 */
export function listingBodyCellStyle(opts: {
  width?: string;
  truncate: boolean;
}): CSSProperties {
  if (!opts.width) {
    return opts.truncate ? { minWidth: 0 } : {};
  }

  if (opts.truncate) {
    return {
      width: opts.width,
      minWidth: opts.width,
      maxWidth: opts.width,
    };
  }

  return {
    width: opts.width,
    minWidth: opts.width,
  };
}

/** Keys that hold short structured values (dates/ranges) — never clip by default. */
const NO_TRUNCATE_KEY =
  /(^|_)(validity|validFrom|validTo|startDate|endDate|fromDate|toDate|date)(_|$)/i;

/**
 * Default truncate behavior for listing columns.
 * Long free-text truncates with tooltip; amounts, dates, status widgets stay full.
 */
export function listingShouldTruncate(opts: {
  truncate?: boolean;
  align?: "left" | "center" | "right";
  filterType?: string;
  key: string;
}): boolean {
  if (opts.truncate !== undefined) return opts.truncate;
  if (opts.align === "right") return false;
  if (opts.filterType === "audit" || opts.filterType === "date") return false;
  if (["status", "actions"].includes(opts.key)) return false;
  if (NO_TRUNCATE_KEY.test(opts.key)) return false;
  return true;
}
