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
  type DistributorConversionStatus,
  loadDistributors,
  saveDistributors,
  getConversionStatusLabel,
  VIEW_DISTRIBUTOR_STORAGE_KEY,
} from "./distributor-data";
import {
  computeDistributorAssessment,
  formatAmountInCrores,
  formatCategoryLabel,
  parseCompaniesDealingIn,
  parseMonetaryValueInCrores,
} from "@/lib/distributor/distributor-scoring";
import { CONVERT_DISTRIBUTOR_STORAGE_KEY } from "@/lib/distributor/distributor-conversion";
import { formatIndianMobile } from "../farmer/farmer-utils";
import { CompanyChips } from "./components/CompanyChips";
import {
  ConversionStatusBadge,
  DistributorCategoryBadge,
} from "./components/DistributorCategoryBadge";

const PER_PAGE = 10;

type ScoreRangeFilter = "" | "80+" | "70-79" | "below70";

function parseFarmerNetwork(value: string) {
  const numericValue = Number.parseInt(value.replace(/[^\d]/g, ""), 10);
  return Number.isNaN(numericValue) ? 0 : numericValue;
}

function formatCombinedTurnoverInCrores(totalCrores: number) {
  return `₹${totalCrores.toFixed(2)} Cr`;
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
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-3 shadow-sm">
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

type DistributorRow = Distributor & {
  _computedCategory: string;
  _computedScore: number;
  _conversionStatus: DistributorConversionStatus;
  _companies: string[];
};

export default function DistributorPage() {
  const router = useRouter();
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "firmName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [scoreRange, setScoreRange] = useState<ScoreRangeFilter>("");
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
      [...new Set(distributors.map((d) => d.state))].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" }),
      ),
    [distributors],
  );

  const tableRows = useMemo<DistributorRow[]>(
    () =>
      distributors.map((distributor) => {
        const assessment = computeDistributorAssessment(distributor);
        return {
          ...distributor,
          _computedCategory: assessment.category,
          _computedScore: assessment.weightedScore,
          _conversionStatus: distributor.conversionStatus ?? "not_converted",
          _companies: parseCompaniesDealingIn(distributor.companiesDealingIn),
        };
      }),
    [distributors],
  );

  const stats = useMemo(
    () => ({
      total: distributors.length,
      totalFarmerNetwork: distributors.reduce(
        (sum, d) => sum + parseFarmerNetwork(d.farmerNetwork),
        0,
      ),
      averageYearsInBusiness:
        distributors.length > 0
          ? Math.round(
              distributors.reduce((sum, d) => sum + d.yearsInBusiness, 0) /
                distributors.length,
            )
          : 0,
      totalTurnoverDisplay: formatCombinedTurnoverInCrores(
        distributors.reduce(
          (sum, d) => sum + parseMonetaryValueInCrores(d.annualTurnover),
          0,
        ),
      ),
    }),
    [distributors],
  );

  const columns = useMemo<ColumnConfig<DistributorRow>[]>(
    () => [
      {
        key: "firmName",
        header: "Firm Name",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "160px",
        render: (_, row) => (
          <p className="text-xs font-semibold text-foreground">{row.firmName}</p>
        ),
      },
      {
        key: "contactPersonName",
        header: "Contact Person",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "130px",
      },
      {
        key: "phoneNumber",
        header: "Mobile Number",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "130px",
        render: (_, row) => (
          <span className="font-mono text-xs text-foreground whitespace-nowrap">
            {formatIndianMobile(row.phoneNumber)}
          </span>
        ),
      },
      {
        key: "district",
        header: "District",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "110px",
      },
      {
        key: "state",
        header: "State",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: states.map((state) => ({ label: state, value: state })),
        width: "100px",
      },
      {
        key: "companiesDealingIn",
        header: "Companies Dealing In",
        sortable: false,
        filterable: true,
        filterType: "text",
        width: "200px",
        render: (_, row) => <CompanyChips companies={row._companies} />,
      },
      {
        key: "annualTurnover",
        header: "Annual Turnover",
        sortable: true,
        filterable: false,
        width: "115px",
        render: (_, row) => (
          <span className="text-xs text-foreground whitespace-nowrap">
            {formatAmountInCrores(row.annualTurnover)}
          </span>
        ),
      },
      {
        key: "annualBusinessPotential",
        header: "Business Plan",
        sortable: true,
        filterable: false,
        width: "110px",
        render: (_, row) => (
          <span className="text-xs text-foreground whitespace-nowrap">
            {formatAmountInCrores(row.annualBusinessPotential)}
          </span>
        ),
      },
      {
        key: "farmerNetwork",
        header: "Farmer Network",
        sortable: true,
        filterable: false,
        width: "110px",
      },
      {
        key: "_computedScore",
        header: "Score",
        sortable: true,
        filterable: false,
        width: "70px",
        render: (_, row) => (
          <span className="text-xs font-semibold tabular-nums text-foreground">
            {row._computedScore.toFixed(2)}
          </span>
        ),
      },
      {
        key: "_computedCategory",
        header: "Category",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: ["A", "B", "C"].map((c) => ({
          label: formatCategoryLabel(c as "A" | "B" | "C"),
          value: c,
        })),
        width: "100px",
        render: (_, row) => (
          <DistributorCategoryBadge category={row._computedCategory as "A" | "B" | "C"} />
        ),
      },
      {
        key: "_conversionStatus",
        header: "Conversion Status",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: (
          ["not_converted", "draft_customer", "customer_completed"] as DistributorConversionStatus[]
        ).map((s) => ({ label: getConversionStatusLabel(s), value: s })),
        width: "140px",
        render: (_, row) => <ConversionStatusBadge status={row._conversionStatus} />,
      },
    ],
    [states],
  );

  const actions = useMemo<ActionItemConfig<DistributorRow>[]>(
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
        label: "Convert to Customer",
        action: "add-customer",
        icon: UserPlus,
        onClick: (distributor) => {
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(
              CONVERT_DISTRIBUTOR_STORAGE_KEY,
              String(distributor.id),
            );
          }
          router.push(`/masters/customers/new?fromDistributor=${distributor.id}`);
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
            const updated = current.filter((item) => item.id !== distributor.id);
            saveDistributors(updated);
            return updated;
          });
          showToast("Distributor removed from the current listing.");
        },
      },
    ],
    [router],
  );

  const filtered = useMemo(() => {
    let result = [...tableRows];

    if (filters.search) {
      const query = String(filters.search).trim().toLowerCase();
      result = result.filter((d) =>
        [
          d.firmName,
          d.contactPersonName,
          d.phoneNumber,
          d.village,
          d.district,
          d.state,
          d.companiesDealingIn,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      );
    }

    result = applyFilters(result, filters);

    if (scoreRange === "80+") {
      result = result.filter((d) => d._computedScore >= 80);
    } else if (scoreRange === "70-79") {
      result = result.filter((d) => d._computedScore >= 70 && d._computedScore < 80);
    } else if (scoreRange === "below70") {
      result = result.filter((d) => d._computedScore < 70);
    }

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        if (sort.key === "annualTurnover") {
          const diff =
            parseMonetaryValueInCrores(a.annualTurnover) -
            parseMonetaryValueInCrores(b.annualTurnover);
          return sort.direction === "asc" ? diff : -diff;
        }
        if (sort.key === "annualBusinessPotential") {
          const diff =
            parseMonetaryValueInCrores(a.annualBusinessPotential) -
            parseMonetaryValueInCrores(b.annualBusinessPotential);
          return sort.direction === "asc" ? diff : -diff;
        }
        if (sort.key === "_computedScore") {
          const diff = a._computedScore - b._computedScore;
          return sort.direction === "asc" ? diff : -diff;
        }
        if (sort.key === "farmerNetwork") {
          const diff = parseFarmerNetwork(a.farmerNetwork) - parseFarmerNetwork(b.farmerNetwork);
          return sort.direction === "asc" ? diff : -diff;
        }
        const aValue = String(a[sort.key as keyof DistributorRow] ?? "").toLowerCase();
        const bValue = String(b[sort.key as keyof DistributorRow] ?? "").toLowerCase();
        return sort.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      });
    }

    return result;
  }, [tableRows, filters, sort, scoreRange]);

  const paginated = useMemo(() => {
    const startOffset = (page - 1) * PER_PAGE;
    return filtered.slice(startOffset, startOffset + PER_PAGE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort, scoreRange]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    if (page > totalPages) setPage(totalPages);
  }, [filtered.length, page]);

  const scoreRangeOptions: { value: ScoreRangeFilter; label: string }[] = [
    { value: "", label: "All Scores" },
    { value: "80+", label: "Score ≥ 80 (Cat A)" },
    { value: "70-79", label: "Score 70–79 (Cat B)" },
    { value: "below70", label: "Score < 70 (Cat C)" },
  ];

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Distributor Database</h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            SFA Mobile raw submissions · Score, category &amp; credit calculated in ERP
          </p>
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

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">Score range:</span>
          {scoreRangeOptions.map((opt) => (
            <button
              key={opt.value || "all"}
              type="button"
              onClick={() => setScoreRange(opt.value)}
              className={cn(
                "h-7 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                scoreRange === opt.value
                  ? "border-brand-400 bg-brand-50 text-brand-700"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <MasterListing<DistributorRow>
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
          onAdd={() => router.push("/database/distributor/new")}
          addLabel="Add Distributor"
          onExport={() => {}}
          searchPlaceholder="Search firm, contact, mobile, district, state, company…"
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
