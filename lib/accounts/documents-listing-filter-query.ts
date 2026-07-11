/** Query params shared by Documents Summary → transaction listing deep links. */

export interface DocumentsListingFilterParams {
  dateFrom: string;
  dateTo: string;
  branch: string;
  warehouse: string;
}

export function parseDocumentsListingFiltersFromSearch(
  search: string,
): Partial<DocumentsListingFilterParams> {
  const params = new URLSearchParams(search);
  const result: Partial<DocumentsListingFilterParams> = {};
  const from = params.get("from");
  const to = params.get("to");
  const branch = params.get("branch");
  const warehouse = params.get("warehouse");
  if (from) result.dateFrom = from;
  if (to) result.dateTo = to;
  if (branch) result.branch = branch;
  if (warehouse) result.warehouse = warehouse;
  return result;
}

export function hasDocumentsListingFilters(search: string): boolean {
  const params = new URLSearchParams(search);
  return !!(params.get("from") || params.get("to") || params.get("branch") || params.get("warehouse"));
}
