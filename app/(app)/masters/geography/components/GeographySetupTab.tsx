"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Eye,
  History,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// ── Level Colors: Zone (Blue), Region (Green), Area (Purple), Territory (Orange) ──
const LEVEL_BADGE_STYLES: Record<
  BusinessGeoLevel,
  {
    pill: string;
    dot: string;
    codeBg: string;
  }
> = {
  Zone: {
    pill: "bg-blue-50 text-blue-600 border border-blue-200",
    dot: "bg-blue-600",
    codeBg: "bg-blue-50 text-blue-800 border border-blue-200/60",
  },
  Region: {
    pill: "bg-emerald-50 text-emerald-600 border border-emerald-200",
    dot: "bg-emerald-600",
    codeBg: "bg-emerald-50 text-emerald-800 border border-emerald-200/60",
  },
  Area: {
    pill: "bg-purple-50 text-purple-600 border border-purple-200",
    dot: "bg-purple-600",
    codeBg: "bg-purple-50 text-purple-800 border border-purple-200/60",
  },
  Territory: {
    pill: "bg-orange-50 text-orange-600 border border-orange-200",
    dot: "bg-orange-500",
    codeBg: "bg-orange-50 text-orange-800 border border-orange-200/60",
  },
};

export function GeographySetupTab(_props?: { postalRecordCount?: number }) {
  const treeQuery = useBusinessGeographyTree();
  const toggleStatus = useToggleBusinessGeoStatus();

  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<BusinessGeoListItem | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [defaultParentLevel, setDefaultParentLevel] = useState<BusinessGeoLevel | null>(null);
  const [viewRecord, setViewRecord] = useState<BusinessGeoListItem | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const records = treeQuery.data ?? [];

  // Expanded node IDs for the table tree
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const r of records) {
      if (r.level === "Zone") set.add(r.id);
    }
    return set;
  });

  // Whenever records load for the first time, auto-expand zones and regions
  React.useEffect(() => {
    if (records.length > 0) {
      setExpandedIds((prev) => {
        if (prev.size > 0) return prev;
        const init = new Set<string>();
        for (const r of records) {
          if (r.level === "Zone" || r.level === "Region") {
            init.add(r.id);
          }
        }
        return init;
      });
    }
  }, [records]);

  // Group children by parentId
  const childrenMap = useMemo(() => {
    const map = new Map<string, BusinessGeoListItem[]>();
    for (const r of records) {
      if (!r.parentId) continue;
      const list = map.get(r.parentId) ?? [];
      list.push(r);
      map.set(r.parentId, list);
    }
    return map;
  }, [records]);

  // Count stats
  const countZones = records.filter((r) => r.level === "Zone").length;
  const countRegions = records.filter((r) => r.level === "Region").length;
  const countAreas = records.filter((r) => r.level === "Area").length;
  const countTerritories = records.filter((r) => r.level === "Territory").length;

  const totalPincodes = useMemo(() => {
    return records.reduce((acc, r) => acc + (r.pincodeCount || 0), 0);
  }, [records]);

  const totalLocalities = useMemo(() => {
    return records.reduce((acc, r) => acc + (r.locationIds?.length ?? 0), 0);
  }, [records]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rowActions = useMemo<ActionItemConfig<BusinessGeoListItem>[]>(
    () => [
      { label: "View", action: "view", icon: Eye, onClick: (g) => setViewRecord(g) },
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

  const topLevelZones = useMemo(() => {
    return records.filter((r) => r.level === "Zone");
  }, [records]);

  const handleAddTerritory = (areaId: string) => {
    setEditRecord(null);
    setDefaultParentId(areaId);
    setDefaultParentLevel("Area");
    setFormOpen(true);
  };

  const renderRow = (item: BusinessGeoListItem, depth: number) => {
    const isExpanded = expandedIds.has(item.id);
    const children = childrenMap.get(item.id) ?? [];
    const canExpand = children.length > 0;
    const badgeStyle = LEVEL_BADGE_STYLES[item.level] || LEVEL_BADGE_STYLES.Territory;

    const q = searchQuery.toLowerCase().trim();
    const isMatched =
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.code?.toLowerCase().includes(q) ?? false) ||
      item.level.toLowerCase().includes(q);

    if (!isMatched) {
      // Still show row if any child matches search query
      const hasMatchingChild = (node: BusinessGeoListItem): boolean => {
        const cList = childrenMap.get(node.id) ?? [];
        return cList.some(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.code?.toLowerCase().includes(q) ?? false) ||
            c.level.toLowerCase().includes(q) ||
            hasMatchingChild(c),
        );
      };
      if (q && !hasMatchingChild(item)) {
        return null;
      }
    }

    const indentPadding = depth * 28 + 16;

    return (
      <React.Fragment key={item.id}>
        <tr className="border-b border-border/60 hover:bg-muted/30 transition-colors group">
          {/* Geography Name & Indent */}
          <td className="py-2.5 pr-4" style={{ paddingLeft: `${indentPadding}px` }}>
            <div className="flex items-center gap-2">
              {canExpand ? (
                <button
                  type="button"
                  onClick={() => toggleExpand(item.id)}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <div className="w-5 h-5 shrink-0" />
              )}

              {/* Color Dot indicator */}
              <span className={cn("w-2 h-2 rounded-full shrink-0", badgeStyle.dot)} />

              {/* Name */}
              <span className="font-semibold text-foreground tracking-tight text-xs">
                {item.name}
              </span>

              {/* Code badge */}
              {item.code && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-mono font-medium",
                    badgeStyle.codeBg,
                  )}
                >
                  {item.code}
                </span>
              )}

              {/* + Territory button directly on Area row */}
              {item.level === "Area" && (
                <button
                  type="button"
                  onClick={() => handleAddTerritory(item.id)}
                  className="ml-1 text-[11px] font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded px-2 py-0.5 inline-flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Territory
                </button>
              )}
            </div>
          </td>

          {/* Level Badge */}
          <td className="py-2.5 px-4 text-center">
            <span
              className={cn(
                "inline-block text-[11px] font-medium px-2.5 py-0.5 rounded-full",
                badgeStyle.pill,
              )}
            >
              {item.level}
            </span>
          </td>

          {/* Pincode Count */}
          <td className="py-2.5 px-4 text-center text-xs text-muted-foreground font-medium">
            {item.level === "Territory" && (item.pincodeCount || 0) > 0 ? (
              <span className="font-semibold text-foreground">
                {item.pincodeCount}
              </span>
            ) : (
              "—"
            )}
          </td>

          {/* Actions */}
          <td className="py-2.5 px-4 text-right">
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground border-border"
                onClick={() => {
                  setEditRecord(item);
                  setDefaultParentId(item.parentId ?? null);
                  setDefaultParentLevel(null);
                  setFormOpen(true);
                }}
              >
                <Edit2 className="w-3 h-3" /> Edit
              </Button>

              <ListingStatusToggle
                active={isActiveStatus(item.status)}
                onChange={async () => {
                  await toggleStatus.mutateAsync({ level: item.level, id: item.id });
                }}
                disabled={toggleStatus.isPending}
              />

              <ActionMenu row={item} actions={rowActions} />
            </div>
          </td>
        </tr>

        {/* Recursive rendering of children when expanded */}
        {isExpanded &&
          children.map((child) => renderRow(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Zones", val: countZones },
          { label: "Regions", val: countRegions },
          { label: "Areas", val: countAreas },
          { label: "Territories", val: countTerritories },
          { label: "Localities", val: totalLocalities },
          { label: "Pincodes", val: totalPincodes },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-border rounded-xl p-3 shadow-2xs">
            <div className="text-xl font-bold text-foreground">{stat.val}</div>
            <div className="text-xs text-muted-foreground font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, code, pincode..."
            className="pl-8 h-9 text-xs bg-white"
          />
        </div>
        <Button
          size="sm"
          className="h-9 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5 px-3.5 font-medium shrink-0"
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

      <div className="rounded-xl border border-border bg-white overflow-hidden shadow-2xs">
        {treeQuery.isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : treeQuery.isError ? (
          <div className="p-12 text-center text-sm text-red-600">Failed to load.</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No geographies yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[750px]">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Geography Name</th>
                  <th className="text-center py-3 px-4 font-semibold text-foreground w-[120px]">Level</th>
                  <th className="text-center py-3 px-4 font-semibold text-foreground w-[100px]">Pincode</th>
                  <th className="text-right py-3 px-4 font-semibold text-foreground w-[180px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {topLevelZones.map((zone) => renderRow(zone, 0))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <GeographyFormSheet
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditRecord(null); }}
        record={editRecord}
        defaultParentId={defaultParentId}
        defaultParentLevel={defaultParentLevel}
        onSaved={() => { void treeQuery.refetch(); }}
      />
      <GeographyDetailSheet
        open={!!viewRecord}
        onClose={() => setViewRecord(null)}
        record={viewRecord}
        childRecords={viewRecord ? childrenMap.get(viewRecord.id) ?? [] : []}
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
