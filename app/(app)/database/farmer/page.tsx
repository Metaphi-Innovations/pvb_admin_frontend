"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, MapPin, Smartphone, Users, Wheat } from "lucide-react";

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

import { type Farmer, SEED, VIEW_FARMER_STORAGE_KEY } from "./farmer-data";
import { FarmerAvatar } from "./components/FarmerAvatar";
import {
  formatIndianMobile,
  formatOwnershipLabel,
  parseAreaValue,
} from "./farmer-utils";

const PER_PAGE = 10;

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent?: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-3 shadow-sm">
      <div
        className={cn(
          "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg",
          accent ? "bg-brand-600" : color ?? "bg-muted",
        )}
      >
        <Icon className={cn("h-4 w-4", accent ? "text-white" : "text-muted-foreground")} />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-none text-foreground">{value}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/** Standard table cell text — matches MasterListing td base styles */
const cellText = "text-xs text-foreground";
const cellMono = "font-mono text-xs text-foreground whitespace-nowrap";
const cellNum = "text-xs text-foreground tabular-nums";

function StatusPill({ status }: { status: Farmer["status"] }) {
  const active = status === "Active";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          active ? "bg-emerald-500" : "bg-slate-400",
        )}
      />
      {status}
    </span>
  );
}

export default function FarmerPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "name", direction: "asc" });
  const [page, setPage] = useState(1);

  const farmers = SEED;

  const stats = useMemo(
    () => ({
      total: farmers.length,
      active: farmers.filter((f) => f.status === "Active").length,
      states: new Set(farmers.map((f) => f.state)).size,
    }),
    [farmers],
  );

  const columns = useMemo<ColumnConfig<Farmer>[]>(
    () => [
      {
        key: "photo",
        header: "Photo",
        width: "72px",
        render: (_, row) => <FarmerAvatar name={row.name} size="sm" variant="muted" />,
      },
      {
        key: "name",
        header: "Farmer Name",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "150px",
        render: (_, row) => (
          <span className={cn(cellText, "block truncate")}>{row.name}</span>
        ),
      },
      {
        key: "village",
        header: "Village",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "110px",
        render: (_, row) => (
          <span className={cn(cellText, "block truncate")}>{row.village}</span>
        ),
      },
      {
        key: "phoneNumber",
        header: "Mobile",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "120px",
        render: (_, row) => (
          <span className={cellMono}>{formatIndianMobile(row.phoneNumber)}</span>
        ),
      },
      {
        key: "ownershipType",
        header: "Ownership",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: [
          { label: "Owned", value: "Owned" },
          { label: "Leased", value: "Leased" },
          { label: "Both", value: "Owned + Leased" },
        ],
        width: "90px",
        render: (_, row) => (
          <span className={cellText}>{formatOwnershipLabel(row.ownershipType)}</span>
        ),
      },
      {
        key: "farmlandSize",
        header: "Total Area",
        sortable: true,
        width: "100px",
        render: (_, row) => (
          <span className={cellNum}>{row.farmlandSize}</span>
        ),
      },
      {
        key: "lastUpdated",
        header: "Last Updated",
        sortable: true,
        width: "110px",
        render: (_, row) => (
          <span className={cellNum}>{row.lastUpdated}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: [
          { label: "Active", value: "Active" },
          { label: "Inactive", value: "Inactive" },
        ],
        width: "90px",
        render: (_, row) => <StatusPill status={row.status} />,
      },
    ],
    [],
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
        [farmer.name, farmer.phoneNumber, farmer.village, farmer.district, farmer.state]
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
        if (sort.key === "photo") {
          return sort.direction === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
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
    const start = (page - 1) * PER_PAGE;
    return filtered.slice(start, start + PER_PAGE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1600px] space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Farmer Database</h1>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              SFA Mobile submissions · View only
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/20 px-2.5 py-1.5 text-[11px] text-muted-foreground">
            <Smartphone className="h-3.5 w-3.5 text-brand-600" />
            Read-only CRM view
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Total Farmers" value={stats.total} icon={Wheat} accent />
          <KpiCard label="Active" value={stats.active} icon={Users} color="bg-emerald-600" />
          <KpiCard label="States" value={stats.states} icon={MapPin} color="bg-navy-600" />
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
          searchPlaceholder="Search name, village, mobile, district..."
          currentFilters={filters}
          currentSort={sort}
        />
      </div>
    </AppLayout>
  );
}
