"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ListChecks } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { HrOrgPageHeader } from "../../organization/_components";
import {
  loadMandatoryProfileSections,
  setProfileSectionMandatory,
  type MandatoryProfileSectionConfig,
  type MandatoryProfileSectionId,
} from "../../onboarding-data";

export default function MandatoryProfileSectionsClient() {
  const [rows, setRows] = useState<MandatoryProfileSectionConfig[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setRows(loadMandatoryProfileSections());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleToggle = (id: MandatoryProfileSectionId, mandatory: boolean) => {
    setRows(setProfileSectionMandatory(id, mandatory));
  };

  return (
    <HrOrgPageHeader
      title="Mandatory Profile Sections"
      description="Choose which employee profile sections are required for profile completion."
      icon={ListChecks}
      sectionLabel="Employee Onboarding Setup"
      sectionHref="/hr/settings"
    >
      <div className="max-w-xl">
        <div className="border border-border rounded-[12px] bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground">
                  Profile Section
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-foreground w-28">
                  Mandatory
                </th>
              </tr>
            </thead>
            <tbody>
              {!ready &&
                Array.from({ length: 7 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="px-4 py-2.5">
                      <div className="h-3 w-40 bg-muted animate-pulse rounded" />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="h-4 w-8 bg-muted animate-pulse rounded ml-auto" />
                    </td>
                  </tr>
                ))}
              {ready &&
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/60 last:border-b-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-2">
                      <span className="text-xs font-medium text-foreground">{row.label}</span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className={cn(
                            "text-[11px] font-medium tabular-nums",
                            row.mandatory ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {row.mandatory ? "ON" : "OFF"}
                        </span>
                        <Switch
                          size="sm"
                          checked={row.mandatory}
                          onCheckedChange={(v) => handleToggle(row.id, v)}
                          aria-label={`${row.label} mandatory`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2.5 leading-snug">
          Mandatory sections count toward profile completion. Optional sections do not block 100%
          completion when empty.
        </p>
      </div>
    </HrOrgPageHeader>
  );
}
