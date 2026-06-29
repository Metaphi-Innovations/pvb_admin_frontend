"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Farmer } from "../farmer-data";
import { formatIndianMobile } from "../farmer-utils";
import { FarmerAvatar } from "./FarmerAvatar";

export function FarmerProfileHeader({
  farmer,
  listHref,
  listLabel,
}: {
  farmer: Farmer;
  listHref: string;
  listLabel: string;
}) {
  const active = farmer.status === "Active";

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
          <span className="truncate text-xs text-foreground">{farmer.name}</span>
        </nav>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2.5">
        <FarmerAvatar name={farmer.name} size="md" variant="brand" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold text-navy-700 leading-tight">{farmer.name}</h1>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  active ? "bg-emerald-500" : "bg-slate-400",
                )}
              />
              {farmer.status}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-mono text-foreground">
              <Phone className="h-3 w-3 flex-shrink-0" />
              {formatIndianMobile(farmer.phoneNumber)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {farmer.village} · {farmer.district} · {farmer.state}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
