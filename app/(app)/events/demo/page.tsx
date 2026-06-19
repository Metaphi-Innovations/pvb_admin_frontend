"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Users } from "lucide-react";

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

import { type DemoRecord, SEED, VIEW_DEMO_STORAGE_KEY } from "./demo-data";

const PER_PAGE = 10;

type DemoListRow = DemoRecord & {
  productCategoryText: string;
  productsDemonstratedText: string;
  cropFocusText: string;
};

function formatList(values: string[]) {
  return values.join(", ");
}

function KpiCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50">
        <Users className="h-4 w-4 text-brand-600" />
      </div>
      <div>
        <p className="text-base font-bold leading-none text-foreground">{value}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function DemoPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "demoTopic", direction: "asc" });
  const [page, setPage] = useState(1);

  const rows = useMemo<DemoListRow[]>(
    () =>
      SEED.map((record) => ({
        ...record,
        productCategoryText: formatList(record.productCategory),
        productsDemonstratedText: formatList(record.productsDemonstrated),
        cropFocusText: formatList(record.cropFocus),
      })),
    [],
  );

  const stats = useMemo(
    () => ({
      totalDemos: rows.length,
      totalFarmersAttended: rows.reduce(
        (sum, record) => sum + record.totalFarmersAttended,
        0,
      ),
      totalDistributorsAttended: rows.reduce(
        (sum, record) => sum + record.totalDistributorsAttended,
        0,
      ),
      avgSuccessRating:
        rows.length === 0
          ? 0
          : Number(
              (
                rows.reduce((sum, record) => sum + record.eventSuccessRating, 0) / rows.length
              ).toFixed(1),
            ),
    }),
    [rows],
  );

  const columns = useMemo<ColumnConfig<DemoListRow>[]>(
    () => [
      {
        key: "demoTopic",
        header: "Demo Topic",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "220px",
        render: (_, row) => (
          <p className="text-xs font-semibold text-foreground">{row.demoTopic}</p>
        ),
      },
      {
        key: "productCategoryText",
        header: "Product Category",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "190px",
        render: (_, row) => (
          <span className="block max-w-[190px] truncate" title={row.productCategoryText}>
            {row.productCategoryText}
          </span>
        ),
      },
      {
        key: "productsDemonstratedText",
        header: "Products Demonstrated",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "220px",
        render: (_, row) => (
          <span
            className="block max-w-[220px] truncate"
            title={row.productsDemonstratedText}
          >
            {row.productsDemonstratedText}
          </span>
        ),
      },
      {
        key: "cropFocusText",
        header: "Crop Focus",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "170px",
        render: (_, row) => (
          <span className="block max-w-[170px] truncate" title={row.cropFocusText}>
            {row.cropFocusText}
          </span>
        ),
      },
      {
        key: "demoMethod",
        header: "Demo Method",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: [
          { label: "Live Demo", value: "Live Demo" },
          { label: "Presentation", value: "Presentation" },
          { label: "Video", value: "Video" },
          { label: "Field Visit", value: "Field Visit" },
          { label: "Training Session", value: "Training Session" },
        ],
        width: "150px",
      },
      {
        key: "demonstratorName",
        header: "Demonstrator Name",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "160px",
      },
      {
        key: "demonstratorContact",
        header: "Demonstrator Contact",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "155px",
      },
    ],
    [],
  );

  const actions = useMemo<ActionItemConfig<DemoListRow>[]>(
    () => [
      {
        label: "View",
        action: "view",
        icon: Eye,
        onClick: (record) => {
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(VIEW_DEMO_STORAGE_KEY, String(record.id));
          }
          router.push("/events/demo/view");
        },
      },
    ],
    [router],
  );

  const filtered = useMemo(() => {
    let result = [...rows];

    if (filters.search) {
      const query = String(filters.search).trim().toLowerCase();
      result = result.filter((record) =>
        [
          record.demoCode,
          record.demoTopic,
          record.demoMethod,
          record.demonstratorName,
          record.demonstratorContact,
          record.productCategoryText,
          record.productsDemonstratedText,
          record.cropFocusText,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      );
    }

    result = applyFilters(result, filters);

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        const aValue = String(a[sort.key as keyof DemoListRow] ?? "").toLowerCase();
        const bValue = String(b[sort.key as keyof DemoListRow] ?? "").toLowerCase();
        return sort.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      });
    }

    return result;
  }, [filters, rows, sort]);

  const paginated = useMemo(() => {
    const startOffset = (page - 1) * PER_PAGE;
    return filtered.slice(startOffset, startOffset + PER_PAGE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort]);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Demo</h1>
          {/* <p className="mt-0.5 text-xs text-muted-foreground">
            View demonstration topics, crop focus, and feedback outcomes
          </p> */}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total Demos" value={stats.totalDemos} />
          <KpiCard label="Farmers Attended" value={stats.totalFarmersAttended} />
          <KpiCard
            label="Distributors Attended"
            value={stats.totalDistributorsAttended}
          />
          <KpiCard label="Avg Success Rating" value={stats.avgSuccessRating} />
        </div>

        <MasterListing<DemoListRow>
          columns={columns}
          data={paginated}
          totalRecords={filtered.length}
          page={page}
          pageSize={PER_PAGE}
          onPageChange={setPage}
          onSortChange={setSort}
          onFilterChange={setFilters}
          actions={actions}
          emptyMessage="demos"
          onExport={() => {}}
          searchPlaceholder="Search demos..."
          currentFilters={filters}
          currentSort={sort}
        />
      </div>
    </AppLayout>
  );
}
