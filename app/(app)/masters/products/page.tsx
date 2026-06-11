"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2,
  ChevronDown,
  Edit2,
  Eye,
  Package,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";
import { type Product, type ProductStatus, formatMoney, loadProducts, saveProducts } from "./product-data";

import { MasterListing } from "@/components/listing/MasterListing";
import { applyFilters } from "@/components/listing/filter-utils";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";

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

function StatusToggle({
  record,
  onToggle,
}: {
  record: Product;
  onToggle: (id: number, status: ProductStatus) => void;
}) {
  const active = record.status === "active";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(record.id, active ? "inactive" : "active");
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
      )}
    >
      {active ? "Active" : "Inactive"}
    </button>
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
      key: "productId",
      header: "Product Code",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (val, row) => (
        <span className="font-mono text-xs text-brand-700">{row.productId}</span>
      ),
    },
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
      key: "category",
      header: "Category",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: Array.from(new Set(records.map((item) => item.category))).sort().map(v => ({ label: v, value: v })),
      width: "130px",
    },
    {
      key: "segment",
      header: "Segment",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: Array.from(new Set(records.map((item) => item.segment))).sort().map(v => ({ label: v, value: v })),
      width: "130px",
    },
    {
      key: "formulation",
      header: "Formulation",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: Array.from(new Set(records.map((item) => item.formulation))).sort().map(v => ({ label: v, value: v })),
      width: "220px",
    },
    {
      key: "baseUnit",
      header: "Base Unit",
      width: "110px",
      render: (val, row) => row.baseUnit || "—",
    },
    {
      key: "packagingUnit",
      header: "Packaging Unit",
      width: "130px",
      render: (val, row) => row.packagingUnit || "—",
    },
    {
      key: "conversionQuantity",
      header: "Conversion Qty",
      width: "140px",
      render: (val, row) => row.conversionQuantity ?? "—",
    },
    {
      key: "hsnCode",
      header: "HSN Code",
      width: "110px",
      render: (val, row) => <span className="font-mono">{row.hsnCode}</span>,
    },
    {
      key: "gstRate",
      header: "GST Rate",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: Array.from(new Set(records.map((item) => item.gstRate))).sort().map(v => ({ label: v, value: v })),
      width: "100px",
    },
    {
      key: "sku",
      header: "SKU",
      width: "140px",
      render: (val, row) => <span className="font-mono">{row.sku}</span>,
    },
    {
      key: "cropApplicable",
      header: "Crop Applicable",
      width: "140px",
      render: (val, row) => row.cropApplicable || "—",
    },
    {
      key: "mrp",
      header: "MRP",
      width: "120px",
      render: (val, row) => <span className="font-semibold">{formatMoney(row.mrp)}</span>,
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
        <StatusToggle record={row} onToggle={updateStatus} />
      ),
    },
    {
      key: "createdDate",
      header: "Created",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (val, row) => (
        <div>
          <p className="text-[11px] font-semibold leading-4 text-brand-700">{row.createdBy}</p>
          <p className="text-[10px] font-mono leading-3 text-muted-foreground">{row.createdDate}</p>
        </div>
      ),
    },
    {
      key: "updatedDate",
      header: "Updated",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (val, row) => (
        <div>
          <p className="text-[11px] font-semibold leading-4 text-brand-700">{row.updatedBy}</p>
          <p className="text-[10px] font-mono leading-3 text-muted-foreground">{row.updatedDate}</p>
        </div>
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
          item.sku.toLowerCase().includes(q) ||
          item.hsnCode.toLowerCase().includes(q)
      );
    }

    // Apply column filters
    result = applyFilters(result, filters);

    // Sorting
    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        if (sort.key === "gstRate") {
          const av = parseInt(a.gstRate, 10);
          const bv = parseInt(b.gstRate, 10);
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
      "Product Code",
      "Product Name",
      "Category",
      "Segment",
      "Formulation",
      "Base Unit",
      "Packaging Unit",
      "Conversion Quantity",
      "HSN Code",
      "GST Rate",
      "SKU",
      "Crop Applicable",
      "MRP",
      "Status",
    ];

    const rows = filtered.map(item => [
      item.productId,
      item.productName,
      item.category,
      item.segment,
      item.formulation,
      item.baseUnit || "",
      item.packagingUnit || "",
      item.conversionQuantity !== undefined ? item.conversionQuantity : "",
      item.hsnCode,
      item.gstRate,
      item.sku,
      item.cropApplicable || "",
      item.mrp,
      item.status,
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
          searchPlaceholder="Search product, SKU, HSN..."
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
