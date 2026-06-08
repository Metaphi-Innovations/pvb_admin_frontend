"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Handshake,
  MapPin,
  Store,
  User,
  X,
} from "lucide-react";
import {
  type Distributor,
  loadDistributors,
  VIEW_DISTRIBUTOR_STORAGE_KEY,
} from "../page";

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
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5 border-b border-border pb-3">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-brand-100 bg-brand-50">
          <Icon className="h-3.5 w-3.5 text-brand-600" />
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

export default function DistributorViewPage() {
  const router = useRouter();
  const [distributors] = useState<Distributor[]>(loadDistributors());
  const [viewDistributor, setViewDistributor] = useState<Distributor | null>(null);
  const [activeTab, setActiveTab] = useState<"distributor-details" | "location-details" | "business-details">("distributor-details");

  useEffect(() => {
    let selectedDistributor: Distributor | undefined;
    if (typeof window !== "undefined") {
      const selectedId = window.sessionStorage.getItem(VIEW_DISTRIBUTOR_STORAGE_KEY);
      selectedDistributor = distributors.find((distributor) => String(distributor.id) === selectedId);
    }

    setViewDistributor(selectedDistributor ?? distributors[0] ?? null);
  }, [distributors]);

  useEffect(() => {
    if (viewDistributor) {
      setActiveTab("distributor-details");
    }
  }, [viewDistributor?.id]);

  const currentViewDistributorIndex = useMemo(
    () => (viewDistributor ? distributors.findIndex((distributor) => distributor.id === viewDistributor.id) : -1),
    [distributors, viewDistributor],
  );
  const canNavigateRecords = activeTab === "distributor-details";

  const handleStepViewDistributor = (direction: -1 | 1) => {
    if (currentViewDistributorIndex < 0) return;

    const nextDistributor = distributors[currentViewDistributorIndex + direction];
    if (!nextDistributor) return;

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(VIEW_DISTRIBUTOR_STORAGE_KEY, String(nextDistributor.id));
    }
    setViewDistributor(nextDistributor);
    router.push("/database/distributor/view");
  };

  const handleCloseView = () => {
    router.push("/database/distributor");
  };

  return (
    <AppLayout>
      {viewDistributor && (
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "distributor-details" | "location-details" | "business-details")}
          className="space-y-4"
        >
          <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <div className="relative border-b border-border px-5 py-3">
              <div className={cn("space-y-0.5", canNavigateRecords ? "pr-32" : "pr-10")}>
                <h1 className="text-sm font-semibold text-foreground">Distributor Details</h1>
                <p className="text-[11px] text-muted-foreground">
                  View-only distributor profile, geography, and business details
                </p>
              </div>
              <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1.5">
                {canNavigateRecords && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStepViewDistributor(-1)}
                      disabled={currentViewDistributorIndex <= 0}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Previous distributor"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepViewDistributor(1)}
                      disabled={currentViewDistributorIndex < 0 || currentViewDistributorIndex >= distributors.length - 1}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Next distributor"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleCloseView}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>
              </div>
            </div>

            <div className="px-4 py-2.5">
              <TabsList className="h-9 rounded-lg bg-muted/70 p-1">
                <TabsTrigger value="distributor-details" className="h-7 gap-1.5 px-3 text-xs">
                  <User className="h-3.5 w-3.5" />
                  Distributor Details
                </TabsTrigger>
                <TabsTrigger value="location-details" className="h-7 gap-1.5 px-3 text-xs">
                  <MapPin className="h-3.5 w-3.5" />
                  Location Details
                </TabsTrigger>
                <TabsTrigger value="business-details" className="h-7 gap-1.5 px-3 text-xs">
                  <Store className="h-3.5 w-3.5" />
                  Business Details
                </TabsTrigger>
              </TabsList>
            </div>
          </section>

          <TabsContent value="distributor-details" className="m-0 space-y-4">
            <SectionBlock icon={Building2} title="Distributor Basic Details" subtitle="Firm identity and primary contact information">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <ReadOnlyField label="Firm Name" value={viewDistributor.firmName} />
                <ReadOnlyField label="Contact Person Name" value={viewDistributor.contactPersonName} />
                <ReadOnlyField label="Gender" value={viewDistributor.gender} />
                <ReadOnlyField label="Phone Number" value={viewDistributor.phoneNumber} mono />
                <ReadOnlyField label="Years in Business" value={`${viewDistributor.yearsInBusiness} Years`} />
              </div>
            </SectionBlock>
          </TabsContent>

          <TabsContent value="location-details" className="m-0 space-y-4">
            <SectionBlock icon={Globe} title="Address & Geography Details" subtitle="Address hierarchy and coordinates">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <ReadOnlyField label="Address" value={viewDistributor.address} multiline className="lg:col-span-2" />
                <ReadOnlyField label="Village" value={viewDistributor.village} />
                <ReadOnlyField label="Town" value={viewDistributor.town} />
                <ReadOnlyField label="City" value={viewDistributor.city} />
                <ReadOnlyField label="District" value={viewDistributor.district} />
                <ReadOnlyField label="State" value={viewDistributor.state} />
                <ReadOnlyField label="Pincode" value={viewDistributor.pincode} mono />
                <ReadOnlyField label="Lat-long" value={viewDistributor.latLong} mono />
              </div>
            </SectionBlock>
          </TabsContent>

          <TabsContent value="business-details" className="m-0 space-y-4">
            <SectionBlock icon={Handshake} title="Business Details" subtitle="Commercial profile, market reach, and category">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <ReadOnlyField label="Companies He Is Dealing In" value={viewDistributor.companiesDealingIn} multiline className="lg:col-span-2" />
                <ReadOnlyField label="Annual Turnover" value={viewDistributor.annualTurnover} />
                <ReadOnlyField label="Annual Business He Can Do for Us" value={viewDistributor.annualBusinessPotential} />
                <ReadOnlyField label="Farmer Network" value={viewDistributor.farmerNetwork} />
                <ReadOnlyField label="Distributor Category" value={viewDistributor.distributorCategory} />
              </div>
            </SectionBlock>
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
}
