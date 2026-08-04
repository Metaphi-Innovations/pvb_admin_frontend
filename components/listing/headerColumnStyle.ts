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
