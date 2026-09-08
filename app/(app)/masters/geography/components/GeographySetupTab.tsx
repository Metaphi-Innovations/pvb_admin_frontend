"use client";

import { useMemo, useState } from "react";
import { Edit2, Eye, History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/listing/ActionMenu";
import { ListingStatusToggle, isActiveStatus } from "@/components/listing";
import { ActionItemConfig } from "@/components/listing/types";
import {
  useBusinessGeographyTree,
  useToggleBusinessGeoStatus,
} from "@/hooks/masters";
import type {
  BusinessGeoLevel,
  BusinessGeoListItem,
} from "@/services/business-geography.service";
import { GeographyFormSheet } from "./GeographyFormSheet";
import { GeographyDetailSheet } from "./GeographyDetailSheet";

export function GeographySetupTab(_props?: { postalRecordCount?: number }) {
  const treeQuery = useBusinessGeographyTree();
  const toggleStatus = useToggleBusinessGeoStatus();

  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<BusinessGeoListItem | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [defaultParentLevel, setDefaultParentLevel] = useState<BusinessGeoLevel | null>(
    null,
  );
  const [viewRecord, setViewRecord] = useState<BusinessGeoListItem | null>(null);

  const records = treeQuery.data ?? [];
  const childrenByParent = useMemo(() => {
    const map = new Map<string, BusinessGeoListItem[]>();
    for (const item of records) {
      if (!item.parentId) continue;
      const list = map.get(item.parentId) ?? [];
      list.push(item);
      map.set(item.parentId, list);
    }
    return map;
  }, [records]);

  const rowActions = useMemo<ActionItemConfig<BusinessGeoListItem>[]>(
    () => [
      { label: "View", action: "view", icon: Eye, onClick: (g) => setViewRecord(g) },
      {
        label: "Edit",
        action: "edit",
        icon: Edit2,
        onClick: (g) => {
          setEditRecord(g);
          setDefaultParentId(g.parentId);
          setDefaultParentLevel(null);
          setFormOpen(true);
        },
      },
      {
        label: "Add Child",
        action: "add-child",
        icon: Plus,
        hide: (g) => g.level === "Territory",
        onClick: (g) => {
          if (g.level === "Territory") return;
          setEditRecord(null);
          setDefaultParentId(g.id);
          setDefaultParentLevel(g.level);
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
            Zone → Region (States) → Area (Districts) → Territory (Locations → Pincodes). All
            mapping happens here — assign users from User Management.
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
          onClick={() => {
            setEditRecord(null);
            setDefaultParentId(null);
            setDefaultParentLevel(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-3.5 h-3.5" /> Add Geography
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-white overflow-x-auto">
        {treeQuery.isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : treeQuery.isError ? (
          <div className="p-8 text-center text-sm text-red-600">
            {treeQuery.error instanceof Error
              ? treeQuery.error.message
              : "Failed to load business geography."}
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No geographies yet. Add a Zone to get started.
          </div>
        ) : (
          <table className="w-full text-xs min-w-[1000px]">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {[
                  "Geography Name",
                  "Code",
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
              {records.map((g) => (
                <tr key={g.id} className="border-b border-border/60 hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-semibold">{g.name}</td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{g.code || "—"}</td>
                  <td className="px-3 py-2.5">{g.level}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{g.parentName}</td>
                  <td className="px-3 py-2.5">{g.coverageLabel}</td>
                  <td className="px-3 py-2.5 font-mono">
                    {g.level === "Territory" ? g.pincodeCount : "—"}
                  </td>
                  <td
                    className="px-3 py-2.5 text-muted-foreground max-w-[220px] truncate"
                    title="Manage in User Management"
                  >
                    —
                  </td>
                  <td className="px-3 py-2.5 font-mono">{g.effectiveDate || "—"}</td>
                  <td className="px-3 py-2.5">
                    <ListingStatusToggle
                      active={isActiveStatus(g.status)}
                      disabled={toggleStatus.isPending}
                      onChange={() => {
                        void toggleStatus.mutateAsync({ level: g.level, id: g.id });
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
        )}
      </div>

      <GeographyFormSheet
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditRecord(null);
        }}
        record={editRecord}
        defaultParentId={defaultParentId}
        defaultParentLevel={defaultParentLevel}
        onSaved={() => {
          void treeQuery.refetch();
        }}
      />
      <GeographyDetailSheet
        open={!!viewRecord}
        onClose={() => setViewRecord(null)}
        record={viewRecord}
        childRecords={viewRecord ? childrenByParent.get(viewRecord.id) ?? [] : []}
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
