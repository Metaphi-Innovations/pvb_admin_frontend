"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, ClipboardCheck, Edit3 } from "lucide-react";
import { QcRecord, QcStatus } from "../types";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { getQcSourceType } from "@/lib/warehouse/grn-source";
import { QcService } from "@/services/qc.service";
import {
  buildQcCreateHref,
  buildQcListHref,
  getQcStatusTab,
  type QcStatusTab,
} from "../shared/qc-list-nav";
import { useQcListingState } from "../qc-listing-state-context";
import { exportQcListingExcel } from "../shared/qc-excel-export";
import { showToast } from "@/lib/toast";

type QcStockTransferRow = QcRecord;

const QC_STATUS_CONFIG: Record<QcStatus, { bg: string; label: string }> = {
  pending: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending QC" },
  completed: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Completed" },
};

export function StockTransferQcListing() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = getQcStatusTab(searchParams);
  const { getListing, setListing, setStatusForSource } = useQcListingState();
  const {
    filters: qcFilters,
    sort: qcSort,
    page: qcPage,
    pageSize: qcPageSize,
  } = getListing("stock-transfer", activeTab);

  useEffect(() => {
    setStatusForSource("stock-transfer", activeTab);
  }, [activeTab, setStatusForSource]);

  const [apiQcList, setApiQcList] = useState<QcRecord[]>([]);
  const [apiTotal, setApiTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportQcListingExcel({
        source: "stock-transfer",
        statusTab: activeTab,
        filters: qcFilters,
        sort: qcSort,
      });
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to export QC list.",
        "error",
      );
    } finally {
      setExporting(false);
    }
  }, [exporting, activeTab, qcFilters, qcSort]);

  const [qcNoOptions, setQcNoOptions] = useState<{ label: string; value: string }[]>([]);
  const [grnNoOptions, setGrnNoOptions] = useState<{ label: string; value: string }[]>([]);
  const [stockTransferNoOptions, setStockTransferNoOptions] = useState<{ label: string; value: string }[]>([]);
  const [fromWarehouseOptions, setFromWarehouseOptions] = useState<{ label: string; value: string }[]>([]);
  const [toWarehouseOptions, setToWarehouseOptions] = useState<{ label: string; value: string }[]>([]);
  const loadedFiltersRef = React.useRef<Set<string>>(new Set());

  const listReturnTo = useMemo(
    () => buildQcListHref(pathname, { qcStatus: activeTab, searchParams }),
    [pathname, activeTab, searchParams],
  );

  const setActiveTab = useCallback(
    (tab: QcStatusTab) => {
      setStatusForSource("stock-transfer", tab);
      router.replace(buildQcListHref(pathname, { qcStatus: tab, searchParams }));
    },
    [router, pathname, searchParams, setStatusForSource],
  );

  const handleFilterChange = useCallback(
    (filters: FilterState) => {
      setListing("stock-transfer", activeTab, (prev) => ({
        ...prev,
        filters,
        page: 1,
      }));
    },
    [activeTab, setListing],
  );

  const handleSortChange = useCallback(
    (sort: SortState) => {
      setListing("stock-transfer", activeTab, (prev) => ({
        ...prev,
        sort,
        page: 1,
      }));
    },
    [activeTab, setListing],
  );

  const setQcPage = useCallback(
    (page: number) => {
      setListing("stock-transfer", activeTab, (prev) => ({ ...prev, page }));
    },
    [activeTab, setListing],
  );

  const setQcPageSize = useCallback(
    (pageSize: number) => {
      setListing("stock-transfer", activeTab, (prev) => ({
        ...prev,
        pageSize,
        page: 1,
      }));
    },
    [activeTab, setListing],
  );

  const handleOpenFilter = async (columnKey: string) => {
    if (loadedFiltersRef.current.has(columnKey)) return;
    loadedFiltersRef.current.add(columnKey);
    try {
      if (columnKey === "qcNo") {
        const data = await QcService.getFilterDropdown("qcNumber", "STOCK_TRANSFER");
        setQcNoOptions(data.map((item: any) => ({ label: item.qcNumber, value: item.qcNumber })));
      } else if (columnKey === "grnNo") {
        if (activeTab === "pending") {
          const data = await QcService.getGrnFilterDropdown("grnNumber", "STOCK_TRANSFER", "QC_PENDING");
          setGrnNoOptions(data.map((item: any) => ({ label: item.grnNumber, value: item.grnNumber })));
        } else {
          const data = await QcService.getFilterDropdown("grn__grnNumber", "STOCK_TRANSFER");
          setGrnNoOptions(data.map((item: any) => ({ label: item.grn__grnNumber, value: item.grn__grnNumber })));
        }
      } else if (columnKey === "stockTransferNo") {
        if (activeTab === "pending") {
          const data = await QcService.getGrnFilterDropdown("stock_transfer_no", "STOCK_TRANSFER", "QC_PENDING");
          setStockTransferNoOptions(
            data.map((item: any) => ({
              label: item.stock_transfer_no,
              value: item.stock_transfer_no,
            })),
          );
        } else {
          const data = await QcService.getFilterDropdown("poNumber", "STOCK_TRANSFER");
          setStockTransferNoOptions(
            data.map((item: any) => ({ label: item.poNumber, value: item.poNumber })),
          );
        }
      } else if (columnKey === "fromWarehouse") {
        if (activeTab === "pending") {
          const data = await QcService.getGrnFilterDropdown("from_warehouse", "STOCK_TRANSFER", "QC_PENDING");
          setFromWarehouseOptions(
            data.map((item: any) => ({
              label: item.from_warehouse,
              value: item.from_warehouse,
            })),
          );
        } else {
          const data = await QcService.getFilterDropdown("vendorName", "STOCK_TRANSFER");
          setFromWarehouseOptions(
            data.map((item: any) => ({
              label: item.supplierName || item.vendorName,
              value: item.supplierName || item.vendorName,
            })),
          );
        }
      } else if (columnKey === "toWarehouse") {
        if (activeTab === "pending") {
          const data = await QcService.getGrnFilterDropdown(
            "warehouse__warehouse_name",
            "STOCK_TRANSFER",
            "QC_PENDING",
          );
          setToWarehouseOptions(
            data.map((item: any) => ({
              label: item.warehouse__warehouse_name,
              value: item.warehouse__warehouse_name,
            })),
          );
        } else {
          const data = await QcService.getFilterDropdown(
            "grn__warehouse__warehouse_name",
            "STOCK_TRANSFER",
          );
          setToWarehouseOptions(
            data.map((item: any) => ({
              label: item.grn__warehouse__warehouse_name,
              value: item.grn__warehouse__warehouse_name,
            })),
          );
        }
      }
    } catch (err) {
      console.error(`Error loading filter options for ${columnKey}:`, err);
      loadedFiltersRef.current.delete(columnKey);
    }
  };

  useEffect(() => {
    // Status tab change: keep per-tab filters; only reset dropdown caches / rows.
    setApiQcList([]);
    loadedFiltersRef.current.clear();
    setQcNoOptions([]);
    setGrnNoOptions([]);
    setStockTransferNoOptions([]);
    setFromWarehouseOptions([]);
    setToWarehouseOptions([]);
  }, [activeTab]);

  useEffect(() => {
    const fetchQcs = async () => {
      setIsLoading(true);
      try {
        let ordering = undefined;
        if (qcSort.key && qcSort.direction !== "none") {
          let baseKey = qcSort.key;
          if (activeTab === "pending") {
            const mapping: Record<string, string> = {
              grnNo: "grnNumber",
              stockTransferNo: "stock_transfer_no",
              fromWarehouse: "from_warehouse",
              toWarehouse: "warehouse__warehouse_name",
              warehouse: "warehouse__warehouse_name",
              receivedQty: "receivedQty",
              totalReceivedQty: "receivedQty",
              itemCount: "item_count",
            };
            baseKey = mapping[qcSort.key] || qcSort.key;
          } else {
            const mapping: Record<string, string> = {
              qcNo: "qcNumber",
              grnNo: "grn__grnNumber",
              stockTransferNo: "poNumber",
              fromWarehouse: "vendorName",
              toWarehouse: "grn__warehouse__warehouse_name",
              warehouse: "grn__warehouse__warehouse_name",
              inspectionDate: "qcDate",
              receivedQty: "receivedQty",
              totalReceivedQty: "receivedQty",
              itemCount: "item_count",
            };
            baseKey = mapping[qcSort.key] || qcSort.key;
          }
          ordering = qcSort.direction === "desc" ? `-${baseKey}` : baseKey;
        }

        const filters: any = {};
        filters.source_type = "STOCK_TRANSFER";
        if (qcFilters.qcNo) {
          filters.qcNumber = qcFilters.qcNo;
        }
        if (qcFilters.grnNo) {
          if (activeTab === "pending") {
            filters.grnNumber = qcFilters.grnNo;
          } else {
            filters.grn = filters.grn || {};
            filters.grn.grnNumber = qcFilters.grnNo;
          }
        }
        if (qcFilters.stockTransferNo) {
          if (activeTab === "pending") {
            filters.stock_transfer_no = qcFilters.stockTransferNo;
          } else {
            filters.poNumber = qcFilters.stockTransferNo;
          }
        }
        if (qcFilters.fromWarehouse) {
          if (activeTab === "pending") {
            filters.from_warehouse = qcFilters.fromWarehouse;
          } else {
            filters.from_warehouse = qcFilters.fromWarehouse;
          }
        }
        if (qcFilters.toWarehouse) {
          if (activeTab === "pending") {
            filters.warehouse = filters.warehouse || {};
            filters.warehouse.warehouse_name = qcFilters.toWarehouse;
          } else {
            filters.grn = filters.grn || {};
            filters.grn.warehouse = filters.grn.warehouse || {};
            filters.grn.warehouse.warehouse_name = qcFilters.toWarehouse;
          }
        }
        if (qcFilters.inspectionDate) {
          const range = qcFilters.inspectionDate as { fromDate: string; toDate: string };
          if (range.fromDate || range.toDate) {
            filters.range = filters.range || {};
            filters.range.qcDate = {
              from: range.fromDate || undefined,
              to: range.toDate || undefined,
            };
          }
        }

        const fetchMethod = activeTab === "pending" ? QcService.listPending : QcService.list;
        const res = await fetchMethod({
          page: qcPage,
          page_size: qcPageSize,
          search: (qcFilters.search as string) || undefined,
          ordering,
          filters,
        });

        const stockTransferOnly = res.data.filter((q) => getQcSourceType(q) === "stock_transfer");
        setApiQcList(stockTransferOnly);
        setApiTotal(res.totalRecords);
      } catch (err) {
        console.error("Error loading stock transfer QCs:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQcs();
  }, [activeTab, qcPage, qcPageSize, qcFilters, qcSort]);

  const displayedData = apiQcList;
  const displayedTotal = apiTotal;

  const stockTransferColumns: ColumnConfig<QcStockTransferRow>[] = [
    {
      key: "qcNo",
      header: "QC No.",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: qcNoOptions,
      width: "130px",
      render: (_val, row) => (
        <Link
          href={
            row.status === "pending"
              ? buildQcCreateHref({ grnId: row.id, returnTo: listReturnTo })
              : `/warehouse/qc/view/${row.id}?returnTo=${encodeURIComponent(listReturnTo)}`
          }
          className="block group/name"
        >
          <span className="font-mono text-xs font-semibold text-brand-700 group-hover/name:text-brand-800">
            {row.qcNo}
          </span>
        </Link>
      ),
    },
    {
      key: "stockTransferNo",
      header: "Stock Transfer No.",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: stockTransferNoOptions,
      width: "140px",
      render: (_val, row) => (
        <span className="font-mono text-xs font-semibold text-brand-700">
          {row.stockTransferNo || row.poNumber || "—"}
        </span>
      ),
    },
    {
      key: "grnNo",
      header: "GRN No.",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: grnNoOptions,
      width: "130px",
      render: (_val, row) => <span className="font-mono text-xs text-foreground">{row.grnNo}</span>,
    },
    {
      key: "fromWarehouse",
      header: "From Warehouse",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: fromWarehouseOptions,
      width: "260px",
      render: (_val, row) => {
        const label = row.fromWarehouse || row.vendorName || "—";
        return (
          <span className="text-xs text-foreground" title={label !== "—" ? label : undefined}>
            {label}
          </span>
        );
      },
    },
    {
      key: "toWarehouse",
      header: "To Warehouse",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: toWarehouseOptions,
      width: "260px",
      render: (_val, row) => {
        const label = row.toWarehouse || row.warehouse || "—";
        return (
          <span className="text-xs text-foreground" title={label !== "—" ? label : undefined}>
            {label}
          </span>
        );
      },
    },
    {
      key: "inspectionDate",
      header: "Inspection Date",
      sortable: true,
      filterable: true,
      filterType: "date",
      width: "130px",
      render: (_val, row) => (
        <span className="text-xs text-foreground">{row.inspectionDate?.trim() ? row.inspectionDate : "—"}</span>
      ),
    },
    {
      key: "itemCount",
      header: "Items",
      sortable: true,
      align: "right",
      width: "90px",
      render: (_val, row) => (
        <span className="text-xs font-medium tabular-nums">
          {(row.itemCount ?? row.items?.length ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: "status",
      header: "QC Status",
      sortable: false,
      width: "120px",
      render: (val: QcStatus) => {
        const cfg = QC_STATUS_CONFIG[val] ?? {
          bg: "bg-slate-100 text-slate-700 border-slate-200",
          label: "Unknown",
        };
        return (
          <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
            {cfg.label}
          </span>
        );
      },
    },
  ];

  const displayedColumns = useMemo(() => {
    if (activeTab === "pending") {
      return stockTransferColumns.filter((col) => col.key !== "qcNo" && col.key !== "inspectionDate");
    }
    return stockTransferColumns;
  }, [
    activeTab,
    qcNoOptions,
    grnNoOptions,
    stockTransferNoOptions,
    fromWarehouseOptions,
    toWarehouseOptions,
    listReturnTo,
  ]);

  const stockTransferActions: ActionItemConfig<QcStockTransferRow>[] = [
    {
      label: "View Details",
      action: "view",
      icon: Eye,
      onClick: (row) =>
        router.push(
          row.status === "pending"
            ? buildQcCreateHref({ grnId: row.id, returnTo: listReturnTo })
            : `/warehouse/qc/view/${row.id}?returnTo=${encodeURIComponent(listReturnTo)}`,
        ),
      hide: (row) => row.status === "pending",
    },
    {
      label: "Perform QC",
      action: "inspect",
      icon: ClipboardCheck,
      onClick: (row) =>
        router.push(buildQcCreateHref({ grnId: row.id, returnTo: listReturnTo })),
      hide: (row) => row.status !== "pending",
    },
    {
      label: "Edit QC",
      action: "edit",
      icon: Edit3,
      onClick: (row) =>
        router.push(buildQcCreateHref({ qcId: row.id, edit: true, returnTo: listReturnTo })),
      hide: (row) => row.status === "pending",
      disabled: (row) => !row.isEditable,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[{ id: "pending", label: "Pending QC" }, { id: "completed", label: "Completed" }].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as QcStatusTab)}
            className={`h-8 px-3 text-xs rounded-lg border transition-colors font-medium inline-flex items-center gap-1.5 ${
              activeTab === tab.id
                ? "bg-brand-600 text-white border-brand-600"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <MasterListing<QcStockTransferRow>
        data={displayedData}
        columns={displayedColumns}
        actions={stockTransferActions}
        totalRecords={displayedTotal}
        page={qcPage}
        pageSize={qcPageSize}
        onPageChange={setQcPage}
        onPageSizeChange={setQcPageSize}
        currentFilters={qcFilters}
        onFilterChange={handleFilterChange}
        currentSort={qcSort}
        onSortChange={handleSortChange}
        onOpenFilter={handleOpenFilter}
        searchPlaceholder="Search QC, GRN or Transfer No..."
        loading={isLoading}
        onExport={() => void handleExport()}
      />
    </div>
  );
}
