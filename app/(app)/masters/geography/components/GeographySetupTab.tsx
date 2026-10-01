"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit2, Eye, History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/listing/ActionMenu";
import { ListingStatusToggle, isActiveStatus } from "@/components/listing";
import { ActionItemConfig } from "@/components/listing/types";
import {
  type GeographyRecord,
  getParentName,
  loadGeographies,
  setGeographyStatus,
} from "../geography-master-data";
import {
  formatAssignedUsersForGeography,
  formatGeographyCoverageCount,
  getCoverageModeLabel,
  getGeographyPathLabel,
} from "../geography-workflow-data";
import { GeographyFormSheet } from "./GeographyFormSheet";
import { GeographyDetailSheet } from "./GeographyDetailSheet";

export function GeographySetupTab({ postalRecordCount = 0 }: { postalRecordCount?: number }) {
  const [records, setRecords] = useState<GeographyRecord[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<GeographyRecord | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<number | null>(null);
  const [viewRecord, setViewRecord] = useState<GeographyRecord | null>(null);

  const refresh = useCallback(() => setRecords(loadGeographies()), []);
  useEffect(() => { refresh(); }, [refresh]);

  const sorted = useMemo(
    () => [...records].sort((a, b) => getGeographyPathLabel(a.id).localeCompare(getGeographyPathLabel(b.id))),
    [records],
  );

  const rowActions = useMemo<ActionItemConfig<GeographyRecord>[]>(
    () => [
      { label: "View", action: "view", icon: Eye, onClick: (g) => setViewRecord(g) },
      {
        label: "Edit",
        action: "edit",
        icon: Edit2,
        onClick: (g) => {
          setEditRecord(g);
          setDefaultParentId(g.parentId);
          setFormOpen(true);
        },
      },
      {
        label: "Add Child",
        action: "add-child",
        icon: Plus,
        onClick: (g) => {
          setEditRecord(null);
          setDefaultParentId(g.id);
          setFormOpen(true);
        },
      },
      {
        label: "History",
        action: "history",
        icon: History,
        onClick: () => {
          if (typeof window !== "undefined") {
            window.location.href = "/masters/geography?tab=audit";
          }
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Business Geography</h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            Zone → Region (States) → Area (Districts) → Territory (Cities → Towns → Pincodes). All mapping happens here — assign users from User Management.
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
          onClick={() => {
            setEditRecord(null);
            setDefaultParentId(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-3.5 h-3.5" /> Add Geography
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-white overflow-x-auto">
        <table className="w-full text-xs min-w-[1000px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              {[
                "Geography Name",
                "Level",
                "Parent Geography",
                "Coverage",
                "Pincode Count",
                "Assigned Users",
                "Effective Date",
                "Status",
                "",
              ].map((h) => (
                <th key={h || "actions"} className="text-left px-3 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((g) => (
              <tr key={g.id} className="border-b border-border/60 hover:bg-muted/20">
                <td className="px-3 py-2.5 font-semibold">{g.name}</td>
                <td className="px-3 py-2.5">{g.geographyType}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{getParentName(g.parentId, records)}</td>
                <td className="px-3 py-2.5">{getCoverageModeLabel(g.id)}</td>
                <td className="px-3 py-2.5 font-mono">{formatGeographyCoverageCount(g.id)}</td>
                <td className="px-3 py-2.5 text-muted-foreground max-w-[220px] truncate" title={formatAssignedUsersForGeography(g.id)}>
                  {formatAssignedUsersForGeography(g.id)}
                </td>
                <td className="px-3 py-2.5 font-mono">{g.effectiveFrom}</td>
                <td className="px-3 py-2.5">
                  <ListingStatusToggle
                    active={isActiveStatus(g.status)}
                    onChange={() => {
                      setGeographyStatus(g.id, g.status === "active" ? "inactive" : "active");
                      refresh();
                    }}
                  />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <ActionMenu actions={rowActions} row={g} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <GeographyFormSheet
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditRecord(null);
        }}
        record={editRecord}
        defaultParentId={defaultParentId}
        postalRecordCount={postalRecordCount}
        onSaved={refresh}
      />
      <GeographyDetailSheet
        open={!!viewRecord}
        onClose={() => setViewRecord(null)}
        record={viewRecord}
        onEdit={() => {
          if (viewRecord) {
            setEditRecord(viewRecord);
            setViewRecord(null);
            setFormOpen(true);
          }
        }}
      />
    </div>
  );
}
