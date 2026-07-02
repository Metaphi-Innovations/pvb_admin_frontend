"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bug,
  ExternalLink,
  HeartPulse,
  ImageIcon,
  Leaf,
  MapPin,
  Package,
  RefreshCw,
  Sprout,
  User,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RecordDetailTabs } from "@/components/record-detail/RecordDetailTabs";
import { type Farmer, SEED, VIEW_FARMER_STORAGE_KEY } from "../farmer-data";
import { FarmerProfileHeader } from "../components/FarmerProfileHeader";
import { CompactPhotoGallery } from "../components/CompactPhotoGallery";
import {
  FarmingPracticePanel,
  LandDetailsCard,
  ProfileCard,
  ProfileCardGrid,
  KvRow,
  TagCard,
} from "../components/FarmerDetailSections";
import {
  formatDobAge,
  formatIndianMobile,
  getAddressLine1,
  getAddressLine2,
  getCropRotationItems,
  getCurrentCropItems,
  googleMapsHref,
  parseLatLong,
  splitListItems,
} from "../farmer-utils";

type FarmerTab = "basic" | "farm" | "health";

const TABS = [
  { value: "basic", label: "Basic Information" },
  { value: "farm", label: "Farm Information" },
  { value: "health", label: "Farm Health" },
];

export default function FarmerViewPage() {
  const [farmers] = useState<Farmer[]>(SEED);
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [activeTab, setActiveTab] = useState<FarmerTab>("basic");

  useEffect(() => {
    let selected: Farmer | undefined;
    if (typeof window !== "undefined") {
      const id = window.sessionStorage.getItem(VIEW_FARMER_STORAGE_KEY);
      selected = farmers.find((f) => String(f.id) === id);
    }
    setFarmer(selected ?? farmers[0] ?? null);
  }, [farmers]);

  const crops = useMemo(() => (farmer ? getCurrentCropItems(farmer) : []), [farmer]);
  const rotation = useMemo(() => (farmer ? getCropRotationItems(farmer) : []), [farmer]);
  const problems = useMemo(
    () => (farmer ? splitListItems(farmer.currentProblem) : []),
    [farmer],
  );
  const diseases = useMemo(
    () => (farmer ? splitListItems(farmer.majorDiseases) : []),
    [farmer],
  );
  const pests = useMemo(() => (farmer ? splitListItems(farmer.majorPests) : []), [farmer]);
  const products = useMemo(
    () => (farmer ? splitListItems(farmer.productsUsed) : []),
    [farmer],
  );
  const brands = useMemo(() => (farmer ? splitListItems(farmer.brandsRecall) : []), [farmer]);
  const currentBrand = useMemo(
    () => (farmer ? splitListItems(farmer.currentBrandUsed) : []),
    [farmer],
  );

  const mapsHref = farmer ? googleMapsHref(farmer.latLong) : undefined;
  const coords = farmer ? parseLatLong(farmer.latLong) : { latitude: "—", longitude: "—" };

  const healthProblems =
    problems.length > 0 ? problems : [farmer?.currentProblem ?? ""].filter(Boolean);

  if (!farmer) {
    return (
      <AppLayout>
        <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
          Loading farmer profile…
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout noPadding>
      <FarmerProfileHeader
        farmer={farmer}
        listHref="/database/farmer"
        listLabel="Farmer Database"
      />

      <RecordDetailTabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(v) => setActiveTab(v as FarmerTab)}
      />

      <div className="bg-muted/20 px-5 py-3 space-y-3">
        {activeTab === "basic" && (
          <ProfileCardGrid cols={4}>
            <ProfileCard title="Basic Details" icon={User}>
              <KvRow label="Farmer Name" value={farmer.name} />
              <KvRow label="Father's Name" value={farmer.fatherName} />
              <KvRow label="DOB / Age" value={formatDobAge(farmer.age)} />
              <KvRow label="Gender" value={farmer.gender} />
              <KvRow
                label="Mobile Number"
                value={formatIndianMobile(farmer.phoneNumber)}
                mono
                isLast
              />
            </ProfileCard>

            <ProfileCard title="Address" icon={MapPin}>
              <KvRow label="Address Line 1" value={getAddressLine1(farmer)} />
              <KvRow label="Address Line 2" value={getAddressLine2(farmer)} />
              <KvRow label="Village" value={farmer.village} />
              <KvRow label="Town" value={farmer.town} />
              <KvRow label="District" value={farmer.district} />
              <KvRow label="State" value={farmer.state} />
              <KvRow label="Pincode" value={farmer.pincode} mono isLast />
            </ProfileCard>

            <ProfileCard title="GPS" icon={MapPin}>
              <KvRow label="Latitude" value={coords.latitude} mono />
              <KvRow label="Longitude" value={coords.longitude} mono isLast={!mapsHref} />
              {mapsHref && (
                <Link
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View on Map
                </Link>
              )}
            </ProfileCard>

            <ProfileCard title="Photos" icon={ImageIcon}>
              <CompactPhotoGallery
                farmerName={farmer.name}
                locationLabel={`${farmer.village}, ${farmer.district}`}
                compact
              />
            </ProfileCard>
          </ProfileCardGrid>
        )}

        {activeTab === "farm" && (
          <>
            <ProfileCardGrid cols={4}>
              <ProfileCard title="Land Details" icon={Sprout}>
                <LandDetailsCard farmer={farmer} />
              </ProfileCard>

              <TagCard
                title="Current Crops"
                items={crops}
                icon={Leaf}
                variant="crop"
              />

              <TagCard
                title="Crop Rotation"
                items={rotation}
                icon={RefreshCw}
                variant="rotation"
              />

              <ProfileCard title="Farming Practice" icon={Sprout}>
                <FarmingPracticePanel farmer={farmer} />
              </ProfileCard>
            </ProfileCardGrid>

            <ProfileCardGrid cols={3}>
              <TagCard
                title="Current Brand Used"
                items={currentBrand}
                icon={Package}
                variant="brand"
              />
              <TagCard
                title="Products Used"
                items={products}
                icon={Package}
                variant="brand"
              />
              <TagCard
                title="Brands Recalled"
                items={brands}
                icon={Package}
                variant="brand"
              />
            </ProfileCardGrid>
          </>
        )}

        {activeTab === "health" && (
          <ProfileCardGrid cols={3}>
            <TagCard
              title="Current Problems"
              items={healthProblems}
              icon={HeartPulse}
              variant="health"
            />
            <TagCard
              title="Major Diseases"
              items={diseases}
              icon={HeartPulse}
              variant="health"
            />
            <TagCard
              title="Major Pests"
              items={pests}
              icon={Bug}
              variant="health"
            />
          </ProfileCardGrid>
        )}
      </div>
    </AppLayout>
  );
}
