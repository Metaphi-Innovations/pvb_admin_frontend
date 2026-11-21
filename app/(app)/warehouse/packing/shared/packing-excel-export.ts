import type { FilterState, SortState } from "@/components/listing/types";
import { exportRowsToExcel } from "@/lib/warehouse/export-excel";
import {
  buildPackingListApiFilters,
  buildPackingListOrdering,
  PackingListService,
  type ReadyExportSummaryRow,
} from "@/services/packing-list.service";
import type { PackingSourceTab } from "../lib/packing-list-nav";

function mapReadySummaryExcelRow(row: ReadyExportSummaryRow) {
  return {
    Product: row.product,
    SKU: row.sku,
    Batch: row.batch,
    "Cases to Pack": row.cases_to_pack,
  };
}

/** Export aggregated pending cases by Product + SKU + Batch for Ready For Packing. */
export async function exportReadyPackingBatchSummaryExcel(opts: {
  sourceFilter: PackingSourceTab;
  filters: FilterState;
  sort: SortState;
  selectedWarehouse?: string | null;
}): Promise<void> {
  const apiFilters = buildPackingListApiFilters(
    opts.filters,
    opts.selectedWarehouse,
  );
  apiFilters.source_type =
    opts.sourceFilter === "sales" ? "normal_sales" : opts.sourceFilter;

  const ordering = buildPackingListOrdering(opts.sort.key, opts.sort.direction);
  const search = String(opts.filters.search || "").trim();

  const { rows } = await PackingListService.exportReadySummary({
    search,
    ordering,
    apiFilters,
  });

  await exportRowsToExcel(rows.map(mapReadySummaryExcelRow), {
    sheetName: "Ready for packing",
    filePrefix: "ready-for-packing-batch-summary",
  });
}
