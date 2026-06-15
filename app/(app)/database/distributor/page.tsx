"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Edit2,
  Eye,
  Handshake,
  Trash2,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

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
  type Distributor,
  loadDistributors,
  saveDistributors,
  VIEW_DISTRIBUTOR_STORAGE_KEY,
} from "./distributor-data";

const PER_PAGE = 10;

function parseBusinessValueInLakhs(value: string) {
  const numericValue = Number.parseFloat(value.replace(/[^\d.]/g, ""));
  if (Number.isNaN(numericValue)) return 0;
  return value.toLowerCase().includes("cr") ? numericValue * 100 : numericValue;
}

function parseFarmerNetwork(value: string) {
  const numericValue = Number.parseInt(value.replace(/[^\d]/g, ""), 10);
  return Number.isNaN(numericValue) ? 0 : numericValue;
}

function formatBusinessValueFromLakhs(valueInLakhs: number) {
  if (valueInLakhs >= 100) {
    return `Rs ${(valueInLakhs / 100).toFixed(2)} Cr`;
  }
  return `Rs ${valueInLakhs.toFixed(0)} Lakh`;
}

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

export default function DistributorPage() {
  const router = useRouter();
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "firmName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "info";
  } | null>(null);

  useEffect(() => {
    setDistributors(loadDistributors());
  }, []);

  const showToast = (msg: string, type: "success" | "info" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const states = useMemo(
    () =>
      [...new Set(distributors.map((distributor) => distributor.state))]
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    [distributors],
  );

  const categories = useMemo(
    () =>
      [...new Set(distributors.map((distributor) => distributor.distributorCategory))]
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    [distributors],
  );

  const stats = useMemo(
    () => ({
      total: distributors.length,
      totalFarmerNetwork: distributors.reduce(
        (sum, distributor) => sum + parseFarmerNetwork(distributor.farmerNetwork),
        0,
      ),
      averageYearsInBusiness:
        distributors.length > 0
          ? Math.round(
              distributors.reduce(
                (sum, distributor) => sum + distributor.yearsInBusiness,
                0,
              ) / distributors.length,
            )
          : 0,
      totalTurnoverDisplay: formatBusinessValueFromLakhs(
        distributors.reduce(
          (sum, distributor) => sum + parseBusinessValueInLakhs(distributor.annualTurnover),
          0,
        ),
      ),
    }),
    [distributors],
  );

  const columns = useMemo<ColumnConfig<Distributor>[]>(
    () => [
      {
        key: "firmName",
        header: "Firm Name",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "190px",
        render: (_, row) => (
          <p className="text-xs font-semibold text-foreground">{row.firmName}</p>
        ),
      },
      {
        key: "contactPersonName",
        header: "Contact Person Name",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "170px",
      },
      {
        key: "phoneNumber",
        header: "Phone Number",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "145px",
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
        key: "companiesDealingIn",
        header: "Companies He Is Dealing In",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "220px",
        render: (_, row) => (
          <span className="block max-w-[220px] truncate" title={row.companiesDealingIn}>
            {row.companiesDealingIn}
          </span>
        ),
      },
      {
        key: "annualTurnover",
        header: "Annual Turnover",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "135px",
        align: "left",
      },
      {
        key: "farmerNetwork",
        header: "Farmer Network",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "130px",
        align: "left",
      },
      {
        key: "distributorCategory",
        header: "Distributor Category",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: categories.map((category) => ({ label: category, value: category })),
        width: "145px",
      },
    ],
    [categories, states],
  );

  const actions = useMemo<ActionItemConfig<Distributor>[]>(
    () => [
      {
        label: "View",
        action: "view",
        icon: Eye,
        onClick: (distributor) => {
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(
              VIEW_DISTRIBUTOR_STORAGE_KEY,
              String(distributor.id),
            );
          }
          router.push("/database/distributor/view");
        },
      },
      {
        label: "Edit",
        action: "edit",
        icon: Edit2,
        onClick: (distributor) => {
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(
              VIEW_DISTRIBUTOR_STORAGE_KEY,
              String(distributor.id),
            );
          }
          router.push(`/database/distributor/edit?id=${distributor.id}`);
        },
      },
      {
        label: "Add Customer",
        action: "add-customer",
        icon: UserPlus,
        onClick: () => {
          router.push("/masters/customers/new");
        },
      },
      {
        label: "Delete",
        action: "delete",
        icon: Trash2,
        variant: "destructive",
        onClick: (distributor) => {
          if (
            typeof window !== "undefined" &&
            !window.confirm(`Delete distributor "${distributor.firmName}" from this listing?`)
          ) {
            return;
          }
          setDistributors((current) => {
            const updatedDistributors = current.filter(
              (item) => item.id !== distributor.id,
            );
            saveDistributors(updatedDistributors);
            return updatedDistributors;
          });
          showToast("Distributor removed from the current listing.");
        },
      },
    ],
    [router],
  );

  const filtered = useMemo(() => {
    let result = [...distributors];

    if (filters.search) {
      const query = String(filters.search).trim().toLowerCase();
      result = result.filter((distributor) =>
        [
          distributor.firmName,
          distributor.contactPersonName,
          distributor.phoneNumber,
          distributor.village,
          distributor.town,
          distributor.city,
          distributor.district,
          distributor.state,
          distributor.companiesDealingIn,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      );
    }

    result = applyFilters(result, filters);

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        if (sort.key === "annualTurnover") {
          const diff =
            parseBusinessValueInLakhs(a.annualTurnover) -
            parseBusinessValueInLakhs(b.annualTurnover);
          return sort.direction === "asc" ? diff : -diff;
        }

        if (sort.key === "farmerNetwork") {
          const diff =
            parseFarmerNetwork(a.farmerNetwork) - parseFarmerNetwork(b.farmerNetwork);
          return sort.direction === "asc" ? diff : -diff;
        }

        const aValue = String(a[sort.key as keyof Distributor] ?? "").toLowerCase();
        const bValue = String(b[sort.key as keyof Distributor] ?? "").toLowerCase();
        return sort.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      });
    }

    return result;
  }, [distributors, filters, sort]);

  const paginated = useMemo(() => {
    const startOffset = (page - 1) * PER_PAGE;
    return filtered.slice(startOffset, startOffset + PER_PAGE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [filtered.length, page]);

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Distributor Listing</h1>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total Distributors" value={stats.total} icon={Building2} accent />
          <KpiCard
            label="Farmer Network"
            value={stats.totalFarmerNetwork.toLocaleString()}
            icon={Users}
            color="bg-emerald-600"
          />
          <KpiCard
            label="Avg Years in Business"
            value={stats.averageYearsInBusiness}
            icon={Handshake}
            color="bg-sky-600"
          />
          <KpiCard
            label="Combined Turnover"
            value={stats.totalTurnoverDisplay}
            icon={Wallet}
            color="bg-amber-500"
          />
        </div>

        <MasterListing<Distributor>
          columns={columns}
          data={paginated}
          totalRecords={filtered.length}
          page={page}
          pageSize={PER_PAGE}
          onPageChange={setPage}
          onSortChange={setSort}
          onFilterChange={setFilters}
          actions={actions}
          emptyMessage="distributors"
          onExport={() => {}}
          searchPlaceholder="Search by firm name, contact person, phone number, village, or company..."
          currentFilters={filters}
          currentSort={sort}
        />
      </div>

      {toast && (
        <div
          className={cn(
            "fixed right-5 top-5 z-[100] flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl",
            toast.type === "success" ? "bg-emerald-600" : "bg-slate-700",
          )}
        >
          {toast.msg}
        </div>
      )}
    </AppLayout>
  );
}
