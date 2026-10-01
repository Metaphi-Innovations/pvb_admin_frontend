"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { FarmerAvatar } from "./FarmerAvatar";
import { ImageIcon, MapPin } from "lucide-react";

export function CompactPhotoGallery({
  farmerName,
  locationLabel,
  compact = false,
}: {
  farmerName: string;
  locationLabel: string;
  /** Smaller tiles for side-by-side profile cards */
  compact?: boolean;
}) {
  const [preview, setPreview] = useState<"farmer" | "farm" | null>(null);

  const items = [
    { id: "farmer" as const, title: "Farmer Photo", name: farmerName, sub: "SFA capture" },
    { id: "farm" as const, title: "Farm Photo", name: `${farmerName} Farm`, sub: locationLabel },
  ];

  return (
    <>
      <div className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 gap-3")}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPreview(item.id)}
            className="group overflow-hidden rounded-lg border border-border bg-muted/10 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/20"
          >
            <div
              className={cn(
                "relative flex items-center justify-center bg-muted/30",
                compact ? "aspect-square max-h-[72px]" : "aspect-[4/3]",
              )}
            >
              <FarmerAvatar
                name={item.name}
                size={compact ? "sm" : "lg"}
                variant={item.id === "farmer" ? "brand" : "muted"}
                className={compact ? "h-9 w-9" : "h-14 w-14 opacity-90"}
              />
              <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded border border-border bg-white shadow-sm">
                <ImageIcon className="h-2.5 w-2.5 text-brand-600" />
              </span>
            </div>
            <div className="border-t border-border/60 px-2 py-1">
              <p className="text-[11px] font-medium text-foreground leading-tight">{item.title}</p>
              {!compact && (
                <p className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5 mt-0.5">
                  {item.id === "farm" && <MapPin className="h-2.5 w-2.5 flex-shrink-0" />}
                  {item.sub}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      <Dialog open={preview !== null} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-xs sm:max-w-sm p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-sm">
              {preview === "farmer" ? "Farmer Photo" : "Farm Photo"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 px-4 pb-5">
            <FarmerAvatar
              name={preview === "farm" ? `${farmerName} Farm` : farmerName}
              size="xl"
              className="h-32 w-32 text-2xl"
            />
            <p className="text-xs text-muted-foreground text-center">
              {preview === "farm" ? locationLabel : "Submitted via SFA Mobile App"}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
