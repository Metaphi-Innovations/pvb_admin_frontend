"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Edit2,
  Eye,
  Package,
  XCircle,
} from "lucide-react";
import { formatIndianRupeeDisplay } from "@/lib/currency/indian-rupee";

import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { ListingStatusToggle, isActiveStatus } from "@/components/listing";

import {
  useProducts,
  useToggleProductStatus,
  useExportProducts,
  useProductFilterDropdown,
} from "@/hooks/masters";
import { sortStateToOrdering, type ProductListRecord } from "@/app/(app)/masters/products/apis";
import {
  buildListApiFilters,
  MASTER_FILTER_FIELD_MAPS,
} from "@/lib/masters/list-api-filters";
import { useAppliedListFilters } from "@/lib/masters/use-applied-list-filters";
import { useLazyFilterColumns } from "@/lib/masters/use-lazy-filter-columns";
import { getMasterListErrorMessage, getErrorMessage } from "@/lib/masters/master-query-errors";
import type { MasterListKeyParams } from "@/lib/masters/master-query-keys";

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent?: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white border rounded-xl border-border">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", accent ? "bg-brand-600" : color ?? "bg-muted")}>
        <Icon className={cn("w-4 h-4", accent ? "text-white" : "text-muted-foreground")} />
      </div>
      <div>
        <p className="text-base font-bold leading-none text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

interface ToastState {
  msg: string;
  type: "success" | "error";
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
    >
      <CheckCircle2 className="flex-shrink-0 w-4 h-4" />
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <XCircle className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProductsPage() {
  const router = useRouter();
  const {
    draftFilters: filters,
    setDraftFilters: setFilters,
    appliedFilters,
    applyFilters,
    appliedSearch,
  } = useAppliedListFilters();
  const { handleOpenFilter, isFilterOpen } = useLazyFilterColumns();
  const [sort, setSort] = useState<SortState>({ key: "productName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);

  // ---- ordering / api-filters / status ----
  const ordering = useMemo(
    () => sortStateToOrdering(sort.key, sort.direction),
    [sort.key, sort.direction],
  );

  const apiFilters = useMemo(
    () => buildListApiFilters(appliedFilters, MASTER_FILTER_FIELD_MAPS.product, ["search"]),
    [appliedFilters],
  );

  const listParams = useMemo<MasterListKeyParams>(
    () => ({
      page,
      pageSize,
      search: appliedSearch,
      status: "all",
      apiFilters,
      ordering,
    }),
    [page, pageSize, appliedSearch, apiFilters, ordering],
  );

  const productCodeOptionsQuery = useProductFilterDropdown("product_code", {
    enabled: isFilterOpen("productCode"),
  });
  const productNameOptionsQuery = useProductFilterDropdown("product_name", {
    enabled: isFilterOpen("productName"),
  });
  const skuOptionsQuery = useProductFilterDropdown("sku", {
    enabled: isFilterOpen("sku"),
  });
  const supplierCodeOptionsQuery = useProductFilterDropdown("supplier_code", {
    enabled: isFilterOpen("supplierCode"),
  });
  const supplierNameOptionsQuery = useProductFilterDropdown("supplier_name", {
    enabled: isFilterOpen("supplier"),
  });
  const hsnCodeOptionsQuery = useProductFilterDropdown("hsnCode", {
    enabled: isFilterOpen("hsnCode"),
  });
  const categoryOptionsQuery = useProductFilterDropdown("categoryName", {
    enabled: isFilterOpen("category"),
  });
  const packSizeOptionsQuery = useProductFilterDropdown("pack_size", {
    enabled: isFilterOpen("packSize"),
  });
  const baseUnitOptionsQuery = useProductFilterDropdown("unit", {
    enabled: isFilterOpen("baseUnit"),
  });
  const mrpOptionsQuery = useProductFilterDropdown("mrp", {
    enabled: isFilterOpen("mrp"),
  });
  const statusOptionsQuery = useProductFilterDropdown("status", {
    enabled: isFilterOpen("status"),
  });

  const productCodeOptions = useMemo(
    () => productCodeOptionsQuery.data ?? [],
    [productCodeOptionsQuery.data],
  );
  const productNameOptions = useMemo(
    () => productNameOptionsQuery.data ?? [],
    [productNameOptionsQuery.data],
  );
  const skuOptions = useMemo(() => skuOptionsQuery.data ?? [], [skuOptionsQuery.data]);
  const supplierCodeOptions = useMemo(
    () => supplierCodeOptionsQuery.data ?? [],
    [supplierCodeOptionsQuery.data],
  );
  const supplierNameOptions = useMemo(
    () => supplierNameOptionsQuery.data ?? [],
    [supplierNameOptionsQuery.data],
  );
  const hsnCodeOptions = useMemo(
    () => hsnCodeOptionsQuery.data ?? [],
    [hsnCodeOptionsQuery.data],
  );
  const categoryOptions = useMemo(
    () => categoryOptionsQuery.data ?? [],
    [categoryOptionsQuery.data],
  );
  const packSizeOptions = useMemo(
    () => packSizeOptionsQuery.data ?? [],
    [packSizeOptionsQuery.data],
  );
  const baseUnitOptions = useMemo(
    () => baseUnitOptionsQuery.data ?? [],
    [baseUnitOptionsQuery.data],
  );
  const mrpOptions = useMemo(() => mrpOptionsQuery.data ?? [], [mrpOptionsQuery.data]);
  const statusOptions = useMemo(
    () =>
      statusOptionsQuery.data?.length
        ? statusOptionsQuery.data
        : [
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
          ],
    [statusOptionsQuery.data],
  );

  // ---- queries / mutations ----
  const listQuery = useProducts(listParams);
  const toggleStatusMutation = useToggleProductStatus();
  const exportMutation = useExportProducts();

  const records = listQuery.data?.items ?? [];
  const totalRecords = listQuery.data?.total ?? 0;

  const listError = listQuery.isError
    ? getMasterListErrorMessage(listQuery.error, {
      resource: "products",
      notFoundMessage: "Product list endpoint not found.",
      serverMessage: "Server error while loading products.",
    })
    : null;

  // ---- reset page on filter / sort change ----
  useEffect(() => {
    setPage(1);
  }, [appliedSearch, apiFilters, pageSize, sort.key, sort.direction]);

  // ---- auto-dismiss toast ----
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- status toggle ----
  const updateStatus = (row: ProductListRecord) => {
    const id = row.productUuid;
    if (!id) {
      setToast({ msg: "Product id missing. Unable to update status.", type: "error" });
      return;
    }
    const nextActive = row.status?.toLowerCase() !== "active";
    toggleStatusMutation.mutate(
      { id, isActive: nextActive },
      {
        onSuccess: () =>
          setToast({
            msg: `Product status updated to ${nextActive ? "Active" : "Inactive"}`,
            type: "success",
          }),
        onError: (error) =>
          setToast({
            msg: getErrorMessage(error, "Failed to update product status."),
            type: "error",
          }),
      },
    );
  };

  // ---- export ----
  const handleExport = () => {
    exportMutation.mutate(
      { search: appliedSearch, status: "all", ordering, apiFilters },
      {
        onError: (error) =>
          setToast({
            msg: getErrorMessage(error, "Failed to export products."),
            type: "error",
          }),
      },
    );
  };

  // ---- add ----
  const handleAdd = () => router.push("/masters/products/add");

  const handleFilterChange = (next: FilterState) => {
    const normalized: FilterState = { ...next };
    const statusVal = normalized.status;
    const statusToken = Array.isArray(statusVal)
      ? String(statusVal[0] ?? "").toLowerCase()
      : String(statusVal ?? "").toLowerCase();
    if (statusToken === "all") {
      delete normalized.status;
    }
    setFilters(normalized);
    applyFilters(normalized);
    setPage(1);
  };

  // ---- KPIs ----
  const active = records.filter((r) => r.status === "active").length;
  const inactive = records.filter((r) => r.status === "inactive").length;

  // ---- columns ----
  const columns: ColumnConfig<ProductListRecord>[] = useMemo(
    () => [
    {
      key: "productCode",
      header: "Product Code",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: productCodeOptions,
      width: "120px",
      render: (_val, row) => (
        <span className="font-mono text-xs">{row.productCode || "—"}</span>
      ),
    },
    {
      key: "productName",
      header: "Product Name",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: productNameOptions,
      width: "180px",
      render: (_val, row) => (
        <Link href={`/masters/products/${row.productUuid}`} className="block group/name">
          <p className="text-xs font-semibold leading-4 text-foreground group-hover/name:text-brand-700">
            {row.productName}
          </p>
        </Link>
      ),
    },
    {
      key: "sku",
      header: "SKU",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: skuOptions,
      width: "120px",
      render: (_val, row) => (
        <span className="font-mono text-xs">{row.sku || "—"}</span>
      ),
    },
    {
      key: "supplierCode",
      header: "Supplier Code",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: supplierCodeOptions,
      width: "110px",
      render: (_val, row) => (
        <span className="font-mono text-xs">{row.supplierCode || "—"}</span>
      ),
    },
    {
      key: "supplier",
      header: "Supplier Name",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: supplierNameOptions,
      width: "140px",
      render: (_val, row) => (
        <span className="text-xs">{row.supplier || "—"}</span>
      ),
    },
    {
      key: "hsnCode",
      header: "HSN Code",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: hsnCodeOptions,
      width: "90px",
      render: (_val, row) => (
        <span className="font-mono text-xs">{row.hsnCode || "—"}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: categoryOptions,
      width: "110px",
      render: (_val, row) => row.category || "—",
    },
    {
      key: "packSize",
      header: "Pack Size",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: packSizeOptions,
      width: "90px",
      render: (_val, row) =>
        row.packSize !== null && row.packSize !== undefined ? String(row.packSize) : "—",
    },
    {
      key: "baseUnit",
      header: "Base Unit",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: baseUnitOptions,
      width: "90px",
      render: (_val, row) => row.baseUnit || "—",
    },
    {
      key: "mrp",
      header: "MRP",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: mrpOptions,
      width: "100px",
      align: "right",
      render: (_val, row) => (
        <span className="font-semibold text-xs tabular-nums">
          {row.mrp !== null && row.mrp !== undefined && row.mrp > 0
            ? formatIndianRupeeDisplay(row.mrp)
            : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: statusOptions,
      width: "100px",
      render: (_val, row) => (
        <ListingStatusToggle
          active={isActiveStatus(row.status)}
          onChange={() => updateStatus(row)}
        />
      ),
    },
  ],
    [
      productCodeOptions,
      productNameOptions,
      skuOptions,
      supplierCodeOptions,
      supplierNameOptions,
      hsnCodeOptions,
      categoryOptions,
      packSizeOptions,
      baseUnitOptions,
      mrpOptions,
      statusOptions,
    ],
  );

  const actions: ActionItemConfig<ProductListRecord>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/masters/products/${row.productUuid}`),
    },
    {
      label: "Edit",
      action: "edit",
      icon: Edit2,
      onClick: (row) => router.push(`/masters/products/${row.productUuid}/edit`),
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Product Master</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage product catalogue, suppliers, and packaging
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <KpiCard label="Total Products" value={totalRecords} icon={Package} accent />
          <KpiCard label="Active" value={active} icon={CheckCircle2} color="bg-emerald-50" />
          <KpiCard label="Inactive" value={inactive} icon={XCircle} color="bg-slate-100" />
        </div>

        {listError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {listError}
          </div>
        )}

        <MasterListing<ProductListRecord>
          columns={columns}
          data={records}
          totalRecords={totalRecords}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSortChange={setSort}
          onFilterChange={handleFilterChange}
          actions={actions}
          onAdd={handleAdd}
          addLabel="Add Product"
          onExport={handleExport}
          emptyMessage="products"
          searchPlaceholder="Search product code, name, supplier, SKU, HSN..."
          currentFilters={filters}
          currentSort={sort}
          onOpenFilter={handleOpenFilter}
        />
      </div>

      {toast && (
        <Toast toast={toast} onDismiss={() => setToast(null)} />
      )}
    </AppLayout>
  );
}
