/**
 * Shared sizing for long free-text listing fields (warehouse / supplier / customer).
 * Used by FilterPopover defaults and by warehouse column configs.
 */

/** Slightly wider than default filters; labels wrap so full names still show. */
export const LONG_NAME_FILTER_POPOVER_CLASS = "w-[300px] min-w-[280px]";

/** Listing column width: fits typical warehouse names; longer ones wrap. */
export const WAREHOUSE_COLUMN_WIDTH = "240px";

const WAREHOUSE_KEY_RE = /warehouse/i;
const LONG_NAME_FILTER_KEY_RE =
  /warehouse|supplier|customer|vendor|salesperson/i;

export function isWarehouseColumnKey(key: string): boolean {
  return WAREHOUSE_KEY_RE.test(key);
}

/** Columns whose filter option labels are typically long names. */
export function isLongNameFilterColumn(key: string, header?: string): boolean {
  return (
    LONG_NAME_FILTER_KEY_RE.test(key) || LONG_NAME_FILTER_KEY_RE.test(header ?? "")
  );
}

/** Columns whose filter option labels are typically long names. */
export function needsWideFilterPopover(column: {
  key: string;
  header?: string;
}): boolean {
  return isLongNameFilterColumn(column.key, column.header);
}

/** Spread onto warehouse listing columns for full name visibility + wider filter. */
export const warehouseColumnLayout = {
  filterPopoverClassName: LONG_NAME_FILTER_POPOVER_CLASS,
  filterWrapOptions: true,
  width: WAREHOUSE_COLUMN_WIDTH,
  wrap: true,
  truncate: false as const,
};
