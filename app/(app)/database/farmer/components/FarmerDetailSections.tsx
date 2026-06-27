"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { WrapChips, type ChipVariant } from "./WrapChips";
import type { Farmer } from "../farmer-data";
import { formatOwnershipLabel, getLandSummary } from "../farmer-utils";

/** Individual profile card with icon header — matches reference grid cards */
export function ProfileCard({
  title,
  count,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  count?: number;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  const titleLabel =
    count !== undefined && count > 0 ? `${title} (${count})` : title;

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/20 px-3 py-2">
        {Icon && (
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-brand-100 bg-brand-50">
            <Icon className="h-3 w-3 text-brand-600" />
          </div>
        )}
        <h3 className="text-xs font-semibold text-foreground">{titleLabel}</h3>
      </div>
      <div className="flex-1 px-3 py-2.5">{children}</div>
    </div>
  );
}

export function TagCard({
  title,
  items,
  icon,
  variant,
  chipPrefix,
  className,
}: {
  title: string;
  items: string[];
  icon?: LucideIcon;
  variant: ChipVariant;
  chipPrefix?: string;
  className?: string;
}) {
  return (
    <ProfileCard title={title} count={items.length} icon={icon} className={className}>
      <WrapChips items={items} variant={variant} chipPrefix={chipPrefix} />
    </ProfileCard>
  );
}

export function KvRow({
  label,
  value,
  highlight,
  mono,
  isLast,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  mono?: boolean;
  isLast?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-2 py-1.5 text-xs",
        !isLast && "border-b border-border/40",
      )}
    >
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      <span
        className={cn(
          "text-right font-medium break-words min-w-0",
          mono ? "font-mono text-brand-700" : "text-foreground",
          highlight && "font-semibold text-brand-700",
        )}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

export function ProfileField({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  const display =
    value === undefined || value === null || value === "" ? "—" : value;

  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-medium text-muted-foreground mb-0.5">{label}</p>
      <p
        className={cn(
          "text-xs font-medium text-foreground break-words",
          mono && "font-mono text-brand-700",
        )}
      >
        {display}
      </p>
    </div>
  );
}

export function LandDetailsCard({ farmer }: { farmer: Farmer }) {
  const land = getLandSummary(farmer);
  const showOwned =
    farmer.ownershipType === "Owned" || farmer.ownershipType === "Owned + Leased";
  const showLeased =
    farmer.ownershipType === "Leased" || farmer.ownershipType === "Owned + Leased";

  const ownedValue = land.owned ?? (farmer.ownershipType === "Owned" ? land.total : "—");
  const leasedValue = land.leased ?? (farmer.ownershipType === "Leased" ? land.total : "—");

  const rows: { label: string; value: React.ReactNode; highlight?: boolean }[] = [
    { label: "Ownership Type", value: formatOwnershipLabel(farmer.ownershipType) },
  ];
  if (showOwned) rows.push({ label: "Owned Area", value: ownedValue });
  if (showLeased) rows.push({ label: "Leased Area", value: leasedValue });
  rows.push({ label: "Total Area", value: land.total, highlight: true });

  return (
    <>
      {rows.map((row, i) => (
        <KvRow
          key={row.label}
          label={row.label}
          value={row.value}
          highlight={row.highlight}
          isLast={i === rows.length - 1}
        />
      ))}
    </>
  );
}

export function FarmingPracticePanel({ farmer }: { farmer: Farmer }) {
  const { farmingPractice, chemicalPercent, biologicalPercent } = farmer;

  const practiceLabel =
    farmingPractice === "Both"
      ? "Chemical + Biological"
      : farmingPractice === "Chemical"
        ? "Chemical Only"
        : "Biological Only";

  const chem = chemicalPercent ?? (farmingPractice === "Biological" ? 0 : 100);
  const bio = biologicalPercent ?? (farmingPractice === "Chemical" ? 0 : 100);
  const showSplit = farmingPractice === "Both" || (chem > 0 && bio > 0);

  return (
    <div className="space-y-2.5">
      <KvRow label="Practice Type" value={practiceLabel} />
      {showSplit ? (
        <>
          <PracticeBar label="Chemical" percent={chem} color="bg-brand-500" />
          <PracticeBar label="Biological" percent={bio} color="bg-leaf-500" />
        </>
      ) : farmingPractice === "Chemical" ? (
        <PracticeBar label="Chemical" percent={100} color="bg-brand-500" />
      ) : (
        <PracticeBar label="Biological" percent={100} color="bg-leaf-500" />
      )}
    </div>
  );
}

function PracticeBar({
  label,
  percent,
  color,
}: {
  label: string;
  percent: number;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground">{label}</span>
        <span className="font-medium tabular-nums text-foreground">{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}

/** Card grid wrapper — equal-height rows */
export function ProfileCardGrid({
  children,
  cols = 3,
  className,
}: {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  const colCls = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
  }[cols];

  return (
    <div className={cn("grid gap-3 items-stretch", colCls, className)}>{children}</div>
  );
}
