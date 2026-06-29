"use client";

import React from "react";
import Link from "next/link";
import { Building2, ChevronLeft, MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Distributor } from "../distributor-data";
import { formatIndianMobile } from "../../farmer/farmer-utils";
import { FarmerAvatar } from "../../farmer/components/FarmerAvatar";
import { ConversionStatusBadge } from "./DistributorCategoryBadge";

export function DistributorProfileHeader({
  distributor,
  listHref,
  listLabel,
}: {
  distributor: Distributor;
  listHref: string;
  listLabel: string;
}) {
  const statusLabel = distributor.source === "sfa" ? "SFA Submission" : "Active";
  const conversionStatus = distributor.conversionStatus ?? "not_converted";

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-white shadow-sm">
      <div className="px-5 pt-2 pb-0">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link
            href={listHref}
            className="inline-flex items-center gap-0.5 hover:text-brand-600 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {listLabel}
          </Link>
          <span className="text-border">/</span>
          <span className="truncate text-xs text-foreground">{distributor.firmName}</span>
        </nav>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2.5">
        <FarmerAvatar name={distributor.firmName} size="md" variant="brand" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold text-navy-700 leading-tight">
              {distributor.firmName}
            </h1>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                "bg-emerald-50 text-emerald-700",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {statusLabel}
            </span>
            {conversionStatus === "customer_completed" && (
              <ConversionStatusBadge status="customer_completed" />
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3 w-3 flex-shrink-0" />
              {distributor.contactPersonName}
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-foreground">
              <Phone className="h-3 w-3 flex-shrink-0" />
              {formatIndianMobile(distributor.phoneNumber)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {distributor.village} · {distributor.district} · {distributor.state}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
