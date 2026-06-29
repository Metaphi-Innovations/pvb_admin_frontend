"use client";

import { cn } from "@/lib/utils";
import { formatListingDate } from "../../components/listing/ListingCells";
import {
  followUpTypeLabel,
  formatActivityDateTime,
  type POFollowUpEntry,
} from "../po-followup-data";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";
}

function PanelTitle({ label }: { label: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span className="h-3.5 w-0.5 rounded-full bg-brand-600" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

export function FollowUpActivityFeed({
  entries,
  className,
  showTitle = true,
  compact = false,
}: {
  entries: POFollowUpEntry[];
  className?: string;
  showTitle?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={className}>
      {showTitle && <PanelTitle label="Comments and Activity" />}
      {entries.length === 0 ? (
        <p
          className={cn(
            "rounded-lg border border-dashed border-border bg-white text-center text-muted-foreground",
            compact ? "px-3 py-6 text-[11px]" : "rounded-xl px-4 py-8 text-xs",
          )}
        >
          No follow-up activity yet.
        </p>
      ) : (
        <div className={cn(compact ? "space-y-2" : "space-y-4")}>
          {entries.map((entry) => (
            <FollowUpActivityItem key={entry.id} entry={entry} compact={compact} />
          ))}
        </div>
      )}
    </div>
  );
}

function FollowUpActivityItem({
  entry,
  compact,
}: {
  entry: POFollowUpEntry;
  compact: boolean;
}) {
  const typeLabel = followUpTypeLabel(entry.followUpType);
  const typeTone =
    entry.followUpType === "enquiry"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-slate-100 text-slate-600 border-slate-200";

  const meta: string[] = [];
  if (entry.spokeWith && entry.spokeWith !== "—") meta.push(`Spoke with ${entry.spokeWith}`);
  if (entry.nextFollowUpAt) {
    meta.push(`Next: ${formatListingDate(entry.nextFollowUpAt.slice(0, 10))}`);
  }

  if (compact) {
    return (
      <div className="rounded-lg border border-border/70 bg-white px-2.5 py-2">
        <div className="flex items-start gap-2">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-[9px] font-bold text-brand-700">
            {initials(entry.createdBy)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <span className="text-[11px] font-semibold text-foreground">{entry.createdBy}</span>
              <span className="text-[10px] text-muted-foreground">
                {formatActivityDateTime(entry.createdAt)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              <span className="inline-flex rounded-full border border-border bg-muted/30 px-1.5 py-px text-[9px] font-semibold text-muted-foreground">
                Follow-up
              </span>
              <span
                className={cn(
                  "inline-flex rounded-full border px-1.5 py-px text-[9px] font-semibold",
                  typeTone,
                )}
              >
                {typeLabel}
              </span>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-[11px] leading-relaxed text-foreground">
              {entry.remarks.trim() || "No remarks added"}
            </p>
            {meta.length > 0 && (
              <p className="mt-1 text-[10px] text-muted-foreground">{meta.join(" · ")}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700">
          {initials(entry.createdBy)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-xs font-semibold text-foreground">{entry.createdBy}</p>
            <p className="text-[11px] text-muted-foreground">
              {formatActivityDateTime(entry.createdAt)}
            </p>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Follow-up
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                typeTone,
              )}
            >
              {typeLabel}
            </span>
          </div>
          <div className="mt-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
            <p className="whitespace-pre-wrap text-xs text-foreground">
              {entry.remarks.trim() || "No remarks added"}
            </p>
          </div>
          {meta.length > 0 && (
            <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
              {entry.spokeWith && entry.spokeWith !== "—" && (
                <p>
                  Spoke with: <span className="font-medium text-foreground">{entry.spokeWith}</span>
                </p>
              )}
              {entry.nextFollowUpAt && (
                <p>
                  Next follow-up:{" "}
                  <span className="font-medium text-foreground">
                    {formatListingDate(entry.nextFollowUpAt.slice(0, 10))}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { PanelTitle };
