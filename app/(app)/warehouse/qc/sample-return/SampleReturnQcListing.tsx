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

type QcSampleReturnRow = QcRecord;

const QC_STATUS_CONFIG: Record<QcStatus, { bg: string; label: string }> = {
  pending: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending QC" },
  completed: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Completed" },
};

export function SampleReturnQcListing() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = getQcStatusTab(searchParams);

  const [qcFilters, setQcFilters] = useState<FilterState>({});
  const [qcSort, setQcSort] = useState<SortState>({ key: "", direction: "none" });
  const [qcPage, setQcPage] = useState(1);
  const [qcPageSize, setQcPageSize] = useState(10);

  const [apiQcList, setApiQcList] = useState<QcRecord[]>([]);
  const [apiTotal, setApiTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [qcNoOptions, setQcNoOptions] = useState<{ label: string; value: string }[]>([]);
  const [grnNoOptions, setGrnNoOptions] = useState<{ label: string; value: string }[]>([]);
  const [poNoOptions, setPoNoOptions] = useState<{ label: string; value: string }[]>([]);
  const [vendorNameOptions, setVendorNameOptions] = useState<{ label: string; value: string }[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<{ label: string; value: string }[]>([]);
  const loadedFiltersRef = React.useRef<Set<string>>(new Set());

  const listReturnTo = useMemo(
    () =>
      buildQcListHref(pathname, {
        qcStatus: activeTab,
        searchParams,
      }),
    [pathname, activeTab, searchParams],
  );

  const setActiveTab = useCallback(
    (tab: QcStatusTab) => {
      router.replace(
        buildQcListHref(pathname, {
          qcStatus: tab,
          searchParams,
        }),
      );
    },
    [router, pathname, searchParams],
  );

  const handleFilterChange = useCallback((filters: FilterState) => {
    setQcFilters(filters);
    setQcPage(1);
  }, []);

  const handleSortChange = useCallback((sort: SortState) => {
    setQcSort(sort);
    setQcPage(1);
  }, []);

  const handleOpenFilter = async (columnKey: string) => {
    if (loadedFiltersRef.current.has(columnKey)) return;
    loadedFiltersRef.current.add(columnKey);
    try {
      if (columnKey === "qcNo") {
        const data = await QcService.getFilterDropdown("qcNumber", "SAMPLE_RETURN");
        setQcNoOptions(data.map((item: any) => ({ label: item.qcNumber, value: item.qcNumber })));
      } else if (columnKey === "grnNo") {
        if (activeTab === "pending") {
          const data = await QcService.getGrnFilterDropdown("grnNumber", "SAMPLE_RETURN", "QC_PENDING");
          setGrnNoOptions(data.map((item: any) => ({ label: item.grnNumber, value: item.grnNumber })));
        } else {
          const data = await QcService.getFilterDropdown("grn__grnNumber", "SAMPLE_RETURN");
          setGrnNoOptions(data.map((item: any) => ({ label: item.grn__grnNumber, value: item.grn__grnNumber })));
        }
      } else if (columnKey === "poNumber") {
        if (activeTab === "pending") {
          const data = await QcService.getGrnFilterDropdown("sample_return_no", "SAMPLE_RETURN", "QC_PENDING");
          setPoNoOptions(
            data.map((item: any) => ({ label: item.sample_return_no, value: item.sample_return_no })),
          );
        } else {
          const data = await QcService.getFilterDropdown("poNumber", "SAMPLE_RETURN");
          setPoNoOptions(data.map((item: any) => ({ label: item.poNumber, value: item.poNumber })));
        }
      } else if (columnKey === "vendorName") {
        if (activeTab === "pending") {
          const data = await QcService.getGrnFilterDropdown("customer_name", "SAMPLE_RETURN", "QC_PENDING");
          setVendorNameOptions(
            data.map((item: any) => ({ label: item.customer_name, value: item.customer_name })),
          );
        } else {
          const data = await QcService.getFilterDropdown("vendorName", "SAMPLE_RETURN");
          setVendorNameOptions(
            data.map((item: any) => ({
              label: item.supplierName || item.vendorName,
              value: item.supplierName || item.vendorName,
            })),
          );
        }
      } else if (columnKey === "warehouse") {
        if (activeTab === "pending") {
          const data = await QcService.getGrnFilterDropdown(
            "warehouse__warehouse_name",
            "SAMPLE_RETURN",
            "QC_PENDING",
          );
          setWarehouseOptions(
            data.map((item: any) => ({
              label: item.warehouse__warehouse_name,
              value: item.warehouse__warehouse_name,
            })),
          );
        } else {
          const data = await QcService.getFilterDropdown(
            "grn__warehouse__warehouse_name",
            "SAMPLE_RETURN",
          );
          setWarehouseOptions(
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
    setQcPage(1);
    setApiQcList([]);
    setQcFilters({});
    setQcSort({ key: "", direction: "none" });
    loadedFiltersRef.current.clear();
    setQcNoOptions([]);
    setGrnNoOptions([]);
    setPoNoOptions([]);
    setVendorNameOptions([]);
    setWarehouseOptions([]);
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
              poNumber: "sample_return_no",
              vendorName: "customer_name",
              warehouse: "warehouse__warehouse_name",
              totalReceivedQty: "receivedQty",
            };
            baseKey = mapping[qcSort.key] || qcSort.key;
          } else {
            const mapping: Record<string, string> = {
              qcNo: "qcNumber",
              grnNo: "grn__grnNumber",
              poNumber: "poNumber",
              inspectionDate: "qcDate",
              vendorName: "vendorName",
              warehouse: "grn__warehouse__warehouse_name",
              totalReceivedQty: "receivedQty",
            };
            baseKey = mapping[qcSort.key] || qcSort.key;
          }
          ordering = qcSort.direction === "desc" ? `-${baseKey}` : baseKey;
        }

        const filters: any = {};
        filters.source_type = "SAMPLE_RETURN";
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
        if (qcFilters.poNumber) {
          if (activeTab === "pending") {
            filters.sample_return_no = qcFilters.poNumber;
          } else {
            filters.poNumber = qcFilters.poNumber;
          }
        }
        if (qcFilters.vendorName) {
          if (activeTab === "pending") {
            filters.customer_name = qcFilters.vendorName;
          } else {
            filters.vendorName = qcFilters.vendorName;
          }
        }
        if (qcFilters.warehouse) {
          if (activeTab === "pending") {
            filters.warehouse = filters.warehouse || {};
            filters.warehouse.warehouse_name = qcFilters.warehouse;
          } else {
            filters.grn = filters.grn || {};
            filters.grn.warehouse = filters.grn.warehouse || {};
            filters.grn.warehouse.warehouse_name = qcFilters.warehouse;
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

        const sampleReturnOnly = res.data.filter((q) => getQcSourceType(q) === "sample_return");
        setApiQcList(sampleReturnOnly);
        setApiTotal(res.totalRecords);
      } catch (err) {
        console.error("Error loading QCs:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQcs();
  }, [activeTab, qcPage, qcPageSize, qcFilters, qcSort]);

  const displayedData = apiQcList;
  const displayedTotal = apiTotal;

  const sampleReturnColumns: ColumnConfig<QcSampleReturnRow>[] = [
    {
      key: "qcNo",
      header: "QC No.",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: qcNoOptions,
      width: "130px",
      render: (_val, row) => (
        <Link href={`/warehouse/qc/view/${row.id}?returnTo=${encodeURIComponent(listReturnTo)}`} className="block group/name">
          <span className="font-mono text-xs font-semibold text-brand-700 group-hover/name:text-brand-800">
            {row.qcNo}
          </span>
        </Link>
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
      key: "poNumber",
      header: "Sample Return No.",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: poNoOptions,
      width: "140px",
      render: (_val, row) => <span className="font-mono text-xs text-foreground">{row.poNumber || "—"}</span>,
    },
    {
      key: "vendorName",
      header: "Customer",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: vendorNameOptions,
      width: "150px",
      render: (_val, row) => <span className="text-xs text-foreground">{row.vendorName}</span>,
    },
    {
      key: "warehouse",
      header: "Warehouse",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: warehouseOptions,
      width: "140px",
      render: (_val, row) => <span className="text-xs text-foreground">{row.warehouse}</span>,
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
      key: "totalReceivedQty",
      header: "Returned Qty",
      sortable: true,
      align: "right",
      width: "110px",
      render: (val) => (
        <span className="text-xs font-medium tabular-nums text-foreground">
          {val != null ? val.toLocaleString() : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: false,
      width: "130px",
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
      return sampleReturnColumns.filter((col) => col.key !== "qcNo" && col.key !== "inspectionDate");
    }
    return sampleReturnColumns;
  }, [activeTab, qcNoOptions, grnNoOptions, poNoOptions, vendorNameOptions, warehouseOptions, listReturnTo]);

  const sampleReturnActions: ActionItemConfig<QcSampleReturnRow>[] = [
    {
      label: "View Details",
      action: "view",
      icon: Eye,
      onClick: (row) =>
        router.push(`/warehouse/qc/view/${row.id}?returnTo=${encodeURIComponent(listReturnTo)}`),
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

      <MasterListing<QcSampleReturnRow>
        data={displayedData}
        columns={displayedColumns}
        actions={sampleReturnActions}
        totalRecords={displayedTotal}
        page={qcPage}
        pageSize={qcPageSize}
        onPageChange={setQcPage}
        onPageSizeChange={(size) => {
          setQcPageSize(size);
          setQcPage(1);
        }}
        currentFilters={qcFilters}
        onFilterChange={handleFilterChange}
        currentSort={qcSort}
        onSortChange={handleSortChange}
        onOpenFilter={handleOpenFilter}
        searchPlaceholder="Search QC or GRN..."
        loading={isLoading}
      />
    </div>
  );
}
