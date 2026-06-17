"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Leaf,
  MapPin,
  Store,
  User,
  X,
} from "lucide-react";
import { type Farmer, SEED, VIEW_FARMER_STORAGE_KEY } from "../farmer-data";

function getOwnedLeasedSummary(farmer: Farmer) {
  const ownedTotal = farmer.cropEntries
    .filter((entry) => entry.ownershipType === "Owned")
    .reduce((sum, entry) => sum + Number.parseFloat(entry.landSize), 0);
  const leasedTotal = farmer.cropEntries
    .filter((entry) => entry.ownershipType === "Leased")
    .reduce((sum, entry) => sum + Number.parseFloat(entry.landSize), 0);

  const parts: string[] = [];
  if (ownedTotal > 0) parts.push(`${ownedTotal} Owned`);
  if (leasedTotal > 0) parts.push(`${leasedTotal} Leased`);
  return parts.join(" + ") || farmer.ownershipType;
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
      <div className="flex h-[156px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-brand-50/70">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white shadow-sm">
          {initials}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-brand-700">
          <ImageIcon className="h-3.5 w-3.5" />
          Farmer Photo
        </div>
      </div>
    </div>
  );
}

export default function FarmerViewPage() {
  const router = useRouter();
  const [farmers] = useState<Farmer[]>(SEED);
  const [viewFarmer, setViewFarmer] = useState<Farmer | null>(null);
  const [activeTab, setActiveTab] = useState<"farmer-details" | "crop-land" | "product">("farmer-details");

  useEffect(() => {
    let selectedFarmer: Farmer | undefined;
    if (typeof window !== "undefined") {
      const selectedId = window.sessionStorage.getItem(VIEW_FARMER_STORAGE_KEY);
      selectedFarmer = farmers.find((farmer) => String(farmer.id) === selectedId);
    }

    setViewFarmer(selectedFarmer ?? farmers[0] ?? null);
  }, [farmers]);

  useEffect(() => {
    if (viewFarmer) {
      setActiveTab("farmer-details");
    }
  }, [viewFarmer?.id]);

  const currentViewFarmerIndex = useMemo(
    () => (viewFarmer ? farmers.findIndex((farmer) => farmer.id === viewFarmer.id) : -1),
    [farmers, viewFarmer],
  );
  const canNavigateRecords = activeTab === "farmer-details";

  const handleStepViewFarmer = (direction: -1 | 1) => {
    if (currentViewFarmerIndex < 0) return;

    const nextFarmer = farmers[currentViewFarmerIndex + direction];
    if (!nextFarmer) return;

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(VIEW_FARMER_STORAGE_KEY, String(nextFarmer.id));
    }
    setViewFarmer(nextFarmer);
    router.push("/database/farmer/view");
  };

  const handleCloseView = () => {
    router.push("/database/farmer");
  };

  return (
    <AppLayout>
      {viewFarmer && (
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "farmer-details" | "crop-land" | "product")}
          className="space-y-4"
        >
          <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <div className="relative border-b border-border px-5 py-3">
              <div className={cn("space-y-0.5", canNavigateRecords ? "pr-32" : "pr-10")}>
                <h1 className="text-sm font-semibold text-foreground">Farmer Details</h1>
              </div>
              <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1.5">
                {canNavigateRecords && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStepViewFarmer(-1)}
                      disabled={currentViewFarmerIndex <= 0}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Previous farmer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepViewFarmer(1)}
                      disabled={currentViewFarmerIndex < 0 || currentViewFarmerIndex >= farmers.length - 1}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Next farmer"
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
                <TabsTrigger value="farmer-details" className="h-7 gap-1.5 px-3 text-xs">
                  <User className="h-3.5 w-3.5" />
                  Farmer Details
                </TabsTrigger>
                <TabsTrigger value="crop-land" className="h-7 gap-1.5 px-3 text-xs">
                  <Leaf className="h-3.5 w-3.5" />
                  Crop and Land Details
                </TabsTrigger>
                <TabsTrigger value="product" className="h-7 gap-1.5 px-3 text-xs">
                  <Store className="h-3.5 w-3.5" />
                  Product Details
                </TabsTrigger>
              </TabsList>
            </div>
          </section>

          <TabsContent value="farmer-details" className="m-0 space-y-4">
            <SectionBlock icon={User} title="Farmer Basic Details" subtitle="Identity, family, contact, and demographics">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <div className="lg:row-span-2">
                  <FarmerPhoto farmer={viewFarmer} />
                </div>
                <ReadOnlyField label="Farmer Name" value={viewFarmer.name} />
                <ReadOnlyField label="Farmer Father's Name" value={viewFarmer.fatherName} />
                <ReadOnlyField label="Age" value={viewFarmer.age} />
                <ReadOnlyField label="Gender" value={viewFarmer.gender} />
                <ReadOnlyField label="Phone Number" value={viewFarmer.phoneNumber} mono />
              </div>
            </SectionBlock>

            <SectionBlock icon={MapPin} title="Address & Geography Details" subtitle="Village, location, and farm coordinates">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <ReadOnlyField label="Village" value={viewFarmer.village} />
                <ReadOnlyField label="Town" value={viewFarmer.town} />
                <ReadOnlyField label="City" value={viewFarmer.city} />
                <ReadOnlyField label="District" value={viewFarmer.district} />
                <ReadOnlyField label="State" value={viewFarmer.state} />
                <ReadOnlyField label="Pincode" value={viewFarmer.pincode} mono />
                <ReadOnlyField label="Lat-long" value={viewFarmer.latLong} mono />
              </div>
            </SectionBlock>
          </TabsContent>

          <TabsContent value="crop-land" className="m-0 space-y-4">
            <SectionBlock icon={Leaf} title="Crop & Land Details" subtitle="Landholding and cultivation information">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <ReadOnlyField label="Total Size of Farmland" value={viewFarmer.farmlandSize} />
                <ReadOnlyField label="Owned / Leased Summary" value={getOwnedLeasedSummary(viewFarmer)} />
                <ReadOnlyField label="Current Crop Grown Summary" value={viewFarmer.currentCrop} className="lg:col-span-2" />
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <p className="text-xs font-semibold text-foreground">Crop Portfolio</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Multiple crop records linked to this farmer
                  </p>
                </div>

                <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Category</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Produce / Crop Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Land Size</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Owned / Leased</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Crop Rotation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewFarmer.cropEntries.map((entry, index) => (
                          <tr key={`${entry.produceCropName}-${index}`} className="border-b border-border/60 last:border-b-0">
                            <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{entry.type}</td>
                            <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{entry.category}</td>
                            <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{entry.produceCropName}</td>
                            <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{entry.landSize}</td>
                            <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{entry.ownershipType}</td>
                            <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{entry.cropRotation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </SectionBlock>
          </TabsContent>

          <TabsContent value="product" className="m-0 space-y-4">
            <SectionBlock icon={Store} title="Product Details" subtitle="Usage patterns, brand recall, and field issues">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <ReadOnlyField
                  label="Chemical / Biological / Percentage"
                  value={viewFarmer.chemicalBiologicalPercentage}
                  multiline
                  className="lg:col-span-2"
                />
                <ReadOnlyField
                  label="Which Brand Product He Uses"
                  value={viewFarmer.brandProductUses}
                  multiline
                />
                <ReadOnlyField
                  label="Brands and Product He Recall"
                  value={viewFarmer.brandsRecall}
                  multiline
                />
                <ReadOnlyField
                  label="Currently Struggling With Which Problem"
                  value={viewFarmer.currentProblem}
                  multiline
                  className="lg:col-span-2"
                />
                <ReadOnlyField
                  label="Major Diseases / Pest Encountered in His Farm"
                  value={viewFarmer.majorDiseases}
                  multiline
                  className="lg:col-span-2"
                />
              </div>
            </SectionBlock>
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
}
