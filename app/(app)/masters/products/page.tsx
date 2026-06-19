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
import { type Product, type ProductStatus, loadProducts, saveProducts } from "./product-data";
import { formatIndianRupeeDisplay } from "@/lib/currency/indian-rupee";
import { getStandardMrp } from "@/lib/pricing/resolve-pricing";

import { MasterListing } from "@/components/listing/MasterListing";
import { applyFilters } from "@/components/listing/filter-utils";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { ListingUserCell, ListingStatusToggle, isActiveStatus } from "@/components/listing";

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

export default function ProductsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<Product[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "productName", direction: "asc" });
  const [toast, setToast] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setRecords(loadProducts());
  }, []);

  const updateStatus = (productId: number, status: ProductStatus) => {
    const today = new Date().toISOString().slice(0, 10);
    const updated = records.map((item) =>
      item.id === productId ? { ...item, status, updatedBy: "Admin", updatedDate: today } : item,
    );
    setRecords(updated);
    saveProducts(updated);
    setToast("Status updated.");
    setTimeout(() => setToast(null), 3200);
  };

  const columns: ColumnConfig<Product>[] = [
    {
      key: "productName",
      header: "Product Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "220px",
      render: (val, row) => (
        <Link href={`/masters/products/${row.id}`} className="block group/name">
          <p className="text-xs font-semibold leading-4 text-foreground group-hover/name:text-brand-700">{row.productName}</p>
        </Link>
      ),
    },
    {
      key: "scientificName",
      header: "Scientific Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "160px",
      render: (val, row) => row.scientificName || "—",
    },
    {
      key: "sku",
      header: "SKU",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "140px",
      render: (val, row) => <span className="font-mono text-xs">{row.sku}</span>,
    },
    {
      key: "baseUnit",
      header: "Base Unit",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "110px",
      render: (val, row) => row.baseUnit || "—",
    },
    {
      key: "packagingUnit",
      header: "Packaging Unit",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (val, row) => row.packagingUnit || "—",
    },
    {
      key: "conversionQuantity",
      header: "Conversion Qty",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (val, row) => row.conversionQuantity ?? "—",
    },
    {
      key: "standardMrp",
      header: "MRP",
      sortable: true,
      width: "120px",
      align: "right",
      render: (_val, row) => {
        const mrp = getStandardMrp(row.id);
        return (
          <span className="font-semibold text-xs tabular-nums">
            {mrp > 0 ? formatIndianRupeeDisplay(mrp) : "—"}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
      width: "110px",
      render: (val, row) => (
        <ListingStatusToggle
          active={isActiveStatus(row.status)}
          onChange={() => updateStatus(row.id, isActiveStatus(row.status) ? "inactive" : "active")}
        />
      ),
    },
    {
      key: "createdBy",
      header: "Created By",
      sortable: true,
      width: "150px",
      render: (_val, row) => (
        <ListingUserCell name={row.createdBy} date={row.createdDate} />
      ),
    },
    {
      key: "updatedBy",
      header: "Updated By",
      sortable: true,
      width: "150px",
      render: (_val, row) => (
        <ListingUserCell name={row.updatedBy} date={row.updatedDate} />
      ),
    },
  ];

  const actions: ActionItemConfig<Product>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/masters/products/${row.id}`),
    },
    {
      label: "Edit",
      action: "edit",
      icon: Edit2,
      onClick: (row) => router.push(`/masters/products/${row.id}/edit`),
    },
  ];

  const filtered = useMemo(() => {
    let result = [...records];

    // Search filter
    if (filters.search) {
      const q = String(filters.search).trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.productName.toLowerCase().includes(q) ||
          (item.scientificName || "").toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q)
      );
    }

    // Apply column filters
    result = applyFilters(result, filters);

    // Sorting
    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        if (sort.key === "standardMrp") {
          const av = getStandardMrp(a.id);
          const bv = getStandardMrp(b.id);
          return sort.direction === "asc" ? av - bv : bv - av;
        }
        const av = String(a[sort.key as keyof Product] ?? "").toLowerCase();
        const bv = String(b[sort.key as keyof Product] ?? "").toLowerCase();
        return sort.direction === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }

    return result;
  }, [records, filters, sort]);

  const paginated = useMemo(() => {
    const startOffset = (page - 1) * pageSize;
    return filtered.slice(startOffset, startOffset + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort, pageSize]);

  const handleExport = () => {
    const headers = [
      "Product Name",
      "Scientific Name",
      "SKU",
      "Base Unit",
      "Packaging Unit",
      "Conversion Qty",
      "MRP",
      "Status",
      "Created By",
      "Updated By",
    ];

    const rows = filtered.map((item) => [
      item.productName,
      item.scientificName || "",
      item.sku,
      item.baseUnit || "",
      item.packagingUnit || "",
      item.conversionQuantity !== undefined ? item.conversionQuantity : "",
      getStandardMrp(item.id) || "",
      item.status,
      item.createdBy,
      item.updatedBy,
    ]);

    const csvString = [
      headers.join(","),
      ...rows.map(row => row.map(val => {
        const str = String(val ?? "").replace(/"/g, '""');
        return `"${str}"`;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "product-master-export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAdd = () => {
    router.push("/masters/products/add");
  };

  const total = records.length;
  const active = records.filter((item) => item.status === "active").length;
  const inactive = records.filter((item) => item.status === "inactive").length;

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Product Master</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage product catalogue, compliance, and pricing</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <KpiCard label="Total Products" value={total} icon={Package} accent />
          <KpiCard label="Active" value={active} icon={CheckCircle2} color="bg-emerald-50" />
          <KpiCard label="Inactive" value={inactive} icon={XCircle} color="bg-slate-100" />
        </div>

        <MasterListing<Product>
          columns={columns}
          data={paginated}
          totalRecords={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSortChange={setSort}
          onFilterChange={setFilters}
          actions={actions}
          onAdd={handleAdd}
          addLabel="Add Product"
          onExport={handleExport}
          emptyMessage="products"
          searchPlaceholder="Search product name, scientific name, SKU..."
          currentFilters={filters}
          currentSort={sort}
        />
      </div>

      {toast && (
        <div className="fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium bg-emerald-600">
          {toast}
        </div>
      )}
    </AppLayout>
  );
}
