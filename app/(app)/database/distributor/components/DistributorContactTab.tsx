"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink, MapPin, Navigation, Smartphone, User } from "lucide-react";
import type { Distributor } from "../distributor-data";
import { ProfileCard, ProfileCardGrid } from "../../farmer/components/FarmerDetailSections";
import {
  DistributorDetailField,
  DistributorFieldGrid,
} from "./DistributorDetailFields";
import {
  formatIndianMobile,
  googleMapsHref,
  parseLatLong,
} from "../../farmer/farmer-utils";

export function DistributorContactTab({ distributor }: { distributor: Distributor }) {
  const mapsHref = googleMapsHref(distributor.latLong);
  const coords = parseLatLong(distributor.latLong);

  return (
    <div className="w-full min-w-0 space-y-3">
      {distributor.source === "sfa" && (
        <div className="flex items-start gap-2 rounded-xl border border-navy-200 bg-navy-50 px-3 py-2.5">
          <Smartphone className="mt-0.5 h-4 w-4 flex-shrink-0 text-navy-600" />
          <p className="text-[11px] text-navy-700">
            SFA Mobile submission — contact &amp; location data only. No ERP calculations shown
            here.
            {distributor.submittedAt ? ` Submitted ${distributor.submittedAt}.` : ""}
          </p>
        </div>
      )}

      <ProfileCardGrid cols={3}>
        <ProfileCard title="Basic Contact Details" icon={User}>
          <DistributorFieldGrid cols={1}>
            <DistributorDetailField label="Firm Name" value={distributor.firmName} />
            <DistributorDetailField
              label="Contact Person Name"
              value={distributor.contactPersonName}
            />
            <DistributorDetailField label="Gender" value={distributor.gender} />
            <DistributorDetailField
              label="Mobile Number"
              value={formatIndianMobile(distributor.phoneNumber)}
              mono
            />
          </DistributorFieldGrid>
        </ProfileCard>

        <ProfileCard title="Address & Geography" icon={MapPin} className="lg:col-span-2">
          <DistributorFieldGrid cols={3}>
            <DistributorDetailField
              label="Address Line 1"
              value={distributor.address}
              className="sm:col-span-2 lg:col-span-3"
            />
            <DistributorDetailField
              label="Address Line 2"
              value={distributor.addressLine2}
              className="sm:col-span-2 lg:col-span-3"
            />
            <DistributorDetailField label="Village" value={distributor.village} />
            <DistributorDetailField label="Town" value={distributor.town} />
            <DistributorDetailField label="City" value={distributor.city} />
            <DistributorDetailField label="District" value={distributor.district} />
            <DistributorDetailField label="State" value={distributor.state} />
            <DistributorDetailField label="Pincode" value={distributor.pincode} mono />
          </DistributorFieldGrid>
        </ProfileCard>
      </ProfileCardGrid>

      <ProfileCard title="GPS Location" icon={Navigation}>
        <DistributorFieldGrid cols={4}>
          <DistributorDetailField label="Latitude" value={coords.latitude} mono />
          <DistributorDetailField label="Longitude" value={coords.longitude} mono />
        </DistributorFieldGrid>
        {mapsHref && (
          <Link
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View on Map
          </Link>
        )}
      </ProfileCard>
    </div>
  );
}
