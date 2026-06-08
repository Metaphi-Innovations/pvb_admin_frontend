"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Download,
  Eye,
  MoreVertical,
  Search,
  Users,
} from "lucide-react";

type DemoMethod =
  | "Live Demo"
  | "Presentation"
  | "Video"
  | "Field Visit"
  | "Training Session";

type PurchaseIntent =
  | "Immediate"
  | "Within Season"
  | "Future"
  | "Not Interested";

type DemoAttendeeType = "Farmer" | "Distributor" | "Other";

interface DemoAttendee {
  id: number;
  name: string;
  type: DemoAttendeeType;
  location: string;
}

interface DistributorFeedback {
  distributorName: string;
  productInterestLevel: 1 | 2 | 3 | 4 | 5;
  orderPotential: number;
  comments: string;
}

export interface DemoRecord {
  id: number;
  demoCode: string;
  demoTopic: string;
  productCategory: string[];
  productsDemonstrated: string[];
  cropFocus: string[];
  demoObjective: string;
  demoMethod: DemoMethod;
  demonstratorName: string;
  demonstratorContact: string;
  totalFarmersInvited: number;
  totalFarmersAttended: number;
  totalDistributorsInvited: number;
  totalDistributorsAttended: number;
  otherAttendees: number;
  attendeeList: DemoAttendee[];
  interestedInProduct: boolean;
  feedbackRating: 1 | 2 | 3 | 4 | 5;
  feedbackComments: string;
  purchaseIntent: PurchaseIntent;
  followUpRequired: boolean;
  distributorFeedback: DistributorFeedback;
  leadsGenerated: number;
  sampleRequests: number;
  trialRequests: number;
  ordersReceived: number;
  followUpVisitsPlanned: number;
  eventSuccessRating: 1 | 2 | 3 | 4 | 5;
}

export const SEED: DemoRecord[] = [
  {
    id: 1,
    demoCode: "DEM-001",
    demoTopic: "Bio Insecticide Performance Demo",
    productCategory: ["Bio Solutions", "Crop Protection"],
    productsDemonstrated: ["BioShield X", "PestGuard Liquid"],
    cropFocus: ["Cotton", "Chilli"],
    demoObjective: "Show visible pest reduction and explain application timing for early-stage infestation control.",
    demoMethod: "Live Demo",
    demonstratorName: "Rajesh Kumar",
    demonstratorContact: "9876503101",
    totalFarmersInvited: 42,
    totalFarmersAttended: 36,
    totalDistributorsInvited: 6,
    totalDistributorsAttended: 4,
    otherAttendees: 3,
    attendeeList: [
      { id: 1, name: "Ramesh Patel", type: "Farmer", location: "Navapura" },
      { id: 2, name: "Suresh Kumar", type: "Farmer", location: "Kheralu" },
      { id: 3, name: "Anand Agro Traders", type: "Distributor", location: "Anand" },
      { id: 4, name: "Block Agriculture Officer", type: "Other", location: "Anand" },
    ],
    interestedInProduct: true,
    feedbackRating: 4,
    feedbackComments: "Farmers responded well to the visible comparison patch and asked for dosage charts.",
    purchaseIntent: "Within Season",
    followUpRequired: true,
    distributorFeedback: {
      distributorName: "Anand Agro Traders",
      productInterestLevel: 4,
      orderPotential: 18.5,
      comments: "Interested in bundling with existing cotton protection range.",
    },
    leadsGenerated: 14,
    sampleRequests: 9,
    trialRequests: 5,
    ordersReceived: 2.5,
    followUpVisitsPlanned: 7,
    eventSuccessRating: 4,
  },
  {
    id: 2,
    demoCode: "DEM-002",
    demoTopic: "Water Soluble Nutrition Field Session",
    productCategory: ["Plant Nutrition"],
    productsDemonstrated: ["NutriMax WS", "CalBoost Pro"],
    cropFocus: ["Paddy", "Vegetables"],
    demoObjective: "Position foliar nutrition program during stress stage and improve crop vigor understanding.",
    demoMethod: "Training Session",
    demonstratorName: "Neha Patel",
    demonstratorContact: "9876503102",
    totalFarmersInvited: 55,
    totalFarmersAttended: 47,
    totalDistributorsInvited: 5,
    totalDistributorsAttended: 5,
    otherAttendees: 2,
    attendeeList: [
      { id: 1, name: "Mahesh Singh", type: "Farmer", location: "Bhanpur" },
      { id: 2, name: "Haridas Patil", type: "Farmer", location: "Mohol" },
      { id: 3, name: "Raipur Krishi Seva", type: "Distributor", location: "Raipur" },
    ],
    interestedInProduct: true,
    feedbackRating: 5,
    feedbackComments: "Training deck and nutrient deficiency visuals were well received.",
    purchaseIntent: "Immediate",
    followUpRequired: true,
    distributorFeedback: {
      distributorName: "Raipur Krishi Seva",
      productInterestLevel: 5,
      orderPotential: 26,
      comments: "Ready to place immediate season-opening order.",
    },
    leadsGenerated: 19,
    sampleRequests: 12,
    trialRequests: 6,
    ordersReceived: 6,
    followUpVisitsPlanned: 8,
    eventSuccessRating: 5,
  },
  {
    id: 3,
    demoCode: "DEM-003",
    demoTopic: "Seed Treatment Product Presentation",
    productCategory: ["Seed Treatment"],
    productsDemonstrated: ["RootStart Treat"],
    cropFocus: ["Soybean", "Maize"],
    demoObjective: "Explain pre-sowing treatment benefits and distributor-led retail talking points.",
    demoMethod: "Presentation",
    demonstratorName: "Amit Sharma",
    demonstratorContact: "9876503103",
    totalFarmersInvited: 33,
    totalFarmersAttended: 25,
    totalDistributorsInvited: 8,
    totalDistributorsAttended: 6,
    otherAttendees: 1,
    attendeeList: [
      { id: 1, name: "Devendra Yadav", type: "Farmer", location: "Indore Rural" },
      { id: 2, name: "Kisan Inputs Hub", type: "Distributor", location: "Indore" },
    ],
    interestedInProduct: true,
    feedbackRating: 3,
    feedbackComments: "Need clearer germination comparison photos for retailer meetings.",
    purchaseIntent: "Future",
    followUpRequired: true,
    distributorFeedback: {
      distributorName: "Kisan Inputs Hub",
      productInterestLevel: 3,
      orderPotential: 9.5,
      comments: "Wants secondary retailer feedback before committing volume.",
    },
    leadsGenerated: 8,
    sampleRequests: 4,
    trialRequests: 3,
    ordersReceived: 1,
    followUpVisitsPlanned: 5,
    eventSuccessRating: 3,
  },
  {
    id: 4,
    demoCode: "DEM-004",
    demoTopic: "Fungicide Spray Comparison Visit",
    productCategory: ["Crop Protection", "Fungicide"],
    productsDemonstrated: ["ShieldPro SC", "FungiStop Gold"],
    cropFocus: ["Wheat"],
    demoObjective: "Compare disease suppression on untreated versus treated plots during mid-season pressure.",
    demoMethod: "Field Visit",
    demonstratorName: "Priya Singh",
    demonstratorContact: "9876503104",
    totalFarmersInvited: 28,
    totalFarmersAttended: 23,
    totalDistributorsInvited: 4,
    totalDistributorsAttended: 3,
    otherAttendees: 2,
    attendeeList: [
      { id: 1, name: "Suresh Kumar", type: "Farmer", location: "Kheralu" },
      { id: 2, name: "Mehsana Agri Center", type: "Distributor", location: "Mehsana" },
    ],
    interestedInProduct: true,
    feedbackRating: 4,
    feedbackComments: "Field comparison created strong recall; dosage repeat questions remain.",
    purchaseIntent: "Within Season",
    followUpRequired: true,
    distributorFeedback: {
      distributorName: "Mehsana Agri Center",
      productInterestLevel: 4,
      orderPotential: 14,
      comments: "Likely to convert after one more village-level activity.",
    },
    leadsGenerated: 11,
    sampleRequests: 6,
    trialRequests: 4,
    ordersReceived: 3,
    followUpVisitsPlanned: 4,
    eventSuccessRating: 4,
  },
  {
    id: 5,
    demoCode: "DEM-005",
    demoTopic: "Drip Fertigation Video Session",
    productCategory: ["Plant Nutrition", "Water Management"],
    productsDemonstrated: ["FertiFlow NPK", "RootActive"],
    cropFocus: ["Tomato", "Capsicum"],
    demoObjective: "Explain fertigation scheduling and compatibility in protected vegetable cultivation.",
    demoMethod: "Video",
    demonstratorName: "Sunil Patil",
    demonstratorContact: "9876503105",
    totalFarmersInvited: 38,
    totalFarmersAttended: 29,
    totalDistributorsInvited: 7,
    totalDistributorsAttended: 5,
    otherAttendees: 4,
    attendeeList: [
      { id: 1, name: "Pooja Jat", type: "Farmer", location: "Nashik" },
      { id: 2, name: "Greenline Agri Trade", type: "Distributor", location: "Nashik" },
    ],
    interestedInProduct: false,
    feedbackRating: 3,
    feedbackComments: "Useful session, but farmers asked for local language printed schedules.",
    purchaseIntent: "Not Interested",
    followUpRequired: false,
    distributorFeedback: {
      distributorName: "Greenline Agri Trade",
      productInterestLevel: 2,
      orderPotential: 4.5,
      comments: "Needs stronger grower pull before expanding inventory.",
    },
    leadsGenerated: 5,
    sampleRequests: 2,
    trialRequests: 1,
    ordersReceived: 0.5,
    followUpVisitsPlanned: 2,
    eventSuccessRating: 3,
  },
  {
    id: 6,
    demoCode: "DEM-006",
    demoTopic: "Herbicide Use Training Session",
    productCategory: ["Crop Protection", "Herbicide"],
    productsDemonstrated: ["CleanField Max"],
    cropFocus: ["Paddy"],
    demoObjective: "Train farmers and channel partners on safe application timing and tank-mix precautions.",
    demoMethod: "Training Session",
    demonstratorName: "Kavita Solanki",
    demonstratorContact: "9876503106",
    totalFarmersInvited: 61,
    totalFarmersAttended: 54,
    totalDistributorsInvited: 9,
    totalDistributorsAttended: 7,
    otherAttendees: 3,
    attendeeList: [
      { id: 1, name: "Lakshmi Reddy", type: "Farmer", location: "Karimnagar" },
      { id: 2, name: "Sri Sai Agro Depot", type: "Distributor", location: "Karimnagar" },
    ],
    interestedInProduct: true,
    feedbackRating: 5,
    feedbackComments: "Strong engagement and clear understanding of stage-specific application.",
    purchaseIntent: "Immediate",
    followUpRequired: true,
    distributorFeedback: {
      distributorName: "Sri Sai Agro Depot",
      productInterestLevel: 5,
      orderPotential: 22,
      comments: "Wants immediate retailer rollout after monsoon stock planning.",
    },
    leadsGenerated: 21,
    sampleRequests: 10,
    trialRequests: 7,
    ordersReceived: 7.5,
    followUpVisitsPlanned: 9,
    eventSuccessRating: 5,
  },
];

const PER_PAGE = 10;
export const VIEW_DEMO_STORAGE_KEY = "events:demo:view-id";

function formatList(values: string[]) {
  return values.join(", ");
}

export default function DemoPage() {
  const router = useRouter();
  const [records] = useState<DemoRecord[]>(SEED);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;

    return records.filter((record) =>
      [
        record.demoCode,
        record.demoTopic,
        record.demoMethod,
        record.demonstratorName,
        record.demonstratorContact,
        ...record.productCategory,
        ...record.productsDemonstrated,
        ...record.cropFocus,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [records, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const start = (page - 1) * PER_PAGE;
  const visibleRecords = filtered.slice(start, start + PER_PAGE);

  const stats = useMemo(
    () => ({
      totalDemos: records.length,
      totalFarmersAttended: records.reduce((sum, record) => sum + record.totalFarmersAttended, 0),
      totalDistributorsAttended: records.reduce(
        (sum, record) => sum + record.totalDistributorsAttended,
        0,
      ),
      avgSuccessRating:
        records.length === 0
          ? 0
          : Number(
              (
                records.reduce((sum, record) => sum + record.eventSuccessRating, 0) / records.length
              ).toFixed(1),
            ),
    }),
    [records],
  );

  const handleViewRecord = (record: DemoRecord) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(VIEW_DEMO_STORAGE_KEY, String(record.id));
    }
    router.push("/events/demo/view");
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Demo</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              View demonstration topics, crop focus, and feedback outcomes
            </p>
          </div>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Demos", value: stats.totalDemos },
            { label: "Farmers Attended", value: stats.totalFarmersAttended },
            { label: "Distributors Attended", value: stats.totalDistributorsAttended },
            { label: "Avg Success Rating", value: stats.avgSuccessRating },
          ].map((card) => (
            <div key={card.label} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50">
                <Users className="h-4 w-4 text-brand-600" />
              </div>
              <div>
                <p className="text-base font-bold leading-none text-foreground">{card.value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-[9px] h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search demos..."
              className="h-8 w-full rounded-lg border border-border bg-white pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Demo Topic</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Product Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Products Demonstrated</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Crop Focus</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Demo Method</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Demonstrator Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Demonstrator Contact</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-foreground whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No demos match your search</p>
                        <p className="text-xs text-muted-foreground">Try adjusting the search term</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  visibleRecords.map((record) => (
                    <tr key={record.id} className="group border-b border-border/60 transition-colors hover:bg-muted/20">
                      <td className="px-4 py-2 text-xs font-semibold text-foreground whitespace-nowrap">{record.demoTopic}</td>
                      <td className="px-4 py-2 text-xs text-foreground max-w-[180px] truncate">{formatList(record.productCategory)}</td>
                      <td className="px-4 py-2 text-xs text-foreground max-w-[220px] truncate">{formatList(record.productsDemonstrated)}</td>
                      <td className="px-4 py-2 text-xs text-foreground max-w-[160px] truncate">{formatList(record.cropFocus)}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{record.demoMethod}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{record.demonstratorName}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{record.demonstratorContact}</td>
                      <td className="px-4 py-2 text-xs whitespace-nowrap">
                        <div className="relative flex justify-center">
                          <button
                            type="button"
                            onClick={() => setOpenMenu(openMenu === record.id ? null : record.id)}
                            className="rounded-md p-1.5 transition-colors hover:bg-muted"
                          >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </button>
                          {openMenu === record.id && (
                            <div className="absolute right-0 top-7 z-50 w-40 rounded-xl border border-border bg-white py-1 shadow-lg">
                              <button
                                type="button"
                                onClick={() => {
                                  handleViewRecord(record);
                                  setOpenMenu(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted"
                              >
                                <Eye className="h-3.5 w-3.5 text-muted-foreground" /> View
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-3">
            <p className="text-[11px] text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {visibleRecords.length === 0 ? 0 : Math.min(start + visibleRecords.length, filtered.length)}
              </span>{" "}
              of <span className="font-medium text-foreground">{filtered.length}</span> records
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
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
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
