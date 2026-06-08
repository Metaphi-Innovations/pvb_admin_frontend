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

export interface Distributor {
  id: number;
  firmName: string;
  contactPersonName: string;
  yearsInBusiness: number;
  address: string;
  gender: "Male" | "Female" | "Other";
  phoneNumber: string;
  village: string;
  town: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  companiesDealingIn: string;
  latLong: string;
  annualTurnover: string;
  annualBusinessPotential: string;
  farmerNetwork: string;
  distributorCategory: string;
}

const SEED: Distributor[] = [
  {
    id: 1,
    firmName: "Anand Agro Traders",
    contactPersonName: "Rahul Sharma",
    yearsInBusiness: 14,
    address: "12 Market Yard Road, Opp. Grain Depot",
    gender: "Male",
    phoneNumber: "9876502001",
    village: "Navapura",
    town: "Anand",
    city: "Anand",
    district: "Anand",
    state: "Gujarat",
    pincode: "388001",
    companiesDealingIn: "UPL, Bayer, Dharitri Sutra",
    latLong: "22.5645, 72.9289",
    annualTurnover: "Rs 1.8 Cr",
    annualBusinessPotential: "Rs 42 Lakh",
    farmerNetwork: "1,250 Farmers",
    distributorCategory: "A",
  },
  {
    id: 2,
    firmName: "Mehsana Agri Center",
    contactPersonName: "Nilesh Shah",
    yearsInBusiness: 9,
    address: "45 Station Road, Near APMC Gate",
    gender: "Male",
    phoneNumber: "9876502002",
    village: "Kheralu",
    town: "Kheralu",
    city: "Mehsana",
    district: "Mehsana",
    state: "Gujarat",
    pincode: "384325",
    companiesDealingIn: "Syngenta, PI Industries",
    latLong: "23.8851, 72.6187",
    annualTurnover: "Rs 95 Lakh",
    annualBusinessPotential: "Rs 24 Lakh",
    farmerNetwork: "820 Farmers",
    distributorCategory: "B",
  },
  {
    id: 3,
    firmName: "Raipur Krishi Seva",
    contactPersonName: "Anita Verma",
    yearsInBusiness: 11,
    address: "Plot 8, Krishi Upaj Mandi Complex",
    gender: "Female",
    phoneNumber: "9876502003",
    village: "Bhanpur",
    town: "Raipur Rural",
    city: "Raipur",
    district: "Raipur",
    state: "Chhattisgarh",
    pincode: "492001",
    companiesDealingIn: "Dhanuka, Dharitri Sutra",
    latLong: "21.2514, 81.6296",
    annualTurnover: "Rs 1.15 Cr",
    annualBusinessPotential: "Rs 31 Lakh",
    farmerNetwork: "960 Farmers",
    distributorCategory: "A",
  },
  {
    id: 4,
    firmName: "Tandur Crop Care",
    contactPersonName: "Prakash Rao",
    yearsInBusiness: 7,
    address: "Main Bazaar Street, Near Bus Stand",
    gender: "Male",
    phoneNumber: "9876502004",
    village: "Tandur",
    town: "Tandur",
    city: "Vikarabad",
    district: "Vikarabad",
    state: "Telangana",
    pincode: "501141",
    companiesDealingIn: "Coromandel, Bayer",
    latLong: "17.2473, 77.5767",
    annualTurnover: "Rs 72 Lakh",
    annualBusinessPotential: "Rs 18 Lakh",
    farmerNetwork: "640 Farmers",
    distributorCategory: "B",
  },
  {
    id: 5,
    firmName: "Fatehpur Agro Traders",
    contactPersonName: "Priya Singh",
    yearsInBusiness: 13,
    address: "Civil Lines Road, Near Block Office",
    gender: "Female",
    phoneNumber: "9876502005",
    village: "Barwa",
    town: "Fatehpur",
    city: "Fatehpur",
    district: "Fatehpur",
    state: "Uttar Pradesh",
    pincode: "212601",
    companiesDealingIn: "IFFCO, Dharitri Sutra",
    latLong: "25.9270, 80.8120",
    annualTurnover: "Rs 1.05 Cr",
    annualBusinessPotential: "Rs 27 Lakh",
    farmerNetwork: "1,020 Farmers",
    distributorCategory: "A",
  },
  {
    id: 6,
    firmName: "Solapur Agro Mart",
    contactPersonName: "Amit Patil",
    yearsInBusiness: 16,
    address: "Wholesale Agri Market, Lane 3",
    gender: "Male",
    phoneNumber: "9876502006",
    village: "Mohol",
    town: "Mohol",
    city: "Solapur",
    district: "Solapur",
    state: "Maharashtra",
    pincode: "413213",
    companiesDealingIn: "UPL, Rallis, Dharitri Sutra",
    latLong: "17.8112, 75.6411",
    annualTurnover: "Rs 2.1 Cr",
    annualBusinessPotential: "Rs 48 Lakh",
    farmerNetwork: "1,540 Farmers",
    distributorCategory: "A+",
  },
  {
    id: 7,
    firmName: "Alappuzha Farm Inputs",
    contactPersonName: "Meera Nair",
    yearsInBusiness: 6,
    address: "Canal View Road, Junction Corner",
    gender: "Female",
    phoneNumber: "9876502007",
    village: "Kuttanad",
    town: "Kuttanad",
    city: "Alappuzha",
    district: "Alappuzha",
    state: "Kerala",
    pincode: "688001",
    companiesDealingIn: "BioStadt, Organic India",
    latLong: "9.4981, 76.3388",
    annualTurnover: "Rs 58 Lakh",
    annualBusinessPotential: "Rs 16 Lakh",
    farmerNetwork: "510 Farmers",
    distributorCategory: "C",
  },
  {
    id: 8,
    firmName: "Murshidabad Agri Supply",
    contactPersonName: "Subhash Dey",
    yearsInBusiness: 10,
    address: "Godown Lane, Near Rice Mill",
    gender: "Male",
    phoneNumber: "9876502008",
    village: "Srirampur",
    town: "Srirampur",
    city: "Murshidabad",
    district: "Murshidabad",
    state: "West Bengal",
    pincode: "742149",
    companiesDealingIn: "Dharitri Sutra, UPL",
    latLong: "24.1750, 88.2750",
    annualTurnover: "Rs 88 Lakh",
    annualBusinessPotential: "Rs 22 Lakh",
    farmerNetwork: "870 Farmers",
    distributorCategory: "B",
  },
  {
    id: 9,
    firmName: "Kadapa Rural Inputs",
    contactPersonName: "Lakshmi Reddy",
    yearsInBusiness: 8,
    address: "APMC Link Road, Near Cold Storage",
    gender: "Female",
    phoneNumber: "9876502009",
    village: "Vempalli",
    town: "Vempalli",
    city: "Kadapa",
    district: "Kadapa",
    state: "Andhra Pradesh",
    pincode: "516329",
    companiesDealingIn: "UPL, Dharitri Sutra, Crystal",
    latLong: "14.3664, 78.6067",
    annualTurnover: "Rs 84 Lakh",
    annualBusinessPotential: "Rs 21 Lakh",
    farmerNetwork: "760 Farmers",
    distributorCategory: "B",
  },
  {
    id: 10,
    firmName: "Sehore Krishi Bazaar",
    contactPersonName: "Sunita Chauhan",
    yearsInBusiness: 12,
    address: "Mandi Square, Plot 11",
    gender: "Female",
    phoneNumber: "9876502010",
    village: "Ashta",
    town: "Ashta",
    city: "Sehore",
    district: "Sehore",
    state: "Madhya Pradesh",
    pincode: "466116",
    companiesDealingIn: "Dhanuka, Bayer, Dharitri Sutra",
    latLong: "23.0173, 76.7247",
    annualTurnover: "Rs 1.22 Cr",
    annualBusinessPotential: "Rs 29 Lakh",
    farmerNetwork: "1,110 Farmers",
    distributorCategory: "A",
  },
  {
    id: 11,
    firmName: "Nalanda Agro House",
    contactPersonName: "Devendra Yadav",
    yearsInBusiness: 10,
    address: "Old Grain Market, Ward 5",
    gender: "Male",
    phoneNumber: "9876502011",
    village: "Hilsa",
    town: "Hilsa",
    city: "Nalanda",
    district: "Nalanda",
    state: "Bihar",
    pincode: "801302",
    companiesDealingIn: "IFFCO, UPL, PI Industries",
    latLong: "25.3167, 85.2833",
    annualTurnover: "Rs 78 Lakh",
    annualBusinessPotential: "Rs 19 Lakh",
    farmerNetwork: "690 Farmers",
    distributorCategory: "B",
  },
  {
    id: 12,
    firmName: "Mandya Cane Services",
    contactPersonName: "Manjunath Gowda",
    yearsInBusiness: 15,
    address: "Sugar Mill Road, Gate 2",
    gender: "Male",
    phoneNumber: "9876502012",
    village: "Srirangapatna",
    town: "Srirangapatna",
    city: "Mandya",
    district: "Mandya",
    state: "Karnataka",
    pincode: "571438",
    companiesDealingIn: "Coromandel, Dharitri Sutra, Rallis",
    latLong: "12.4226, 76.6930",
    annualTurnover: "Rs 1.68 Cr",
    annualBusinessPotential: "Rs 36 Lakh",
    farmerNetwork: "1,320 Farmers",
    distributorCategory: "A+",
  },
  {
    id: 13,
    firmName: "Kota Seed & Spice Point",
    contactPersonName: "Pooja Jat",
    yearsInBusiness: 7,
    address: "NH Junction Market, Shop 6",
    gender: "Female",
    phoneNumber: "9876502013",
    village: "Sultanpur",
    town: "Digod",
    city: "Kota",
    district: "Kota",
    state: "Rajasthan",
    pincode: "325204",
    companiesDealingIn: "Syngenta, Dharitri Sutra",
    latLong: "25.1032, 76.1647",
    annualTurnover: "Rs 66 Lakh",
    annualBusinessPotential: "Rs 17 Lakh",
    farmerNetwork: "540 Farmers",
    distributorCategory: "C",
  },
  {
    id: 14,
    firmName: "Nagaon Input Depot",
    contactPersonName: "Ajay Boro",
    yearsInBusiness: 9,
    address: "College Road, Near Rice Yard",
    gender: "Male",
    phoneNumber: "9876502014",
    village: "Kampur",
    town: "Kampur",
    city: "Nagaon",
    district: "Nagaon",
    state: "Assam",
    pincode: "782426",
    companiesDealingIn: "Organic India, Dharitri Sutra, UPL",
    latLong: "26.3582, 92.6925",
    annualTurnover: "Rs 74 Lakh",
    annualBusinessPotential: "Rs 18 Lakh",
    farmerNetwork: "680 Farmers",
    distributorCategory: "B",
  },
  {
    id: 15,
    firmName: "Nashik Crop Link",
    contactPersonName: "Rekha Pawar",
    yearsInBusiness: 11,
    address: "Onion Market Lane, Unit 14",
    gender: "Female",
    phoneNumber: "9876502015",
    village: "Niphad",
    town: "Niphad",
    city: "Nashik",
    district: "Nashik",
    state: "Maharashtra",
    pincode: "422303",
    companiesDealingIn: "Bayer, Rallis, Dharitri Sutra",
    latLong: "20.0837, 74.1078",
    annualTurnover: "Rs 1.14 Cr",
    annualBusinessPotential: "Rs 26 Lakh",
    farmerNetwork: "940 Farmers",
    distributorCategory: "A",
  },
  {
    id: 16,
    firmName: "Ladakh Agri Solutions",
    contactPersonName: "Tsering Namgyal",
    yearsInBusiness: 5,
    address: "Main Bazaar, Near Cooperative Bank",
    gender: "Male",
    phoneNumber: "9876502016",
    village: "Diskit",
    town: "Diskit",
    city: "Leh",
    district: "Leh",
    state: "Ladakh",
    pincode: "194401",
    companiesDealingIn: "Organic India, Dharitri Sutra",
    latLong: "34.5594, 77.5472",
    annualTurnover: "Rs 36 Lakh",
    annualBusinessPotential: "Rs 11 Lakh",
    farmerNetwork: "280 Farmers",
    distributorCategory: "C",
  },
  {
    id: 17,
    firmName: "Parbhani Agri Network",
    contactPersonName: "Imran Sheikh",
    yearsInBusiness: 13,
    address: "Seed Market Road, Block C",
    gender: "Male",
    phoneNumber: "9876502017",
    village: "Parbhani Rural",
    town: "Parbhani",
    city: "Parbhani",
    district: "Parbhani",
    state: "Maharashtra",
    pincode: "431401",
    companiesDealingIn: "UPL, PI Industries, Dharitri Sutra",
    latLong: "19.2699, 76.7708",
    annualTurnover: "Rs 1.31 Cr",
    annualBusinessPotential: "Rs 33 Lakh",
    farmerNetwork: "1,180 Farmers",
    distributorCategory: "A",
  },
  {
    id: 18,
    firmName: "Baloda Bazar Agri Mart",
    contactPersonName: "Nirmala Sahu",
    yearsInBusiness: 10,
    address: "Mandi Frontage Road, Plot 3",
    gender: "Female",
    phoneNumber: "9876502018",
    village: "Bhatapara",
    town: "Bhatapara",
    city: "Baloda Bazar",
    district: "Baloda Bazar",
    state: "Chhattisgarh",
    pincode: "493118",
    companiesDealingIn: "Dharitri Sutra, Dhanuka, Coromandel",
    latLong: "21.7357, 81.9474",
    annualTurnover: "Rs 97 Lakh",
    annualBusinessPotential: "Rs 23 Lakh",
    farmerNetwork: "850 Farmers",
    distributorCategory: "B",
  },
  {
    id: 19,
    firmName: "Kottayam Plantation Inputs",
    contactPersonName: "Joseph Mathew",
    yearsInBusiness: 18,
    address: "Rubber Board Road, Shop 22",
    gender: "Male",
    phoneNumber: "9876502019",
    village: "Pala",
    town: "Pala",
    city: "Kottayam",
    district: "Kottayam",
    state: "Kerala",
    pincode: "686575",
    companiesDealingIn: "BioStadt, Dharitri Sutra, Organic India",
    latLong: "9.7116, 76.6863",
    annualTurnover: "Rs 82 Lakh",
    annualBusinessPotential: "Rs 20 Lakh",
    farmerNetwork: "610 Farmers",
    distributorCategory: "B",
  },
  {
    id: 20,
    firmName: "Mahisagar Farm Channel",
    contactPersonName: "Kavita Solanki",
    yearsInBusiness: 6,
    address: "Bus Stand Circle, Ward 2",
    gender: "Female",
    phoneNumber: "9876502020",
    village: "Santrampur",
    town: "Santrampur",
    city: "Mahisagar",
    district: "Mahisagar",
    state: "Gujarat",
    pincode: "389260",
    companiesDealingIn: "Dharitri Sutra, Crystal, IFFCO",
    latLong: "23.1911, 73.8916",
    annualTurnover: "Rs 63 Lakh",
    annualBusinessPotential: "Rs 16 Lakh",
    farmerNetwork: "520 Farmers",
    distributorCategory: "C",
  },
];

export function loadDistributors(): Distributor[] {
  return SEED;
}

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
export const VIEW_DISTRIBUTOR_STORAGE_KEY = "distributor:view-id";

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
