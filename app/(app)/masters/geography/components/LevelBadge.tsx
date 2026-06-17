import { cn } from "@/lib/utils";
import { type GeoLevel } from "../geo-data";

const LEVEL_STYLES: Record<GeoLevel, string> = {
  Zone:      "bg-blue-50 text-blue-700 border border-blue-200",
  State:     "bg-teal-50 text-teal-700 border border-teal-200",
  Region:    "bg-purple-50 text-purple-700 border border-purple-200",
  Area:      "bg-amber-50 text-amber-700 border border-amber-200",
  Territory: "bg-orange-50 text-orange-700 border border-orange-200",
  Locality:  "bg-rose-50 text-rose-700 border border-rose-200",
  Pincode:   "bg-slate-100 text-slate-600 border border-slate-200",
};

export const LEVEL_DOT: Record<GeoLevel, string> = {
  Zone:      "bg-blue-500",
  State:     "bg-teal-500",
  Region:    "bg-purple-500",
  Area:      "bg-amber-500",
  Territory: "bg-orange-500",
  Locality:  "bg-rose-500",
  Pincode:   "bg-slate-400",
};

interface LevelBadgeProps {
  level: GeoLevel;
  size?: "xs" | "sm";
}

export function LevelBadge({ level, size = "sm" }: LevelBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium whitespace-nowrap",
        size === "sm" ? "text-[11px] px-2 py-0.5" : "text-[10px] px-1.5 py-px",
        LEVEL_STYLES[level],
      )}
    >
      {level}
    </span>
  );
}
