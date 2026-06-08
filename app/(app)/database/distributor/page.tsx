"use client";

import React, { useEffect, useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  Download,
  Edit2,
  Eye,
  Globe,
  Handshake,
  MapPin,
  MoreVertical,
  Search,
  SlidersHorizontal,
  Store,
  Trash2,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";

import {
  type Distributor,
  loadDistributors,
  VIEW_DISTRIBUTOR_STORAGE_KEY,
} from "./distributor-data";


type SortKey =
  | "firmName"
  | "contactPersonName"
  | "phoneNumber"
  | "district"
  | "state"
  | "companiesDealingIn"
  | "annualTurnover"
  | "farmerNetwork"
  | "distributorCategory";

function parseBusinessValueInLakhs(value: string) {
  const numericValue = Number.parseFloat(value.replace(/[^\d.]/g, ""));
  if (Number.isNaN(numericValue)) return 0;
  return value.toLowerCase().includes("cr") ? numericValue * 100 : numericValue;
}

function formatBusinessValueFromLakhs(valueInLakhs: number) {
  if (valueInLakhs >= 100) {
    return `Rs ${(valueInLakhs / 100).toFixed(2)} Cr`;
  }
  return `Rs ${valueInLakhs.toFixed(0)} Lakh`;
}

function SortTh({
  label,
  col,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (col: SortKey) => void;
}) {
  const active = sortKey === col;

  return (
    <th
      onClick={() => onSort(col)}
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none group whitespace-nowrap",
        active && "bg-brand-50/60",
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
        {active ? (
          <ChevronDown
            className={cn(
              "w-3 h-3 text-brand-600 transition-transform",
              sortDir === "desc" && "rotate-180",
            )}
          />
        ) : (
          <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
        )}
      </div>
    </th>
  );
}

function SectionBlock({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-brand-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  mono = false,
  multiline = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  multiline?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-xs font-medium text-foreground">{label}</p>
      <div
        className={cn(
          "min-h-9 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground",
          multiline ? "flex items-start leading-5" : "flex items-center",
          mono && "font-mono text-xs font-semibold text-brand-700",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function DistributorViewDialog({
  distributor,
  onClose,
  onPrevious,
  onNext,
  canPrevious,
  canNext,
}: {
  distributor: Distributor | null;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  canPrevious: boolean;
  canNext: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"distributor-details" | "location-details" | "business-details">("distributor-details");

  useEffect(() => {
    if (distributor) {
      setActiveTab("distributor-details");
    }
  }, [distributor?.id]);

  const canNavigateRecords = activeTab === "distributor-details";

  return (
    <Dialog open={!!distributor} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-x-0 bottom-0 top-[104px] z-[300] bg-black/40" />
        <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 top-[104px] z-[300] flex w-screen flex-col overflow-hidden bg-muted outline-none">
          {distributor && (
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "distributor-details" | "location-details" | "business-details")} className="flex flex-1 min-h-0 flex-col overflow-hidden">
              <div className="flex-shrink-0 px-6 pt-5 pb-3">
                <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
                  <div className="relative border-b border-border px-5 py-3">
                    <DialogHeader className={cn("space-y-0.5", canNavigateRecords ? "pr-32" : "pr-10")}>
                      <DialogTitle className="text-sm font-semibold text-foreground">Distributor Details</DialogTitle>
                      <DialogDescription className="text-[11px] text-muted-foreground">
                        View-only distributor profile, geography, and business details
                      </DialogDescription>
                    </DialogHeader>
                    <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1.5">
                      {canNavigateRecords && (
                        <>
                          <button
                            type="button"
                            onClick={onPrevious}
                            disabled={!canPrevious}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Previous distributor"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={onNext}
                            disabled={!canNext}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Next distributor"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <DialogPrimitive.Close className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                      </DialogPrimitive.Close>
                    </div>
                  </div>

                  <div className="px-4 py-2.5">
                    <TabsList className="h-9 rounded-lg bg-muted/70 p-1">
                      <TabsTrigger value="distributor-details" className="h-7 gap-1.5 px-3 text-xs">
                        <User className="w-3.5 h-3.5" />
                        Distributor Details
                      </TabsTrigger>
                      <TabsTrigger value="location-details" className="h-7 gap-1.5 px-3 text-xs">
                        <MapPin className="w-3.5 h-3.5" />
                        Location Details
                      </TabsTrigger>
                      <TabsTrigger value="business-details" className="h-7 gap-1.5 px-3 text-xs">
                        <Store className="w-3.5 h-3.5" />
                        Business Details
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-5">
                <TabsContent value="distributor-details" className="m-0 space-y-4">
                  <SectionBlock icon={Building2} title="Distributor Basic Details" subtitle="Firm identity and primary contact information">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <ReadOnlyField label="Firm Name" value={distributor.firmName} />
                      <ReadOnlyField label="Contact Person Name" value={distributor.contactPersonName} />
                      <ReadOnlyField label="Gender" value={distributor.gender} />
                      <ReadOnlyField label="Phone Number" value={distributor.phoneNumber} mono />
                      <ReadOnlyField label="Years in Business" value={`${distributor.yearsInBusiness} Years`} />
                    </div>
                  </SectionBlock>
                </TabsContent>

                <TabsContent value="location-details" className="m-0 space-y-4">
                  <SectionBlock icon={Globe} title="Address & Geography Details" subtitle="Address hierarchy and coordinates">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <ReadOnlyField label="Address" value={distributor.address} multiline className="lg:col-span-2" />
                      <ReadOnlyField label="Village" value={distributor.village} />
                      <ReadOnlyField label="Town" value={distributor.town} />
                      <ReadOnlyField label="City" value={distributor.city} />
                      <ReadOnlyField label="District" value={distributor.district} />
                      <ReadOnlyField label="State" value={distributor.state} />
                      <ReadOnlyField label="Pincode" value={distributor.pincode} mono />
                      <ReadOnlyField label="Lat-long" value={distributor.latLong} mono />
                    </div>
                  </SectionBlock>
                </TabsContent>

                <TabsContent value="business-details" className="m-0 space-y-4">
                  <SectionBlock icon={Handshake} title="Business Details" subtitle="Commercial profile, market reach, and category">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <ReadOnlyField label="Companies He Is Dealing In" value={distributor.companiesDealingIn} multiline className="lg:col-span-2" />
                      <ReadOnlyField label="Annual Turnover" value={distributor.annualTurnover} />
                      <ReadOnlyField label="Annual Business He Can Do for Us" value={distributor.annualBusinessPotential} />
                      <ReadOnlyField label="Farmer Network" value={distributor.farmerNetwork} />
                      <ReadOnlyField label="Distributor Category" value={distributor.distributorCategory} />
                    </div>
                  </SectionBlock>
                </TabsContent>
              </div>
            </Tabs>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}

const PER_PAGE = 10;

export default function DistributorPage() {
  const router = useRouter();
  const [distributors] = useState<Distributor[]>(loadDistributors());
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filterGender, setFilterGender] = useState<Distributor["gender"][]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("firmName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const states = useMemo(() => [...new Set(distributors.map((distributor) => distributor.state))], [distributors]);
  const categories = useMemo(() => [...new Set(distributors.map((distributor) => distributor.distributorCategory))], [distributors]);

  const stats = useMemo(() => ({
    total: distributors.length,
    totalFarmerNetwork: distributors.reduce((sum, distributor) => sum + Number(distributor.farmerNetwork.replace(/[^\d]/g, "")), 0),
    averageYearsInBusiness: Math.round(distributors.reduce((sum, distributor) => sum + distributor.yearsInBusiness, 0) / distributors.length),
    totalTurnoverDisplay: formatBusinessValueFromLakhs(
      distributors.reduce((sum, distributor) => sum + parseBusinessValueInLakhs(distributor.annualTurnover), 0),
    ),
  }), [distributors]);

  const filtered = useMemo(() => {
    let result = distributors.filter((distributor) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchSearch = [
          distributor.firmName,
          distributor.contactPersonName,
          distributor.phoneNumber,
          distributor.village,
          distributor.town,
          distributor.city,
          distributor.district,
          distributor.state,
          distributor.companiesDealingIn,
        ].some((field) => field.toLowerCase().includes(q));
        if (!matchSearch) return false;
      }

      if (filterState.length > 0 && !filterState.includes(distributor.state)) return false;
      if (filterCategory.length > 0 && !filterCategory.includes(distributor.distributorCategory)) return false;
      if (filterGender.length > 0 && !filterGender.includes(distributor.gender)) return false;

      return true;
    });

    result.sort((a, b) => {
      const aVal = String(a[sortKey] ?? "").toLowerCase();
      const bVal = String(b[sortKey] ?? "").toLowerCase();
      const comparison = aVal.localeCompare(bVal);
      return sortDir === "asc" ? comparison : -comparison;
    });

    return result;
  }, [distributors, search, filterState, filterCategory, filterGender, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const start = (page - 1) * PER_PAGE;
  const visibleDistributors = filtered.slice(start, start + PER_PAGE);
  const hasActiveFilters = search.trim() !== "" || filterState.length > 0 || filterCategory.length > 0 || filterGender.length > 0;

  const handleSort = (col: SortKey) => {
    if (sortKey === col) {
      setSortDir((current) => current === "asc" ? "desc" : "asc");
    } else {
      setSortKey(col);
      setSortDir("asc");
    }
  };

  const toggleStringFilter = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    current: string[],
  ) => {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
    setPage(1);
  };

  const toggleGenderFilter = (value: Distributor["gender"]) => {
    setFilterGender((current) => (
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    ));
    setPage(1);
  };

  const clearAllFilters = () => {
    setSearch("");
    setFilterState([]);
    setFilterCategory([]);
    setFilterGender([]);
    setPage(1);
  };

  const handleViewDistributor = (distributor: Distributor) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(VIEW_DISTRIBUTOR_STORAGE_KEY, String(distributor.id));
    }
    router.push("/database/distributor/view");
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Distributor Listing</h1>
            {/* <p className="text-xs text-muted-foreground mt-0.5">View and manage distributor records</p> */}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">{stats.total}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Total Distributors</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">{stats.totalFarmerNetwork.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Farmer Network</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center flex-shrink-0">
              <Handshake className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">{stats.averageYearsInBusiness}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Avg Years in Business</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">{stats.totalTurnoverDisplay}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Combined Turnover</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-white">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by firm name, contact person, phone number, village, or company..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="flex-1 border-0 h-8 text-sm bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground"
            />

            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                    hasActiveFilters
                      ? "border-brand-400 bg-brand-50 text-brand-700"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filter
                  {hasActiveFilters && (
                    <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
                      {filterState.length + filterCategory.length + filterGender.length}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 p-0">
                <div className="space-y-3 p-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">State</p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {states.map((state) => (
                        <label key={state} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded accent-brand-600"
                            checked={filterState.includes(state)}
                            onChange={() => toggleStringFilter(state, setFilterState, filterState)}
                          />
                          <span className="text-xs text-foreground">{state}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-semibold text-foreground mb-2">Distributor Category</p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {categories.map((category) => (
                        <label key={category} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded accent-brand-600"
                            checked={filterCategory.includes(category)}
                            onChange={() => toggleStringFilter(category, setFilterCategory, filterCategory)}
                          />
                          <span className="text-xs text-foreground">{category}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-semibold text-foreground mb-2">Gender</p>
                    <div className="space-y-1.5">
                      {(["Male", "Female", "Other"] as Distributor["gender"][]).map((gender) => (
                        <label key={gender} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded accent-brand-600"
                            checked={filterGender.includes(gender)}
                            onChange={() => toggleGenderFilter(gender)}
                          />
                          <span className="text-xs text-foreground">{gender}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <div className="border-t border-border pt-2">
                      <button
                        onClick={clearAllFilters}
                        className="text-xs text-brand-600 hover:underline font-medium"
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center flex-wrap gap-2">
              {search && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
                  {search}
                  <button onClick={() => { setSearch(""); setPage(1); }}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filterState.map((state) => (
                <span key={`state-${state}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
                  {state}
                  <button onClick={() => setFilterState(filterState.filter((item) => item !== state))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {filterCategory.map((category) => (
                <span key={`category-${category}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
                  {category}
                  <button onClick={() => setFilterCategory(filterCategory.filter((item) => item !== category))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {filterGender.map((gender) => (
                <span key={`gender-${gender}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
                  {gender}
                  <button onClick={() => setFilterGender(filterGender.filter((item) => item !== gender))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh label="Firm Name" col="firmName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Contact Person Name" col="contactPersonName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Phone Number" col="phoneNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="District" col="district" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="State" col="state" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Companies He Is Dealing In" col="companiesDealingIn" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Annual Turnover" col="annualTurnover" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Farmer Network" col="farmerNetwork" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Distributor Category" col="distributorCategory" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleDistributors.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No distributors match your filters</p>
                        <p className="text-xs text-muted-foreground">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  visibleDistributors.map((distributor) => (
                    <tr key={distributor.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-2 text-xs font-semibold text-foreground whitespace-nowrap">{distributor.firmName}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{distributor.contactPersonName}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{distributor.phoneNumber}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{distributor.district}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{distributor.state}</td>
                      <td className="px-4 py-2 text-xs text-foreground max-w-[220px] truncate">{distributor.companiesDealingIn}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{distributor.annualTurnover}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{distributor.farmerNetwork}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{distributor.distributorCategory}</td>
                      <td className="px-4 py-2 text-xs whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
                              Actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <button
                              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm transition-colors"
                              onClick={() => handleViewDistributor(distributor)}
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                            <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm transition-colors">
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <DropdownMenuSeparator />
                            <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-sm transition-colors">
                              <Trash2 className="w-3.5 h-3.5" /> Archive
                            </button>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">
              Showing <span className="font-medium text-foreground">{Math.min(start + PER_PAGE, filtered.length)}</span> of{" "}
              <span className="font-medium text-foreground">{filtered.length}</span> records
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
                disabled={page === totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

    </AppLayout>
  );
}
