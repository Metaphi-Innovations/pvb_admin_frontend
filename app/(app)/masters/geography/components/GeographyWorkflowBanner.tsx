"use client";

import { GitMerge, MapPin, Network, Users, Workflow } from "lucide-react";

export function GeographyWorkflowBanner({
  summary,
}: {
  summary?: {
    totalPincodes: number;
    mappedPincodes: number;
    totalGeographies: number;
    totalAssignments: number;
  };
}) {
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
            <Workflow className="w-[18px] h-[18px] text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Sales Geography & Territory Management</h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Upload Postal Master → Create Zone → Region (States) → Area (Districts) → Territory (Cities → Towns → Pincodes) → Assign users in User Management
            </p>
          </div>
        </div>

        {summary && (
          <div className="flex flex-wrap gap-2 text-[11px] sm:justify-end shrink-0">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/40 border border-border">
              <MapPin className="w-3 h-3 text-brand-600" /> {summary.totalPincodes} postal
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/40 border border-border">
              <Network className="w-3 h-3 text-teal-600" /> {summary.mappedPincodes} mapped
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/40 border border-border">
              <GitMerge className="w-3 h-3 text-indigo-600" /> {summary.totalGeographies} geographies
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/40 border border-border">
              <Users className="w-3 h-3 text-amber-600" /> {summary.totalAssignments} users
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
