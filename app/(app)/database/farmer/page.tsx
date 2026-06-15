"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, MapPin, Wheat } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { MasterListing } from "@/components/listing/MasterListing";
import { applyFilters } from "@/components/listing/filter-utils";
import {
  ActionItemConfig,
  ColumnConfig,
  FilterState,
  SortState,
} from "@/components/listing/types";
import { cn } from "@/lib/utils";

import {
  type Farmer,
  SEED,
  VIEW_FARMER_STORAGE_KEY,
} from "./farmer-data";

const PER_PAGE = 10;

function parseAreaValue(value: string) {
  const numericValue = Number.parseFloat(value.replace(/[^\d.]/g, ""));
  return Number.isNaN(numericValue) ? 0 : numericValue;
}

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
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
      <div
        className={cn(
          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
          accent ? "bg-brand-600" : color ?? "bg-muted",
        )}
      >
        <Icon className={cn("h-4 w-4", accent ? "text-white" : "text-muted-foreground")} />
      </div>
      <div>
        <p className="text-base font-bold leading-none text-foreground">{value}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function FarmerPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "name", direction: "asc" });
  const [page, setPage] = useState(1);

  const farmers = SEED;

  const states = useMemo(
    () =>
      [...new Set(farmers.map((farmer) => farmer.state))]
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    [farmers],
  );

  const stats = useMemo(
    () => ({
      total: farmers.length,
      owned: farmers.filter((farmer) =>
        farmer.cropEntries.some((entry) => entry.ownershipType === "Owned"),
      ).length,
      leased: farmers.filter((farmer) =>
        farmer.cropEntries.some((entry) => entry.ownershipType === "Leased"),
      ).length,
    }),
    [farmers],
  );

  const columns = useMemo<ColumnConfig<Farmer>[]>(
    () => [
      {
        key: "name",
        header: "Farmer Name",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "180px",
        render: (_, row) => (
          <p className="text-xs font-semibold text-foreground">{row.name}</p>
        ),
      },
      {
        key: "phoneNumber",
        header: "Phone Number",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "150px",
      },
      {
        key: "village",
        header: "Village",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "140px",
      },
      {
        key: "district",
        header: "District",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "140px",
      },
      {
        key: "state",
        header: "State",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: states.map((state) => ({ label: state, value: state })),
        width: "140px",
      },
      {
        key: "currentCrop",
        header: "Current Crop Grown",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "220px",
        render: (_, row) => (
          <span className="block max-w-[220px] truncate" title={row.currentCrop}>
            {row.currentCrop}
          </span>
        ),
      },
      {
        key: "farmlandSize",
        header: "Size of Farmland",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "140px",
        align: "left",
      },
      {
        key: "ownershipType",
        header: "Owned / Leased",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: [
          { label: "Owned", value: "Owned" },
          { label: "Leased", value: "Leased" },
          { label: "Owned + Leased", value: "Owned + Leased" },
        ],
        width: "160px",
      },
    ],
    [states],
  );

  const actions = useMemo<ActionItemConfig<Farmer>[]>(
    () => [
      {
        label: "View",
        action: "view",
        icon: Eye,
        onClick: (farmer) => {
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(VIEW_FARMER_STORAGE_KEY, String(farmer.id));
          }
          router.push("/database/farmer/view");
        },
      },
    ],
    [router],
  );

  const filtered = useMemo(() => {
    let result = [...farmers];

    if (filters.search) {
      const query = String(filters.search).trim().toLowerCase();
      result = result.filter((farmer) =>
        [
          farmer.name,
          farmer.fatherName,
          farmer.phoneNumber,
          farmer.village,
          farmer.town,
          farmer.city,
          farmer.district,
          farmer.state,
          farmer.currentCrop,
          ...farmer.cropEntries.map((entry) => entry.produceCropName),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      );
    }

    result = applyFilters(result, filters);

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        if (sort.key === "farmlandSize") {
          const diff = parseAreaValue(a.farmlandSize) - parseAreaValue(b.farmlandSize);
          return sort.direction === "asc" ? diff : -diff;
        }

        const aValue = String(a[sort.key as keyof Farmer] ?? "").toLowerCase();
        const bValue = String(b[sort.key as keyof Farmer] ?? "").toLowerCase();
        return sort.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      });
    }

    return result;
  }, [farmers, filters, sort]);

  const paginated = useMemo(() => {
    const startOffset = (page - 1) * PER_PAGE;
    return filtered.slice(startOffset, startOffset + PER_PAGE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort]);

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Farmer Listing</h1>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <KpiCard label="Total Farmers" value={stats.total} icon={Wheat} accent />
          <KpiCard label="Owned" value={stats.owned} icon={CheckCircle2} color="bg-emerald-600" />
          <KpiCard label="Leased" value={stats.leased} icon={MapPin} color="bg-amber-500" />
        </div>

        <MasterListing<Farmer>
          columns={columns}
          data={paginated}
          totalRecords={filtered.length}
          page={page}
          pageSize={PER_PAGE}
          onPageChange={setPage}
          onSortChange={setSort}
          onFilterChange={setFilters}
          actions={actions}
          emptyMessage="farmers"
          onExport={() => {}}
          searchPlaceholder="Search by farmer name, phone number, village, district, or crop..."
          currentFilters={filters}
          currentSort={sort}
        />
      </div>
    </AppLayout>
  );
}
