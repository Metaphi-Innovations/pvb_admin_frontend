"use client";

import React, { useEffect, useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover, PopoverContent, PopoverTrigger,
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
  CheckCircle2, ChevronDown, ChevronsUpDown, Download, Edit2,
  Eye, ImageIcon, Leaf, MapPin, MoreVertical, Plus, Search, SlidersHorizontal,
  Store, Trash2, User, Wheat, X, XCircle,
} from "lucide-react";

interface Farmer {
  id: number;
  farmerCode: string;
  name: string;
  mobile: string;
  village: string;
  district: string;
  state: string;
  taluka: string;
  landArea: string;
  primaryCrop: string;
  cropDetails: string;
  assignedFO: string;
  fpoName: string;
  soilType: string;
  irrigationType: string;
  distributor: string;
  status: "active" | "inactive";
  registeredDate: string;
}

const SEED: Farmer[] = [
  { id: 1, farmerCode: "FMR-001", name: "Ramesh Patel", mobile: "9876501001", village: "Navapura", taluka: "Anand", district: "Anand", state: "Gujarat", landArea: "4.5 Acres", primaryCrop: "Cotton", cropDetails: "Cotton, Wheat", assignedFO: "Rahul Sharma", fpoName: "Anand FPO", soilType: "Black Soil", irrigationType: "Drip", distributor: "Anand Agro Traders", status: "active", registeredDate: "2023-04-15" },
  { id: 2, farmerCode: "FMR-002", name: "Suresh Kumar", mobile: "9876501002", village: "Kheralu", taluka: "Kheralu", district: "Mehsana", state: "Gujarat", landArea: "2.0 Acres", primaryCrop: "Wheat", cropDetails: "Wheat, Cumin", assignedFO: "Nilesh Shah", fpoName: "Mehsana Kisan FPO", soilType: "Sandy Loam", irrigationType: "Borewell", distributor: "Mehsana Agri Center", status: "active", registeredDate: "2023-05-20" },
  { id: 3, farmerCode: "FMR-003", name: "Mahesh Singh", mobile: "9876501003", village: "Bhanpur", taluka: "Raipur", district: "Raipur", state: "Chhattisgarh", landArea: "6.0 Acres", primaryCrop: "Paddy", cropDetails: "Paddy, Maize", assignedFO: "Anita Verma", fpoName: "CG Kisan FPO", soilType: "Clay Loam", irrigationType: "Canal", distributor: "Raipur Krishi Seva", status: "active", registeredDate: "2023-03-10" },
  { id: 4, farmerCode: "FMR-004", name: "Prakash Rao", mobile: "9876501004", village: "Tandur", taluka: "Tandur", district: "Vikarabad", state: "Telangana", landArea: "3.5 Acres", primaryCrop: "Maize", cropDetails: "Maize, Cotton", assignedFO: "Ravi Kumar", fpoName: "Telangana Agri FPO", soilType: "Red Soil", irrigationType: "Sprinkler", distributor: "Tandur Crop Care", status: "active", registeredDate: "2023-06-01" },
  { id: 5, farmerCode: "FMR-005", name: "Rajan Verma", mobile: "9876501005", village: "Barwa", taluka: "Fatehpur", district: "Fatehpur", state: "Uttar Pradesh", landArea: "1.5 Acres", primaryCrop: "Sugarcane", cropDetails: "Sugarcane, Wheat", assignedFO: "Priya Singh", fpoName: "UP Kisan FPO", soilType: "Alluvial Soil", irrigationType: "Flood", distributor: "Fatehpur Agro Traders", status: "inactive", registeredDate: "2023-02-15" },
  { id: 6, farmerCode: "FMR-006", name: "Haridas Patil", mobile: "9876501006", village: "Mohol", taluka: "Mohol", district: "Solapur", state: "Maharashtra", landArea: "8.0 Acres", primaryCrop: "Soybean", cropDetails: "Soybean, Jowar", assignedFO: "Amit Patil", fpoName: "Solapur FPO", soilType: "Black Cotton Soil", irrigationType: "Drip", distributor: "Solapur Agro Mart", status: "active", registeredDate: "2023-07-12" },
  { id: 7, farmerCode: "FMR-007", name: "Gopal Nair", mobile: "9876501007", village: "Kuttanad", taluka: "Kuttanad", district: "Alappuzha", state: "Kerala", landArea: "1.0 Acres", primaryCrop: "Paddy", cropDetails: "Paddy", assignedFO: "Meera Nair", fpoName: "Kerala Agri FPO", soilType: "Peaty Soil", irrigationType: "Canal", distributor: "Alappuzha Farm Inputs", status: "active", registeredDate: "2023-08-05" },
  { id: 8, farmerCode: "FMR-008", name: "Bharat Das", mobile: "9876501008", village: "Srirampur", taluka: "Srirampur", district: "Murshidabad", state: "West Bengal", landArea: "2.5 Acres", primaryCrop: "Jute", cropDetails: "Jute, Paddy", assignedFO: "Subhash Dey", fpoName: "WB Kisan FPO", soilType: "Alluvial Soil", irrigationType: "Rainfed", distributor: "Murshidabad Agri Supply", status: "active", registeredDate: "2023-09-18" },
];

const STATUS_CFG: Record<Farmer["status"], { bg: string; text: string; dot: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  inactive: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
};

function StatusPill({ status }: { status: Farmer["status"] }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium",
        cfg.bg,
        cfg.text,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

type SortKey =
  | "farmerCode"
  | "name"
  | "mobile"
  | "village"
  | "district"
  | "primaryCrop"
  | "landArea"
  | "assignedFO"
  | "status";

function SortTh({
  label,
  col,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (col: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === col;

  return (
    <th
      onClick={() => onSort(col)}
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none group whitespace-nowrap",
        active && "bg-brand-50/60",
        className,
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
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-foreground">{label}</p>
      <div
        className={cn(
          "min-h-9 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground flex items-center",
          mono && "font-mono text-xs font-semibold text-brand-700",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function FarmerPhoto({ farmer }: { farmer: Farmer }) {
  const initials = farmer.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-foreground">Farmer Photo</p>
      <div className="h-[156px] rounded-xl border border-border bg-brand-50/70 flex flex-col items-center justify-center gap-2">
        <div className="w-16 h-16 rounded-full bg-brand-600 text-white flex items-center justify-center text-lg font-bold shadow-sm">
          {initials}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-brand-700">
          <ImageIcon className="w-3.5 h-3.5" />
          Farmer Photo
        </div>
      </div>
    </div>
  );
}

function FarmerViewDialog({
  farmer,
  onClose,
}: {
  farmer: Farmer | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!farmer} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-x-0 bottom-0 top-[104px] z-[300] bg-black/40" />
        <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 top-[104px] z-[300] flex w-screen flex-col overflow-hidden bg-muted outline-none">
          {farmer && (
            <Tabs defaultValue="farmer-details" className="flex flex-1 min-h-0 flex-col overflow-hidden">
              <div className="flex-shrink-0 px-6 pt-5 pb-3">
                <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
                  <div className="relative border-b border-border px-5 py-3">
                    <DialogHeader className="space-y-0.5 pr-10">
                      <DialogTitle className="text-sm font-semibold text-foreground">Farmer Registration Details</DialogTitle>
                      <DialogDescription className="text-[11px] text-muted-foreground">
                        View-only farmer profile and distributor mapping details
                      </DialogDescription>
                    </DialogHeader>
                    <DialogPrimitive.Close className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>
                  </div>

                  <div className="px-4 py-2.5">
                    <TabsList className="h-9 rounded-lg bg-muted/70 p-1">
                      <TabsTrigger value="farmer-details" className="h-7 gap-1.5 px-3 text-xs">
                        <User className="w-3.5 h-3.5" />
                        Farmer Details
                      </TabsTrigger>
                      <TabsTrigger value="crop-land" className="h-7 gap-1.5 px-3 text-xs">
                        <Leaf className="w-3.5 h-3.5" />
                        Crop and Land Details
                      </TabsTrigger>
                      <TabsTrigger value="product" className="h-7 gap-1.5 px-3 text-xs">
                        <Store className="w-3.5 h-3.5" />
                        Product Details
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-5">
                <TabsContent value="farmer-details" className="m-0 space-y-4">
                  <SectionBlock icon={User} title="Farmer Basic Details" subtitle="Photo, identity, contact, and ownership">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      <div className="lg:row-span-2">
                        <FarmerPhoto farmer={farmer} />
                      </div>
                      <ReadOnlyField label="Farmer Name" value={farmer.name} />
                      <ReadOnlyField label="Farmer ID" value={farmer.farmerCode} mono />
                      <ReadOnlyField label="Mobile" value={farmer.mobile} mono />
                      <ReadOnlyField label="Assigned FO" value={farmer.assignedFO} />
                      <ReadOnlyField label="Status" value={<StatusPill status={farmer.status} />} />
                    </div>
                  </SectionBlock>

                  <SectionBlock icon={MapPin} title="Address & Geography Details" subtitle="Village and administrative hierarchy">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <ReadOnlyField label="Village" value={farmer.village} />
                      <ReadOnlyField label="Taluka" value={farmer.taluka} />
                      <ReadOnlyField label="District" value={farmer.district} />
                      <ReadOnlyField label="State" value={farmer.state} />
                    </div>
                  </SectionBlock>
                </TabsContent>

                <TabsContent value="crop-land" className="m-0 space-y-4">
                  <SectionBlock icon={Leaf} title="Crop & Land Details" subtitle="Cultivation, land, and irrigation profile">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <ReadOnlyField label="Crop Details" value={farmer.cropDetails} />
                      <ReadOnlyField label="Land Area" value={farmer.landArea} />
                      <ReadOnlyField label="Soil Type" value={farmer.soilType} />
                      <ReadOnlyField label="Irrigation Type" value={farmer.irrigationType} />
                    </div>
                  </SectionBlock>
                </TabsContent>

                <TabsContent value="product" className="m-0 space-y-4">
                  <SectionBlock icon={Store} title="Product Details" subtitle="Linked distributor and product supply information">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ReadOnlyField label="Distributor" value={farmer.distributor} />
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
const VIEW_FARMER_STORAGE_KEY = "farmer:view-id";

export default function FarmerRegistrationPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [farmers] = useState<Farmer[]>(SEED);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<Farmer["status"][]>([]);
  const [filterCrop, setFilterCrop] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("farmerCode");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [viewFarmer, setViewFarmer] = useState<Farmer | null>(null);

  useEffect(() => {
    if (pathname !== "/farmer/view") {
      setViewFarmer(null);
      return;
    }

    let selectedFarmer: Farmer | undefined;
    if (typeof window !== "undefined") {
      const selectedId = window.sessionStorage.getItem(VIEW_FARMER_STORAGE_KEY);
      selectedFarmer = farmers.find((farmer) => String(farmer.id) === selectedId);
    }

    setViewFarmer(selectedFarmer ?? farmers[0] ?? null);
  }, [farmers, pathname]);

  const states = useMemo(() => [...new Set(farmers.map((f) => f.state))], [farmers]);
  const crops = useMemo(() => [...new Set(farmers.map((f) => f.primaryCrop))], [farmers]);

  const stats = useMemo(() => ({
    total: farmers.length,
    active: farmers.filter((f) => f.status === "active").length,
    inactive: farmers.filter((f) => f.status === "inactive").length,
  }), [farmers]);

  const filtered = useMemo(() => {
    let result = farmers.filter((farmer) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchSearch = [
          farmer.farmerCode,
          farmer.name,
          farmer.mobile,
          farmer.village,
          farmer.district,
          farmer.state,
          farmer.primaryCrop,
          farmer.assignedFO,
        ].some((field) => field.toLowerCase().includes(q));
        if (!matchSearch) return false;
      }

      if (filterState.length > 0 && !filterState.includes(farmer.state)) return false;
      if (filterStatus.length > 0 && !filterStatus.includes(farmer.status)) return false;
      if (filterCrop.length > 0 && !filterCrop.includes(farmer.primaryCrop)) return false;

      return true;
    });

    result.sort((a, b) => {
      const aVal = String(a[sortKey] ?? "").toLowerCase();
      const bVal = String(b[sortKey] ?? "").toLowerCase();
      const comparison = aVal.localeCompare(bVal);
      return sortDir === "asc" ? comparison : -comparison;
    });

    return result;
  }, [farmers, search, filterState, filterStatus, filterCrop, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const start = (page - 1) * PER_PAGE;
  const visibleFarmers = filtered.slice(start, start + PER_PAGE);
  const hasActiveFilters = search.trim() !== "" || filterState.length > 0 || filterStatus.length > 0 || filterCrop.length > 0;

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

  const toggleStatusFilter = (value: Farmer["status"]) => {
    setFilterStatus((current) => (
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    ));
    setPage(1);
  };

  const clearAllFilters = () => {
    setSearch("");
    setFilterState([]);
    setFilterStatus([]);
    setFilterCrop([]);
    setPage(1);
  };

  const handleViewFarmer = (farmer: Farmer) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(VIEW_FARMER_STORAGE_KEY, String(farmer.id));
    }
    setViewFarmer(farmer);
    router.push("/farmer/view");
  };

  const handleCloseView = () => {
    setViewFarmer(null);
    if (pathname === "/farmer/view") {
      router.push("/farmer");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Farmer Registration</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Register and manage farmer profiles</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white">
              <Plus className="w-3.5 h-3.5" /> Register Farmer
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
              <Wheat className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">{stats.total}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Total Farmers</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">{stats.active}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Active</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-400 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">{stats.inactive}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Inactive</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-white">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by Farmer ID, Name, Mobile, Village, or State..."
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
                      {filterState.length + filterStatus.length + filterCrop.length}
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
                    <p className="text-xs font-semibold text-foreground mb-2">Crop</p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {crops.map((crop) => (
                        <label key={crop} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded accent-brand-600"
                            checked={filterCrop.includes(crop)}
                            onChange={() => toggleStringFilter(crop, setFilterCrop, filterCrop)}
                          />
                          <span className="text-xs text-foreground">{crop}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-semibold text-foreground mb-2">Status</p>
                    <div className="space-y-1.5">
                      {(["active", "inactive"] as Farmer["status"][]).map((status) => (
                        <label key={status} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded accent-brand-600"
                            checked={filterStatus.includes(status)}
                            onChange={() => toggleStatusFilter(status)}
                          />
                          <span className="text-xs text-foreground capitalize">{status}</span>
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
              {filterCrop.map((crop) => (
                <span key={`crop-${crop}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
                  {crop}
                  <button onClick={() => setFilterCrop(filterCrop.filter((item) => item !== crop))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {filterStatus.map((status) => (
                <span key={`status-${status}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  <button onClick={() => setFilterStatus(filterStatus.filter((item) => item !== status))}>
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
                  <SortTh label="Farmer ID" col="farmerCode" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Farmer Name" col="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Mobile" col="mobile" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Village" col="village" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="District" col="district" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Primary Crop" col="primaryCrop" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Land Area" col="landArea" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Assigned FO" col="assignedFO" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Status" col="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleFarmers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Wheat className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No farmers match your filters</p>
                        <p className="text-xs text-muted-foreground">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  visibleFarmers.map((farmer) => (
                    <tr key={farmer.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-2 text-xs font-mono font-semibold text-brand-700 whitespace-nowrap">{farmer.farmerCode}</td>
                      <td className="px-4 py-2 text-xs font-semibold text-foreground whitespace-nowrap">{farmer.name}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{farmer.mobile}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{farmer.village}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{farmer.district}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{farmer.primaryCrop}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{farmer.landArea}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{farmer.assignedFO}</td>
                      <td className="px-4 py-2 text-xs whitespace-nowrap"><StatusPill status={farmer.status} /></td>
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
                              onClick={() => handleViewFarmer(farmer)}
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                            <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm transition-colors">
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <DropdownMenuSeparator />
                            <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm transition-colors">
                              <MapPin className="w-3.5 h-3.5" /> Map Distributor
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

      <FarmerViewDialog farmer={viewFarmer} onClose={handleCloseView} />
    </AppLayout>
  );
}
